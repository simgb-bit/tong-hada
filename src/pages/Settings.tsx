// 통 HADA - 설정 (Core 리더 이상 전용: 통 유형 관리)

import { useMemo, useState } from 'react'
import { useData } from '@/store/DataContext'
import { useCurrentUser } from '@/store/CurrentUserContext'
import { PageHeader, Card, Badge, ConfirmModal } from '@/components/ui'
import { TrashIcon, PlusIcon, AlertIcon } from '@/components/icons'
import { uid } from '@/lib/db'
import { TONG_TYPE_PALETTE } from '@/lib/utils'
import type { TongTypeColor, TongTypeDef } from '@/types'

const COLORS: TongTypeColor[] = ['purple', 'brand', 'teal', 'gray', 'amber', 'green', 'red', 'violet']

export function Settings() {
  const { organizations, tongTypes, upsertTongType, deleteTongType } = useData()
  const { currentUser, currentCoreId, canManageTongTypes } = useCurrentUser()

  const coreName = useMemo(
    () => organizations.find((o) => o.id === currentCoreId)?.name ?? '',
    [organizations, currentCoreId],
  )
  const coreTypes = useMemo(
    () => tongTypes.filter((t) => t.core_org_id === currentCoreId).sort((a, b) => a.sort_order - b.sort_order),
    [tongTypes, currentCoreId],
  )
  const [error, setError] = useState<string | null>(null)

  if (!canManageTongTypes || !currentCoreId) {
    return (
      <div>
        <PageHeader title="설정" subtitle="서비스 설정을 관리합니다." />
        <Card className="border-amber-100 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertIcon className="mt-0.5 h-5 w-5 text-amber-500" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-800">접근 권한이 없습니다.</p>
              <p className="mt-1 text-gray-500">통 유형 관리는 Core 리더 이상만 사용할 수 있습니다.</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  async function run(fn: () => Promise<void>) {
    try {
      setError(null)
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function addType() {
    const maxOrder = coreTypes.reduce((m, t) => Math.max(m, t.sort_order), 0)
    const def: TongTypeDef = {
      id: uid('tt'),
      core_org_id: currentCoreId!,
      label: '새 유형',
      color: 'brand',
      sort_order: maxOrder + 1,
      created_at: new Date().toISOString(),
    }
    void run(() => upsertTongType(def))
  }

  return (
    <div>
      <PageHeader title="설정" subtitle={`${coreName} · 통 유형 관리`} />

      <Card className="mb-6 border-brand-100 bg-brand-50/50">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">{currentUser?.name}</span> ({currentUser?.position}) 님은{' '}
          <span className="font-medium text-brand-700">{coreName}</span> 의 통 유형을 관리할 수 있습니다.
          여기서 정의한 유형은 이 Core 소속 조직의 새 통 생성 시 선택지로 나타납니다.
        </p>
      </Card>

      {error && (
        <Card className="mb-6 border-red-100 bg-red-50">
          <p className="text-sm text-red-700"><span className="font-medium">저장 실패:</span> {error}</p>
          <p className="mt-1 text-xs text-red-500">Supabase에 <code>tong_types</code> 테이블이 없으면 <code>supabase/schema.sql</code> 을 먼저 실행하세요.</p>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">통 유형 ({coreTypes.length})</h3>
          <button className="btn-primary" onClick={addType}>
            <PlusIcon className="h-4 w-4" />유형 추가
          </button>
        </div>

        {coreTypes.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">등록된 통 유형이 없습니다. "유형 추가"로 시작하세요.</p>
        ) : (
          <ul className="space-y-2">
            {coreTypes.map((def) => (
              <TypeRow
                key={def.id}
                def={def}
                onSave={(t) => run(() => upsertTongType(t))}
                onDelete={(id) => run(() => deleteTongType(id))}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function TypeRow({
  def,
  onSave,
  onDelete,
}: {
  def: TongTypeDef
  onSave: (t: TongTypeDef) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [label, setLabel] = useState(def.label)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function commitLabel() {
    const next = label.trim()
    if (next && next !== def.label) void onSave({ ...def, label: next })
    else setLabel(def.label)
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 p-2">
      <input
        className="input min-w-[140px] flex-1"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
      />
      <select
        className="input w-auto"
        value={def.color}
        onChange={(e) => void onSave({ ...def, color: e.target.value as TongTypeColor })}
      >
        {COLORS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <Badge className={TONG_TYPE_PALETTE[def.color]}>{label.trim() || '미리보기'}</Badge>
      <button
        className="btn-ghost px-2 py-1 text-gray-400 hover:text-red-500"
        onClick={() => setDeleteOpen(true)}
        title="삭제"
      >
        <TrashIcon className="h-4 w-4" />
      </button>

      <ConfirmModal
        open={deleteOpen}
        title="유형을 삭제할까요?"
        message={`'${def.label}' 유형을 삭제합니다. 이 유형이 적용된 통은 유형 표시가 사라집니다.`}
        confirmLabel="삭제"
        onConfirm={() => { setDeleteOpen(false); void onDelete(def.id) }}
        onCancel={() => setDeleteOpen(false)}
      />
    </li>
  )
}
