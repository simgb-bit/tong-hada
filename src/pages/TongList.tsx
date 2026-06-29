// 통 HADA - 통 기록함 (스마트 폴더 + 개인 폴더, 다중 분류)

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { PageHeader, Card, Badge, EmptyState, Modal } from '@/components/ui'
import {
  SearchIcon,
  ArchiveIcon,
  FolderIcon,
  FolderPlusIcon,
  UserIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  MoreIcon,
} from '@/components/icons'
import { cn, formatDateTime, formatDate, tongStatusColor, tongTypeBadgeClass } from '@/lib/utils'
import { TongCalendar } from '@/components/TongCalendar'
import { TrashPreviewModal } from '@/pages/tong/TrashPreviewModal'
import { uid } from '@/lib/db'
import { trashPurgeAt } from '@/lib/storage'
import {
  myTongs,
  sharedWithMeTongs,
  myFolders,
  tongsInFolder,
  folderIdsOfTong,
} from '@/lib/selectors'
import type { Folder, Tong, TongStatus } from '@/types'

type ViewMode = 'list' | 'calendar'
/** 좌측 패널 선택: 스마트 폴더 키 또는 개인 폴더 id */
type Section = 'all' | 'mine' | 'shared' | string

const TODAY = new Date(2026, 5, 17)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
function isNew(createdAt: string) {
  return TODAY.getTime() - new Date(createdAt).getTime() < SEVEN_DAYS_MS
}

const STATUS_FILTERS: (TongStatus | '전체')[] = ['전체', '예정', '진행 완료', '보류']

/** 목록 한 페이지당 통 개수 */
const PAGE_SIZE = 10

