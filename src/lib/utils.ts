// 통 HADA - 공통 유틸리티

import type { TongStatus, TongType } from '@/types'

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** ISO 문자열을 'YYYY.MM.DD (요일) HH:mm' 으로 포맷 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} (${days[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** ISO 문자열을 'YYYY.MM.DD' 로 포맷 */
export function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/** 두 날짜가 같은 날인지 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** 오늘 이후(미래)인지 */
export function isUpcoming(iso: string): boolean {
  return new Date(iso).getTime() >= Date.now()
}

/** 기한이 지났는지 (오늘 이전) */
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── 상태/유형별 색상 클래스 ───────────────────────────────────────────────
export function tongStatusColor(status: TongStatus): string {
  switch (status) {
    case '예정':
      return 'bg-blue-100 text-blue-700'
    case '진행 완료':
      return 'bg-green-100 text-green-700'
    case '보류':
      return 'bg-amber-100 text-amber-700'
  }
}

export function tongTypeColor(type: TongType): string {
  switch (type) {
    case '책임자 통':
      return 'bg-purple-100 text-purple-700'
    case '주간 통':
      return 'bg-brand-100 text-brand-700'
    case '상시 통':
      return 'bg-teal-100 text-teal-700'
    case '기타 통':
      return 'bg-gray-100 text-gray-700'
  }
}
