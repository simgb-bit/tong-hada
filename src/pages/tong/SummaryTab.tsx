// 통 상세 - AI 요약 탭 (Mock 생성 + 사용자 수정 + 후속 과제 등록)

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { Card, Badge, EmptyState } from '@/components/ui'
import { SparkIcon, PlusIcon } from '@/components/icons'
import { uid } from '@/lib/db'
import { generateTongSummary } from '@/lib/ai'
import type { Tong, TongSummary, ActionItem } from '@/types'

export function SummaryTab({ tong, onGoToInput }: { tong: Tong; onGoToInput: () => void }) {
  const { inputs, summaries, saveSummary, actionItems, upsertActionItem } = useData()
  const existing = useMemo(() => summaries.find((s) => s.tong_id === tong.id), [summaries, tong.id])
  const tongInputs = useMemo(() => inputs.filter((i) => i.tong_id === tong.id), [inputs, tong.id])
  const tongActionItems = useMemo(() => actionItems.filter((a) => a.tong_id === tong.id), [actionItems, tong.id])

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

  async function persist(next: TongSummary) {
    setDraft(next)
    setDirty(true)
  }

  async function save() {
    if (!draft) return
    await saveSummary({ ...draft, source: 'manual', updated_at: new Date().toISOString() })
    setDirty(false)
  }

  async function addAsActionItem(title: string) {
    const nowIso = new Date().toISOString()
    const item: ActionItem = {
      id: uid('ai'),
      tong_id: tong.id,
      tong_title: tong.title,
      title,
      assignee: null, // AI 는 담당자를 확정하지 않음 → 확인 필요
      assignee_org_id: tong.org_id,
      assignee_org_name: tong.org_name,
      due_date: null,
      status: '확인 필요',
      evidence: 'AI 요약의 후속 과제 초안에서 생성됨.',
      created_at: nowIso,
      updated_at: nowIso,
    }
    await upsertActionItem(item)
  }

  if (!draft) {
    return (
      <Card>
        <EmptyState
          icon={<SparkIcon className="h-10 w-10" />}
          title="아직 AI 요약이 없습니다."
          description={tongInputs.length === 0 ? '먼저 입력 탭에서 회의 기록을 추가하세요.' : '입력된 회의 기록을 바탕으로 AI 요약을 생성합니다. (Mock)'}
          action={
            tongInputs.length === 0 ? (
              <button className="btn-secondary" onClick={onGoToInput}>입력 탭으로 이동</button>
            ) : (
              <button className="btn-primary" onClick={generate} disabled={generating}>
                <SparkIcon className="h-4 w-4" />{generating ? '생성 중…' : 'AI 요약 생성'}
              </button>
            )
          }
        />
      </Card>
    )
  }

  const existingTitles = new Set(tongActionItems.map((a) => a.title))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={draft.source === 'mock' ? 'bg-violet-50 text-violet-700' : 'bg-green-50 text-green-700'}>
            {draft.source === 'mock' ? 'AI 생성 (Mock)' : '사용자 수정됨'}
          </Badge>
          <span className="text-xs text-gray-400">입력 기록 {tongInputs.length}건 기반</span>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={generate} disabled={generating}>
            <SparkIcon className="h-4 w-4" />{generating ? '재생성 중…' : 'AI 재생성'}
          </button>
          <button className="btn-primary" onClick={save} disabled={!dirty}>저장</button>
        </div>
      </div>

      <Card>
        <SummaryField label="1. 한 줄 요약">
          <textarea className="input min-h-[60px]" value={draft.one_line} onChange={(e) => persist({ ...draft, one_line: e.target.value })} />
        </SummaryField>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ListField label="2. 주요 쟁점" items={draft.key_issues} onChange={(v) => persist({ ...draft, key_issues: v })} />
        <ListField label="3. 결론" items={draft.conclusions} onChange={(v) => persist({ ...draft, conclusions: v })} />
        <ListField label="4. 보류 사항" items={draft.pending_items} onChange={(v) => persist({ ...draft, pending_items: v })} />
        <ListField label="5. 확인 필요 사항" items={draft.to_confirm} onChange={(v) => persist({ ...draft, to_confirm: v })} />
      </div>

      <Card>
        <SummaryField label="6. 후속 과제 (초안)">
          <p className="mb-3 text-xs text-gray-400">담당자는 AI 가 확정하지 않습니다. 과제로 등록하면 '확인 필요' 상태로 추가됩니다.</p>
          <ul className="space-y-2">
            {draft.action_item_drafts.map((d, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  value={d}
                  onChange={(e) => {
                    const next = [...draft.action_item_drafts]
                    next[idx] = e.target.value
                    persist({ ...draft, action_item_drafts: next })
                  }}
                />
                <button
                  className="btn-secondary shrink-0"
                  disabled={existingTitles.has(d)}
                  onClick={() => addAsActionItem(d)}
                  title={existingTitles.has(d) ? '이미 과제로 등록됨' : '후속 과제로 추가'}
                >
                  <PlusIcon className="h-4 w-4" />{existingTitles.has(d) ? '등록됨' : '과제 추가'}
                </button>
              </li>
            ))}
          </ul>
        </SummaryField>
      </Card>

      <Card>
        <SummaryField label="7. 반복 이슈 키워드">
          <div className="flex flex-wrap gap-2">
            {draft.recurring_keywords.map((k) => (
              <Badge key={k} className="bg-violet-50 text-violet-700">#{k}</Badge>
            ))}
            {draft.recurring_keywords.length === 0 && <span className="text-sm text-gray-400">키워드 없음</span>}
          </div>
        </SummaryField>
      </Card>
    </div>
  )
}

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-gray-900">{label}</h3>
      {children}
    </div>
  )
}

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  function update(idx: number, value: string) {
    const next = [...items]
    next[idx] = value
    onChange(next)
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }
  function add() {
    onChange([...items, ''])
  }
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <button className="text-xs font-medium text-brand-600 hover:underline" onClick={add}>+ 추가</button>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-gray-400">항목 없음</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <input className="input flex-1" value={it} onChange={(e) => update(idx, e.target.value)} />
              <button className="btn-ghost shrink-0 px-2 text-gray-400 hover:text-red-500" onClick={() => remove(idx)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
