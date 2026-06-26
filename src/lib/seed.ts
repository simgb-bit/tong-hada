// 통 HADA - 초기 샘플 데이터
//
// 앱 최초 실행 시(데이터가 비어 있을 때) 자동으로 주입됩니다.
// In-Memory 저장소와 Supabase 시드(seed) 양쪽에서 동일하게 사용합니다.

import type {
  Attachment,
  Employee,
  Folder,
  FolderItem,
  Organization,
  Tong,
  TongInput,
  TongShare,
  TongSummary,
  TongTypeDef,
} from '@/types'

const now = new Date('2026-06-17T09:00:00+09:00')

function isoOffsetDays(days: number, hour = 10): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

// ── 조직 (Company → CoreGroup → Core → Cell) ───────────────────────────────
export const seedOrganizations: Organization[] = [
  // Company
  { id: 'org-company', name: '비상교육', level: 'Company', parent_id: null, created_at: now.toISOString() },

  // CoreGroup
  { id: 'cg-content', name: '콘텐츠 CoreGroup', level: 'CoreGroup', parent_id: 'org-company', created_at: now.toISOString() },
  { id: 'cg-platform', name: '플랫폼 CoreGroup', level: 'CoreGroup', parent_id: 'org-company', created_at: now.toISOString() },
  { id: 'cg-management', name: '경영지원 CoreGroup', level: 'CoreGroup', parent_id: 'org-company', created_at: now.toISOString() },

  // Core
  { id: 'core-textbook', name: '교재개발 Core', level: 'Core', parent_id: 'cg-content', created_at: now.toISOString() },
  { id: 'core-digital', name: '디지털콘텐츠 Core', level: 'Core', parent_id: 'cg-content', created_at: now.toISOString() },
  { id: 'core-ax', name: 'AX추진 Core', level: 'Core', parent_id: 'cg-platform', created_at: now.toISOString() },

  // Cell
  { id: 'cell-ax', name: 'AX추진 Cell', level: 'Cell', parent_id: 'core-ax', created_at: now.toISOString() },
  { id: 'cell-kids', name: '유아콘텐츠 Cell', level: 'Cell', parent_id: 'core-digital', created_at: now.toISOString() },
  { id: 'cell-platform', name: '플랫폼기획 Cell', level: 'Cell', parent_id: 'core-ax', created_at: now.toISOString() },
]

// ── 사원 (그룹웨어 연동 대상 Mock) ─────────────────────────────────────────
export const seedEmployees: Employee[] = [
  { id: 'emp-1', name: '김도윤', email: 'doyun.kim@visang.com', employee_no: 'V2019001', position: 'Cell Leader', org_id: 'cell-ax', org_name: 'AX추진 Cell', created_at: now.toISOString() },
  { id: 'emp-2', name: '이서연', email: 'seoyeon.lee@visang.com', employee_no: 'V2020114', position: '책임', org_id: 'cell-ax', org_name: 'AX추진 Cell', created_at: now.toISOString() },
  { id: 'emp-3', name: '박지호', email: 'jiho.park@visang.com', employee_no: 'V2021077', position: '선임', org_id: 'cell-platform', org_name: '플랫폼기획 Cell', created_at: now.toISOString() },
  { id: 'emp-4', name: '최하은', email: 'haeun.choi@visang.com', employee_no: 'V2018045', position: 'Core Leader', org_id: 'core-ax', org_name: 'AX추진 Core', created_at: now.toISOString() },
  { id: 'emp-5', name: '정민준', email: 'minjun.jung@visang.com', employee_no: 'V2022150', position: '사원', org_id: 'cell-kids', org_name: '유아콘텐츠 Cell', created_at: now.toISOString() },
  { id: 'emp-6', name: '한소율', email: 'soyul.han@visang.com', employee_no: 'V2017030', position: '책임', org_id: 'core-textbook', org_name: '교재개발 Core', created_at: now.toISOString() },
]

// ── 통 유형 (Core 단위 커스텀) ─────────────────────────────────────────────
// 기본 유형 없음 — Core 마다 자체적으로 정의합니다.
export const seedTongTypes: TongTypeDef[] = [
  // AX추진 Core
  { id: 'tt-ax-1', core_org_id: 'core-ax', label: '책임자 통', color: 'purple', sort_order: 1, created_at: now.toISOString() },
  { id: 'tt-ax-2', core_org_id: 'core-ax', label: '주간 통', color: 'brand', sort_order: 2, created_at: now.toISOString() },
  { id: 'tt-ax-3', core_org_id: 'core-ax', label: '기타 통', color: 'gray', sort_order: 3, created_at: now.toISOString() },
  // 디지털콘텐츠 Core
  { id: 'tt-dg-1', core_org_id: 'core-digital', label: '상시 통', color: 'teal', sort_order: 1, created_at: now.toISOString() },
  { id: 'tt-dg-2', core_org_id: 'core-digital', label: '주간 통', color: 'brand', sort_order: 2, created_at: now.toISOString() },
  // 교재개발 Core (전혀 다른 호칭 — Core 별 커스텀 예시)
  { id: 'tt-tb-1', core_org_id: 'core-textbook', label: '편집 회의', color: 'violet', sort_order: 1, created_at: now.toISOString() },
  { id: 'tt-tb-2', core_org_id: 'core-textbook', label: '교정 점검 통', color: 'amber', sort_order: 2, created_at: now.toISOString() },
]

