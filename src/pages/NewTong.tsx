// 통 HADA - 새 통 만들기

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { PageHeader, Card } from '@/components/ui'
import { uid } from '@/lib/db'
import type { Tong, TongStatus, TongType } from '@/types'

const TYPES: TongType[] = ['책임자 통', '주간 통', '상시 통', '기타 통']
const STATUSES: TongStatus[] = ['예정', '진행 완료', '보류']

export function NewTong() {
  const { organizations, employees, upsertTong } = useData()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<TongType>('주간 통')
  const [scheduledAt, setScheduledAt] = useState('2026-06-18T10:00')
  const [orgId, setOrgId] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [agenda, setAgenda] = useState('')
  const [references, setReferences] = useState('')
  const [status, setStatus] = useState<TongStatus>('예정')
  const [saving, setSaving] = useState(false)

  const canSave = title.trim() && orgId

  function toggleParticipant(name: string) {
    setParticipants((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const org = organizations.find((o) => o.id === orgId)!
    const nowIso = new Date().toISOString()
    const tong: Tong = {
      id: uid('tong'),
      title: title.trim(),
      type,
      scheduled_at: new Date(scheduledAt).toISOString(),
      org_id: orgId,
      org_name: org.name,
      participants,
      agenda: agenda.trim(),
      references: references.trim(),
      status,
      created_at: nowIso,
      updated_at: nowIso,
    }
    try {
      await upsertTong(tong)
      navigate(`/tongs/${tong.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="새 통 만들기" subtitle="회의(통)를 표준 포맷으로 생성합니다." />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <div>
            <label className="label">통명 *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 제품 로드맵 작성 통" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">통 유형</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value as TongType)}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">상태</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TongStatus)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">일시</label>
              <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <label className="label">주관 조직 *</label>
              <select className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                <option value="">선택하세요</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {' '.repeat(depthIndent(o.level))}
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">안건</label>
            <textarea className="input min-h-[80px]" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="논의할 안건을 입력하세요." />
          </div>

          <div>
            <label className="label">관련 자료</label>
            <textarea className="input min-h-[60px]" value={references} onChange={(e) => setReferences(e.target.value)} placeholder="참고 문서, 링크 등" />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <label className="label">참석자</label>
            <p className="mb-3 text-xs text-gray-400">연동된 사원 목록에서 선택합니다.</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {employees.map((emp) => (
                <label key={emp.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                  <input type="checkbox" checked={participants.includes(emp.name)} onChange={() => toggleParticipant(emp.name)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">{emp.name}</span>
                  <span className="text-xs text-gray-400">{emp.position} · {emp.org_name}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <button type="submit" className="btn-primary w-full" disabled={!canSave || saving}>
              {saving ? '저장 중…' : '통 생성'}
            </button>
            {!canSave && <p className="mt-2 text-center text-xs text-gray-400">통명과 주관 조직은 필수입니다.</p>}
          </Card>
        </div>
      </form>
    </div>
  )
}

function depthIndent(level: string): number {
  switch (level) {
    case 'CoreGroup':
      return 2
    case 'Core':
      return 4
    case 'Cell':
      return 6
    default:
      return 0
  }
}
