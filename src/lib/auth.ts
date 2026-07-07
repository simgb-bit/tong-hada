// 통 HADA - 권한/직책 헬퍼
//
// 통 유형 커스텀은 Core 단위로 관리하며, 권한은 "Core 리더 이상" 직책에만 부여합니다.
// 현재는 페르소나(사용자 선택) 기반으로 동작하며, 추후 Teams(Entra ID) 로그인으로 교체됩니다.

import type { Employee, Organization, Tong, TongShare } from '@/types'

/** 리더 직책 → 등급 (숫자가 클수록 상위) */
const LEADER_RANK: Record<string, number> = {
  'Cell Leader': 1,
  'Core Leader': 2,
  'CoreGroup Leader': 3,
  'Company Leader': 4,
}

/** "Core 리더" 등급 기준값 (이 값 이상이면 Core 리더 이상) */
export const CORE_LEADER_RANK = 2

/** 직책 등급 (리더가 아니면 0) */
export function positionRank(position: string): number {
  return LEADER_RANK[position] ?? 0
}

/** 특정 조직이 속한 Core 조직 id (조직 자신이 Core 면 자기 자신). 없으면 null */
export function getCoreOrgId(orgs: Organization[], orgId: string): string | null {
  const byId = new Map(orgs.map((o) => [o.id, o]))
  let cur = byId.get(orgId)
  while (cur) {
    if (cur.level === 'Core') return cur.id
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return null
}

/** 통 유형을 관리할 수 있는지 (Core 리더 이상 + 소속 Core 가 분명할 때) */
export function canManageTongTypes(user: Employee | null, orgs: Organization[]): boolean {
  if (!user) return false
  if (positionRank(user.position) < CORE_LEADER_RANK) return false
  return getCoreOrgId(orgs, user.org_id) !== null
}

/**
 * 통을 편집(입력/수정/삭제)할 수 있는지 판정한다.
 *  - 진행자(생성자) 이거나
 *  - 편집(edit) 권한으로 공유받은 사람
 * 그 외(보기 권한 공유, 단순 조회자)는 읽기 전용이다.
 */
export function canEditTong(tong: Tong, userId: string, shares: TongShare[]): boolean {
  if (!userId) return false
  if (tong.created_by === userId) return true
  return shares.some((s) => s.tong_id === tong.id && s.shared_with === userId && s.permission === 'edit')
}

// ── 조직 리더십 / 분석 가시성 ────────────────────────────────────────────────

/** 특정 조직의 모든 하위 조직 id (자기 자신 포함) */
export function orgDescendantIds(orgs: Organization[], rootId: string): Set<string> {
  const result = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const o of orgs) {
      if (o.parent_id && result.has(o.parent_id) && !result.has(o.id)) {
        result.add(o.id)
        changed = true
      }
    }
  }
  return result
}

/**
 * 사용자가 리드하는 조직 id 목록.
 *  - `led_org_ids` 가 있으면(그룹웨어 동기화가 채운 값, 겸직 포함) 그것을 사용
 *  - 없으면 직책 기반 파생: 리더면 자기 소속 조직 1개
 */
export function ledOrgIds(user: Employee | null): string[] {
  if (!user) return []
  if (user.led_org_ids && user.led_org_ids.length > 0) return user.led_org_ids
  return positionRank(user.position) > 0 ? [user.org_id] : []
}

/** 분석(조직 운영 데이터)을 볼 수 있는지 = 리드하는 조직이 하나라도 있으면 */
export function canViewAnalytics(user: Employee | null): boolean {
  return ledOrgIds(user).length > 0
}

/**
 * 분석 스코프 조직 id 집합.
 *  - selectedOrgId 지정 시: 그 조직의 하위 트리
 *  - null 이면: 리드하는 모든 조직의 하위 트리 합집합
 */
export function analyticsScopeOrgIds(orgs: Organization[], ledIds: string[], selectedOrgId: string | null): Set<string> {
  const roots = selectedOrgId ? [selectedOrgId] : ledIds
  const set = new Set<string>()
  for (const r of roots) for (const id of orgDescendantIds(orgs, r)) set.add(id)
  return set
}
