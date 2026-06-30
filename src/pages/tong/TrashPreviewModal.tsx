// 통 HADA - 휴지통 항목 읽기 전용 미리보기
//
// 휴지통에 있는 통은 상세 화면으로 열리지 않으므로(상세는 정상 통만 조회),
// 복구/영구삭제 전에 내용을 확인할 수 있도록 읽기 전용으로 보여준다.

import { useMemo } from 'react'
import { useData } from '@/store/DataContext'
import { Modal, Badge } from '@/components/ui'
import { cn, formatDateTime, formatDate, tongStatusColor, tongTypeBadgeClass } from '@/lib/utils'
import { trashPurgeAt } from '@/lib/storage'
import type { Tong, TongInputType } from '@/types'

const TYPE_LABEL: Record<TongInputType, string> = {
  teams: 'Teams 녹취',
  text: '텍스트',
  memo: '메모',
  audio: '음성(STT)',
}

export function TrashPreviewModal({ tong, open, onClose }: { tong: Tong | null; open: boolean; onClose: () => void }) {
  const { inputs, summaries, tongTypes } = useData()

  const tongInputs = useMemo(
    () => (tong ? inputs.filter((i) => i.tong_id === tong.id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)) : []),
    [inputs, tong],
  )
  const summary = useMemo(() => (tong ? summaries.find((s) => s.tong_id === tong.id) ?? null : null), [summaries, tong])

  if (!tong) return null

  return (
    <Modal open={open} onClose={onClose} title={tong.title} footer={<button className="btn-secondary" onClick={onClose}>닫기</button>}>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {/* 삭제 안내 */}
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          휴지통 항목 (읽기 전용)
          {tong.deleted_at && ` · 삭제됨 ${formatDateTime(tong.deleted_at)}`}
          {tong.deleted_at && ` · ${formatDate(trashPurgeAt(tong.deleted_at))} 자동 삭제 예정`}
        </p>

        {/* 기본 정보 */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={tongTypeBadgeClass(tong.type, tongTypes)}>{tong.type}</Badge>
          <Badge className={tongStatusColor(tong.status)}>{tong.status}</Badge>
          <span className="text-xs text-gray-400">{tong.org_name} · {formatDateTime(tong.scheduled_at)}</span>
        </div>

        {tong.participants.length > 0 && (
          <p className="text-sm text-gray-600"><span className="text-gray-400">참석자 </span>{tong.participants.join(', ')}</p>
        )}
        {tong.agenda && <Field label="안건" value={tong.agenda} />}
        {tong.references && <Field label="관련 자료" value={tong.references} />}

        {/* AI 요약 */}
        {summary && (
          <div className="rounded-xl border border-gray-100 p-3">
            <p className="mb-1 text-xs font-semibold text-gray-400">AI 요약</p>
            {summary.one_line && <p className="text-sm text-gray-700">{summary.one_line}</p>}
            {summary.full_summary && (
              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-500">{summary.full_summary}</p>
            )}
            {summary.recurring_keywords.length > 0 && (
              <p className="mt-2 text-xs text-violet-600">{summary.recurring_keywords.map((k) => `#${k}`).join(' ')}</p>
            )}
          </div>
        )}

        {/* 입력 기록 */}
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-400">입력 기록 ({tongInputs.length})</p>
          {tongInputs.length === 0 ? (
            <p className="text-sm text-gray-400">입력 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {tongInputs.map((i) => (
                <li key={i.id} className="rounded-lg border border-gray-100 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge className="bg-brand-50 text-brand-700">{TYPE_LABEL[i.input_type]}</Badge>
                    <span className="text-xs text-gray-400">{formatDateTime(i.created_at)}</span>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-xs text-gray-600">{i.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className={cn('text-sm text-gray-600')}>
      <span className="text-gray-400">{label} </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </p>
  )
}
