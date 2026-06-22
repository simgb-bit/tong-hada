// 통 HADA - 통 캘린더 (월간 뷰, 통 기록함에서 사용)
//
// 필터링된 통 목록을 prop 으로 받아 월간 캘린더 + 선택일 패널로 보여줍니다.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge } from '@/components/ui'
import { ChevronRight } from '@/components/icons'
import { cn, isSameDay, tongTypeColor, formatDateTime } from '@/lib/utils'
import type { Tong } from '@/types'

// 데모 시드 데이터(2026-06) 기준 "오늘"
const TODAY = new Date(2026, 5, 17)

export function TongCalendar({ tongs }: { tongs: Tong[] }) {
  const [cursor, setCursor] = useState(() => new Date(2026, 5, 1)) // 2026-06
  const [selected, setSelected] = useState<Date | null>(TODAY)

  const { weeks, monthLabel } = useMemo(() => buildMonth(cursor), [cursor])

  const tongsByDay = useMemo(() => {
    const map = new Map<string, Tong[]>()
    for (const t of tongs) {
      const key = new Date(t.scheduled_at).toDateString()
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return map
  }, [tongs])

  const selectedTongs = selected ? tongsByDay.get(selected.toDateString()) ?? [] : []

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button className="btn-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              이전
            </button>
            <button className="btn-secondary" onClick={() => setCursor(new Date(2026, 5, 1))}>
              오늘
            </button>
            <button className="btn-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              다음
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 text-center text-xs">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div key={d} className="bg-gray-50 py-2 font-medium text-gray-500">
              {d}
            </div>
          ))}
          {weeks.flat().map((day, i) => {
            const inMonth = day.getMonth() === cursor.getMonth()
            const dayTongs = tongsByDay.get(day.toDateString()) ?? []
            const isSelected = selected && isSameDay(day, selected)
            const isToday = isSameDay(day, TODAY)
            return (
              <button
                key={i}
                onClick={() => setSelected(day)}
                className={cn(
                  'min-h-[78px] bg-white p-1.5 text-left align-top transition-colors hover:bg-brand-50',
                  !inMonth && 'bg-gray-50/60 text-gray-300',
                  isSelected && 'ring-2 ring-inset ring-brand-400',
                )}
              >
                <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs', isToday && 'bg-brand-600 font-bold text-white')}>
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayTongs.slice(0, 2).map((t) => (
                    <div key={t.id} className="truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] text-brand-700">
                      {t.title}
                    </div>
                  ))}
                  {dayTongs.length > 2 && <div className="text-[10px] text-gray-400">+{dayTongs.length - 2}</div>}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          {selected ? `${selected.getMonth() + 1}월 ${selected.getDate()}일 일정` : '날짜를 선택하세요'}
        </h2>
        {selectedTongs.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">선택한 날짜에 통이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {selectedTongs.map((t) => (
              <li key={t.id}>
                <Link to={`/tongs/${t.id}`} className="block rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-gray-900">{t.title}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{formatDateTime(t.scheduled_at)}</p>
                  <div className="mt-2">
                    <Badge className={tongTypeColor(t.type)}>{t.type}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function buildMonth(cursor: Date) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay()) // 일요일 시작

  const weeks: Date[][] = []
  const d = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    weeks.push(week)
  }
  return { weeks, monthLabel: `${year}년 ${month + 1}월` }
}
