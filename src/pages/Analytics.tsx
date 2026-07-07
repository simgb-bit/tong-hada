// 통 HADA - 분석 (회의를 조직 운영 데이터로)
//
// 상단 기간 선택에 따라 모든 지표가 그 기간(scheduled_at 기준)으로 계산된다.
//  A. 운영 펄스 — 활동 추세 · 보류(정체) · 요약 정리율 · 상태 분포
//  B. 조직별 비교 — 조직별 통 수·보류 수
//  C. 이슈 인사이트 — 반복 이슈 키워드
//  D. 참여/부하 — 회의 참석 상위 인원

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { PageHeader, Card, StatCard, BarChart, Badge } from '@/components/ui'
import { RangeCalendar } from '@/components/RangeCalendar'
import { ArchiveIcon, AlertIcon, SparkIcon, UserIcon } from '@/components/icons'
import { analyticsScopeOrgIds } from '@/lib/auth'
import {
  activeTongsInWindow,
  tongsByStatus,
  summaryCoverage,
  orgBreakdown,
  keywordsFromTongs,
  participantLoad,
} from '@/lib/selectors'
import type { Tong } from '@/types'

type Period = '30' | '90' | 'year' | 'all' | 'custom'
const PERIODS: { key: Period; label: string }[] = [
  { key: '30', label: '최근 30일' },
  { key: '90', label: '최근 90일' },
  { key: 'year', label: '올해' },
  { key: 'all', label: '전체' },
  { key: 'custom', label: '사용자 지정' },
]
const DAY = 86_400_000
const toDateInput = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function Analytics() {
  const data = useData()
  const { canViewAnalytics, ledOrgs } = useCurrentUser()
  const [period, setPeriod] = useState<Period>('90')
  const [selectedOrg, setSelectedOrg] = useState('') // '' = 전체(내 관리 조직 합집합)
  // 사용자 지정 날짜 범위 (기본: 최근 30일) + 팝오버
  const [customFrom, setCustomFrom] = useState(toDateInput(Date.now() - 30 * DAY))
  const [customTo, setCustomTo] = useState(toDateInput(Date.now()))
  const [customOpen, setCustomOpen] = useState(false)
  const fmtShort = (d: string) => d.slice(5).replace('-', '.') // YYYY-MM-DD → MM.DD

  const now = Date.now()
  // 분석 구간 [from, to]
  const { from, to } = useMemo(() => {
    if (period === '30') return { from: now - 30 * DAY, to: now }
    if (period === '90') return { from: now - 90 * DAY, to: now }
    if (period === 'year') return { from: new Date(new Date().getFullYear(), 0, 1).getTime(), to: now }
    if (period === 'custom') {
      const f = new Date(`${customFrom}T00:00:00`).getTime()
      // 종료일은 그날 끝까지 포함
      const t = new Date(`${customTo}T23:59:59`).getTime()
      return { from: Number.isNaN(f) ? 0 : f, to: Number.isNaN(t) ? now : t }
    }
    return { from: 0, to: now } // 전체
  }, [period, now, customFrom, customTo])

  // 스코프: 선택 조직(또는 내 관리 조직 전체)의 하위 트리
  const scopeOrgIds = useMemo(
    () => analyticsScopeOrgIds(data.organizations, ledOrgs.map((o) => o.id), selectedOrg || null),
    [data.organizations, ledOrgs, selectedOrg],
  )
  const inScope = (t: Tong) => scopeOrgIds.has(t.org_id)

  const scoped = useMemo(() => activeTongsInWindow(data, from, to).filter(inScope), [data, from, to, scopeOrgIds])

  // 추세: 직전 동일 기간 대비 (스코프 내, 전체 기간은 비교 없음)
  const trend = useMemo(() => {
    if (period === 'all') return null
    const len = to - from
    const prev = activeTongsInWindow(data, from - len, from).filter(inScope).length
    const cur = scoped.length
    const deltaPct = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100)
    return { cur, prev, deltaPct }
  }, [data, from, to, period, scoped, scopeOrgIds])

  const byStatus = useMemo(() => tongsByStatus(scoped), [scoped])
  const coverage = useMemo(() => summaryCoverage(scoped, data.summaries), [scoped, data.summaries])
  const orgs = useMemo(() => orgBreakdown(scoped), [scoped])
  const keywords = useMemo(() => keywordsFromTongs(scoped, data.summaries).slice(0, 10), [scoped, data.summaries])
  const load = useMemo(() => participantLoad(scoped).slice(0, 8), [scoped])

  const pending = byStatus.find((s) => s.label === '보류')?.value ?? 0
  const periodLabel = period === 'custom' ? '선택 기간' : PERIODS.find((p) => p.key === period)?.label ?? ''

  // 리더(리드 조직 보유자) 전용
  if (!canViewAnalytics) {
    return (
      <div>
        <PageHeader title="분석" subtitle="조직 운영 데이터를 봅니다." />
        <Card className="border-amber-100 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertIcon className="mt-0.5 h-5 w-5 text-amber-500" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-800">접근 권한이 없습니다.</p>
              <p className="mt-1 text-gray-500">분석은 조직을 리드하는 사용자(Cell 리더 이상)만 볼 수 있습니다.</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="분석"
        subtitle={`${ledOrgs.length > 1 ? '관리 조직' : ledOrgs[0]?.name ?? ''} 운영 데이터`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* 관리 조직 선택 (겸직 시 드롭다운) */}
            {ledOrgs.length > 1 ? (
              <select className="input w-auto py-1.5 text-sm" value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} title="관리 조직 선택">
                <option value="">전체 (내 관리 조직)</option>
                {ledOrgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            ) : ledOrgs.length === 1 ? (
              <span className="chip bg-gray-100 text-gray-500">{ledOrgs[0].name}</span>
            ) : null}
            <div className="flex rounded-lg border border-gray-200 p-0.5">
            {PERIODS.filter((p) => p.key !== 'custom').map((p) => (
              <button
                key={p.key}
                onClick={() => { setPeriod(p.key); setCustomOpen(false) }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${period === p.key ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {p.label}
              </button>
            ))}
            {/* 사용자 지정: 팝오버 (문서 흐름에 영향 없음 → 레이아웃 안 밀림) */}
            <div className="relative">
              <button
                onClick={() => { if (period !== 'custom') { setPeriod('custom'); setCustomOpen(true) } else { setCustomOpen((o) => !o) } }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${period === 'custom' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800'}`}
                title="사용자 지정 기간"
              >
                {period === 'custom' ? `${fmtShort(customFrom)} ~ ${fmtShort(customTo)}` : '사용자 지정'}
              </button>
              {customOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCustomOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    <RangeCalendar from={customFrom} to={customTo} onChange={(f, t) => { setCustomFrom(f); setCustomTo(t) }} />
                    <div className="mt-2 flex justify-end border-t border-gray-100 pt-2">
                      <button className="btn-secondary py-1 text-xs" onClick={() => setCustomOpen(false)}>완료</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        }
      />

      {/* A. 운영 펄스 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`${periodLabel} 통`}
          value={scoped.length}
          hint={trend ? `${trend.deltaPct > 0 ? '▲ +' : trend.deltaPct < 0 ? '▼ ' : ''}${trend.deltaPct}% · 직전 동일 기간 대비` : '전체 기간'}
          icon={<ArchiveIcon />}
          tone="brand"
        />
        <StatCard label="보류(정체) 통" value={pending} hint="장기 정체 시 관리 필요" icon={<AlertIcon />} tone="amber" />
        <StatCard label="요약 정리율" value={`${coverage.rate}%`} hint={`미정리 ${coverage.total - coverage.summarized}건`} icon={<SparkIcon />} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* A. 상태 분포 */}
        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">상태 분포</h3>
          <BarChart data={byStatus} colorClass="bg-brand-500" />
        </Card>

        {/* C. 반복 이슈 키워드 */}
        <Card>
          <h3 className="mb-1 font-semibold text-gray-900">반복 이슈 키워드</h3>
          <p className="mb-4 text-xs text-gray-400">자주 반복되면 구조적 이슈 신호입니다.</p>
          {keywords.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">키워드가 없습니다.</p>
          ) : (
            <BarChart data={keywords} colorClass="bg-violet-500" />
          )}
        </Card>

        {/* B. 조직별 현황 */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-gray-900">조직별 현황</h3>
          {orgs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">이 기간에 데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                    <th className="py-2 pr-4 font-medium">조직</th>
                    <th className="py-2 pr-4 font-medium">통 수</th>
                    <th className="py-2 pr-4 font-medium">보류</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <tr key={o.org} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{o.org}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{o.total}</td>
                      <td className="py-2.5 pr-4">
                        {o.pending > 0 ? <Badge className="bg-amber-100 text-amber-700">{o.pending}</Badge> : <span className="text-gray-300">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* D. 회의 참석 상위(부하) */}
        <Card className="lg:col-span-2">
          <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
            <UserIcon className="h-4 w-4 text-gray-400" />회의 참석 상위 (부하)
          </h3>
          <p className="mb-4 text-xs text-gray-400">특정 인원에 회의가 몰리면 병목·과부하 신호입니다.</p>
          {load.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">참석 데이터가 없습니다.</p>
          ) : (
            <BarChart data={load} colorClass="bg-teal-500" />
          )}
        </Card>
      </div>
    </div>
  )
}
