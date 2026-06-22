// 통 HADA - 좌측 사이드바 메뉴

import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  CalendarIcon,
  PlusIcon,
  ArchiveIcon,
  OrgIcon,
  ChartIcon,
  XIcon,
} from '@/components/icons'
import type { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const items: NavItem[] = [
  { to: '/', label: '홈', icon: <HomeIcon />, end: true },
  { to: '/calendar', label: '통 캘린더', icon: <CalendarIcon /> },
  { to: '/new', label: '새 통 만들기', icon: <PlusIcon /> },
  { to: '/tongs', label: '통 기록함', icon: <ArchiveIcon /> },
  { to: '/org-data', label: '조직 데이터', icon: <OrgIcon /> },
  { to: '/analytics', label: '분석', icon: <ChartIcon /> },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* 모바일 백드롭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex h-screen w-64 shrink-0 flex-col border-r border-gray-100 bg-white transition-transform duration-300 ease-in-out',
          'md:static md:z-auto md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* 로고 */}
        <div className="flex items-center justify-between px-6 py-5">
          <img src="/logo.png" alt="통 HADA" className="h-12 w-auto" />
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 md:hidden"
            onClick={onClose}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs leading-relaxed text-gray-400">
            회의(통) 문화를 표준화하고
            <br />조직 운영 데이터로 축적합니다.
          </p>
        </div>
      </aside>
    </>
  )
}
