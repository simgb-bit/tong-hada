// 통 HADA - 분석 (회의 데이터를 조직 운영 데이터로)

import { useMemo } from 'react'
import { useData } from '@/store/DataContext'
import { PageHeader, Card, StatCard, BarChart, Badge } from '@/components/ui'
import { ArchiveIcon, TaskIcon, SparkIcon, ClockIcon } from '@/components/icons'
import { tongsByType, tongsByOrg, recurringKeywords, recentKeyIssues, openActionItems } from '@/lib/selectors'

export function Analytics() {
  const data = useData()
  const { tongs, actionItems, summaries } = data

  const byType = useMemo(() => tongsByType(data), [data])
  const byOrg = useMemo(() => tongsByOrg(data), [data])
  const keywords = useMemo(() => recurringKeywords(data), [data])
  const recentIssues = useMemo(() => recentKeyIssues(data, 30), [data])
  const open = openActionItems(actionItems)

  const totalConclusions = summaries.reduce((sum, s) => sum + s.conclusions.length, 0)
  const totalPending = summaries.reduce((sum, s) => sum + s.pending_items.length, 0)

  return (
    <div>
      <PageHeader title="분석" subtitle="전사 회의 데이터를 조직 운영 관점에서 분석합니다." />

      {/* 핵심 지표 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="전체 통 개수" value={tongs.length} icon={<ArchiveIcon />} tone="brand" />
        <StatCard label="미완료 과제 수" value={open.length} icon={<TaskIcon />} tone="amber" />
        <StatCard label="주요 결론 수" value={totalConclusions} icon={<SparkIcon />} tone="green" />
        <StatCard label="보류 사항 수" value={totalPending} icon={<ClockIcon />} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">유형별 통 개수</h3>
          <BarChart data={byType} colorClass="bg-accent-500" />
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">조직별 통 개수</h3>
          <BarChart data={byOrg} colorClass="bg-brand-500" />
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">반복 이슈 키워드</h3>
          <BarChart data={keywords} colorClass="bg-violet-500" />
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">최근 30일 주요 쟁점</h3>
          {recentIssues.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">최근 쟁점이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {recentIssues.slice(0, 10).map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Badge className="mt-0.5 shrink-0 bg-brand-50 text-brand-600">{i + 1}</Badge>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
