// 통 상세 - 입력 탭 (Teams 녹취 / 텍스트 / 메모 / 음성 파일)

import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '@/store/DataContext'
import { Card, Badge } from '@/components/ui'
import { TeamsIcon, TextIcon, MemoIcon, MicIcon, FileIcon, StopIcon } from '@/components/icons'
import { cn, formatDateTime, formatDate, formatFileSize } from '@/lib/utils'
import { uid } from '@/lib/db'
import { fetchTeamsTranscript } from '@/lib/teams'
import { transcribeAudioFile, isSupportedAudio } from '@/lib/stt'
import { uploadRecording, recordingExpiresAt } from '@/lib/storage'
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
                <li key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2 text-sm">
                  <FileIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-gray-700">{a.file_name}</p>
                    {a.storage_path
                      ? a.expires_at && <p className="text-xs text-gray-400">{formatDate(a.expires_at)} 자동 삭제 예정</p>
                      : <p className="text-xs text-gray-400">{a.expires_at ? '음원 만료(삭제됨)' : '음원 미보관'}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{formatFileSize(a.file_size)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
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

  // 녹음/업로드 공통 처리: 음원 Storage 업로드 → 첨부 메타 저장 → STT 변환(Mock) → 입력 저장
  async function processFile(file: File): Promise<string> {
    const id = uid('att')
    const uploadedAt = new Date().toISOString()
    // 음원 원본을 Storage 에 보관 (Supabase 미설정 시 빈 경로). 90일 후 자동 삭제 대상.
    const storagePath = await uploadRecording(file, tong.id, id)
    const att: Attachment = {
      id,
      tong_id: tong.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'audio/webm',
      storage_path: storagePath,
      uploaded_at: uploadedAt,
      expires_at: storagePath ? recordingExpiresAt(uploadedAt) : null,
    }
    await onAttach(att)
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
      {sub === 'record' ? <MicRecorder onProcess={processFile} /> : <AudioUpload onProcess={processFile} />}
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
function MicRecorder({ onProcess }: { onProcess: (file: File) => Promise<string> }) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

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

  // 언마운트(탭 이동 등) 시 녹음/스트림 정리
  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      stopStream()
    }
  }, [])

  async function start() {
    setError(null)
    setResult(null)
    setRecordedFile(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('이 브라우저는 마이크 녹음을 지원하지 않습니다. (HTTPS 환경의 Chrome/Edge 권장)')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const ext = type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `녹음_${fileStamp()}.${ext}`, { type })
        setRecordedFile(file)
        stopStream()
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
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
      const text = await onProcess(recordedFile)
      setResult(text)
      setRecordedFile(null)
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="label">마이크 녹음</label>
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
        <div className={cn('mb-3 flex h-16 w-16 items-center justify-center rounded-full', recording ? 'animate-pulse bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400')}>
          <MicIcon className="h-7 w-7" />
        </div>
        {recording ? (
          <p className="text-sm font-medium text-red-500">녹음 중… {formatElapsed(seconds)}</p>
        ) : recordedFile ? (
          <p className="text-sm text-gray-500">{recordedFile.name} · {formatFileSize(recordedFile.size)}</p>
        ) : (
          <p className="text-sm text-gray-500">버튼을 눌러 회의 녹음을 시작하세요.</p>
        )}
        <div className="mt-4">
          {recording ? (
            <button className="btn-primary bg-red-500 hover:bg-red-600" onClick={stop}>
              <StopIcon className="h-4 w-4" />녹음 종료
            </button>
          ) : (
            <button className="btn-primary" onClick={start} disabled={transcribing}>
              <MicIcon className="h-4 w-4" />{recordedFile ? '다시 녹음' : '녹음 시작'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {recordedFile && !recording && (
        <div className="flex justify-end">
          <button className="btn-primary" onClick={transcribe} disabled={transcribing}>
            {transcribing ? 'STT 변환 중…' : 'STT 변환'}
          </button>
        </div>
      )}
      {result && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">변환 결과 (저장됨)</p>
          <p className="whitespace-pre-wrap text-xs text-gray-600">{result}</p>
        </div>
      )}
    </div>
  )
}

// ── 음성 파일 업로드 + STT ───────────────────────────────────────────────────
function AudioUpload({ onProcess }: { onProcess: (file: File) => Promise<string> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function pick(f: File | null) {
    setError(null)
    setResult(null)
    if (!f) return
    if (!isSupportedAudio(f)) {
      setError('mp3 또는 wav 파일만 업로드할 수 있습니다.')
      return
    }
    setFile(f)
  }

  async function transcribe() {
    if (!file) return
    setTranscribing(true)
    try {
      const text = await onProcess(file)
      setResult(text)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
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
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0] ?? null) }}
      >
        <MicIcon className="mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">{file ? file.name : '클릭 또는 드래그하여 음성 파일 업로드'}</p>
        {file && <p className="mt-1 text-xs text-gray-400">{formatFileSize(file.size)} · {new Date().toLocaleString('ko-KR')}</p>}
        <input ref={inputRef} type="file" accept=".mp3,.wav,audio/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={transcribe} disabled={!file || transcribing}>
          {transcribing ? 'STT 변환 중…' : 'STT 변환'}
        </button>
      </div>
      {result && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">변환 결과 (저장됨)</p>
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
