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
  useState,
  type ReactNode,
} from 'react'
import { repo, type FullDataset } from '@/lib/db'
import type {
  ActionItem,
  Attachment,
  Employee,
  Organization,
  Tong,
  TongInput,
  TongSummary,
} from '@/types'

interface DataContextValue extends FullDataset {
  loading: boolean
  error: string | null
  backendMode: 'supabase' | 'memory'
  refresh: () => Promise<void>

  upsertTong: (tong: Tong) => Promise<void>
  deleteTong: (id: string) => Promise<void>

  addInput: (input: TongInput) => Promise<void>

  saveSummary: (summary: TongSummary) => Promise<void>

  upsertActionItem: (item: ActionItem) => Promise<void>
  deleteActionItem: (id: string) => Promise<void>

  addAttachment: (att: Attachment) => Promise<void>

  setEmployees: (employees: Employee[]) => Promise<void>
}

const empty: FullDataset = {
  organizations: [],
  employees: [],
  tongs: [],
  inputs: [],
  summaries: [],
  actionItems: [],
  attachments: [],
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FullDataset>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const deleteTong = useCallback(async (id: string) => {
    await repo.deleteTong(id)
    setData((d) => ({
      ...d,
      tongs: d.tongs.filter((t) => t.id !== id),
      inputs: d.inputs.filter((x) => x.tong_id !== id),
      summaries: d.summaries.filter((x) => x.tong_id !== id),
      actionItems: d.actionItems.filter((x) => x.tong_id !== id),
      attachments: d.attachments.filter((x) => x.tong_id !== id),
    }))
  }, [])

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

  const upsertActionItem = useCallback(async (item: ActionItem) => {
    await repo.upsertActionItem(item)
    setData((d) => {
      const i = d.actionItems.findIndex((a) => a.id === item.id)
      const actionItems = i >= 0 ? d.actionItems.map((a) => (a.id === item.id ? item : a)) : [...d.actionItems, item]
      return { ...d, actionItems }
    })
  }, [])

  const deleteActionItem = useCallback(async (id: string) => {
    await repo.deleteActionItem(id)
    setData((d) => ({ ...d, actionItems: d.actionItems.filter((a) => a.id !== id) }))
  }, [])

  const addAttachment = useCallback(async (att: Attachment) => {
    await repo.addAttachment(att)
    setData((d) => ({ ...d, attachments: [...d.attachments, att] }))
  }, [])

  const setEmployees = useCallback(async (employees: Employee[]) => {
    await repo.replaceEmployees(employees)
    setData((d) => ({ ...d, employees }))
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      loading,
      error,
      backendMode: repo.mode,
      refresh,
      upsertTong,
      deleteTong,
      addInput,
      saveSummary,
      upsertActionItem,
      deleteActionItem,
      addAttachment,
      setEmployees,
    }),
    [data, loading, error, refresh, upsertTong, deleteTong, addInput, saveSummary, upsertActionItem, deleteActionItem, addAttachment, setEmployees],
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
