// 통 HADA - 현재 로그인 사용자 (페르소나 기반, 추후 Teams 로그인으로 교체)
//
// 지금은 사원 목록에서 사용자를 선택(페르소나)하는 방식으로 동작합니다.
// 추후 Teams(Entra ID) 로그인을 붙이면 이 Provider 내부의 사용자 결정 로직만 교체하면 됩니다.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useData } from '@/store/DataContext'
import { canManageTongTypes as canManage, getCoreOrgId } from '@/lib/auth'
import type { Employee } from '@/types'

interface CurrentUserValue {
  currentUser: Employee | null
  setCurrentUserId: (id: string) => void
  /** 현재 사용자가 속한 Core 조직 id */
  currentCoreId: string | null
  /** 통 유형 관리 권한 (Core 리더 이상) */
  canManageTongTypes: boolean
}

const Ctx = createContext<CurrentUserValue | null>(null)

// 기본 페르소나: Core 리더 (데모용). 추후 Teams 로그인으로 대체.
const DEFAULT_USER_ID = 'emp-4'

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { employees, organizations } = useData()
  const [currentUserId, setCurrentUserId] = useState<string>(DEFAULT_USER_ID)

  const currentUser = useMemo(
    () => employees.find((e) => e.id === currentUserId) ?? null,
    [employees, currentUserId],
  )

  const value = useMemo<CurrentUserValue>(
    () => ({
      currentUser,
      setCurrentUserId,
      currentCoreId: currentUser ? getCoreOrgId(organizations, currentUser.org_id) : null,
      canManageTongTypes: canManage(currentUser, organizations),
    }),
    [currentUser, organizations],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCurrentUser(): CurrentUserValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider')
  return ctx
}
