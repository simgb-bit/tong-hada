// 통 상세 - 후속 과제 탭

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { Card, EmptyState } from '@/components/ui'
import { ActionItemCard } from '@/components/ActionItemCard'
import { TaskIcon, PlusIcon } from '@/components/icons'
import { uid } from '@/lib/db'
import type { Tong, ActionItem } from '@/types'

export function ActionItemsTab({ tong }: { tong: Tong }) {
  const { actionItems, upsertActionItem } = useData()
  const items = useMemo(
    () => actionItems.filter((a) => a.tong_id === tong.id).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    [actionItems, tong.id],
  )
  const [adding, setAdding] = useState(false)

  async function addEmpty() {
    setAdding(true)
    const nowIso = new Date().toISOString()
    const item: ActionItem = {
      id: uid('ai'),
      tong_id: tong.id,
      tong_title: tong.title,
      title: '새 후속 과제',
      assignee: null,
      assignee_org_id: tong.org_id,
      assignee_org_name: tong.org_name,
      due_date: null,
      status: '확인 필요',
      evidence: '',
      created_at: nowIso,
      updated_at: nowIso,
    }
    try {
      await upsertActionItem(item)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">이 통에서 도출된 후속 과제 ({items.length})</p>
        <button className="btn-primary" onClick={addEmpty} disabled={adding}>
          <PlusIcon className="h-4 w-4" />과제 추가
        </button>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TaskIcon className="h-10 w-10" />}
            title="후속 과제가 없습니다."
            description="AI 요약 탭에서 후속 과제 초안을 등록하거나 직접 추가할 수 있습니다."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <ActionItemCard key={item.id} item={item} showTong={false} />
          ))}
        </div>
      )}
    </div>
  )
}
