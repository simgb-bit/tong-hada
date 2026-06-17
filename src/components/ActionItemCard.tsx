// 통 HADA - 후속 과제 카드 (인라인 편집 가능)
//
// 중요: 담당자는 AI 가 확정하지 않습니다. 미지정 시 '확인 필요' 로 표시합니다.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { Badge } from '@/components/ui'
import { TrashIcon, AlertIcon } from '@/components/icons'
import { actionStatusColor, formatDate, isOverdue } from '@/lib/utils'
import type { ActionItem, ActionItemStatus } from '@/types'

const STATUSES: ActionItemStatus[] = ['확인 필요', '진행 중', '완료', '보류']

export function ActionItemCard({ item, showTong = true }: { item: ActionItem; showTong?: boolean }) {
  const { employees, organizations, upsertActionItem, deleteActionItem } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const org = draft.assignee_org_id ? organizations.find((o) => o.id === draft.assignee_org_id) : null
      await upsertActionItem({
        ...draft,
        assignee: draft.assignee?.trim() ? draft.assignee.trim() : null,
        assignee_org_name: org?.name ?? null,
        updated_at: new Date().toISOString(),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function quickStatus(status: ActionItemStatus) {
    await upsertActionItem({ ...item, status, updated_at: new Date().toISOString() })
  }

  if (editing) {
    return (
      <div className="card space-y-3 p-4">
        <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="과제명" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">담당자</label>
            <select className="input" value={draft.assignee ?? ''} onChange={(e) => setDraft({ ...draft, assignee: e.target.value || null })}>
              <option value="">미지정 (확인 필요)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>{emp.name} ({emp.org_name})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">담당 조직</label>
            <select className="input" value={draft.assignee_org_id ?? ''} onChange={(e) => setDraft({ ...draft, assignee_org_id: e.target.value || null })}>
              <option value="">미지정</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">기한</label>
            <input type="date" className="input" value={draft.due_date ?? ''} onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })} />
          </div>
          <div>
            <label className="label">상태</label>
            <select className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ActionItemStatus })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">근거 내용</label>
          <textarea className="input min-h-[60px]" value={draft.evidence} onChange={(e) => setDraft({ ...draft, evidence: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => { setDraft(item); setEditing(false) }}>취소</button>
          <button className="btn-primary" onClick={save} disabled={saving || !draft.title.trim()}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{item.title}</p>
          {showTong && (
            <Link to={`/tongs/${item.tong_id}`} className="text-xs text-brand-600 hover:underline">
              {item.tong_title}
            </Link>
          )}
        </div>
        <Badge className={actionStatusColor(item.status)}>{item.status}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          담당:&nbsp;
          {item.assignee ? (
            <span className="font-medium text-gray-700">{item.assignee}</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-red-500">
              <AlertIcon className="h-3.5 w-3.5" />확인 필요
            </span>
          )}
        </span>
        <span>조직: {item.assignee_org_name ?? '미지정'}</span>
        <span>
          기한: <span className={isOverdue(item.due_date) && item.status !== '완료' ? 'font-medium text-red-500' : ''}>{formatDate(item.due_date)}</span>
        </span>
      </div>

      {item.evidence && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-500">근거: {item.evidence}</p>}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => quickStatus(s)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${item.status === s ? actionStatusColor(s) : 'text-gray-400 hover:bg-gray-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setDraft(item); setEditing(true) }}>편집</button>
          <button className="btn-ghost px-2 py-1 text-xs text-gray-400 hover:text-red-500" onClick={() => deleteActionItem(item.id)}>
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
