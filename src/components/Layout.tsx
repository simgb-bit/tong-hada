// 통 HADA - 전체 레이아웃 (사이드바 + 상단바 + 콘텐츠)

import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { useData } from '@/store/DataContext'
import { PlusIcon } from '@/components/icons'

export function Layout({ children }: { children: ReactNode }) {
  const { backendMode } = useData()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단바 */}
        <header className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-semibold text-gray-700">통 HADA</span>
            <span>·</span>
            <span>회의를 조직 운영 데이터로</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="chip bg-gray-100 text-gray-500"
              title={backendMode === 'supabase' ? 'Supabase 백엔드에 연결되었습니다.' : '데모용 In-Memory 저장소로 동작 중입니다. (.env 에 Supabase 정보를 설정하세요)'}
            >
              {backendMode === 'supabase' ? '● Supabase' : '○ Demo (In-Memory)'}
            </span>
            <Link to="/new" className="btn-primary">
              <PlusIcon className="h-4 w-4" />새 통 만들기
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
