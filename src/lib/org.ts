// 통 HADA - 조직 계층 관련 헬퍼

import type { Organization } from '@/types'

/** 특정 조직의 모든 하위 조직 id (자기 자신 포함) */
export function getDescendantOrgIds(orgs: Organization[], rootId: string): Set<string> {
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

/** 직속 하위 조직 목록 */
export function getChildren(orgs: Organization[], parentId: string | null): Organization[] {
  return orgs.filter((o) => o.parent_id === parentId)
}

/** 조직의 상위 경로 (Company → ... → 자기 자신) */
export function getOrgPath(orgs: Organization[], orgId: string): Organization[] {
  const byId = new Map(orgs.map((o) => [o.id, o]))
  const path: Organization[] = []
  let cur = byId.get(orgId)
  while (cur) {
    path.unshift(cur)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return path
}
