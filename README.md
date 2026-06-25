# 통 HADA (Tong HADA)

비상교육 사내 **Work AI 플랫폼** MVP.

통 HADA 는 단순 회의록 작성 도구가 아닙니다. 비상교육의 회의(**통**) 문화를 표준화하고,
회의 내용을 AI 가 구조화하여 핵심 쟁점·결론을 정리하며, 이를 **Company · CoreGroup · Core · Cell**
단위의 조직 운영 데이터로 축적하는 플랫폼입니다.

## 기술 스택

- **Frontend**: React 18 · Vite · TypeScript · Tailwind CSS · React Router
- **Backend**: Supabase (데이터 / 파일 메타데이터)
- **배포**: GitHub · Vercel

## 빠른 시작

```bash
npm install
npm run dev      # http://localhost:5173
```

> Supabase 환경 변수가 없으면 **데모용 In-Memory 저장소**(샘플 데이터)로 자동 동작합니다.
> (localStorage 는 사용하지 않습니다. 새로고침 시 샘플로 초기화됩니다.)

### Supabase 연결 (선택)

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor 에서 [`supabase/schema.sql`](supabase/schema.sql) → [`supabase/policies.sql`](supabase/policies.sql) 순서로 실행
3. `.env` 파일 생성 (`.env.example` 참고)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

4. `npm run dev` — 이제 모든 데이터가 Supabase 에 저장됩니다. (조직 데이터가 비어 있으면 샘플 자동 주입)

## 기능 (MVP)

| 메뉴 | 설명 |
|------|------|
| 홈 | 오늘의 통, 최근 통 기록, 반복 이슈 키워드 대시보드 (좌측 상단 로고 클릭 시 홈 이동) |
| 새 통 만들기 | 통명·유형·일시·참석자·안건·관련 자료·상태 입력 (주관 조직은 사용자 소속으로 자동 설정) |
| 통 기록함 | 검색/필터 + **목록 / 캘린더** 뷰 토글 |
| 통 상세 | 3개 탭 — 기본 정보 / 입력 / AI 요약 |
| 분석 | 유형별/조직별 통 개수, 반복 키워드, 최근 쟁점 등 |
| 설정 | **Core 리더 이상 전용** — 통 유형 관리 |

### 통 유형 커스텀 (조직별)

통 유형은 고정값이 아니라 **Core 단위로 직접 정의**합니다.

- 각 Core 가 자체 통 유형(이름·색상)을 추가/수정/삭제 — **설정** 메뉴에서 관리
- 새 통 생성 시 **사용자 소속 Core 의 유형만** 선택지로 노출
- 데이터: `tong_types` 테이블 (Core 단위), `Tong.type` 은 유형 라벨 문자열

### 권한 / 사용자

- 현재 사용자(로그인) 개념을 `CurrentUserContext` 로 관리하고, **직책이 Core 리더 이상**이면 통 유형 관리 권한을 부여합니다.
- 지금은 **페르소나(헤더의 사용자 선택)** 방식이며, 추후 **Teams(Entra ID) 로그인**으로 교체 예정입니다. (인증부만 국소 교체)

### 통 상세 · 입력 탭 (입력 방식)

- **Teams 녹취**: `Teams 녹취 가져오기` 버튼 → Mock 녹취 생성
- **텍스트 / 메모 입력**: 직접 입력
- **음성 녹음·파일**: 노트북 마이크로 **직접 녹음**하거나 mp3/wav 업로드 → `STT 변환`(현재 Mock)

### AI 요약 (7개 항목)

`generateTongSummary()` 가 입력 기록을 바탕으로 다음을 생성합니다 (현재 Mock, 사용자 수정 가능):

1. 한 줄 요약 2. 주요 쟁점 3. 결론 4. 보류 사항 5. 확인 필요 사항 6. 후속 과제(초안) 7. 반복 이슈 키워드

## Mock 연동 구조

외부 연동은 Mock 으로 구현되어 있으며, 실제 연동을 위한 `TODO` 주석이 포함되어 있습니다.

| 파일 | 함수 | 용도 |
|------|------|------|
| [`src/lib/ai.ts`](src/lib/ai.ts) | `generateTongSummary()` | AI 요약 |
| [`src/lib/stt.ts`](src/lib/stt.ts) | `transcribeAudioFile()` | 음성 → 텍스트 |
| [`src/lib/teams.ts`](src/lib/teams.ts) | `fetchTeamsTranscript()` | Teams 녹취 |

> 마이크 녹음 자체는 브라우저 `MediaRecorder` 로 실제 동작하며, 녹음 결과의 텍스트 변환만 Mock(STT) 입니다.

## 프로젝트 구조

```
src/
├── types/            # 도메인 타입 (Organization, Employee, Tong, TongInput, TongSummary, TongTypeDef, Attachment)
├── lib/
│   ├── supabase.ts   # Supabase 클라이언트 (단일 인스턴스)
│   ├── db.ts         # Repository (Supabase ↔ In-Memory 자동 전환)
│   ├── seed.ts       # 샘플 데이터 (Core별 통 유형 포함)
│   ├── auth.ts       # 직책/권한 헬퍼 (Core 리더 이상 판별)
│   ├── ai.ts / stt.ts / teams.ts   # Mock 연동
│   ├── selectors.ts  # 집계/파생 계산
│   └── utils.ts      # 공통 유틸 (날짜/색상 등)
├── store/
│   ├── DataContext.tsx        # 전역 데이터 상태 + CRUD
│   └── CurrentUserContext.tsx # 현재 로그인 사용자 (페르소나 → 추후 Teams)
├── components/       # Layout, Sidebar, TongCalendar, 공용 UI, 아이콘
└── pages/            # 화면 (tong/ 하위는 상세 탭들)
```

## 배포 (Vercel)

1. GitHub 저장소 push
2. Vercel 에서 import (Framework: **Vite** 자동 감지)
3. Environment Variables 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 (값 중복·공백 없이)
4. Deploy

## 스크립트

```bash
npm run dev       # 개발 서버
npm run build     # 타입 체크 + 프로덕션 빌드
npm run preview   # 빌드 결과 미리보기
```
