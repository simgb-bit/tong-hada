// 통 HADA - 그룹웨어 사원/조직 연동 (Mock)
//
// 사내 그룹웨어에서 사원 정보를 동기화합니다.
// 현재는 Mock 구현으로, 동기화 버튼 클릭 시 샘플 사원 데이터를 반환합니다.
//
// TODO: 실제 그룹웨어 / HR 시스템 연동
//   - 사내 그룹웨어 OpenAPI 또는 M365(Entra ID) 디렉터리 동기화
//   - 조직 계층(Company/CoreGroup/Core/Cell) 매핑 규칙 정의
//   - 증분 동기화(변경분만) 및 퇴사자 처리 로직 추가

import { seedEmployees } from '@/lib/seed'
import { uid } from '@/lib/db'
import type { Employee } from '@/types'

/** 동기화 시 추가로 들어오는 신규 사원(Mock) */
const ADDITIONAL_EMPLOYEES: Omit<Employee, 'id' | 'created_at'>[] = [
  { name: '오윤서', email: 'yunseo.oh@visang.com', employee_no: 'V2023201', position: '사원', org_id: 'cell-ax', org_name: 'AX추진 Cell' },
  { name: '신재현', email: 'jaehyun.shin@visang.com', employee_no: 'V2016012', position: '수석', org_id: 'core-textbook', org_name: '교재개발 Core' },
]

/**
 * 그룹웨어에서 사원 정보를 동기화합니다. (Mock)
 *
 * @returns 동기화된 전체 사원 목록
 */
export async function syncEmployeesFromGroupware(): Promise<Employee[]> {
  // 동기화 처리 시간 흉내
  await new Promise((r) => setTimeout(r, 1200))

  const nowIso = new Date().toISOString()
  const added: Employee[] = ADDITIONAL_EMPLOYEES.map((e) => ({
    ...e,
    id: uid('emp'),
    created_at: nowIso,
  }))

  // 기존 시드 사원 + 신규 사원
  return [...structuredClone(seedEmployees), ...added]
}
