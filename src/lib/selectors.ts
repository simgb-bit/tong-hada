// 통 HADA - 데이터 집계/파생 셀렉터
//
// 회의(통) 데이터를 조직 운영 데이터로 가공하는 계산 로직을 모았습니다.

import type { FullDataset } from '@/lib/db'
import type { Employee, Folder, Tong } from '@/types'

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

/** 통 유형별 개수 */
export function tongsByType(data: FullDataset): { label: string; value: number }[] {
  return countByFrequency(data.tongs.map((t) => t.type))
}

/** 조직(Cell 등 말단 기준)별 통 개수 */
export function tongsByOrg(data: FullDataset): { label: string; value: number }[] {
  return countByFrequency(data.tongs.map((t) => t.org_name))
}

// ── 통 기록함 폴더/소유/공유 셀렉터 ──────────────────────────────────────────

/** 참석자로 저장되는 라벨 ("이름 (조직명)") — ParticipantPicker 와 동일 규칙 */
function attendeeLabel(user: Pick<Employee, 'name' | 'org_name'>): string {
  return `${user.name} (${user.org_name})`
}

/** 내가 관여한 통 (내가 진행했거나 참석자로 포함된 통) */
export function myTongs(data: FullDataset, user: Employee | null): Tong[] {
  if (!user) return []
  const label = attendeeLabel(user)
  return data.tongs.filter((t) => t.created_by === user.id || t.participants.includes(label))
}

/** 나에게 공유된 통 (내가 관여한 통은 제외) */
export function sharedWithMeTongs(data: FullDataset, user: Employee | null): Tong[] {
  if (!user) return []
  const sharedIds = new Set(
    data.shares.filter((s) => s.shared_with === user.id).map((s) => s.tong_id),
  )
  const label = attendeeLabel(user)
  return data.tongs.filter(
    (t) => sharedIds.has(t.id) && t.created_by !== user.id && !t.participants.includes(label),
  )
}

/** 현재 사용자가 소유한 폴더 (정렬순) */
export function myFolders(data: FullDataset, userId: string): Folder[] {
  return data.folders
    .filter((f) => f.owner_id === userId)
    .sort((a, b) => a.sort_order - b.sort_order)
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
    .flatMap((s) => s.key_issues)
}
