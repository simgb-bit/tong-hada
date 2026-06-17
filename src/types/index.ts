// 통 HADA - 도메인 타입 정의
// 모든 데이터 모델의 단일 소스(Single Source of Truth)입니다.

/** 조직 계층 레벨 */
export type OrgLevel = 'Company' | 'CoreGroup' | 'Core' | 'Cell'

/** 조직 (Company → CoreGroup → Core → Cell 계층 구조) */
export interface Organization {
  id: string
  name: string
  level: OrgLevel
  /** 상위 조직 id. Company 는 null */
  parent_id: string | null
  created_at: string
}

/** 사원 (그룹웨어 연동 대상) */
export interface Employee {
  id: string
  name: string
  email: string
  /** 사번 */
  employee_no: string
  /** 직책 */
  position: string
  /** 소속 조직 id */
  org_id: string
  /** 소속 조직명 (조회 편의용 비정규화 필드) */
  org_name: string
  created_at: string
}

/** 통 유형 */
export type TongType = '책임자 통' | '주간 통' | '상시 통' | '기타 통'

/** 통 상태 */
export type TongStatus = '예정' | '진행 완료' | '보류'

/** 통(회의) */
export interface Tong {
  id: string
  /** 통명 */
  title: string
  type: TongType
  /** 일시 (ISO 8601) */
  scheduled_at: string
  /** 주관 조직 id */
  org_id: string
  org_name: string
  /** 참석자 (사원 이름 목록) */
  participants: string[]
  /** 안건 */
  agenda: string
  /** 관련 자료 (텍스트/링크) */
  references: string
  status: TongStatus
  created_at: string
  updated_at: string
}

/** 통 입력 방식 */
export type TongInputType = 'teams' | 'text' | 'memo' | 'audio'

/** 통 기록 입력 (Teams 녹취 / 텍스트 / 메모 / 음성) */
export interface TongInput {
  id: string
  tong_id: string
  input_type: TongInputType
  /** 입력 본문 (녹취 텍스트, 직접 입력, 메모, STT 변환 결과) */
  content: string
  created_at: string
}

/** AI 요약 결과 구조 */
export interface TongSummary {
  id: string
  tong_id: string
  /** 1. 한 줄 요약 */
  one_line: string
  /** 2. 주요 쟁점 */
  key_issues: string[]
  /** 3. 결론 */
  conclusions: string[]
  /** 4. 보류 사항 */
  pending_items: string[]
  /** 5. 확인 필요 사항 */
  to_confirm: string[]
  /** 6. 후속 과제 (요약 단계의 초안) */
  action_item_drafts: string[]
  /** 7. 반복 이슈 키워드 */
  recurring_keywords: string[]
  /** 생성 출처: mock | manual(사용자 수정) */
  source: 'mock' | 'manual'
  created_at: string
  updated_at: string
}

/** 후속 과제 상태 */
export type ActionItemStatus = '확인 필요' | '진행 중' | '완료' | '보류'

/** 후속 과제 */
export interface ActionItem {
  id: string
  tong_id: string
  /** 관련 통명 (조회 편의용) */
  tong_title: string
  /** 과제명 */
  title: string
  /**
   * 담당자. AI 가 확정하지 않습니다.
   * 불명확할 경우 null 이며 UI 에서 "확인 필요" 로 표시합니다.
   */
  assignee: string | null
  /** 담당 조직 id (불명확 시 null) */
  assignee_org_id: string | null
  assignee_org_name: string | null
  /** 기한 (ISO 8601 date) */
  due_date: string | null
  status: ActionItemStatus
  /** 근거 내용 (회의 기록 중 이 과제의 출처) */
  evidence: string
  created_at: string
  updated_at: string
}

/** 첨부 파일 메타데이터 (음성 파일 등) */
export interface Attachment {
  id: string
  tong_id: string
  /** 파일명 */
  file_name: string
  /** 파일 크기 (bytes) */
  file_size: number
  /** MIME 타입 */
  mime_type: string
  /** 스토리지 경로 또는 URL (Mock 단계에서는 빈 값 허용) */
  storage_path: string
  /** 업로드 일시 */
  uploaded_at: string
}
