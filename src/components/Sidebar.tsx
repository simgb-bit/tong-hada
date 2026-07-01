// 통 HADA - 좌측 사이드바 메뉴

import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { FolderNav } from '@/components/FolderNav'
import {
  PlusIcon,
  ArchiveIcon,
  ChartIcon,
  SettingsIcon,
  XIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from '@/components/icons'
import type { ReactNode } from 'react'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

// 상단 고정: 새 통 만들기 · 통 기록함(하위에 폴더 트리)
const topItems: NavItem[] = [
  { to: '/new', label: '새 통 만들기', icon: <PlusIcon /> },
  { to: '/tongs', label: '통 기록함', icon: <ArchiveIcon /> },
]

// 하단 고정: 분석 · 설정 (사용 빈도 낮아 최하단 배치)
const analyticsItem: NavItem = { to: '/analytics', label: '분석', icon: <ChartIcon /> }
const settingsItem: NavItem = { to: '/settings', label: '설정', icon: <SettingsIcon /> }

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { canManageTongTypes } = useCurrentUser()
  const [collapsed, setCollapsed] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(true) // '통 기록함' 섹션(폴더 내비) 펼침 여부
  const bottomItems = canManageTongTypes ? [analyticsItem, settingsItem] : [analyticsItem]
  const newItem = topItems[0]
  const tongsItem = topItems[1]

  function renderItem(item: NavItem) {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'group/item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            collapsed && 'md:justify-center md:px-2',
            isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          )
        }
      >
        <span className="shrink-0">{item.icon}</span>
        <span className={cn(collapsed && 'md:hidden')}>{item.label}</span>
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover/item:opacity-100 md:block">
            {item.label}
          </span>
        )}
      </NavLink>
    )
  }

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
          'group fixed inset-y-0 left-0 z-30 flex h-screen shrink-0 flex-col border-r border-gray-100 bg-white transition-all duration-300 ease-in-out',
          'md:relative md:z-auto md:translate-x-0',
          collapsed ? 'md:w-16 w-64' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* 접기/펼치기 버튼 — hover 시에만 표시 (데스크탑 전용) */}
        <button
          className={cn(
            'absolute -right-3 top-1/2 z-50 -translate-y-1/2',
            'hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm',
            'text-gray-400 transition-all duration-150',
            'opacity-0 group-hover:opacity-100',
          )}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />
          }
        </button>

        {/* 로고: 접혔을 때 데스크탑에서 숨김 */}
        <div className={cn(
          'flex items-center justify-between px-6 py-5',
          collapsed && 'md:hidden',
        )}>
          <Link to="/" onClick={onClose} aria-label="홈으로 이동">
            <img src="/logo.png" alt="통 HADA" className="h-12 w-auto" />
          </Link>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 md:hidden"
            onClick={onClose}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 상단 고정: 새 통 만들기 · 통 기록함(섹션 토글) */}
        <nav className={cn('shrink-0 space-y-1 pt-2', collapsed ? 'md:px-2 px-3' : 'px-3')}>
          {renderItem(newItem)}
          <div className="flex items-center gap-0.5">
            <div className="min-w-0 flex-1">{renderItem(tongsItem)}</div>
            {/* 통 기록함 섹션 접기/펼치기 (접힘 미니모드에선 숨김) */}
            {!collapsed && (
              <button
                onClick={() => setRecordsOpen((o) => !o)}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title={recordsOpen ? '통 기록함 접기' : '통 기록함 펼치기'}
                aria-expanded={recordsOpen}
              >
                {recordsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>
        </nav>

        {/* 중앙 스크롤: 폴더 트리 — 통 기록함 하위로 들여쓰기(가이드선). 접혀도 여백 유지해 하단 메뉴 고정 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
          {recordsOpen && (
            <div className={cn('ml-3 border-l border-gray-100 pl-1', collapsed && 'md:hidden')}>
              <FolderNav onNavigate={onClose} />
            </div>
          )}
        </div>

        {/* 하단 고정: 분석 · 설정 */}
        <nav className={cn('shrink-0 space-y-1 border-t border-gray-100 py-2', collapsed ? 'md:px-2 px-3' : 'px-3')}>
          {bottomItems.map(renderItem)}
        </nav>

        {/* 하단 설명: 접혔을 때 숨김 */}
        <div className={cn('shrink-0 border-t border-gray-100 px-6 py-4', collapsed && 'md:hidden')}>
          <p className="text-xs leading-relaxed text-gray-400">
            회의(통) 문화를 표준화하고
            <br />조직 운영 데이터로 축적합니다.
          </p>
        </div>
      </aside>
    </>
  )
}
