// 통 HADA - 통 기록함

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui'
import { SearchIcon, ArchiveIcon, PlusIcon } from '@/components/icons'
import { cn, formatDateTime, tongStatusColor, tongTypeColor } from '@/lib/utils'
import { TongCalendar } from '@/components/TongCalendar'
import type { TongStatus, TongType } from '@/types'

type ViewMode = 'list' | 'calendar'

const TYPE_FILTERS: (TongType | '전체')[] = ['전체', '책임자 통', '주간 통', '상시 통', '기타 통']
const STATUS_FILTERS: (TongStatus | '전체')[] = ['전체', '예정', '진행 완료', '보류']

export function TongList() {
  const { tongs, summaries } = useData()
  const [q, setQ] = useState('')
  const [type, setType] = useState<TongType | '전체'>('전체')
  const [status, setStatus] = useState<TongStatus | '전체'>('전체')
  const [view, setView] = useState<ViewMode>('list')

  const summaryByTong = useMemo(() => new Map(summaries.map((s) => [s.tong_id, s])), [summaries])

  const filtered = useMemo(() => {
    return [...tongs]
      .filter((t) => (type === '전체' ? true : t.type === type))
      .filter((t) => (status === '전체' ? true : t.status === status))
      .filter((t) => (q.trim() ? (t.title + t.org_name + t.agenda).toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))
  }, [tongs, type, status, q])

  return (
    <div>
      <PageHeader
        title="통 기록함"
        subtitle={`총 ${tongs.length}개의 통이 기록되어 있습니다.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5">
              <button
                onClick={() => setView('list')}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800')}
              >
                목록
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'calendar' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800')}
              >
                캘린더
              </button>
            </div>
            <Link to="/new" className="btn-primary">
              <PlusIcon className="h-4 w-4" />새 통
            </Link>
          </div>
        }
      />

      {/* 필터 */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input className="input pl-9" placeholder="통명, 조직, 안건 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as TongType | '전체')}>
            {TYPE_FILTERS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as TongStatus | '전체')}>
            {STATUS_FILTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>

      {view === 'calendar' ? (
        <TongCalendar tongs={filtered} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ArchiveIcon className="h-10 w-10" />} title="조건에 맞는 통이 없습니다." description="필터를 변경하거나 새 통을 만들어 보세요." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((t) => {
            const sum = summaryByTong.get(t.id)
            return (
              <Link key={t.id} to={`/tongs/${t.id}`} className="card p-5 transition-shadow hover:shadow-md">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{t.title}</h3>
                  <Badge className={tongStatusColor(t.status)}>{t.status}</Badge>
                </div>
                <p className="text-xs text-gray-400">{t.org_name} · {formatDateTime(t.scheduled_at)}</p>
                {sum && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{sum.one_line}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className={tongTypeColor(t.type)}>{t.type}</Badge>
                  {t.participants.length > 0 && <span className="text-xs text-gray-400">참석 {t.participants.length}명</span>}
                  {sum && sum.recurring_keywords.slice(0, 2).map((k) => (
                    <Badge key={k} className="bg-violet-50 text-violet-600">#{k}</Badge>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
