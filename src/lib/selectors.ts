// 통 HADA - 데이터 집계/파생 셀렉터
//
// 회의(통) 데이터를 조직 운영 데이터로 가공하는 계산 로직을 모았습니다.

import type { FullDataset } from '@/lib/db'
import type { Employee, Folder, Tong, TongSummary } from '@/types'

/** 빈도 카운트 → 내림차순 정렬된 [라벨, 횟수] 배열 */
export function countByFrequency(items: string[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1)
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

/** 전체 데이터에서 반복 이슈 키워드 집계 */
export function recurringKeywords(data: FullDataset): { label: string; value: number }[] {
  const all = data.summaries.flatMap((s) => s.recurring_keywords)
  return countByFrequency(all)
}

/** 분석 대상 통 (휴지통 제외) */
function activeTongsOf(data: FullDataset): Tong[] {
  return data.tongs.filter((t) => !t.deleted_at)
}

/** 통 유형별 개수 */
export function tongsByType(data: FullDataset): { label: string; value: number }[] {
  return countByFrequency(activeTongsOf(data).map((t) => t.type))
}

/** 조직(Cell 등 말단 기준)별 통 개수 */
export function tongsByOrg(data: FullDataset): { label: string; value: number }[] {
  return countByFrequency(activeTongsOf(data).map((t) => t.org_name))
}

// ── 분석(운영 지표) 셀렉터 — 기간 필터 적용 ──────────────────────────────────
// 통 기반 지표는 이미 기간으로 걸러진 Tong[] 을 받는다(activeTongsInWindow 로 사전 필터).

/** 활성(휴지통 제외) 통 중 (fromMs, toMs] 기간 내 (scheduled_at 기준). fromMs=0 이면 전체 */
export function activeTongsInWindow(data: FullDataset, fromMs: number, toMs: number): Tong[] {
  return data.tongs.filter((t) => {
    if (t.deleted_at) return false
    const ts = new Date(t.scheduled_at).getTime()
    return ts > fromMs && ts <= toMs
  })
}

/** A. 상태 분포 (예정/진행 완료/보류) */
export function tongsByStatus(tongs: Tong[]): { label: string; value: number }[] {
  const order = ['예정', '진행 완료', '보류']
  const counts = countByFrequency(tongs.map((t) => t.status))
  return order.map((label) => ({ label, value: counts.find((c) => c.label === label)?.value ?? 0 }))
}

/** A. 요약 정리율: 통 대비 AI 요약(내용 있음)이 작성된 비율 */
export function summaryCoverage(tongs: Tong[], summaries: TongSummary[]): { summarized: number; total: number; rate: number } {
  const withSummary = new Set(
    summaries.filter((s) => (s.one_line?.trim() || s.full_summary?.trim())).map((s) => s.tong_id),
  )
  const summarized = tongs.filter((t) => withSummary.has(t.id)).length
  const total = tongs.length
  return { summarized, total, rate: total === 0 ? 0 : Math.round((summarized / total) * 100) }
}

/** B. 조직별 통 현황 (통 수 · 보류 수), 통 수 내림차순 */
export function orgBreakdown(tongs: Tong[]): { org: string; total: number; pending: number }[] {
  const map = new Map<string, { total: number; pending: number }>()
  for (const t of tongs) {
    const cur = map.get(t.org_name) ?? { total: 0, pending: 0 }
    cur.total++
    if (t.status === '보류') cur.pending++
    map.set(t.org_name, cur)
  }
  return Array.from(map.entries())
    .map(([org, v]) => ({ org, ...v }))
    .sort((a, b) => b.total - a.total)
}

/** C. 기간 내 통의 반복 이슈 키워드 */
export function keywordsFromTongs(tongs: Tong[], summaries: TongSummary[]): { label: string; value: number }[] {
  const ids = new Set(tongs.map((t) => t.id))
  const kws = summaries.filter((s) => ids.has(s.tong_id)).flatMap((s) => s.recurring_keywords)
  return countByFrequency(kws)
}

/** D. 회의 부하: 참석자별 참석 통 수 (상위순) */
export function participantLoad(tongs: Tong[]): { label: string; value: number }[] {
  return countByFrequency(tongs.flatMap((t) => t.participants))
}

// ── 통 기록함 폴더/소유/공유 셀렉터 ──────────────────────────────────────────

/** 참석자로 저장되는 라벨 ("이름 (조직명)") — ParticipantPicker 와 동일 규칙 */
function attendeeLabel(user: Pick<Employee, 'name' | 'org_name'>): string {
  return `${user.name} (${user.org_name})`
}

/** 내 통: 내가 진행(생성)했거나 참석자로 포함된 통 (휴지통 제외) */
export function myTongs(data: FullDataset, user: Employee | null): Tong[] {
  if (!user) return []
  const label = attendeeLabel(user)
  return data.tongs.filter((t) => !t.deleted_at && (t.created_by === user.id || t.participants.includes(label)))
}

/**
 * 공유받은 통: 나에게 공유된 통 (내가 진행·참석한 통은 제외, 휴지통 제외)
 * 정렬: 공유받은 시점(TongShare.created_at) 내림차순 — "받은함" 성격에 맞게 최근 공유가 위로.
 */
export function sharedWithMeTongs(data: FullDataset, user: Employee | null): Tong[] {
  if (!user) return []
  // 통별 "나에게 공유된 최신 시점" (같은 통이 여러 번 공유됐으면 가장 최근)
  const sharedAt = new Map<string, string>()
  for (const s of data.shares) {
    if (s.shared_with !== user.id) continue
    const prev = sharedAt.get(s.tong_id)
    if (!prev || s.created_at > prev) sharedAt.set(s.tong_id, s.created_at)
  }
  const label = attendeeLabel(user)
  return data.tongs
    .filter(
      (t) => !t.deleted_at && sharedAt.has(t.id) && t.created_by !== user.id && !t.participants.includes(label),
    )
    .sort((a, b) => {
      // ISO 8601 문자열은 사전식 비교 = 시간순
      const av = sharedAt.get(a.id)!
      const bv = sharedAt.get(b.id)!
      return av < bv ? 1 : av > bv ? -1 : 0
    })
}

/** 전체(내가 관여한 통): 내 통 ∪ 공유받은 통 — "전체" 스마트 폴더 (전 조직 공개 아님) */
export function involvedTongs(data: FullDataset, user: Employee | null): Tong[] {
  if (!user) return []
  const mine = myTongs(data, user)
  const shared = sharedWithMeTongs(data, user)
  const seen = new Set(mine.map((t) => t.id))
  return [...mine, ...shared.filter((t) => !seen.has(t.id))]
}

/** 현재 사용자가 소유한 폴더 (정렬순) */
export function myFolders(data: FullDataset, userId: string): Folder[] {
  return data.folders
    .filter((f) => f.owner_id === userId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

/** 특정 부모(parentId; null=최상위)의 직속 하위 폴더 (정렬순) */
export function childFolders(folders: Folder[], parentId: string | null): Folder[] {
  return folders
    .filter((f) => (f.parent_id ?? null) === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

/** 특정 폴더의 모든 하위 폴더 id (자기 자신 포함) — 삭제 시 하위까지 정리용 */
export function folderDescendantIds(folders: Folder[], rootId: string): Set<string> {
  const result = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const f of folders) {
      if (f.parent_id && result.has(f.parent_id) && !result.has(f.id)) {
        result.add(f.id)
        changed = true
      }
    }
  }
  return result
}

/** 특정 폴더에 담긴 통 */
export function tongsInFolder(data: FullDataset, folderId: string): Tong[] {
  const tongIds = new Set(
    data.folderItems.filter((x) => x.folder_id === folderId).map((x) => x.tong_id),
  )
  return data.tongs.filter((t) => tongIds.has(t.id))
}

/** 특정 통이 담긴 현재 사용자 폴더 id 목록 (다중 분류) */
export function folderIdsOfTong(data: FullDataset, tongId: string, ownerFolderIds: Set<string>): string[] {
  return data.folderItems
    .filter((x) => x.tong_id === tongId && ownerFolderIds.has(x.folder_id))
    .map((x) => x.folder_id)
}

/** 최근 N일 내 주요 쟁점 모음 */
export function recentKeyIssues(data: FullDataset, days = 30): string[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return data.summaries
    .filter((s) => new Date(s.created_at).getTime() >= cutoff)
    .flatMap((s) => s.key_issues ?? [])
}
