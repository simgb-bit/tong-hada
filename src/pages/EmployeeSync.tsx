// 통 HADA - 사원/조직 연동 (그룹웨어 Mock)

import { useState } from 'react'
import { useData } from '@/store/DataContext'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { UsersIcon, RefreshIcon } from '@/components/icons'
import { formatDateTime } from '@/lib/utils'
import { syncEmployeesFromGroupware } from '@/lib/groupware'

export function EmployeeSync() {
  const { employees, setEmployees } = useData()
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  async function sync() {
    setSyncing(true)
    try {
      const result = await syncEmployeesFromGroupware()
      await setEmployees(result)
      setLastSync(new Date().toISOString())
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="사원/조직 연동"
        subtitle="향후 그룹웨어 연계를 위한 사원 데이터입니다. (현재 Mock)"
        actions={
          <button className="btn-primary" onClick={sync} disabled={syncing}>
            <RefreshIcon className="h-4 w-4" />{syncing ? '동기화 중…' : '그룹웨어 동기화'}
          </button>
        }
      />

      <Card className="mb-6 border-brand-100 bg-brand-50/50">
        <div className="flex items-start gap-3">
          <UsersIcon className="mt-0.5 h-5 w-5 text-brand-500" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-800">그룹웨어 연동 안내</p>
            <p className="mt-1 text-gray-500">
              현재는 Mock 데이터로 동작합니다. 실제 연동 시 사내 그룹웨어 / M365(Entra ID) 디렉터리에서 사원·조직 정보를 동기화합니다.
              관련 코드: <code className="rounded bg-white px-1 py-0.5 text-xs">src/lib/groupware.ts</code> 의 <code className="rounded bg-white px-1 py-0.5 text-xs">syncEmployeesFromGroupware()</code>
            </p>
            {lastSync && <p className="mt-2 text-xs text-brand-600">최근 동기화: {formatDateTime(lastSync)}</p>}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-semibold text-gray-900">사원 목록 ({employees.length})</h3>
        {employees.length === 0 ? (
          <EmptyState icon={<UsersIcon className="h-10 w-10" />} title="동기화된 사원이 없습니다." description="그룹웨어 동기화 버튼을 눌러 데이터를 가져오세요." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                  <th className="py-2 pr-4 font-medium">이름</th>
                  <th className="py-2 pr-4 font-medium">사번</th>
                  <th className="py-2 pr-4 font-medium">직책</th>
                  <th className="py-2 pr-4 font-medium">조직</th>
                  <th className="py-2 pr-4 font-medium">이메일</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{e.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{e.employee_no}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{e.position}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{e.org_name}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{e.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
