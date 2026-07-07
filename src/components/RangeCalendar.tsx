// 통 HADA - 날짜 범위 선택 캘린더 (커스텀)
//
// 네이티브 <input type="date"> 대신 직접 그려서 열림/닫힘·선택을 완전히 제어한다.
// 첫 클릭 = 시작일, 두 번째 클릭 = 종료일(시작보다 이르면 새 시작). 값은 'YYYY-MM-DD'.

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from '@/components/icons'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

export function RangeCalendar({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const [view, setView] = useState(() => {
    const base = from ? new Date(`${from}T00:00:00`) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  // true = 다음 클릭이 시작일, false = 다음 클릭이 종료일
  const [pickStart, setPickStart] = useState(true)

  const y = view.getFullYear()
  const m = view.getMonth()
  const first = new Date(y, m, 1)
  const gridStart = new Date(first)
  gridStart.setDate(1 - first.getDay()) // 일요일 시작
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }

  function click(d: Date) {
    const s = ymd(d)
    if (pickStart) {
      onChange(s, s)
      setPickStart(false)
    } else if (s >= from) {
      onChange(from, s)
      setPickStart(true)
    } else {
      // 시작보다 이른 날 → 새 시작으로
      onChange(s, s)
      setPickStart(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} className="rounded p-1 text-gray-400 hover:bg-gray-100" title="이전 달">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{y}년 {m + 1}월</span>
        <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} className="rounded p-1 text-gray-400 hover:bg-gray-100" title="다음 달">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEK.map((w) => (
          <div key={w} className="py-1 text-[11px] text-gray-400">{w}</div>
        ))}
        {days.map((d, i) => {
          const s = ymd(d)
          const inMonth = d.getMonth() === m
          const isEnd = s === from || s === to
          const inRange = Boolean(from && to && s >= from && s <= to)
          return (
            <button
              key={i}
              type="button"
              onClick={() => click(d)}
              className={cn(
                'h-8 rounded text-xs transition-colors',
                !inMonth && 'text-gray-300',
                isEnd
                  ? 'bg-brand-600 font-semibold text-white'
                  : inRange
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        {pickStart ? '시작일을 선택하세요' : '종료일을 선택하세요'}
      </p>
    </div>
  )
}
