// 통 HADA - 전체 레이아웃 (사이드바 + 상단바 + 콘텐츠)

import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { PlusIcon, MenuIcon } from '@/components/icons'

export function Layout({ children }: { children: ReactNode }) {
  const { backendMode, employees } = useData()
  const { currentUser, setCurrentUserId } = useCurrentUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen min-w-0 h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 상단바 */}
        <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            {/* 모바일 햄버거 */}
            <button
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="font-semibold text-gray-700">통 HADA</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">회의를 조직 운영 데이터로</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* 현재 로그인 사용자 (데모용 페르소나 — 추후 Teams 로그인으로 교체) */}
            <select
              className="hidden rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 sm:block"
              value={currentUser?.id ?? ''}
              onChange={(e) => setCurrentUserId(e.target.value)}
              title="현재 로그인 사용자 (데모용)"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} · {emp.position}
                </option>
              ))}
            </select>
            <span
              className="chip hidden bg-gray-100 text-gray-500 sm:inline-flex"
              title={backendMode === 'supabase' ? 'Supabase 백엔드에 연결되었습니다.' : '데모용 In-Memory 저장소로 동작 중입니다. (.env 에 Supabase 정보를 설정하세요)'}
            >
              {backendMode === 'supabase' ? '● Supabase' : '○ Demo (In-Memory)'}
            </span>
            <Link to="/new" className="btn-primary text-sm">
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">새 통 만들기</span>
              <span className="sm:hidden">새 통</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
