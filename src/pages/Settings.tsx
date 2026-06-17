// 통 HADA - 설정

import { useData } from '@/store/DataContext'
import { PageHeader, Card, Badge } from '@/components/ui'

export function Settings() {
  const { backendMode, refresh, organizations, employees, tongs, actionItems } = useData()

  const integrations = [
    { name: 'AI 요약', file: 'src/lib/ai.ts', fn: 'generateTongSummary()', status: 'Mock' },
    { name: '음성 변환 (STT)', file: 'src/lib/stt.ts', fn: 'transcribeAudioFile()', status: 'Mock' },
    { name: 'Teams 녹취', file: 'src/lib/teams.ts', fn: 'fetchTeamsTranscript()', status: 'Mock' },
    { name: '그룹웨어 연동', file: 'src/lib/groupware.ts', fn: 'syncEmployeesFromGroupware()', status: 'Mock' },
  ]

  return (
    <div>
      <PageHeader title="설정" subtitle="서비스 정보와 연동 상태를 확인합니다." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">백엔드 (Supabase)</h3>
          <div className="space-y-3 text-sm">
            <Row label="저장소 모드">
              <Badge className={backendMode === 'supabase' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                {backendMode === 'supabase' ? 'Supabase 연결됨' : 'Demo (In-Memory)'}
              </Badge>
            </Row>
            <Row label="환경 변수">
              <span className="text-gray-500">VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY</span>
            </Row>
            {backendMode === 'memory' && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                현재 데모용 In-Memory 저장소로 동작 중입니다. <code>.env</code> 파일에 Supabase 정보를 설정하면 실제 DB 에 저장됩니다.
                (브라우저 새로고침 시 데이터는 샘플로 초기화됩니다 — localStorage 는 사용하지 않습니다.)
              </p>
            )}
          </div>
          <button className="btn-secondary mt-4" onClick={() => refresh()}>데이터 새로고침</button>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-gray-900">데이터 현황</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="조직" value={organizations.length} />
            <Stat label="사원" value={employees.length} />
            <Stat label="통" value={tongs.length} />
            <Stat label="후속 과제" value={actionItems.length} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-gray-900">외부 연동 상태</h3>
          <p className="mb-4 text-sm text-gray-500">모든 외부 연동은 현재 Mock 으로 구현되어 있으며, 실제 API 연동을 위한 TODO 주석이 포함되어 있습니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-400">
                  <th className="py-2 pr-4 font-medium">연동</th>
                  <th className="py-2 pr-4 font-medium">파일</th>
                  <th className="py-2 pr-4 font-medium">함수</th>
                  <th className="py-2 pr-4 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((it) => (
                  <tr key={it.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{it.name}</td>
                    <td className="py-2.5 pr-4"><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{it.file}</code></td>
                    <td className="py-2.5 pr-4"><code className="text-xs text-gray-500">{it.fn}</code></td>
                    <td className="py-2.5 pr-4"><Badge className="bg-violet-50 text-violet-700">{it.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-2 font-semibold text-gray-900">통 HADA 소개</h3>
          <p className="text-sm leading-relaxed text-gray-500">
            통 HADA 는 단순 회의록 작성 도구가 아닙니다. 비상교육의 회의(통) 문화를 표준화하고, 회의 내용을 AI 가 구조화하여
            결정사항과 후속 과제를 정리합니다. 이렇게 정리된 데이터는 Company · CoreGroup · Core · Cell 단위의 조직 운영 데이터로 축적되어,
            향후 그룹웨어 · M365 · AI API 연계가 가능한 Work AI 플랫폼을 지향합니다.
          </p>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span>{children}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
