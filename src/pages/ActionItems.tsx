// 통 HADA - 후속 과제 (전사)

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui'
import { ActionItemCard } from '@/components/ActionItemCard'
import { TaskIcon, AlertIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { ActionItemStatus } from '@/types'

const FILTERS: (ActionItemStatus | '전체')[] = ['전체', '확인 필요', '진행 중', '완료', '보류']

export function ActionItems() {
  const { actionItems } = useData()
  const [filter, setFilter] = useState<ActionItemStatus | '전체'>('전체')

  const counts = useMemo(() => {
    const c: Record<string, number> = { 전체: actionItems.length }
    for (const f of FILTERS) if (f !== '전체') c[f] = actionItems.filter((a) => a.status === f).length
    return c
  }, [actionItems])

  const filtered = useMemo(
    () =>
      [...actionItems]
        .filter((a) => (filter === '전체' ? true : a.status === filter))
        .sort((a, b) => {
          const ad = a.due_date ?? '9999'
          const bd = b.due_date ?? '9999'
          return ad.localeCompare(bd)
        }),
    [actionItems, filter],
  )

  return (
    <div>
      <PageHeader title="후속 과제" subtitle="회의에서 도출된 후속 과제를 추적합니다." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="전체 과제" value={counts['전체']} icon={<TaskIcon />} tone="brand" />
        <StatCard label="확인 필요" value={counts['확인 필요']} icon={<AlertIcon />} tone="red" />
        <StatCard label="진행 중" value={counts['진행 중']} icon={<TaskIcon />} tone="accent" />
        <StatCard label="완료" value={counts['완료']} icon={<TaskIcon />} tone="green" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100',
            )}
          >
            {f} <span className="opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<TaskIcon className="h-10 w-10" />} title="해당 조건의 과제가 없습니다." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <ActionItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
