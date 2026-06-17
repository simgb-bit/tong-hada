// 통 HADA - 조직 데이터 (Company → CoreGroup → Core → Cell Drill-down)

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { PageHeader, Card, StatCard, Badge, EmptyState } from '@/components/ui'
import { ArchiveIcon, TaskIcon, AlertIcon, OrgIcon, ChevronRight } from '@/components/icons'
import { getChildren, getOrgPath } from '@/lib/org'
import { scopeToOrg, countByFrequency } from '@/lib/selectors'
import { formatDate, tongStatusColor } from '@/lib/utils'

export function OrgData() {
  const data = useData()
  const company = data.organizations.find((o) => o.level === 'Company')
  const [currentId, setCurrentId] = useState<string>(company?.id ?? '')

  const path = useMemo(() => getOrgPath(data.organizations, currentId), [data.organizations, currentId])
  const children = useMemo(() => getChildren(data.organizations, currentId), [data.organizations, currentId])
  const scoped = useMemo(() => scopeToOrg(data, currentId), [data, currentId])

  const open = scoped.actionItems.filter((a) => a.status !== '완료')
  const keywords = countByFrequency(scoped.summaries.flatMap((s) => s.recurring_keywords)).slice(0, 8)
  const recentTongs = [...scoped.tongs].sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at)).slice(0, 6)

  if (!company) {
    return (
      <div>
        <PageHeader title="조직 데이터" />
        <Card><EmptyState title="조직 데이터가 없습니다." /></Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="조직 데이터" subtitle="조직 계층별로 회의 데이터가 축적됩니다." />

      {/* 브레드크럼 */}
      <div className="mb-5 flex flex-wrap items-center gap-1 text-sm">
        {path.map((o, i) => (
          <span key={o.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
            <button
              onClick={() => setCurrentId(o.id)}
              className={i === path.length - 1 ? 'font-semibold text-brand-700' : 'text-gray-500 hover:text-brand-600'}
            >
              {o.name}
            </button>
          </span>
        ))}
      </div>

      {/* 현재 조직 통계 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="통 개수" value={scoped.tongs.length} icon={<ArchiveIcon />} tone="brand" />
        <StatCard label="후속 과제" value={scoped.actionItems.length} icon={<TaskIcon />} tone="accent" />
        <StatCard label="미완료 과제" value={open.length} icon={<AlertIcon />} tone="amber" />
        <StatCard label="하위 조직" value={children.length} icon={<OrgIcon />} tone="brand" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 하위 조직 Drill-down */}
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold text-gray-900">하위 조직</h3>
          {children.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">말단 조직(Cell)입니다.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {children.map((c) => {
                const cs = scopeToOrg(data, c.id)
                const cOpen = cs.actionItems.filter((a) => a.status !== '완료').length
                return (
                  <button
                    key={c.id}
                    onClick={() => setCurrentId(c.id)}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-4 text-left hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        통 {cs.tongs.length} · 과제 {cs.actionItems.length} · 미완료 {cOpen}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* 반복 이슈 */}
        <Card>
          <h3 className="mb-3 font-semibold text-gray-900">반복 이슈</h3>
          <div className="flex flex-wrap gap-2">
            {keywords.length === 0 ? (
              <span className="text-sm text-gray-400">데이터 없음</span>
            ) : (
              keywords.map((k) => <Badge key={k.label} className="bg-violet-50 text-violet-700">{k.label} ×{k.value}</Badge>)
            )}
          </div>
        </Card>

        {/* 최근 통 목록 */}
        <Card className="lg:col-span-3">
          <h3 className="mb-3 font-semibold text-gray-900">최근 통 목록</h3>
          {recentTongs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">통 기록이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentTongs.map((t) => (
                <li key={t.id}>
                  <Link to={`/tongs/${t.id}`} className="flex items-center justify-between py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.org_name} · {formatDate(t.scheduled_at)}</p>
                    </div>
                    <Badge className={tongStatusColor(t.status)}>{t.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
