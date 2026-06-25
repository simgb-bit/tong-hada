// 통 HADA - 아이콘 (의존성 없이 인라인 SVG)

interface IconProps {
  className?: string
}

function base(path: ReactNode, props: IconProps) {
  return (
    <svg
      className={props.className ?? 'h-5 w-5'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  )
}

import type { ReactNode } from 'react'

export const CalendarIcon = (p: IconProps) => base(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>, p)
export const PlusIcon = (p: IconProps) => base(<><path d="M12 5v14M5 12h14" /></>, p)
export const ArchiveIcon = (p: IconProps) => base(<><rect x="3" y="3" width="18" height="5" rx="1" /><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" /></>, p)
export const ChartIcon = (p: IconProps) => base(<><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="12" y="6" width="3" height="11" /><rect x="17" y="13" width="3" height="4" /></>, p)
export const SettingsIcon = (p: IconProps) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>, p)
export const ClockIcon = (p: IconProps) => base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, p)
export const SparkIcon = (p: IconProps) => base(<><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></>, p)
export const FileIcon = (p: IconProps) => base(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>, p)
export const TeamsIcon = (p: IconProps) => base(<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 9l5-3v12l-5-3" /></>, p)
export const MicIcon = (p: IconProps) => base(<><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0M12 19v3" /></>, p)
export const StopIcon = (p: IconProps) => base(<><rect x="6" y="6" width="12" height="12" rx="2" /></>, p)
export const TextIcon = (p: IconProps) => base(<><path d="M4 7V4h16v3M9 20h6M12 4v16" /></>, p)
export const MemoIcon = (p: IconProps) => base(<><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" /></>, p)
export const TrashIcon = (p: IconProps) => base(<><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></>, p)
export const ChevronRight = (p: IconProps) => base(<><path d="M9 18l6-6-6-6" /></>, p)
export const AlertIcon = (p: IconProps) => base(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>, p)
export const SearchIcon = (p: IconProps) => base(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>, p)
export const MenuIcon = (p: IconProps) => base(<><path d="M3 12h18M3 6h18M3 18h18" /></>, p)
export const XIcon = (p: IconProps) => base(<><path d="M18 6L6 18M6 6l12 12" /></>, p)
