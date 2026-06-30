// 통 상세 - 입력 탭 (Teams 녹취 / 텍스트 / 메모 / 음성 파일)

import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '@/store/DataContext'
import { Card, Badge, ConfirmModal } from '@/components/ui'
import { TeamsIcon, TextIcon, MemoIcon, MicIcon, FileIcon, StopIcon, TrashIcon } from '@/components/icons'
import { cn, formatDateTime, formatDate, formatFileSize } from '@/lib/utils'
import { uid } from '@/lib/db'
import { fetchTeamsTranscript } from '@/lib/teams'
import { transcribeAudioFile, isSupportedAudio } from '@/lib/stt'
import { uploadRecording, recordingExpiresAt, getRecordingUrl } from '@/lib/storage'
import { convertToMp3 } from '@/lib/mp3'
import type { Tong, TongInput, TongInputType, Attachment } from '@/types'

const METHODS: { key: TongInputType; label: string; icon: React.ReactNode }[] = [
  { key: 'teams', label: 'Teams 녹취', icon: <TeamsIcon className="h-4 w-4" /> },
  { key: 'text', label: '텍스트 입력', icon: <TextIcon className="h-4 w-4" /> },
  { key: 'memo', label: '메모 입력', icon: <MemoIcon className="h-4 w-4" /> },
  { key: 'audio', label: '음성 녹음·파일', icon: <MicIcon className="h-4 w-4" /> },
]

const TYPE_LABEL: Record<TongInputType, string> = {
  teams: 'Teams 녹취',
  text: '텍스트',
  memo: '메모',
  audio: '음성(STT)',
}

