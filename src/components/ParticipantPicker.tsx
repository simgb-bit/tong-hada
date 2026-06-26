// 통 HADA - 참석자 검색 선택기
//
// 대규모(1000명+) 사원을 전부 나열하지 않고, 검색해서 추가하는 방식.
// 기본은 빈 상태이며 검색어를 입력해야 결과가 나옵니다.
//
// 현재는 메모리의 employees 배열을 클라이언트에서 검색합니다.
// 추후 그룹웨어/MS Graph 연동 시 searchEmployees 만 서버 쿼리(디바운스)로 교체하면 됩니다.

import { useMemo, useState } from 'react'
import { SearchIcon, PlusIcon, XIcon } from '@/components/icons'
import type { Employee } from '@/types'

/** 한 번에 보여줄 최대 검색 결과 수 */
const MAX_RESULTS = 20

/**
 * 참석자 저장 라벨: Teams 와 동일하게 "이름 (조직명)" 으로 동명이인을 구분한다.
 * (예: "심규빈 (AX추진 Cell)")
 */
export function participantLabel(e: Employee): string {
  return `${e.name} (${e.org_name})`
}

/** 이름/사번/조직명으로 사원 검색 (대소문자 무시) */
function searchEmployees(employees: Employee[], query: string): Employee[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return employees.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.employee_no.toLowerCase().includes(q) ||
      e.org_name.toLowerCase().includes(q),
  )
}

export function ParticipantPicker({
  employees,
  value,
  onChange,
}: {
  employees: Employee[]
  /** 선택된 참석자 이름 목록 */
  value: string[]
  onChange: (names: string[]) => void
}) {
  const [q, setQ] = useState('')

  const selected = useMemo(() => new Set(value), [value])

  // 검색 결과 (이미 선택된 사람 제외)
  const matches = useMemo(() => searchEmployees(employees, q).filter((e) => !selected.has(participantLabel(e))), [employees, q, selected])
  const results = matches.slice(0, MAX_RESULTS)
  const overflow = matches.length - results.length

  function add(e: Employee) {
    const label = participantLabel(e)
    if (!selected.has(label)) onChange([...value, label])
  }
  function remove(label: string) {
    onChange(value.filter((n) => n !== label))
  }

  return (
    <div>
      {/* 선택된 참석자 칩 */}
      {value.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {value.map((label) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 text-sm text-brand-700">
              {label}
              <button type="button" onClick={() => remove(label)} className="rounded-full p-0.5 hover:bg-brand-100" title="제거">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-gray-400">선택된 참석자가 없습니다.</p>
      )}

      {/* 검색 입력 */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <input
          className="input pl-9"
          placeholder="이름·사번·조직 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* 검색 결과 */}
      {q.trim() && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-100">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400">검색 결과가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {results.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => add(e)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800">{e.name}</p>
                      <p className="truncate text-xs text-gray-400">{e.position} · {e.org_name} · {e.employee_no}</p>
                    </div>
                    <PlusIcon className="h-4 w-4 shrink-0 text-brand-500" />
                  </button>
                </li>
              ))}
              {overflow > 0 && (
                <li className="px-3 py-2 text-xs text-gray-400">검색 결과가 {overflow}명 더 있습니다. 검색어를 더 입력해 좁혀보세요.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
