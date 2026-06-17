// 통 상세 - 입력 탭 (Teams 녹취 / 텍스트 / 메모 / 음성 파일)

import { useMemo, useRef, useState } from 'react'
import { useData } from '@/store/DataContext'
import { Card, Badge } from '@/components/ui'
import { TeamsIcon, TextIcon, MemoIcon, MicIcon, FileIcon } from '@/components/icons'
import { cn, formatDateTime, formatFileSize } from '@/lib/utils'
import { uid } from '@/lib/db'
import { fetchTeamsTranscript } from '@/lib/teams'
import { transcribeAudioFile, isSupportedAudio } from '@/lib/stt'
import type { Tong, TongInput, TongInputType, Attachment } from '@/types'

const METHODS: { key: TongInputType; label: string; icon: React.ReactNode }[] = [
  { key: 'teams', label: 'Teams 녹취', icon: <TeamsIcon className="h-4 w-4" /> },
  { key: 'text', label: '텍스트 입력', icon: <TextIcon className="h-4 w-4" /> },
  { key: 'memo', label: '메모 입력', icon: <MemoIcon className="h-4 w-4" /> },
  { key: 'audio', label: '음성 파일', icon: <MicIcon className="h-4 w-4" /> },
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
                  <FileIcon className="h-4 w-4 text-gray-400" />
                  <span className="min-w-0 flex-1 truncate text-gray-700">{a.file_name}</span>
                  <span className="text-xs text-gray-400">{formatFileSize(a.file_size)}</span>
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

// ── 음성 파일 업로드 + STT ───────────────────────────────────────────────────
function AudioInput({ tong, onTranscribed, onAttach }: { tong: Tong; onTranscribed: (c: string) => Promise<void>; onAttach: (a: Attachment) => Promise<void> }) {
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
      // 파일 메타데이터 저장
      const att: Attachment = {
        id: uid('att'),
        tong_id: tong.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'audio/mpeg',
        storage_path: '', // TODO: Supabase Storage 업로드 경로
        uploaded_at: new Date().toISOString(),
      }
      await onAttach(att)

      const text = await transcribeAudioFile(file)
      setResult(text)
      await onTranscribed(text)
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
