// 통 HADA - 새 통 만들기

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { PageHeader, Card } from '@/components/ui'
import { uid } from '@/lib/db'
import { getCoreOrgId } from '@/lib/auth'
import type { Tong, TongStatus } from '@/types'

const STATUSES: TongStatus[] = ['예정', '진행 완료', '보류']

export function NewTong() {
  const { organizations, employees, tongTypes, upsertTong } = useData()
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()

  // 주관 조직은 현재 사용자의 소속 조직으로 자동 설정 (선택 불필요)
  const orgId = currentUser?.org_id ?? ''
  const org = organizations.find((o) => o.id === orgId)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [scheduledAt, setScheduledAt] = useState('2026-06-18T10:00')
  const [participants, setParticipants] = useState<string[]>([])
  const [agenda, setAgenda] = useState('')
  const [references, setReferences] = useState('')
  const [status, setStatus] = useState<TongStatus>('예정')
  const [saving, setSaving] = useState(false)

  // 소속 Core 의 통 유형만 노출
  const availableTypes = useMemo(() => {
    if (!orgId) return []
    const coreId = getCoreOrgId(organizations, orgId)
    return tongTypes
      .filter((t) => t.core_org_id === coreId)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [orgId, organizations, tongTypes])

  // 유형 목록이 준비되면 기본값 자동 보정
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.some((t) => t.label === type)) {
      setType(availableTypes[0].label)
    } else if (availableTypes.length === 0 && type) {
      setType('')
    }
  }, [availableTypes]) // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = title.trim() && orgId && type

  function toggleParticipant(name: string) {
    setParticipants((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const nowIso = new Date().toISOString()
    const tong: Tong = {
      id: uid('tong'),
      title: title.trim(),
      type,
      scheduled_at: new Date(scheduledAt).toISOString(),
      org_id: orgId,
      org_name: org?.name ?? '',
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
              <select className="input" value={type} onChange={(e) => setType(e.target.value)} disabled={!orgId || availableTypes.length === 0}>
                {!orgId && <option value="">소속 조직이 없습니다</option>}
                {orgId && availableTypes.length === 0 && <option value="">등록된 통 유형이 없습니다</option>}
                {availableTypes.map((t) => (
                  <option key={t.id} value={t.label}>{t.label}</option>
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
              <label className="label">주관 조직</label>
              <input className="input bg-gray-50 text-gray-600" value={org ? org.name : '소속 조직 없음'} readOnly />
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
            {!canSave && <p className="mt-2 text-center text-xs text-gray-400">통명·통 유형은 필수입니다.</p>}
          </Card>
        </div>
      </form>
    </div>
  )
}