export function TongList() {
  const data = useData()
  const { tongs, trashedTongs, summaries, tongTypes, upsertFolder, deleteFolder, addTongToFolder, removeTongFromFolder, trashTong, restoreTong, deleteTong, emptyTrash } = data
  const { currentUser } = useCurrentUser()
  const userId = currentUser?.id ?? ''

  const [q, setQ] = useState('')
  const [type, setType] = useState<string>('전체')
  const [status, setStatus] = useState<TongStatus | '전체'>('전체')
  const [view, setView] = useState<ViewMode>('list')
  const [section, setSection] = useState<Section>('all')
  const [page, setPage] = useState(1)

  // 폴더 생성/이름변경 모달
  const [folderModal, setFolderModal] = useState<{ mode: 'create' | 'rename'; id?: string; name: string } | null>(null)
  // 카드별 "폴더 분류" 메뉴
  const [menuTongId, setMenuTongId] = useState<string | null>(null)
  // 다중 선택
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false)
  // 드래그앤드롭
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropFolderId, setDropFolderId] = useState<string | null>(null)
  // 휴지통 읽기전용 미리보기
  const [previewTong, setPreviewTong] = useState<Tong | null>(null)

  const folders = useMemo(() => myFolders(data, userId), [data, userId])
  const ownerFolderIds = useMemo(() => folders.map((f) => f.id), [folders])
  const ownerFolderIdSet = useMemo(() => new Set(ownerFolderIds), [ownerFolderIds])
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? ''

  const mineCount = useMemo(() => myTongs(data, currentUser).length, [data, currentUser])
  const sharedCount = useMemo(() => sharedWithMeTongs(data, currentUser).length, [data, currentUser])
  const countInFolder = (id: string) => tongsInFolder(data, id).length

  // 선택된 섹션의 기준 통 목록
  const sectionTongs = useMemo(() => {
    if (section === 'all') return tongs
    if (section === 'mine') return myTongs(data, currentUser)
    if (section === 'shared') return sharedWithMeTongs(data, currentUser)
    if (section === 'trash') return trashedTongs
    return tongsInFolder(data, section) // 폴더 id
  }, [section, tongs, trashedTongs, data, currentUser])

  const isTrash = section === 'trash'

  // 유형 필터: 커스텀 유형 정의(tongTypes)를 기준으로 채우고,
  // 정의에 없지만 통에 쓰인 유형도 빠지지 않게 합쳐서 표시한다.
  const typeFilters = useMemo(() => {
    const defined = [...tongTypes].sort((a, b) => a.sort_order - b.sort_order).map((t) => t.label)
    const used = tongs.map((t) => t.type)
    return ['전체', ...Array.from(new Set([...defined, ...used]))]
  }, [tongTypes, tongs])
  const summaryByTong = useMemo(() => new Map(summaries.map((s) => [s.tong_id, s])), [summaries])

  const filtered = useMemo(() => {
    return [...sectionTongs]
      .filter((t) => (type === '전체' ? true : t.type === type))
      .filter((t) => (status === '전체' ? true : t.status === status))
      .filter((t) => (q.trim() ? (t.title + t.org_name + t.agenda).toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))
  }, [sectionTongs, type, status, q])

  // ── 페이지네이션 (목록 뷰) ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // 필터/섹션 변경 시 페이지 리셋 + 선택 해제
  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [section, type, status, q])
  const safePage = Math.min(page, totalPages)
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )
  const pageItems = useMemo<(number | 'gap')[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const set = new Set([1, totalPages, safePage, safePage - 1, safePage + 1])
    const pages = Array.from(set).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
    const out: (number | 'gap')[] = []
    let prev = 0
    for (const p of pages) {
      if (p - prev > 1) out.push('gap')
      out.push(p)
      prev = p
    }
    return out
  }, [totalPages, safePage])

  // 저장 실패를 조용히 넘기지 않고 사용자에게 알림
  function reportError(action: string, e: unknown) {
    console.error(`[폴더] ${action} 실패:`, e)
    const msg = e instanceof Error ? e.message : String(e)
    window.alert(`${action}에 실패했습니다.\n${msg}\n\nSupabase를 쓰는 경우 supabase/migration_folders.sql 을 먼저 실행했는지 확인하세요.`)
  }

  // ── 폴더 CRUD ────────────────────────────────────────────────────────────────
  async function submitFolderModal() {
    if (!folderModal) return
    const name = folderModal.name.trim()
    if (!name) return
    try {
      if (folderModal.mode === 'create') {
        const folder: Folder = {
          id: uid('folder'),
          owner_id: userId,
          name,
          parent_id: null,
          sort_order: folders.length + 1,
          created_at: new Date().toISOString(),
        }
        await upsertFolder(folder)
      } else if (folderModal.id) {
        const existing = folders.find((f) => f.id === folderModal.id)
        if (existing) await upsertFolder({ ...existing, name })
      }
      setFolderModal(null)
    } catch (e) {
      reportError(folderModal.mode === 'rename' ? '폴더 이름 변경' : '폴더 생성', e)
    }
  }

  async function handleDeleteFolder(f: Folder) {
    if (!window.confirm(`'${f.name}' 폴더를 삭제할까요? (안의 통은 삭제되지 않고 분류만 해제됩니다)`)) return
    try {
      await deleteFolder(f.id)
      if (section === f.id) setSection('all')
    } catch (e) {
      reportError('폴더 삭제', e)
    }
  }

  // ── 분류 (다중) ──────────────────────────────────────────────────────────────
  async function toggleTongInFolder(tongId: string, folderId: string, isIn: boolean) {
    try {
      if (isIn) await removeTongFromFolder(folderId, tongId)
      else await addTongToFolder(folderId, tongId)
    } catch (e) {
      reportError('폴더 분류', e)
    }
  }

  async function addTongsToFolder(folderId: string, tongIds: string[]) {
    try {
      await Promise.all(tongIds.map((tid) => addTongToFolder(folderId, tid)))
    } catch (e) {
      reportError('폴더에 추가', e)
    }
  }

  // ── 휴지통 ────────────────────────────────────────────────────────────────────
  async function handleRestore(id: string) {
    try {
      await restoreTong(id)
    } catch (e) {
      reportError('복구', e)
    }
  }

  async function handlePermanentDelete(title: string, id: string) {
    if (!window.confirm(`'${title}' 통을 영구 삭제할까요? 입력·요약·첨부 등 관련 기록이 모두 사라지며 복구할 수 없습니다.`)) return
    try {
      await deleteTong(id)
    } catch (e) {
      reportError('영구 삭제', e)
    }
  }

  async function handleEmptyTrash() {
    if (trashedTongs.length === 0) return
    if (!window.confirm(`휴지통의 통 ${trashedTongs.length}개를 모두 영구 삭제할까요? 복구할 수 없습니다.`)) return
    try {
      await emptyTrash()
    } catch (e) {
      reportError('휴지통 비우기', e)
    }
  }

  async function bulkTrash() {
    const ids = [...selectedIds]
    exitSelectMode()
    try {
      await Promise.all(ids.map((id) => trashTong(id)))
    } catch (e) {
      reportError('휴지통으로 이동', e)
    }
  }

  // ── 다중 선택 ────────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBulkMenuOpen(false)
  }
  async function bulkAddToFolder(folderId: string) {
    setBulkMenuOpen(false)
    await addTongsToFolder(folderId, [...selectedIds])
    exitSelectMode()
  }

  // ── 드래그앤드롭 ─────────────────────────────────────────────────────────────
  function onRowDragStart(e: React.DragEvent, tongId: string) {
    // 드래그 대상이 선택 목록에 포함되면 선택 전체, 아니면 단일
    const ids = selectedIds.has(tongId) ? [...selectedIds] : [tongId]
    setDragId(tongId)
    e.dataTransfer.setData('text/plain', ids.join(','))
    e.dataTransfer.effectAllowed = 'copy'
  }
  function onFolderDrop(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('text/plain')
    const ids = raw ? raw.split(',').filter(Boolean) : dragId ? [dragId] : []
    setDropFolderId(null)
    setDragId(null)
    if (ids.length) void addTongsToFolder(folderId, ids)
  }

  // 좌측 패널 스마트 항목 버튼
  function NavItem({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50',
        )}
      >
        <span className="shrink-0 text-gray-400">{icon}</span>
        <span className="flex-1 truncate text-left">{label}</span>
        {count !== undefined && <span className="shrink-0 text-xs text-gray-400">{count}</span>}
      </button>
    )
  }

  return (
    <div>
      <PageHeader
        title="통 기록함"
        subtitle={`총 ${tongs.length}개의 통이 기록되어 있습니다.`}
        actions={
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setView('list')}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'list' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800')}
            >
              목록
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === 'calendar' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800')}
            >
              캘린더
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 좌측 폴더 패널 */}
        <aside className="lg:w-56 lg:shrink-0">
          <Card className="lg:sticky lg:top-4">
            <nav className="space-y-1">
              <NavItem active={section === 'all'} onClick={() => setSection('all')} icon={<ArchiveIcon className="h-4 w-4" />} label="전체" count={tongs.length} />
              <NavItem active={section === 'mine'} onClick={() => setSection('mine')} icon={<UserIcon className="h-4 w-4" />} label="내 통" count={mineCount} />
              <NavItem active={section === 'shared'} onClick={() => setSection('shared')} icon={<ShareIcon className="h-4 w-4" />} label="공유받은 통" count={sharedCount} />
              <NavItem active={section === 'trash'} onClick={() => setSection('trash')} icon={<TrashIcon className="h-4 w-4" />} label="휴지통" count={trashedTongs.length} />
            </nav>

            <div className="my-3 border-t border-gray-100" />

            <div className="mb-1 flex items-center justify-between px-3">
              <span className="text-xs font-semibold text-gray-400">내 폴더</span>
              <button onClick={() => setFolderModal({ mode: 'create', name: '' })} className="text-gray-400 hover:text-brand-600" title="새 폴더">
                <FolderPlusIcon className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-1">
              {folders.length === 0 && <p className="px-3 py-1 text-xs text-gray-400">폴더가 없습니다.</p>}
              {folders.map((f) => (
                <div
                  key={f.id}
                  onDragOver={(e) => { e.preventDefault(); setDropFolderId(f.id) }}
                  onDragLeave={() => setDropFolderId((id) => (id === f.id ? null : id))}
                  onDrop={(e) => onFolderDrop(e, f.id)}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg pr-1 transition-colors',
                    dropFolderId === f.id ? 'ring-2 ring-brand-400 ring-offset-1' : '',
                    section === f.id ? 'bg-brand-50' : 'hover:bg-gray-50',
                  )}
                >
                  <button onClick={() => setSection(f.id)} className={cn('flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm font-medium', section === f.id ? 'text-brand-700' : 'text-gray-600')}>
                    <FolderIcon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-left">{f.name}</span>
                    <span className="shrink-0 text-xs text-gray-400">{countInFolder(f.id)}</span>
                  </button>
                  <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setFolderModal({ mode: 'rename', id: f.id, name: f.name })} className="p-1 text-gray-400 hover:text-brand-600" title="이름 변경">
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteFolder(f)} className="p-1 text-gray-400 hover:text-red-600" title="삭제">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </nav>
            {dragId && folders.length > 0 && <p className="mt-2 px-3 text-xs text-brand-500">여기 폴더로 끌어다 놓으세요</p>}
          </Card>
        </aside>

        {/* 우측 본문 */}
        <div className="min-w-0 flex-1">
          {/* 필터 */}
          <Card className="mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input className="input pl-9" placeholder="통명, 조직, 안건 검색" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)}>
                {typeFilters.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as TongStatus | '전체')}>
                {STATUS_FILTERS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* 목록 툴바: 선택 모드 / 일괄 동작 */}
          {view === 'list' && filtered.length > 0 && (
            <div className="mb-3 flex min-h-[2rem] items-center justify-between">
              {selectMode && selectedIds.size > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{selectedIds.size}개 선택</span>
                  <div className="relative">
                    <button onClick={() => setBulkMenuOpen((o) => !o)} className="btn-secondary" disabled={folders.length === 0}>
                      <FolderIcon className="h-4 w-4" />폴더에 추가
                    </button>
                    {bulkMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setBulkMenuOpen(false)} />
                        <div className="absolute left-0 top-10 z-20 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                          {folders.map((f) => (
                            <button key={f.id} onClick={() => void bulkAddToFolder(f.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                              <FolderIcon className="h-4 w-4 text-gray-400" />
                              <span className="flex-1 truncate">{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button onClick={() => void bulkTrash()} className="btn-ghost text-red-500 hover:bg-red-50">
                    <TrashIcon className="h-4 w-4" />휴지통으로 이동
                  </button>
                </div>
              ) : isTrash ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{filtered.length}개</span>
                  {trashedTongs.length > 0 && (
                    <button onClick={() => void handleEmptyTrash()} className="btn-ghost text-red-500 hover:bg-red-50">
                      <TrashIcon className="h-4 w-4" />휴지통 비우기
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400">{filtered.length}개</span>
              )}
              {!isTrash && (
                <button onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))} className="text-sm font-medium text-gray-500 hover:text-gray-800">
                  {selectMode ? '선택 취소' : '선택'}
                </button>
              )}
            </div>
          )}

          {view === 'calendar' ? (
            <TongCalendar tongs={filtered} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={isTrash ? <TrashIcon className="h-10 w-10" /> : <ArchiveIcon className="h-10 w-10" />}
              title={isTrash ? '휴지통이 비어 있습니다.' : '조건에 맞는 통이 없습니다.'}
              description={isTrash ? '삭제한 통이 여기에 보관됩니다.' : '필터를 변경하거나 새 통을 만들어 보세요.'}
            />
          ) : (
            <>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {paged.map((t) => {
                  const sum = summaryByTong.get(t.id)

                  // 휴지통 행: 복구 / 영구 삭제 (상세 이동·폴더·선택·드래그 없음)
                  if (isTrash) {
                    return (
                      <div key={t.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                        <button onClick={() => setPreviewTong(t)} className="min-w-0 flex-1 text-left" title="내용 보기 (읽기 전용)">
                          <h3 className="truncate font-semibold text-gray-700 hover:text-brand-700">{t.title}</h3>
                          {sum && <p className="mt-0.5 truncate text-sm text-gray-400">{sum.one_line}</p>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                            <span>{t.org_name}</span>
                            {t.deleted_at && (<><span aria-hidden>·</span><span>삭제됨 {formatDateTime(t.deleted_at)}</span></>)}
                            {t.deleted_at && (<><span aria-hidden>·</span><span>{formatDate(trashPurgeAt(t.deleted_at))} 자동 삭제</span></>)}
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <button onClick={() => void handleRestore(t.id)} className="btn-secondary">복구</button>
                          <button onClick={() => void handlePermanentDelete(t.title, t.id)} className="btn-ghost text-red-500 hover:bg-red-50">
                            <TrashIcon className="h-4 w-4" />영구 삭제
                          </button>
                        </div>
                      </div>
                    )
                  }

                  const tongFolderIds = folderIdsOfTong(data, t.id, ownerFolderIdSet)
                  const checked = selectedIds.has(t.id)

                  const content = (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate font-semibold text-gray-900">{t.title}</h3>
                          {isNew(t.created_at) && (
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                              N
                            </span>
                          )}
                        </div>
                        {sum && <p className="mt-0.5 truncate text-sm text-gray-500">{sum.one_line}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                          <span>{t.org_name}</span>
                          <span aria-hidden>·</span>
                          <span>{formatDateTime(t.scheduled_at)}</span>
                          {t.participants.length > 0 && (
                            <>
                              <span aria-hidden>·</span>
                              <span>참석 {t.participants.length}명</span>
                            </>
                          )}
                          {tongFolderIds.map((fid) => (
                            <span key={fid} className="inline-flex items-center gap-1 text-brand-600">
                              <FolderIcon className="h-3.5 w-3.5" />
                              {folderName(fid)}
                            </span>
                          ))}
                          {sum && sum.recurring_keywords.slice(0, 2).map((k) => (
                            <span key={k} className="text-violet-500">#{k}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge className={tongStatusColor(t.status)}>{t.status}</Badge>
                        <Badge className={tongTypeBadgeClass(t.type, tongTypes)}>{t.type}</Badge>
                      </div>
                    </div>
                  )

                  return (
                    <div
                      key={t.id}
                      className={cn('relative', dragId === t.id && 'opacity-50')}
                      draggable
                      onDragStart={(e) => onRowDragStart(e, t.id)}
                      onDragEnd={() => { setDragId(null); setDropFolderId(null) }}
                    >
                      {selectMode ? (
                        <div onClick={() => toggleSelect(t.id)} className={cn('flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50', checked && 'bg-brand-50/50')}>
                          <input type="checkbox" checked={checked} readOnly className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                          <div className="min-w-0 flex-1">{content}</div>
                        </div>
                      ) : (
                        <Link to={`/tongs/${t.id}`} draggable={false} className="block px-4 py-3.5 pr-12 transition-colors hover:bg-gray-50">
                          {content}
                        </Link>
                      )}

                      {/* 폴더 분류 메뉴 (다중 토글) */}
                      {!selectMode && (
                        <>
                          <button
                            onClick={() => setMenuTongId((id) => (id === t.id ? null : t.id))}
                            className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="폴더 분류"
                          >
                            <MoreIcon className="h-4 w-4" />
                          </button>
                          {menuTongId === t.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuTongId(null)} />
                              <div className="absolute right-3 top-10 z-20 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                <p className="px-3 py-1.5 text-xs font-semibold text-gray-400">폴더 분류 (여러 개 가능)</p>
                                {folders.length === 0 && <p className="px-3 py-1.5 text-xs text-gray-400">폴더를 먼저 만드세요.</p>}
                                {folders.map((f) => {
                                  const isIn = tongFolderIds.includes(f.id)
                                  return (
                                    <button
                                      key={f.id}
                                      onClick={() => void toggleTongInFolder(t.id, f.id, isIn)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] text-white', isIn ? 'border-brand-500 bg-brand-500' : 'border-gray-300')}>
                                        {isIn ? '✓' : ''}
                                      </span>
                                      <FolderIcon className="h-4 w-4 text-gray-400" />
                                      <span className="flex-1 truncate">{f.name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 enabled:hover:bg-gray-50 disabled:opacity-40"
                  >
                    이전
                  </button>
                  {pageItems.map((p, i) =>
                    p === 'gap' ? (
                      <span key={`gap-${i}`} className="px-1 text-sm text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          'min-w-[36px] rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                          p === safePage ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                        )}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 enabled:hover:bg-gray-50 disabled:opacity-40"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 폴더 생성/이름변경 모달 */}
      <Modal
        open={folderModal !== null}
        onClose={() => setFolderModal(null)}
        title={folderModal?.mode === 'rename' ? '폴더 이름 변경' : '새 폴더'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setFolderModal(null)}>취소</button>
            <button className="btn-primary" onClick={submitFolderModal} disabled={!folderModal?.name.trim()}>
              {folderModal?.mode === 'rename' ? '변경' : '만들기'}
            </button>
          </>
        }
      >
        <label className="label">폴더 이름</label>
        <input
          className="input"
          autoFocus
          value={folderModal?.name ?? ''}
          onChange={(e) => setFolderModal((m) => (m ? { ...m, name: e.target.value } : m))}
          onKeyDown={(e) => e.key === 'Enter' && submitFolderModal()}
          placeholder="예: 1분기 회의"
        />
      </Modal>

      {/* 휴지통 항목 읽기전용 미리보기 */}
      <TrashPreviewModal tong={previewTong} open={previewTong !== null} onClose={() => setPreviewTong(null)} />
    </div>
  )
}
