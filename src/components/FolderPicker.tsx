// 통 HADA - 폴더 분류 선택기 (다중)
//
// 현재 담긴 폴더를 칩으로 보여주고, 버튼으로 폴더 체크리스트(다중 토글)를 엽니다.
// 통 상세(서버 반영)와 통 생성(로컬 상태) 양쪽에서 재사용합니다.

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FolderIcon, FolderPlusIcon } from '@/components/icons'
import type { Folder } from '@/types'

export function FolderPicker({
  folders,
  selectedIds,
  onToggle,
  emptyHint = '폴더가 없습니다. 통 기록함에서 폴더를 먼저 만드세요.',
}: {
  folders: Folder[]
  /** 현재 담긴 폴더 id 목록 */
  selectedIds: string[]
  onToggle: (folderId: string, isIn: boolean) => void
  emptyHint?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = new Set(selectedIds)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedIds.map((fid) => (
        <span key={fid} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm text-brand-700">
          <FolderIcon className="h-3.5 w-3.5" />
          {folders.find((f) => f.id === fid)?.name ?? '알 수 없음'}
        </span>
      ))}

      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600">
          <FolderPlusIcon className="h-4 w-4" />
          {selectedIds.length === 0 ? '폴더에 분류' : '폴더 편집'}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-9 z-20 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400">폴더 분류 (여러 개 가능)</p>
              {folders.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">{emptyHint}</p>
              ) : (
                folders.map((f) => {
                  const isIn = selected.has(f.id)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onToggle(f.id, isIn)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] text-white', isIn ? 'border-brand-500 bg-brand-500' : 'border-gray-300')}>
                        {isIn ? '✓' : ''}
                      </span>
                      <FolderIcon className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 truncate">{f.name}</span>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
