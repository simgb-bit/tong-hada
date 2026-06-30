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
