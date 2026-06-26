// 통 HADA - 통 공유 모달
//
// 통을 특정 사원에게 공유(보기/편집)하고, 현재 공유 대상을 관리합니다.
// 공유받은 사람의 "공유받은 통" 목록에 해당 통이 나타납니다.

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { Modal } from '@/components/ui'
import { TrashIcon, ShareIcon } from '@/components/icons'
import { uid } from '@/lib/db'
import type { SharePermission, Tong } from '@/types'

const PERMISSION_LABEL: Record<SharePermission, string> = {
  view: '보기',
  edit: '편집',
}

export function ShareTongModal({ tong, open, onClose }: { tong: Tong; open: boolean; onClose: () => void }) {
  const { employees, shares, addShare, removeShare } = useData()
  const { currentUser } = useCurrentUser()

  const [selectedEmp, setSelectedEmp] = useState('')
  const [permission, setPermission] = useState<SharePermission>('view')

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  // 이 통의 현재 공유 목록
  const tongShares = useMemo(
    () => shares.filter((s) => s.tong_id === tong.id),
    [shares, tong.id],
  )
  const sharedWithIds = useMemo(() => new Set(tongShares.map((s) => s.shared_with)), [tongShares])

  // 공유 가능한 대상: 진행자(소유자)·현재 사용자·이미 공유된 사람 제외
  const candidates = useMemo(
    () =>
      employees.filter(
        (e) => e.id !== tong.created_by && e.id !== currentUser?.id && !sharedWithIds.has(e.id),
      ),
    [employees, tong.created_by, currentUser?.id, sharedWithIds],
  )

  function reportError(action: string, e: unknown) {
    console.error(`[공유] ${action} 실패:`, e)
    const msg = e instanceof Error ? e.message : String(e)
    window.alert(`${action}에 실패했습니다.\n${msg}\n\nSupabase를 쓰는 경우 supabase/migration_folders.sql 을 먼저 실행했는지 확인하세요.`)
  }

  async function handleAdd() {
    if (!selectedEmp) return
    try {
      await addShare({
        id: uid('share'),
        tong_id: tong.id,
        shared_with: selectedEmp,
        shared_by: currentUser?.id ?? '',
        permission,
        created_at: new Date().toISOString(),
      })
      setSelectedEmp('')
      setPermission('view')
    } catch (e) {
      reportError('공유 추가', e)
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeShare(id)
    } catch (e) {
      reportError('공유 해제', e)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="통 공유"
      footer={<button className="btn-primary" onClick={onClose}>닫기</button>}
    >
      <p className="mb-4 text-sm text-gray-500">
        공유한 사원의 <span className="font-medium text-gray-700">‘공유받은 통’</span> 목록에 이 통이 나타납니다.
      </p>

      {/* 공유 대상 추가 */}
      <div className="mb-5 flex flex-wrap items-end gap-2">
        <div className="min-w-[180px] flex-1">
          <label className="label">대상 사원</label>
          <select className="input" value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
            <option value="">사원 선택…</option>
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>{e.name} · {e.org_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">권한</label>
          <select className="input w-auto" value={permission} onChange={(e) => setPermission(e.target.value as SharePermission)}>
            <option value="view">보기</option>
            <option value="edit">편집</option>
          </select>
        </div>
        <button className="btn-primary" onClick={handleAdd} disabled={!selectedEmp}>
          <ShareIcon className="h-4 w-4" />공유
        </button>
      </div>

      {candidates.length === 0 && tongShares.length === 0 && (
        <p className="text-sm text-gray-400">공유할 수 있는 사원이 없습니다.</p>
      )}

      {/* 현재 공유 목록 */}
      {tongShares.length > 0 && (
        <div>
          <p className="label">공유 중 ({tongShares.length})</p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {tongShares.map((s) => {
              const emp = empById.get(s.shared_with)
              return (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{emp?.name ?? s.shared_with}</p>
                    <p className="truncate text-xs text-gray-400">{emp?.org_name}</p>
                  </div>
                  <span className="chip bg-gray-100 text-gray-600">{PERMISSION_LABEL[s.permission]}</span>
                  <button onClick={() => handleRemove(s.id)} className="p-1 text-gray-400 hover:text-red-600" title="공유 해제">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Modal>
  )
}
