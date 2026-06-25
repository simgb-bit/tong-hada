// 통 HADA - 공통 유틸리티

import type { TongStatus, TongTypeColor, TongTypeDef } from '@/types'

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

/** 통 유형 색상 팔레트 (팔레트 키 → Tailwind 클래스) */
export const TONG_TYPE_PALETTE: Record<TongTypeColor, string> = {
  purple: 'bg-purple-100 text-purple-700',
  brand: 'bg-brand-100 text-brand-700',
  teal: 'bg-teal-100 text-teal-700',
  gray: 'bg-gray-100 text-gray-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  violet: 'bg-violet-100 text-violet-700',
}

/** 유형 라벨 → 뱃지 클래스 (정의에서 색상 조회, 없으면 회색) */
export function tongTypeBadgeClass(label: string, defs: TongTypeDef[]): string {
  const def = defs.find((d) => d.label === label)
  return def ? TONG_TYPE_PALETTE[def.color] : TONG_TYPE_PALETTE.gray
}