// ── 통 (회의) ──────────────────────────────────────────────────────────────
export const seedTongs: Tong[] = [
  {
    id: 'tong-1',
    title: '제품 로드맵 작성 통',
    type: '책임자 통',
    scheduled_at: isoOffsetDays(0, 10),
    org_id: 'cell-ax',
    org_name: 'AX추진 Cell',
    participants: ['김도윤 (AX추진 Cell)', '이서연 (AX추진 Cell)', '최하은 (AX추진 Core)'],
    agenda: '하반기 제품 로드맵 확정, 우선순위 정렬, 리소스 배분',
    references: '2026 상반기 회고 문서, 경쟁사 벤치마크 자료',
    status: '예정',
    created_by: 'emp-4',
    created_at: isoOffsetDays(-3),
    updated_at: isoOffsetDays(-3),
  },
  {
    id: 'tong-2',
    title: '마케팅 캠페인 주간 점검 통',
    type: '주간 통',
    scheduled_at: isoOffsetDays(-2, 14),
    org_id: 'cell-platform',
    org_name: '플랫폼기획 Cell',
    participants: ['박지호 (플랫폼기획 Cell)', '정민준 (유아콘텐츠 Cell)'],
    agenda: '신학기 캠페인 진행 현황, 채널별 성과, 예산 집행 점검',
    references: '주간 성과 대시보드',
    status: '진행 완료',
    created_by: 'emp-3',
    created_at: isoOffsetDays(-9),
    updated_at: isoOffsetDays(-2),
  },
  {
    id: 'tong-3',
    title: '신규 프로젝트 킥오프 통',
    type: '기타 통',
    scheduled_at: isoOffsetDays(-5, 11),
    org_id: 'core-ax',
    org_name: 'AX추진 Core',
    participants: ['최하은 (AX추진 Core)', '김도윤 (AX추진 Cell)', '박지호 (플랫폼기획 Cell)', '한소율 (교재개발 Core)'],
    agenda: 'AI 회의 플랫폼 프로젝트 범위 정의, 역할 분담, 마일스톤 설정',
    references: '프로젝트 제안서 v0.9',
    status: '진행 완료',
    created_by: 'emp-4',
    created_at: isoOffsetDays(-12),
    updated_at: isoOffsetDays(-5),
  },
  {
    id: 'tong-4',
    title: '서비스 개선 의견 수렴 통',
    type: '상시 통',
    scheduled_at: isoOffsetDays(2, 15),
    org_id: 'cell-kids',
    org_name: '유아콘텐츠 Cell',
    participants: ['정민준 (유아콘텐츠 Cell)', '한소율 (교재개발 Core)'],
    agenda: '고객 피드백 기반 서비스 개선 아이디어 수렴 및 우선순위화',
    references: 'VOC 수집 리포트 5월',
    status: '예정',
    created_by: 'emp-5',
    created_at: isoOffsetDays(-1),
    updated_at: isoOffsetDays(-1),
  },
]

// ── 통 입력 기록 ───────────────────────────────────────────────────────────
export const seedInputs: TongInput[] = [
  {
    id: 'input-1',
    tong_id: 'tong-2',
    input_type: 'teams',
    content:
      '[Teams 녹취]\n박지호: 이번 주 캠페인 클릭률은 전주 대비 12% 상승했습니다.\n정민준: 다만 전환율은 정체 상태입니다. 랜딩 페이지 개선이 필요합니다.\n박지호: 예산은 70% 집행되었고, 남은 예산은 성과 좋은 채널에 재배분하겠습니다.\n정민준: 디자인 리소스가 부족해 랜딩 개선 일정이 다음 주로 밀릴 수 있습니다.',
    created_at: isoOffsetDays(-2),
  },
  {
    id: 'input-2',
    tong_id: 'tong-3',
    input_type: 'text',
    content:
      '프로젝트 범위는 회의 기록 구조화와 후속 과제 자동 정리로 한정한다. STT/AI는 1차에서 Mock으로 구현하고, 2차에서 실제 API 연동을 검토한다. 마일스톤은 4주 단위로 설정하며, 첫 데모는 3주 차에 진행한다. 요구사항이 변경될 가능성이 있어 범위 관리가 중요하다.',
    created_at: isoOffsetDays(-5),
  },
]

