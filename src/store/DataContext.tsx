// 통 HADA - 전역 데이터 상태
//
// Repository(Supabase 또는 In-Memory)에서 전체 데이터를 로드하고,
// CRUD 액션을 통해 화면 상태와 백엔드를 동기화합니다.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { repo, type FullDataset } from '@/lib/db'
import { removeRecordings } from '@/lib/storage'
import type {
  Attachment,
  Employee,
  Folder,
  Organization,
  Tong,
  TongInput,
  TongShare,
  TongSummary,
  TongTypeDef,
} from '@/types'

interface DataContextValue extends FullDataset {
  loading: boolean
  error: string | null
  backendMode: 'supabase' | 'memory'
  refresh: () => Promise<void>

  /** 휴지통에 있는 통 (deleted_at != null) — tongs 에는 포함되지 않음 */
  trashedTongs: Tong[]

  upsertTong: (tong: Tong) => Promise<void>
  /** 휴지통으로 이동 (소프트 삭제) */
  trashTong: (id: string) => Promise<void>
  /** 휴지통에서 복구 */
  restoreTong: (id: string) => Promise<void>
  /** 영구 삭제 (관련 기록·음원 포함) */
  deleteTong: (id: string) => Promise<void>
  /** 휴지통 전체 영구 삭제 */
  emptyTrash: () => Promise<void>

  addInput: (input: TongInput) => Promise<void>

  saveSummary: (summary: TongSummary) => Promise<void>

  upsertTongType: (typeDef: TongTypeDef) => Promise<void>
  deleteTongType: (id: string) => Promise<void>

  addAttachment: (att: Attachment) => Promise<void>
  deleteAttachment: (id: string) => Promise<void>

  setEmployees: (employees: Employee[]) => Promise<void>

  addShare: (share: TongShare) => Promise<void>
  removeShare: (id: string) => Promise<void>

  upsertFolder: (folder: Folder) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  /** 통을 폴더에 추가 (다중 분류 — 이미 있으면 무시) */
  addTongToFolder: (folderId: string, tongId: string) => Promise<void>
  /** 통을 폴더에서 제거 */
  removeTongFromFolder: (folderId: string, tongId: string) => Promise<void>
}

