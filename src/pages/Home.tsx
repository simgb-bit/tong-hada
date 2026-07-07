// 통 HADA - 홈 대시보드 (실무자 개인 중심 · 오늘 할 일)
//
// 조직 집계는 분석(리더용)으로 분리하고, 홈은 "내" 통과 챙길 것 중심으로 구성.
//  B. 내 통 일정 (메인) — 오늘/이번 주 수치는 헤더 칩으로 흡수
//  C. 챙길 것 사이드 (공유받은 통 · 정리 필요한 내 통)

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { Card, PageHeader, Badge, EmptyState } from '@/components/ui'
import { CalendarIcon, ShareIcon, SparkIcon } from '@/components/icons'
import { formatDateTime, formatDate, isSameDay, tongTypeBadgeClass } from '@/lib/utils'
import { myTongs, sharedWithMeTongs } from '@/lib/selectors'

export function Home() {
  const data = useData()
  const { tongTypes, summaries } = data
  const { currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? ''

  const now = new Date()
  const startToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const weekStart = useMemo(() => { const d = new Date(startToday); d.setDate(d.getDate() - d.getDay()); return d }, [startToday])
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); return d }, [weekStart])

  const mine = useMemo(() => myTongs(data, currentUser), [data, currentUser])
  const shared = useMemo(() => sharedWithMeTongs(data, currentUser), [data, currentUser])
  const summarized = useMemo(
    () => new Set(summaries.filter((s) => s.one_line?.trim() || s.full_summary?.trim()).map((s) => s.tong_id)),
    [summaries],
  )

  const todayMine = mine.filter((t) => isSameDay(new Date(t.scheduled_at), now))
  const weekMine = mine.filter((t) => { const d = new Date(t.scheduled_at); return d >= weekStart && d < weekEnd })
  // 오늘부터 예정(앞으로) 내 통 — 시간순
  const upcomingMine = mine
    .filter((t) => new Date(t.scheduled_at) >= startToday)
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
    .slice(0, 6)
  // 정리 필요: 내가 진행(생성)했고 이미 진행됐는데 요약이 없는 통
  const needSummary = mine
    .filter((t) => t.created_by === userId && new Date(t.scheduled_at) <= now && !summarized.has(t.id))
    .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))

  return (
    <div>
      <PageHeader
        title={currentUser ? `안녕하세요, ${currentUser.name}님` : '홈'}
        subtitle="오늘 참여할 통과 챙길 것을 확인하세요."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* B. 오늘·예정된 내 통 (메인) — 오늘/이번 주 수치를 헤더 칩으로 흡수 */}
        <Card className="lg:col-span-2">
          <SectionTitle
            icon={<CalendarIcon className="h-5 w-5 text-brand-500" />}
            title="내 통 일정"
            meta={
              <span className="flex items-center gap-1.5 text-xs">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">오늘 {todayMine.length}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500">이번 주 {weekMine.length}</span>
              </span>
            }
            to="/tongs?f=mine"
          />
          {upcomingMine.length === 0 ? (
            <EmptyState title="예정된 내 통이 없습니다." />
          ) : (
            <ul className="space-y-2">
              {upcomingMine.map((t) => (
                <li key={t.id}>
                  <Link to={`/tongs/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">
                        {isSameDay(new Date(t.scheduled_at), now) && <span className="mr-1 font-medium text-brand-600">오늘</span>}
                        {t.org_name} · {formatDateTime(t.scheduled_at)}
                      </p>
                    </div>
                    <Badge className={tongTypeBadgeClass(t.type, tongTypes)}>{t.type}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* C. 챙길 것 사이드 (공유받은 통 · 정리 필요) */}
        <div className="space-y-6">
          {/* C2. 공유받은 통 */}
          <Card>
            <SectionTitle icon={<ShareIcon className="h-5 w-5 text-green-500" />} title="공유받은 통" count={shared.length} to="/tongs?f=shared" />
            {shared.length === 0 ? (
              <EmptyState title="공유받은 통이 없습니다." />
            ) : (
              <ul className="space-y-2">
                {shared.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link to={`/tongs/${t.id}`} className="block rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                      <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.org_name} · {formatDate(t.scheduled_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* C1. 정리 필요한 내 통 */}
          <Card>
            <SectionTitle icon={<SparkIcon className="h-5 w-5 text-amber-500" />} title="정리 필요한 내 통" count={needSummary.length} />
            {needSummary.length === 0 ? (
              <EmptyState title="정리할 통이 없습니다." description="진행한 통은 모두 요약돼 있어요." />
            ) : (
              <ul className="space-y-2">
                {needSummary.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link to={`/tongs/${t.id}`} className="block rounded-xl border border-amber-100 bg-amber-50/40 p-3 hover:bg-amber-50">
                      <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(t.scheduled_at)}</p>
                      <p className="mt-1 text-xs font-medium text-amber-600">AI 요약 작성 →</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, count, meta, to }: { icon: React.ReactNode; title: string; count?: number; meta?: React.ReactNode; to?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {count != null && count > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{count}</span>
        )}
        {meta}
      </div>
      {to && (
        <Link to={to} className="text-xs font-medium text-brand-600 hover:underline">
          전체 보기
        </Link>
      )}
    </div>
  )
}
