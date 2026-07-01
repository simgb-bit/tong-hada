// 통 HADA - 폴더 내비게이션 (좌측 사이드바용)
//
// 통 기록함의 스마트 폴더(전체/내 통/공유받은 통/휴지통)와 개인 폴더 트리를
// 전역 사이드바에 표시한다. 선택 상태는 URL 쿼리(`/tongs?f=<key>`)로 관리하여
// 사이드바와 통 기록함 페이지가 선택을 공유한다.
//   f = 'all' | 'mine' | 'shared' | 'trash' | <folderId>

import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/db'
import {
  ArchiveIcon,
  UserIcon,
  ShareIcon,
  TrashIcon,
  FolderIcon,
  FolderPlusIcon,
  PencilIcon,
  ChevronRight,
  ChevronDown,
} from '@/components/icons'
import {
  involvedTongs,
  myTongs,
  sharedWithMeTongs,
  myFolders,
  childFolders,
  tongsInFolder,
  folderDescendantIds,
} from '@/lib/selectors'
import type { Folder } from '@/types'

export function FolderNav({ onNavigate }: { onNavigate?: () => void }) {
  const data = useData()
  const { trashedTongs, upsertFolder, deleteFolder, addTongToFolder } = data
  const { currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const [sp] = useSearchParams()
  // 통 기록함(/tongs) 화면일 때만 현재 선택을 강조 (다른 페이지에선 강조 안 함)
  const current = location.pathname === '/tongs' ? sp.get('f') || 'all' : ''

  const folders = useMemo(() => myFolders(data, userId), [data, userId])
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? ''

  const allCount = useMemo(() => involvedTongs(data, currentUser).length, [data, currentUser])
  const mineCount = useMemo(() => myTongs(data, currentUser).length, [data, currentUser])
  const sharedCount = useMemo(() => sharedWithMeTongs(data, currentUser).length, [data, currentUser])
  const countInFolder = (id: string) => tongsInFolder(data, id).length

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [dropId, setDropId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: 'create' | 'rename'; id?: string; name: string; parentId?: string | null } | null>(null)

  function select(key: string) {
    navigate(`/tongs?f=${encodeURIComponent(key)}`)
    onNavigate?.()
  }

  function reportError(action: string, e: unknown) {
    console.error(`[폴더] ${action} 실패:`, e)
    window.alert(`${action}에 실패했습니다.\n${e instanceof Error ? e.message : String(e)}`)
  }

  async function submitModal() {
    if (!modal) return
    const name = modal.name.trim()
    if (!name) return
    try {
      if (modal.mode === 'create') {
        const parentId = modal.parentId ?? null
        await upsertFolder({ id: uid('folder'), owner_id: userId, name, parent_id: parentId, sort_order: folders.length + 1, created_at: new Date().toISOString() })
        if (parentId) setCollapsed((prev) => { const n = new Set(prev); n.delete(parentId); return n })
      } else if (modal.id) {
        const existing = folders.find((f) => f.id === modal.id)
        if (existing) await upsertFolder({ ...existing, name })
      }
      setModal(null)
    } catch (e) {
      reportError(modal.mode === 'rename' ? '폴더 이름 변경' : '폴더 생성', e)
    }
  }

  async function handleDelete(f: Folder) {
    const hasChildren = folders.some((x) => x.parent_id === f.id)
    const msg = hasChildren
      ? `'${f.name}' 폴더와 모든 하위 폴더를 삭제할까요? (안의 통은 삭제되지 않고 분류만 해제됩니다)`
      : `'${f.name}' 폴더를 삭제할까요? (안의 통은 삭제되지 않고 분류만 해제됩니다)`
    if (!window.confirm(msg)) return
    try {
      const removed = folderDescendantIds(folders, f.id)
      await deleteFolder(f.id)
      if (removed.has(current)) select('all')
    } catch (e) {
      reportError('폴더 삭제', e)
    }
  }

  async function onDrop(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    setDropId(null)
    const raw = e.dataTransfer.getData('text/plain')
    const ids = raw ? raw.split(',').filter(Boolean) : []
    if (!ids.length) return
    try {
      await Promise.all(ids.map((tid) => addTongToFolder(folderId, tid)))
    } catch (e2) {
      reportError('폴더에 추가', e2)
    }
  }

  function smartItem(key: string, label: string, icon: React.ReactNode, count: number) {
    return (
      <button
        onClick={() => select(key)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          current === key ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50',
        )}
      >
        <span className="shrink-0 text-gray-400">{icon}</span>
        <span className="flex-1 truncate text-left">{label}</span>
        <span className="shrink-0 text-xs text-gray-400">{count}</span>
      </button>
    )
  }

  function renderNodes(parentId: string | null, depth: number): React.ReactNode {
    return childFolders(folders, parentId).map((f) => {
      const hasKids = folders.some((x) => x.parent_id === f.id)
      const isCollapsed = collapsed.has(f.id)
      return (
        <div key={f.id}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDropId(f.id) }}
            onDragLeave={() => setDropId((id) => (id === f.id ? null : id))}
            onDrop={(e) => onDrop(e, f.id)}
            className={cn(
              'group/f flex items-center gap-0.5 rounded-lg pr-1 transition-colors',
              dropId === f.id ? 'ring-2 ring-brand-400 ring-offset-1' : '',
              current === f.id ? 'bg-brand-50' : 'hover:bg-gray-50',
            )}
            style={{ paddingLeft: depth * 12 }}
          >
            {hasKids ? (
              <button
                onClick={() => setCollapsed((prev) => { const n = new Set(prev); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n })}
                className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
                title={isCollapsed ? '펼치기' : '접기'}
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            <button onClick={() => select(f.id)} className={cn('flex min-w-0 flex-1 items-center gap-2 py-1.5 text-sm font-medium', current === f.id ? 'text-brand-700' : 'text-gray-600')}>
              <FolderIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="flex-1 truncate text-left">{f.name}</span>
              <span className="shrink-0 text-xs text-gray-400">{countInFolder(f.id)}</span>
            </button>
            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/f:opacity-100">
              <button onClick={() => setModal({ mode: 'create', name: '', parentId: f.id })} className="p-1 text-gray-400 hover:text-brand-600" title="하위 폴더 추가">
                <FolderPlusIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setModal({ mode: 'rename', id: f.id, name: f.name })} className="p-1 text-gray-400 hover:text-brand-600" title="이름 변경">
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(f)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {hasKids && !isCollapsed && renderNodes(f.id, depth + 1)}
        </div>
      )
    })
  }

  return (
    <div className="mt-1">
      <div className="space-y-0.5">
        {smartItem('all', '전체', <ArchiveIcon className="h-4 w-4" />, allCount)}
        {smartItem('mine', '내 통', <UserIcon className="h-4 w-4" />, mineCount)}
        {smartItem('shared', '공유받은 통', <ShareIcon className="h-4 w-4" />, sharedCount)}
        {smartItem('trash', '휴지통', <TrashIcon className="h-4 w-4" />, trashedTongs.length)}
      </div>

      <div className="mb-1 mt-2 flex items-center justify-between px-3">
        <span className="text-xs font-semibold text-gray-400">내 폴더</span>
        <button onClick={() => setModal({ mode: 'create', name: '', parentId: null })} className="text-gray-400 hover:text-brand-600" title="새 폴더">
          <FolderPlusIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-0.5">
        {folders.length === 0 ? <p className="px-3 py-1 text-xs text-gray-400">폴더가 없습니다.</p> : renderNodes(null, 0)}
      </div>

      {/* 폴더 생성/이름변경 모달 */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'rename' ? '폴더 이름 변경' : modal?.parentId ? `하위 폴더 만들기 · ${folderName(modal.parentId)}` : '새 폴더'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModal(null)}>취소</button>
            <button className="btn-primary" onClick={submitModal} disabled={!modal?.name.trim()}>{modal?.mode === 'rename' ? '변경' : '만들기'}</button>
          </>
        }
      >
        <label className="label">폴더 이름</label>
        <input
          className="input"
          autoFocus
          value={modal?.name ?? ''}
          onChange={(e) => setModal((m) => (m ? { ...m, name: e.target.value } : m))}
          onKeyDown={(e) => e.key === 'Enter' && submitModal()}
          placeholder="예: 1분기 회의"
        />
      </Modal>
    </div>
  )
}
