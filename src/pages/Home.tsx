// 통 HADA - 홈 대시보드

import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { Card, PageHeader, StatCard, Badge, EmptyState, BarChart } from '@/components/ui'
import { CalendarIcon, ArchiveIcon, TaskIcon, SparkIcon, ClockIcon, AlertIcon } from '@/components/icons'
import { formatDateTime, formatDate, isSameDay, tongStatusColor, tongTypeColor, actionStatusColor, isOverdue } from '@/lib/utils'
import { recurringKeywords, openActionItems, tongsByOrg } from '@/lib/selectors'

export function Home() {
  const data = useData()
  const { tongs, actionItems } = data

  const today = new Date()
  const todayTongs = tongs.filter((t) => isSameDay(new Date(t.scheduled_at), today))
  const recentTongs = [...tongs].sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at)).slice(0, 5)
  const open = openActionItems(actionItems)
  const keywords = recurringKeywords(data).slice(0, 6)
  const byOrg = tongsByOrg(data)
  const orgOpenItems = countOpenByOrg(open)

  return (
    <div>
      <PageHeader title="홈" subtitle="오늘의 통과 조직 현황을 한눈에 확인하세요." />

      {/* 상단 통계 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="오늘 예정된 통" value={todayTongs.length} icon={<CalendarIcon />} tone="brand" />
        <StatCard label="전체 통 기록" value={tongs.length} icon={<ArchiveIcon />} tone="accent" />
        <StatCard label="미완료 후속 과제" value={open.length} icon={<TaskIcon />} tone="amber" />
        <StatCard label="확인 필요 과제" value={actionItems.filter((a) => a.status === '확인 필요').length} icon={<AlertIcon />} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 오늘 예정된 통 */}
        <Card className="lg:col-span-2">
          <SectionTitle icon={<CalendarIcon className="h-5 w-5 text-brand-500" />} title="오늘 예정된 통" to="/calendar" />
          {todayTongs.length === 0 ? (
            <EmptyState title="오늘 예정된 통이 없습니다." />
          ) : (
            <ul className="space-y-2">
              {todayTongs.map((t) => (
                <li key={t.id}>
                  <Link to={`/tongs/${t.id}`} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.org_name} · {formatDateTime(t.scheduled_at)}</p>
                    </div>
                    <Badge className={tongTypeColor(t.type)}>{t.type}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 반복 이슈 키워드 */}
        <Card>
          <SectionTitle icon={<SparkIcon className="h-5 w-5 text-accent-500" />} title="반복 이슈 키워드" />
          {keywords.length === 0 ? (
            <EmptyState title="아직 키워드가 없습니다." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <Badge key={k.label} className="bg-violet-50 text-violet-700">
                  {k.label} <span className="ml-1 text-violet-400">×{k.value}</span>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* 최근 통 기록 */}
        <Card className="lg:col-span-2">
          <SectionTitle icon={<ArchiveIcon className="h-5 w-5 text-brand-500" />} title="최근 통 기록" to="/tongs" />
          {recentTongs.length === 0 ? (
            <EmptyState title="기록된 통이 없습니다." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentTongs.map((t) => (
                <li key={t.id}>
                  <Link to={`/tongs/${t.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
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

        {/* 미완료 후속 과제 */}
        <Card>
          <SectionTitle icon={<TaskIcon className="h-5 w-5 text-amber-500" />} title="미완료 후속 과제" to="/action-items" />
          {open.length === 0 ? (
            <EmptyState title="미완료 과제가 없습니다." />
          ) : (
            <ul className="space-y-2">
              {open.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">{a.title}</p>
                    <Badge className={actionStatusColor(a.status)}>{a.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    담당: {a.assignee ?? '확인 필요'} · 기한 <span className={isOverdue(a.due_date) ? 'text-red-500' : ''}>{formatDate(a.due_date)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 조직별 통 현황 */}
        <Card>
          <SectionTitle icon={<ClockIcon className="h-5 w-5 text-brand-500" />} title="조직별 통 현황" to="/org-data" />
          <BarChart data={byOrg} />
        </Card>

        {/* 조직별 후속 과제 현황 */}
        <Card>
          <SectionTitle icon={<TaskIcon className="h-5 w-5 text-amber-500" />} title="조직별 후속 과제 현황" to="/org-data" />
          <BarChart data={orgOpenItems} colorClass="bg-amber-500" />
        </Card>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, to }: { icon: React.ReactNode; title: string; to?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs font-medium text-brand-600 hover:underline">
          전체 보기
        </Link>
      )}
    </div>
  )
}

function countOpenByOrg(open: ReturnType<typeof openActionItems>) {
  const map = new Map<string, number>()
  for (const a of open) {
    const key = a.assignee_org_name ?? '미지정'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}
