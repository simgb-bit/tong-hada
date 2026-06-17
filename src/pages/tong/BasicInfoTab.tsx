// 통 상세 - 기본 정보 탭 (조회 + 인라인 편집)

import { useState } from 'react'
import { useData } from '@/store/DataContext'
import { Card } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { Tong, TongStatus, TongType } from '@/types'

const TYPES: TongType[] = ['책임자 통', '주간 통', '상시 통', '기타 통']
const STATUSES: TongStatus[] = ['예정', '진행 완료', '보류']

export function BasicInfoTab({ tong }: { tong: Tong }) {
  const { upsertTong } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tong)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await upsertTong({ ...draft, updated_at: new Date().toISOString() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <Card className="space-y-4">
        <div className="flex justify-end">
          <button className="btn-secondary" onClick={() => { setDraft(tong); setEditing(true) }}>편집</button>
        </div>
        <Row label="통명" value={tong.title} />
        <Row label="통 유형" value={tong.type} />
        <Row label="일시" value={formatDateTime(tong.scheduled_at)} />
        <Row label="주관 조직" value={tong.org_name} />
        <Row label="참석자" value={tong.participants.length ? tong.participants.join(', ') : '-'} />
        <Row label="상태" value={tong.status} />
        <Row label="안건" value={tong.agenda || '-'} multiline />
        <Row label="관련 자료" value={tong.references || '-'} multiline />
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div>
        <label className="label">통명</label>
        <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">통 유형</label>
          <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as TongType })}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">상태</label>
          <select className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TongStatus })}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">안건</label>
        <textarea className="input min-h-[80px]" value={draft.agenda} onChange={(e) => setDraft({ ...draft, agenda: e.target.value })} />
      </div>
      <div>
        <label className="label">관련 자료</label>
        <textarea className="input min-h-[60px]" value={draft.references} onChange={(e) => setDraft({ ...draft, references: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={() => setEditing(false)}>취소</button>
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
      </div>
    </Card>
  )
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 border-b border-gray-50 pb-3 last:border-0">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className={multiline ? 'whitespace-pre-wrap text-sm text-gray-800' : 'text-sm text-gray-800'}>{value}</span>
    </div>
  )
}
