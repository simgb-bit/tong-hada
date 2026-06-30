// 통 HADA - 통 상세 (3개 탭: 기본 정보 / 입력 / AI 요약)

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { PageHeader, Badge, ConfirmModal } from '@/components/ui'
import { cn, formatDateTime, tongStatusColor, tongTypeBadgeClass } from '@/lib/utils'
import { canEditTong } from '@/lib/auth'
import { TrashIcon, ShareIcon } from '@/components/icons'
import { FolderPicker } from '@/components/FolderPicker'
import { myFolders, folderIdsOfTong } from '@/lib/selectors'
import { BasicInfoTab } from '@/pages/tong/BasicInfoTab'
import { InputTab } from '@/pages/tong/InputTab'
import { SummaryTab } from '@/pages/tong/SummaryTab'
import { ShareTongModal } from '@/pages/tong/ShareTongModal'

const TABS = ['기본 정보', '입력', 'AI 요약'] as const
type Tab = (typeof TABS)[number]

export function TongDetail() {
  const { id } = useParams<{ id: string }>()
  const data = useData()
  const { tongs, tongTypes, shares, trashTong, addTongToFolder, removeTongFromFolder } = data
  const { currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('기본 정보')
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const tong = useMemo(() => tongs.find((t) => t.id === id), [tongs, id])
  const shareCount = useMemo(() => shares.filter((s) => s.tong_id === id).length, [shares, id])

  const userId = currentUser?.id ?? ''
  // 편집 권한: 진행자(생성자) 또는 편집 공유받은 사람만. 그 외(보기 권한 등)는 읽기 전용
  const canEdit = useMemo(() => (tong ? canEditTong(tong, userId, shares) : false), [tong, userId, shares])
  const folders = useMemo(() => myFolders(data, userId), [data, userId])
  const ownerFolderIdSet = useMemo(() => new Set(folders.map((f) => f.id)), [folders])
  const tongFolderIds = useMemo(() => (id ? folderIdsOfTong(data, id, ownerFolderIdSet) : []), [data, id, ownerFolderIdSet])

  function toggleFolder(folderId: string, isIn: boolean) {
    if (!id) return
    const action = isIn ? removeTongFromFolder(folderId, id) : addTongToFolder(folderId, id)
    void action.catch((e) => {
      console.error('[폴더 분류] 실패:', e)
      window.alert('폴더 분류에 실패했습니다. Supabase를 쓰는 경우 supabase/migration_folders.sql 실행 여부를 확인하세요.')
    })
  }

  if (!tong) {
    return (
      <div>
        <PageHeader title="통을 찾을 수 없습니다." />
        <Link to="/tongs" className="btn-secondary">통 기록함으로 이동</Link>
      </div>
    )
  }

  async function handleDelete() {
    if (!tong) return
    await trashTong(tong.id)
    navigate('/tongs')
  }

  return (
    <div>
      <PageHeader
        title={tong.title}
        subtitle={`${tong.org_name} · ${formatDateTime(tong.scheduled_at)}`}
        actions={
          canEdit ? (
            <>
              <button className="btn-secondary" onClick={() => setShareOpen(true)}>
                <ShareIcon className="h-4 w-4" />공유{shareCount > 0 ? ` ${shareCount}` : ''}
              </button>
              <button className="btn-ghost text-red-500 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                <TrashIcon className="h-4 w-4" />삭제
              </button>
            </>
          ) : (
            <Badge className="bg-gray-100 text-gray-500">읽기 전용 (보기 권한)</Badge>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className={tongTypeBadgeClass(tong.type, tongTypes)}>{tong.type}</Badge>
        <Badge className={tongStatusColor(tong.status)}>{tong.status}</Badge>
        {tong.participants.map((p) => (
          <Badge key={p} className="bg-gray-100 text-gray-600">{p}</Badge>
        ))}
      </div>

      <div className="mb-5">
        <FolderPicker folders={folders} selectedIds={tongFolderIds} onToggle={toggleFolder} />
      </div>

      {/* 탭 헤더 */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '기본 정보' && <BasicInfoTab tong={tong} readOnly={!canEdit} />}
      {tab === '입력' && <InputTab tong={tong} readOnly={!canEdit} />}
      {tab === 'AI 요약' && <SummaryTab tong={tong} onGoToInput={() => setTab('입력')} readOnly={!canEdit} />}

      <ShareTongModal tong={tong} open={shareOpen} onClose={() => setShareOpen(false)} />

      <ConfirmModal
        open={deleteOpen}
        title="통을 휴지통으로 옮길까요?"
        message={`'${tong.title}' 통이 휴지통으로 이동합니다. 통 기록함의 휴지통에서 복구하거나 영구 삭제할 수 있습니다.`}
        confirmLabel="휴지통으로 이동"
        onConfirm={() => { setDeleteOpen(false); void handleDelete() }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
