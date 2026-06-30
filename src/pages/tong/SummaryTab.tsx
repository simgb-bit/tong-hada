// 통 상세 - AI 요약 탭
// 항목: ① 한 줄 요약  ② 전체 내용(구조화 정리)  ③ 키워드  ④ Comments(참여자 의견)

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { Card, Badge, EmptyState } from '@/components/ui'
import { SparkIcon, TrashIcon } from '@/components/icons'
import { uid } from '@/lib/db'
import { generateTongSummary } from '@/lib/ai'
import { formatDateTime } from '@/lib/utils'
import type { Tong, TongSummary, TongComment } from '@/types'

export function SummaryTab({ tong, onGoToInput, readOnly = false }: { tong: Tong; onGoToInput: () => void; readOnly?: boolean }) {
  const { inputs, summaries, saveSummary } = useData()
  const existing = useMemo(() => summaries.find((s) => s.tong_id === tong.id), [summaries, tong.id])
  const tongInputs = useMemo(() => inputs.filter((i) => i.tong_id === tong.id && !i.deleted_at), [inputs, tong.id])

  const [draft, setDraft] = useState<TongSummary | null>(existing ?? null)
  const [generating, setGenerating] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const transcript = tongInputs.map((i) => i.content).join('\n\n')
      const result = await generateTongSummary(transcript)
      const nowIso = new Date().toISOString()
      const summary: TongSummary = {
        id: existing?.id ?? uid('sum'),
        tong_id: tong.id,
        ...result,
        created_at: existing?.created_at ?? nowIso,
        updated_at: nowIso,
      }
      setDraft(summary)
      await saveSummary(summary)
      setDirty(false)
    } finally {
      setGenerating(false)
    }
  }

  function persist(next: TongSummary) {
    setDraft(next)
    setDirty(true)
  }

  async function save() {
    if (!draft) return
    await saveSummary({ ...draft, source: 'manual', updated_at: new Date().toISOString() })
    setDirty(false)
  }

  return (
    <div className="space-y-5">
      {!draft ? (
        <Card>
          <EmptyState
            icon={<SparkIcon className="h-10 w-10" />}
            title="아직 AI 요약이 없습니다."
            description={tongInputs.length === 0 ? '먼저 입력 탭에서 회의 기록을 추가하세요.' : '입력된 회의 기록을 바탕으로 AI 요약을 생성합니다. (Mock)'}
            action={
              readOnly ? undefined : tongInputs.length === 0 ? (
                <button className="btn-secondary" onClick={onGoToInput}>입력 탭으로 이동</button>
              ) : (
                <button className="btn-primary" onClick={generate} disabled={generating}>
                  <SparkIcon className="h-4 w-4" />{generating ? '생성 중…' : 'AI 요약 생성'}
                </button>
              )
            }
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className={draft.source === 'mock' ? 'bg-violet-50 text-violet-700' : 'bg-green-50 text-green-700'}>
                {draft.source === 'mock' ? 'AI 생성 (Mock)' : '사용자 수정됨'}
              </Badge>
              <span className="text-xs text-gray-400">입력 기록 {tongInputs.length}건 기반</span>
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={generate} disabled={generating}>
                  <SparkIcon className="h-4 w-4" />{generating ? '재생성 중…' : 'AI 재생성'}
                </button>
                <button className="btn-primary" onClick={save} disabled={!dirty}>저장</button>
              </div>
            )}
          </div>

          {/* 1. 한 줄 요약 */}
          <Card>
            <h3 className="mb-2 font-semibold text-gray-900">한 줄 요약</h3>
            <textarea className="input min-h-[56px]" value={draft.one_line} readOnly={readOnly} onChange={(e) => persist({ ...draft, one_line: e.target.value })} />
          </Card>

          {/* 2. 전체 내용 */}
          <Card>
            <h3 className="mb-2 font-semibold text-gray-900">전체 내용</h3>
            <p className="mb-2 text-xs text-gray-400">입력된 내용을 구조화·정리한 회의록 본문입니다.</p>
            <textarea className="input min-h-[260px] leading-relaxed" value={draft.full_summary} readOnly={readOnly} onChange={(e) => persist({ ...draft, full_summary: e.target.value })} />
          </Card>

          {/* 3. 키워드 */}
          <Card>
            <h3 className="mb-2 font-semibold text-gray-900">키워드</h3>
            <div className="mb-2 flex flex-wrap gap-2">
              {draft.recurring_keywords.length === 0 ? (
                <span className="text-sm text-gray-400">키워드 없음</span>
              ) : (
                draft.recurring_keywords.map((k) => <Badge key={k} className="bg-violet-50 text-violet-700">#{k}</Badge>)
              )}
            </div>
            {!readOnly && (
              <input
                className="input"
                placeholder="키워드를 쉼표(,)로 구분해 입력"
                value={draft.recurring_keywords.join(', ')}
                onChange={(e) =>
                  persist({ ...draft, recurring_keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
            )}
          </Card>
        </>
      )}

      {/* 4. Comments */}
      <Comments tongId={tong.id} canModerate={!readOnly} />
    </div>
  )
}

// ── Comments (참여자 의견) ────────────────────────────────────────────────────
function Comments({ tongId, canModerate }: { tongId: string; canModerate: boolean }) {
  const { comments, addComment, deleteComment } = useData()
  const { currentUser } = useCurrentUser()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  const list = useMemo(
    () => comments.filter((c) => c.tong_id === tongId).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    [comments, tongId],
  )

  async function post() {
    const content = text.trim()
    if (!content) return
    setPosting(true)
    try {
      const comment: TongComment = {
        id: uid('cmt'),
        tong_id: tongId,
        author_id: currentUser?.id ?? null,
        author_name: currentUser?.name ?? null,
        content,
        created_at: new Date().toISOString(),
      }
      await addComment(comment)
      setText('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <Card>
      <h3 className="mb-3 font-semibold text-gray-900">Comments ({list.length})</h3>

      {list.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">아직 의견이 없습니다. 첫 의견을 남겨보세요.</p>
      ) : (
        <ul className="mb-4 space-y-3">
          {list.map((c) => {
            const mine = c.author_id && c.author_id === currentUser?.id
            return (
              <li key={c.id} className="rounded-xl border border-gray-100 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800">{c.author_name ?? '익명'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDateTime(c.created_at)}</span>
                    {(canModerate || mine) && (
                      <button
                        className="btn-ghost px-1.5 py-0.5 text-gray-400 hover:text-red-500"
                        onClick={() => void deleteComment(c.id)}
                        title="댓글 삭제"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{c.content}</p>
              </li>
            )
          })}
        </ul>
      )}

      {/* 작성 */}
      <div className="flex items-end gap-2">
        <textarea
          className="input min-h-[44px] flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void post() } }}
          placeholder={`의견을 남기세요${currentUser ? ` (${currentUser.name})` : ''} · Ctrl/⌘+Enter 등록`}
        />
        <button className="btn-primary shrink-0" onClick={() => void post()} disabled={!text.trim() || posting}>
          {posting ? '등록 중…' : '등록'}
        </button>
      </div>
    </Card>
  )
}
