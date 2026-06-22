// 통 HADA - 통 상세 (3개 탭: 기본 정보 / 입력 / AI 요약)

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { PageHeader, Badge } from '@/components/ui'
import { cn, formatDateTime, tongStatusColor, tongTypeColor } from '@/lib/utils'
import { TrashIcon } from '@/components/icons'
import { BasicInfoTab } from '@/pages/tong/BasicInfoTab'
import { InputTab } from '@/pages/tong/InputTab'
import { SummaryTab } from '@/pages/tong/SummaryTab'

const TABS = ['기본 정보', '입력', 'AI 요약'] as const
type Tab = (typeof TABS)[number]

export function TongDetail() {
  const { id } = useParams<{ id: string }>()
  const { tongs, deleteTong } = useData()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('기본 정보')

  const tong = useMemo(() => tongs.find((t) => t.id === id), [tongs, id])

  if (!tong) {
    return (
      <div>
        <PageHeader title="통을 찾을 수 없습니다." />
        <Link to="/tongs" className="btn-secondary">통 기록함으로 이동</Link>
      </div>
    )
  }

  async function handleDelete() {
    if (!tong) return
    if (!confirm(`'${tong.title}' 통을 삭제하시겠습니까? 관련 기록도 함께 삭제됩니다.`)) return
    await deleteTong(tong.id)
    navigate('/tongs')
  }

  return (
    <div>
      <PageHeader
        title={tong.title}
        subtitle={`${tong.org_name} · ${formatDateTime(tong.scheduled_at)}`}
        actions={
          <button className="btn-ghost text-red-500 hover:bg-red-50" onClick={handleDelete}>
            <TrashIcon className="h-4 w-4" />삭제
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge className={tongTypeColor(tong.type)}>{tong.type}</Badge>
        <Badge className={tongStatusColor(tong.status)}>{tong.status}</Badge>
        {tong.participants.map((p) => (
          <Badge key={p} className="bg-gray-100 text-gray-600">{p}</Badge>
        ))}
      </div>

      {/* 탭 헤더 */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '기본 정보' && <BasicInfoTab tong={tong} />}
      {tab === '입력' && <InputTab tong={tong} />}
      {tab === 'AI 요약' && <SummaryTab tong={tong} onGoToInput={() => setTab('입력')} />}
    </div>
  )
}