export function InputTab({ tong }: { tong: Tong }) {
  const { inputs, attachments, addInput, addAttachment } = useData()
  const [method, setMethod] = useState<TongInputType>('teams')

  const tongInputs = useMemo(
    () => inputs.filter((i) => i.tong_id === tong.id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [inputs, tong.id],
  )
  const tongAttachments = useMemo(() => attachments.filter((a) => a.tong_id === tong.id), [attachments, tong.id])

  async function saveInput(type: TongInputType, content: string) {
    if (!content.trim()) return
    const input: TongInput = {
      id: uid('input'),
      tong_id: tong.id,
      input_type: type,
      content: content.trim(),
      created_at: new Date().toISOString(),
    }
    await addInput(input)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* 입력 방식 선택 */}
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  method === m.key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {method === 'teams' && <TeamsInput tong={tong} onSave={(c) => saveInput('teams', c)} />}
          {method === 'text' && <TextInput onSave={(c) => saveInput('text', c)} placeholder="회의 내용을 직접 입력하세요." label="텍스트 입력" />}
          {method === 'memo' && <TextInput onSave={(c) => saveInput('memo', c)} placeholder="회의 중 작성한 자유 메모를 입력하세요." label="메모 입력" />}
          {method === 'audio' && <AudioInput tong={tong} onTranscribed={(c) => saveInput('audio', c)} onAttach={addAttachment} />}
        </Card>
      </div>

      {/* 입력 기록 목록 */}
      <div className="space-y-4">
        <Card>
          <h3 className="mb-3 font-semibold text-gray-900">입력 기록 ({tongInputs.length})</h3>
          {tongInputs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">아직 입력된 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {tongInputs.map((i) => (
                <li key={i.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge className="bg-brand-50 text-brand-700">{TYPE_LABEL[i.input_type]}</Badge>
                    <span className="text-xs text-gray-400">{formatDateTime(i.created_at)}</span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-xs text-gray-600">{i.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {tongAttachments.length > 0 && (
          <Card>
            <h3 className="mb-3 font-semibold text-gray-900">첨부 파일</h3>
            <ul className="space-y-2">
              {tongAttachments.map((a) => (
                <AttachmentRow key={a.id} att={a} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── 첨부(음원) 행: 재생 / 다운로드 / 삭제 ────────────────────────────────────
function AttachmentRow({ att }: { att: Attachment }) {
  const { deleteAttachment } = useData()
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState<null | 'play' | 'download'>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const stored = Boolean(att.storage_path)

  async function remove() {
    setConfirmOpen(false)
    setDeleting(true)
    setError(null)
    try {
      await deleteAttachment(att.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  async function play() {
    if (playUrl) return
    setLoading('play')
    setError(null)
    try {
      const url = await getRecordingUrl(att.storage_path)
      if (!url) setError('재생 URL을 가져오지 못했습니다.')
      else setPlayUrl(url)
    } finally {
      setLoading(null)
    }
  }

  async function download() {
    setLoading('download')
    setError(null)
    try {
      const url = await getRecordingUrl(att.storage_path, 3600, true)
      if (!url) {
        setError('다운로드 URL을 가져오지 못했습니다.')
        return
      }
      const a = document.createElement('a')
      a.href = url
      a.download = att.file_name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setLoading(null)
    }
  }

  return (
    <li className="rounded-lg border border-gray-100 p-2 text-sm">
      <div className="flex items-center gap-2">
        <FileIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-gray-700">{att.file_name}</p>
          {stored
            ? att.expires_at && <p className="text-xs text-gray-400">{formatDate(att.expires_at)} 자동 삭제 예정</p>
            : <p className="text-xs text-gray-400">{att.expires_at ? '음원 만료(삭제됨)' : '음원 미보관'}</p>}
        </div>
        <span className="shrink-0 text-xs text-gray-400">{formatFileSize(att.file_size)}</span>
        <div className="flex shrink-0 items-center gap-1">
          {stored && (
            <>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={play} disabled={loading !== null || deleting}>
                {loading === 'play' ? '여는 중…' : '재생'}
              </button>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={download} disabled={loading !== null || deleting}>
                {loading === 'download' ? '받는 중…' : '다운로드'}
              </button>
            </>
          )}
          <button
            className="btn-ghost px-2 py-1 text-xs text-gray-400 hover:text-red-500"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            title="첨부 삭제"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {playUrl && (
        <audio className="mt-2 w-full" controls autoPlay src={playUrl}>
          브라우저가 오디오 재생을 지원하지 않습니다.
        </audio>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <ConfirmModal
        open={confirmOpen}
        title="첨부 음원을 삭제할까요?"
        message={`'${att.file_name}' 을(를) 삭제합니다. 저장된 음원 파일도 함께 삭제되며 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  )
}

// ── Teams 녹취 ──────────────────────────────────────────────────────────────
function TeamsInput({ tong, onSave }: { tong: Tong; onSave: (c: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function importTranscript() {
    setLoading(true)
    try {
      const t = await fetchTeamsTranscript(tong.title)
      setText(t)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(text)
      setText('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Teams 회의 녹취</label>
        <button className="btn-secondary" onClick={importTranscript} disabled={loading}>
          {loading ? '가져오는 중…' : 'Teams 녹취 가져오기'}
        </button>
      </div>
      <textarea className="input min-h-[220px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="녹취 텍스트를 붙여넣거나 'Teams 녹취 가져오기'를 클릭하세요. (Mock)" />
      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={!text.trim() || saving}>{saving ? '저장 중…' : '녹취 저장'}</button>
      </div>
    </div>
  )
}

// ── 텍스트 / 메모 (공통) ─────────────────────────────────────────────────────
function TextInput({ onSave, placeholder, label }: { onSave: (c: string) => Promise<void>; placeholder: string; label: string }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await onSave(text)
      setText('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="label">{label}</label>
      <textarea className="input min-h-[220px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={!text.trim() || saving}>{saving ? '저장 중…' : '저장'}</button>
      </div>
    </div>
  )
}

// ── 음성 (마이크 녹음 / 파일 업로드) ─────────────────────────────────────────
function AudioInput({ tong, onTranscribed, onAttach }: { tong: Tong; onTranscribed: (c: string) => Promise<void>; onAttach: (a: Attachment) => Promise<void> }) {
  const [sub, setSub] = useState<'record' | 'upload'>('record')

  // 음원 자동 저장: Storage 업로드 → 첨부 메타 저장 (녹음/선택 즉시 실행 → 유실 방지)
  async function saveAudio(file: File): Promise<void> {
    const id = uid('att')
    const uploadedAt = new Date().toISOString()
    // 음원 원본을 Storage 에 보관 (Supabase 미설정 시 빈 경로). 90일 후 자동 삭제 대상.
    const storagePath = await uploadRecording(file, tong.id, id)
    const att: Attachment = {
      id,
      tong_id: tong.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'audio/mpeg',
      storage_path: storagePath,
      uploaded_at: uploadedAt,
      expires_at: storagePath ? recordingExpiresAt(uploadedAt) : null,
    }
    await onAttach(att)
  }

  // STT 텍스트 변환(선택): 변환 결과를 입력 기록으로 저장
  async function runStt(file: File): Promise<string> {
    const text = await transcribeAudioFile(file)
    await onTranscribed(text)
    return text
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <SubTab active={sub === 'record'} onClick={() => setSub('record')} icon={<MicIcon className="h-4 w-4" />} label="마이크 녹음" />
        <SubTab active={sub === 'upload'} onClick={() => setSub('upload')} icon={<FileIcon className="h-4 w-4" />} label="파일 업로드" />
      </div>
      {sub === 'record' ? <MicRecorder onSaveAudio={saveAudio} onStt={runStt} /> : <AudioUpload onSaveAudio={saveAudio} onStt={runStt} />}
    </div>
  )
}

function SubTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ── 마이크 녹음 (MediaRecorder) ──────────────────────────────────────────────
function MicRecorder({ onSaveAudio, onStt }: { onSaveAudio: (file: File) => Promise<void>; onStt: (file: File) => Promise<string> }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [level, setLevel] = useState(0) // 입력 레벨 0~100
  const [silent, setSilent] = useState(false) // 녹음 중 소리가 거의 감지되지 않음
  const [converting, setConverting] = useState(false) // webm → mp3 변환 중
  const [saving, setSaving] = useState(false) // 자동 저장(업로드) 중
  const [saved, setSaved] = useState(false) // 자동 저장 완료
  const [error, setError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  // 입력 장치 선택
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>('') // '' = 브라우저 기본

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  // 레벨 미터(Web Audio)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const peakRef = useRef(0) // 녹음 동안의 최대 입력 레벨

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  // 레벨 미터 정리
  function stopMeter() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    analyserRef.current = null
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setLevel(0)
  }

  // 입력 레벨 측정 루프
  function startMeter(stream: MediaStream) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      void ctx.resume().catch(() => {})
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      peakRef.current = 0
      const buf = new Uint8Array(analyser.fftSize)
      const tick = () => {
        const a = analyserRef.current
        if (!a) return
        a.getByteTimeDomainData(buf)
        let peak = 0
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i] - 128)
          if (v > peak) peak = v
        }
        const lvl = Math.min(100, Math.round((peak / 128) * 100 * 1.8))
        setLevel(lvl)
        if (lvl > peakRef.current) peakRef.current = lvl
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      // 레벨 미터는 부가 기능이므로 실패해도 녹음은 계속 진행
    }
  }

  // 사용 가능한 오디오 입력 장치 목록 갱신 (라벨은 권한 허용 후에만 보임)
  async function refreshDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(all.filter((d) => d.kind === 'audioinput'))
    } catch {
      // 무시 (부가 기능)
    }
  }

  // 언마운트(탭 이동 등) 시 녹음/스트림/미터 정리
  useEffect(() => {
    void refreshDevices()
    const onChange = () => void refreshDevices()
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
      clearTimer()
      stopMeter()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      stopStream()
    }
  }, [])

  // 녹음 결과 미리듣기용 object URL 관리
  useEffect(() => {
    if (!recordedFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(recordedFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recordedFile])

  // 변환(webm→mp3) 후 자동 저장
  async function finalize(rawFile: File) {
    setConverting(true)
    let file = rawFile
    try {
      file = await convertToMp3(rawFile)
    } catch (e) {
      console.warn('[mp3] 변환 실패 — 원본 유지:', e)
      setError('mp3 변환에 실패해 원본(webm) 형식으로 저장됩니다.')
    } finally {
      setConverting(false)
    }
    setRecordedFile(file)
    setSaving(true)
    try {
      await onSaveAudio(file) // 자동 저장 (유실 방지)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? `자동 저장 실패: ${e.message}` : '자동 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function start() {
    setError(null)
    setResult(null)
    setRecordedFile(null)
    setSilent(false)
    setSaved(false)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('이 브라우저는 마이크 녹음을 지원하지 않습니다. (HTTPS 환경의 Chrome/Edge 권장)')
      return
    }
    try {
      const audioConstraint: MediaTrackConstraints | boolean = deviceId ? { deviceId: { exact: deviceId } } : true
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint })
      streamRef.current = stream
      chunksRef.current = []
      // 권한 허용 후에는 장치 라벨이 보이므로 목록 갱신, 실제 사용 장치를 선택값에 반영
      void refreshDevices()
      const usedId = stream.getAudioTracks()[0]?.getSettings().deviceId
      if (usedId && !deviceId) setDeviceId(usedId)
      startMeter(stream)
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const ext = type.includes('ogg') ? 'ogg' : 'webm'
        const stamp = fileStamp()
        const file = new File([blob], `녹음_${stamp}.${ext}`, { type })
        // 녹음 동안 입력 레벨이 거의 0이면 무음으로 간주(마이크 입력 문제 가능성)
        setSilent(peakRef.current < 4)
        stopMeter()
        stopStream()
        // webm → mp3 변환 후 자동 저장
        void finalize(file)
      }
      recorder.start(1000) // 1초 간격으로 데이터 수집(안정성)
      recorderRef.current = recorder
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      stopMeter()
      const err = e as DOMException
      if (err.name === 'NotAllowedError') setError('마이크 권한이 거부되었습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.')
      else if (err.name === 'NotFoundError') setError('마이크를 찾을 수 없습니다. 장치 연결을 확인해 주세요.')
      else setError(`녹음을 시작할 수 없습니다: ${err.message}`)
    }
  }

  function stop() {
    clearTimer()
    setRecording(false)
    recorderRef.current?.stop()
  }

  async function transcribe() {
    if (!recordedFile) return
    setTranscribing(true)
    try {
      const text = await onStt(recordedFile)
      setResult(text)
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="label mb-0">마이크 녹음</label>
        {/* 입력 장치 선택 */}
        <div className="flex items-center gap-1">
          <select
            className="input w-auto py-1 text-xs"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            disabled={recording}
            title="마이크 입력 장치 선택"
          >
            <option value="">기본 마이크</option>
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `마이크 ${i + 1}`}
              </option>
            ))}
          </select>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => void refreshDevices()} disabled={recording} title="장치 목록 새로고침">
            새로고침
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
        <div className={cn('mb-3 flex h-16 w-16 items-center justify-center rounded-full', recording ? 'animate-pulse bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400')}>
          <MicIcon className="h-7 w-7" />
        </div>
        {recording ? (
          <p className="text-sm font-medium text-red-500">녹음 중… {formatElapsed(seconds)}</p>
        ) : converting ? (
          <p className="text-sm text-gray-500">mp3 변환 중…</p>
        ) : saving ? (
          <p className="text-sm text-gray-500">저장 중…</p>
        ) : recordedFile ? (
          <p className="text-sm text-gray-500">{recordedFile.name} · {formatFileSize(recordedFile.size)}</p>
        ) : (
          <p className="text-sm text-gray-500">버튼을 눌러 회의 녹음을 시작하세요.</p>
        )}

        {/* 입력 레벨 미터 (녹음 중) */}
        {recording && (
          <div className="mt-3 w-56">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full transition-[width] duration-75', level < 5 ? 'bg-gray-300' : level < 60 ? 'bg-green-500' : 'bg-amber-500')}
                style={{ width: `${level}%` }}
              />
            </div>
            <p className={cn('mt-1 text-xs', level < 5 ? 'text-gray-400' : 'text-gray-500')}>
              {level < 5 ? '입력 신호 없음 — 말해도 막대가 안 움직이면 마이크 입력을 확인하세요' : '입력 감지 중'}
            </p>
          </div>
        )}

        <div className="mt-4">
          {recording ? (
            <button className="btn-primary bg-red-500 hover:bg-red-600" onClick={stop}>
              <StopIcon className="h-4 w-4" />녹음 종료
            </button>
          ) : (
            <button className="btn-primary" onClick={start} disabled={transcribing || converting}>
              <MicIcon className="h-4 w-4" />{recordedFile ? '다시 녹음' : '녹음 시작'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 무음 경고 */}
      {recordedFile && !recording && silent && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          이번 녹음에서 소리가 거의 감지되지 않았습니다. 미리듣기로 확인해 보세요. 소리가 없으면 마이크 입력 장치·음소거 설정을 확인 후 다시 녹음하세요.
        </div>
      )}

      {/* 저장 전 미리듣기 */}
      {recordedFile && !recording && previewUrl && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">미리듣기 (저장 전 확인)</p>
          <audio className="w-full" controls src={previewUrl}>
            브라우저가 오디오 재생을 지원하지 않습니다.
          </audio>
        </div>
      )}

      {/* 자동 저장 안내 + 선택적 텍스트 변환 */}
      {recordedFile && !recording && !converting && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            {saving ? '저장 중…' : saved ? '✓ 자동 저장됨 — 아래 첨부 목록에서 확인·삭제할 수 있습니다.' : ''}
          </p>
          <button className="btn-secondary" onClick={transcribe} disabled={transcribing || saving}>
            {transcribing ? '변환 중…' : result ? '텍스트 다시 변환' : '텍스트로 변환 (STT, 선택)'}
          </button>
        </div>
      )}
      {result && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">변환 결과 (입력 기록에 저장됨)</p>
          <p className="whitespace-pre-wrap text-xs text-gray-600">{result}</p>
        </div>
      )}
    </div>
  )
}

// ── 음성 파일 업로드 (선택 즉시 자동 저장) ───────────────────────────────────
function AudioUpload({ onSaveAudio, onStt }: { onSaveAudio: (file: File) => Promise<void>; onStt: (file: File) => Promise<string> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function pick(f: File | null) {
    setError(null)
    setResult(null)
    setSaved(false)
    if (!f) return
    if (!isSupportedAudio(f)) {
      setError('mp3 또는 wav 파일만 업로드할 수 있습니다.')
      return
    }
    setFile(f)
    // 선택 즉시 자동 저장 (유실 방지)
    setSaving(true)
    try {
      await onSaveAudio(f)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? `저장 실패: ${e.message}` : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function transcribe() {
    if (!file) return
    setTranscribing(true)
    try {
      const text = await onStt(file)
      setResult(text)
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="label">음성 파일 업로드 (mp3, wav)</label>
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-10 text-center hover:bg-gray-50"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0] ?? null) }}
      >
        <MicIcon className="mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">{file ? file.name : '클릭 또는 드래그하여 음성 파일 업로드'}</p>
        {file && <p className="mt-1 text-xs text-gray-400">{formatFileSize(file.size)} · {new Date().toLocaleString('ko-KR')}</p>}
        <input ref={inputRef} type="file" accept=".mp3,.wav,audio/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0] ?? null)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {file && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">{saving ? '저장 중…' : saved ? '✓ 자동 저장됨 — 아래 첨부 목록에서 확인·삭제할 수 있습니다.' : ''}</p>
          <button className="btn-secondary" onClick={transcribe} disabled={transcribing || saving}>
            {transcribing ? '변환 중…' : result ? '텍스트 다시 변환' : '텍스트로 변환 (STT, 선택)'}
          </button>
        </div>
      )}
      {result && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">변환 결과 (입력 기록에 저장됨)</p>
          <p className="whitespace-pre-wrap text-xs text-gray-600">{result}</p>
        </div>
      )}
    </div>
  )
}

// 녹음 경과 시간 mm:ss
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// 녹음 파일명용 타임스탬프 (YYYYMMDD_HHmmss)
function fileStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