const empty: FullDataset = {
  organizations: [],
  employees: [],
  tongs: [],
  inputs: [],
  summaries: [],
  tongTypes: [],
  attachments: [],
  shares: [],
  folders: [],
  folderItems: [],
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FullDataset>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 최신 데이터 참조 (콜백에서 첨부 경로 조회용)
  const dataRef = useRef(data)
  dataRef.current = data

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await repo.loadAll()
      setData(all)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const upsertTong = useCallback(async (tong: Tong) => {
    await repo.upsertTong(tong)
    setData((d) => {
      const i = d.tongs.findIndex((t) => t.id === tong.id)
      const tongs = i >= 0 ? d.tongs.map((t) => (t.id === tong.id ? tong : t)) : [...d.tongs, tong]
      return { ...d, tongs }
    })
  }, [])

  const trashTong = useCallback(async (id: string) => {
    const deletedAt = new Date().toISOString()
    await repo.setTongDeleted(id, deletedAt)
    setData((d) => ({
      ...d,
      tongs: d.tongs.map((t) => (t.id === id ? { ...t, deleted_at: deletedAt } : t)),
    }))
  }, [])

  const restoreTong = useCallback(async (id: string) => {
    await repo.setTongDeleted(id, null)
    setData((d) => ({
      ...d,
      tongs: d.tongs.map((t) => (t.id === id ? { ...t, deleted_at: null } : t)),
    }))
  }, [])

  const deleteTong = useCallback(async (id: string) => {
    // 영구삭제 전 음원 Storage 정리 (orphan 파일 방지)
    const paths = dataRef.current.attachments.filter((a) => a.tong_id === id && a.storage_path).map((a) => a.storage_path)
    await removeRecordings(paths)
    await repo.deleteTong(id)
    setData((d) => ({
      ...d,
      tongs: d.tongs.filter((t) => t.id !== id),
      inputs: d.inputs.filter((x) => x.tong_id !== id),
      summaries: d.summaries.filter((x) => x.tong_id !== id),
      attachments: d.attachments.filter((x) => x.tong_id !== id),
      shares: d.shares.filter((x) => x.tong_id !== id),
      folderItems: d.folderItems.filter((x) => x.tong_id !== id),
    }))
  }, [])

  const emptyTrash = useCallback(async () => {
    const trashedIds = dataRef.current.tongs.filter((t) => t.deleted_at).map((t) => t.id)
    for (const id of trashedIds) {
      await deleteTong(id)
    }
  }, [deleteTong])

  const addInput = useCallback(async (input: TongInput) => {
    await repo.addInput(input)
    setData((d) => ({ ...d, inputs: [...d.inputs, input] }))
  }, [])

  const saveSummary = useCallback(async (summary: TongSummary) => {
    await repo.upsertSummary(summary)
    setData((d) => {
      const i = d.summaries.findIndex((s) => s.tong_id === summary.tong_id)
      const summaries = i >= 0 ? d.summaries.map((s) => (s.tong_id === summary.tong_id ? summary : s)) : [...d.summaries, summary]
      return { ...d, summaries }
    })
  }, [])

  const upsertTongType = useCallback(async (typeDef: TongTypeDef) => {
    await repo.upsertTongType(typeDef)
    setData((d) => {
      const i = d.tongTypes.findIndex((t) => t.id === typeDef.id)
      const tongTypes = i >= 0 ? d.tongTypes.map((t) => (t.id === typeDef.id ? typeDef : t)) : [...d.tongTypes, typeDef]
      return { ...d, tongTypes }
    })
  }, [])

  const deleteTongType = useCallback(async (id: string) => {
    await repo.deleteTongType(id)
    setData((d) => ({ ...d, tongTypes: d.tongTypes.filter((t) => t.id !== id) }))
  }, [])

  const addAttachment = useCallback(async (att: Attachment) => {
    await repo.addAttachment(att)
    setData((d) => ({ ...d, attachments: [...d.attachments, att] }))
  }, [])

  const deleteAttachment = useCallback(async (id: string) => {
    // Storage 음원 파일도 함께 정리
    const path = dataRef.current.attachments.find((a) => a.id === id)?.storage_path
    if (path) await removeRecordings([path])
    await repo.removeAttachment(id)
    setData((d) => ({ ...d, attachments: d.attachments.filter((a) => a.id !== id) }))
  }, [])

  const setEmployees = useCallback(async (employees: Employee[]) => {
    await repo.replaceEmployees(employees)
    setData((d) => ({ ...d, employees }))
  }, [])

  const addShare = useCallback(async (share: TongShare) => {
    await repo.addShare(share)
    setData((d) => {
      const exists = d.shares.some((s) => s.tong_id === share.tong_id && s.shared_with === share.shared_with)
      return exists ? d : { ...d, shares: [...d.shares, share] }
    })
  }, [])

  const removeShare = useCallback(async (id: string) => {
    await repo.removeShare(id)
    setData((d) => ({ ...d, shares: d.shares.filter((s) => s.id !== id) }))
  }, [])

  const upsertFolder = useCallback(async (folder: Folder) => {
    await repo.upsertFolder(folder)
    setData((d) => {
      const i = d.folders.findIndex((f) => f.id === folder.id)
      const folders = i >= 0 ? d.folders.map((f) => (f.id === folder.id ? folder : f)) : [...d.folders, folder]
      return { ...d, folders }
    })
  }, [])

  const deleteFolder = useCallback(async (id: string) => {
    await repo.deleteFolder(id)
    setData((d) => ({
      ...d,
      folders: d.folders.filter((f) => f.id !== id),
      folderItems: d.folderItems.filter((x) => x.folder_id !== id),
    }))
  }, [])

  const addTongToFolder = useCallback(async (folderId: string, tongId: string) => {
    const item = { folder_id: folderId, tong_id: tongId, added_at: new Date().toISOString() }
    await repo.addFolderItem(item)
    setData((d) => {
      if (d.folderItems.some((x) => x.folder_id === folderId && x.tong_id === tongId)) return d
      return { ...d, folderItems: [...d.folderItems, item] }
    })
  }, [])

  const removeTongFromFolder = useCallback(async (folderId: string, tongId: string) => {
    await repo.removeFolderItem(folderId, tongId)
    setData((d) => ({ ...d, folderItems: d.folderItems.filter((x) => !(x.folder_id === folderId && x.tong_id === tongId)) }))
  }, [])

  // 휴지통 통은 일반 tongs 에서 제외하고 trashedTongs 로 분리해 노출한다.
  const activeTongs = useMemo(() => data.tongs.filter((t) => !t.deleted_at), [data.tongs])
  const trashedTongs = useMemo(() => data.tongs.filter((t) => !!t.deleted_at), [data.tongs])

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      tongs: activeTongs,
      trashedTongs,
      loading,
      error,
      backendMode: repo.mode,
      refresh,
      upsertTong,
      trashTong,
      restoreTong,
      deleteTong,
      emptyTrash,
      addInput,
      saveSummary,
      upsertTongType,
      deleteTongType,
      addAttachment,
      deleteAttachment,
      setEmployees,
      addShare,
      removeShare,
      upsertFolder,
      deleteFolder,
      addTongToFolder,
      removeTongFromFolder,
    }),
    [data, activeTongs, trashedTongs, loading, error, refresh, upsertTong, trashTong, restoreTong, deleteTong, emptyTrash, addInput, saveSummary, upsertTongType, deleteTongType, addAttachment, deleteAttachment, setEmployees, addShare, removeShare, upsertFolder, deleteFolder, addTongToFolder, removeTongFromFolder],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

// ── 파생 셀렉터 헬퍼 (컴포넌트에서 사용) ───────────────────────────────────
export type { Organization }
