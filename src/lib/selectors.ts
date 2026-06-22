// 통 HADA - 데이터 집계/파생 셀렉터
//
// 회의(통) 데이터를 조직 운영 데이터로 가공하는 계산 로직을 모았습니다.

import type { FullDataset } from '@/lib/db'

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

/** 최근 N일 내 주요 쟁점 모음 */
export function recentKeyIssues(data: FullDataset, days = 30): string[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return data.summaries
    .filter((s) => new Date(s.created_at).getTime() >= cutoff)
    .flatMap((s) => s.key_issues)
}