// ── AI 요약 ────────────────────────────────────────────────────────────────
export const seedSummaries: TongSummary[] = [
  {
    id: 'sum-2',
    tong_id: 'tong-2',
    one_line: '캠페인 클릭률은 상승했으나 전환율 정체로 랜딩 페이지 개선이 시급함.',
    key_issues: ['전환율 정체', '디자인 리소스 부족으로 일정 지연 우려', '잔여 예산 재배분'],
    conclusions: ['성과 좋은 채널로 잔여 예산 재배분', '랜딩 페이지 개선 추진'],
    pending_items: ['랜딩 페이지 개선 일정 확정 (디자인 리소스 확보 후)'],
    to_confirm: ['디자인 리소스 추가 투입 가능 여부'],
    action_item_drafts: ['랜딩 페이지 개선안 초안 작성', '잔여 예산 채널별 재배분 계획 수립'],
    recurring_keywords: ['일정 지연', '의사소통 부족'],
    source: 'mock',
    created_at: isoOffsetDays(-2),
    updated_at: isoOffsetDays(-2),
  },
  {
    id: 'sum-3',
    tong_id: 'tong-3',
    one_line: 'AI 회의 플랫폼 1차 범위를 Mock 기반으로 확정하고 4주 마일스톤을 설정함.',
    key_issues: ['요구사항 변경 가능성', '범위 관리 필요', '실제 API 연동 시점'],
    conclusions: ['1차는 Mock 구현', '4주 단위 마일스톤, 3주 차 첫 데모'],
    pending_items: ['실제 STT/AI API 연동은 2차로 보류'],
    to_confirm: ['2차 API 연동 예산 및 일정'],
    action_item_drafts: ['프로젝트 범위 정의서 확정', '마일스톤 일정표 공유'],
    recurring_keywords: ['요구사항 변경', '우선순위 불명확'],
    source: 'mock',
    created_at: isoOffsetDays(-5),
    updated_at: isoOffsetDays(-5),
  },
]

// ── 첨부 파일 ──────────────────────────────────────────────────────────────
export const seedAttachments: Attachment[] = []

// ── 통 공유 (데모: tong-2 를 emp-3 → emp-4 에게 공유) ────────────────────────
export const seedShares: TongShare[] = [
  { id: 'share-1', tong_id: 'tong-2', shared_with: 'emp-4', shared_by: 'emp-3', permission: 'view', created_at: isoOffsetDays(-2) },
]

// ── 개인 폴더 (데모: 기본 페르소나 emp-4 의 폴더) ────────────────────────────
export const seedFolders: Folder[] = [
  { id: 'folder-1', owner_id: 'emp-4', name: '1분기 회의', parent_id: null, sort_order: 1, created_at: isoOffsetDays(-10) },
  { id: 'folder-2', owner_id: 'emp-4', name: '공유 자료', parent_id: null, sort_order: 2, created_at: isoOffsetDays(-8) },
]

// ── 폴더-통 매핑 ─────────────────────────────────────────────────────────────
export const seedFolderItems: FolderItem[] = [
  { folder_id: 'folder-1', tong_id: 'tong-1', added_at: isoOffsetDays(-9) },
  { folder_id: 'folder-2', tong_id: 'tong-2', added_at: isoOffsetDays(-2) },
]

export interface SeedBundle {
  organizations: Organization[]
  employees: Employee[]
  tongs: Tong[]
  inputs: TongInput[]
  summaries: TongSummary[]
  tongTypes: TongTypeDef[]
  attachments: Attachment[]
  shares: TongShare[]
  folders: Folder[]
  folderItems: FolderItem[]
}

/** 깊은 복사된 시드 번들을 반환 (In-Memory 저장소 초기화용) */
export function buildSeedBundle(): SeedBundle {
  return structuredClone({
    organizations: seedOrganizations,
    employees: seedEmployees,
    tongs: seedTongs,
    inputs: seedInputs,
    summaries: seedSummaries,
    tongTypes: seedTongTypes,
    attachments: seedAttachments,
    shares: seedShares,
    folders: seedFolders,
    folderItems: seedFolderItems,
  })
}

/** 자주 쓰는 샘플 반복 이슈 키워드 */
export const sampleKeywords = ['일정 지연', '요구사항 변경', '의사소통 부족', '우선순위 불명확']
