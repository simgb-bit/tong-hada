// 통 상세 - 조직 데이터 탭 (이 통이 속한 조직의 누적 현황)

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { Card, StatCard, Badge } from '@/components/ui'
import { ArchiveIcon, TaskIcon, AlertIcon } from '@/components/icons'
import { getOrgPath } from '@/lib/org'
import { scopeToOrg, countByFrequency } from '@/lib/selectors'
import { formatDate, tongStatusColor } from '@/lib/utils'
import type { Tong } from '@/types'

export function OrgDataTab({ tong }: { tong: Tong }) {
  const data = useData()
  const path = useMemo(() => getOrgPath(data.organizations, tong.org_id), [data.organizations, tong.org_id])
  const scoped = useMemo(() => scopeToOrg(data, tong.org_id), [data, tong.org_id])

  const open = scoped.actionItems.filter((a) => a.status !== '완료')
  const keywords = countByFrequency(scoped.summaries.flatMap((s) => s.recurring_keywords)).slice(0, 8)
  const recentTongs = [...scoped.tongs].sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at)).slice(0, 5)

  return (
    <div className="space-y-6">
      <Card>
        <p className="mb-1 text-sm text-gray-500">조직 경로</p>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {path.map((o, i) => (
            <span key={o.id} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">›</span>}
              <span className={i === path.length - 1 ? 'font-semibold text-brand-700' : 'text-gray-500'}>{o.name}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">{tong.org_name} (하위 조직 포함) 의 누적 데이터입니다.</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="통 개수" value={scoped.tongs.length} icon={<ArchiveIcon />} tone="brand" />
        <StatCard label="후속 과제" value={scoped.actionItems.length} icon={<TaskIcon />} tone="accent" />
        <StatCard label="미완료 과제" value={open.length} icon={<AlertIcon />} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-gray-900">반복 이슈 키워드</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.length === 0 ? (
              <span className="text-sm text-gray-400">데이터 없음</span>
            ) : (
              keywords.map((k) => (
                <Badge key={k.label} className="bg-violet-50 text-violet-700">{k.label} ×{k.value}</Badge>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-gray-900">최근 통</h3>
          <ul className="divide-y divide-gray-100">
            {recentTongs.map((t) => (
              <li key={t.id}>
                <Link to={`/tongs/${t.id}`} className="flex items-center justify-between py-2 text-sm hover:opacity-80">
                  <span className="min-w-0 truncate text-gray-700">{t.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDate(t.scheduled_at)}</span>
                    <Badge className={tongStatusColor(t.status)}>{t.status}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="text-center">
        <Link to="/org-data" className="text-sm font-medium text-brand-600 hover:underline">전체 조직 데이터 보기 →</Link>
      </div>
    </div>
  )
}
