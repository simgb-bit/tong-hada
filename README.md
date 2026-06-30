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
   - **이미 구버전 스키마로 만든 프로젝트**는 아래 마이그레이션을 추가 실행:
     - [`migration_folders.sql`](supabase/migration_folders.sql) — 폴더·공유 (`folders`/`folder_items`/`tong_shares` + `tongs.created_by`)
     - [`migration_trash.sql`](supabase/migration_trash.sql) — 휴지통 (`tongs.deleted_at`)
     - [`cron_purge_trash.sql`](supabase/cron_purge_trash.sql) — 휴지통 90일 자동 비우기(pg_cron)
     - [`migration_audio_retention.sql`](supabase/migration_audio_retention.sql) — 음원 보관 (`attachments.expires_at` + `recordings` 버킷)
     - [`cron_purge_recordings.sql`](supabase/cron_purge_recordings.sql) — 음원 90일 자동 삭제(pg_cron)
     - [`migration_input_author.sql`](supabase/migration_input_author.sql) — 입력 기록 작성자·소프트삭제 (`tong_inputs.created_by` / `created_by_name` / `deleted_at`)
     - [`migration_summary_comments.sql`](supabase/migration_summary_comments.sql) — AI 요약 전체 내용(`tong_summaries.full_summary`) + 댓글(`tong_comments`)
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
| 새 통 만들기 | 통명·유형·일시·참석자·안건·관련 자료·상태 입력 (주관 조직은 사용자 소속으로 자동 설정). 참석자는 **검색해서 추가**, 추가된 참석자에게 **자동으로 입력 권한(편집) 공유** |
| 통 기록함 | 검색/필터 + **목록 / 캘린더** 뷰 토글 + **폴더**(스마트 폴더 + 개인 폴더) + **휴지통** + **페이지네이션**(10개/페이지) |
| 통 상세 | 3개 탭 — 기본 정보 / 입력 / AI 요약 + **공유**(사원에게 보기/편집 권한 부여) + 삭제 시 **휴지통 이동**. 입력 기록은 **클릭 시 전체 내용·작성자 상세 보기**, **소프트 삭제(복구 가능)** — 삭제 시 AI 요약에서 제외. 보기 권한자는 **읽기 전용** |
| 분석 | 유형별/조직별 통 개수, 반복 키워드, 최근 쟁점 등 |
| 설정 | **Core 리더 이상 전용** — 통 유형 관리 |

### 통 유형 커스텀 (조직별)

통 유형은 고정값이 아니라 **Core 단위로 직접 정의**합니다.

- 각 Core 가 자체 통 유형(이름·색상)을 추가/수정/삭제 — **설정** 메뉴에서 관리
- 새 통 생성 시 **사용자 소속 Core 의 유형만** 선택지로 노출
- 데이터: `tong_types` 테이블 (Core 단위), `Tong.type` 은 유형 라벨 문자열

### 통 기록함 — 폴더 / 공유

통 기록함은 좌측 폴더 패널로 통을 분류합니다. **스마트 폴더(자동) + 개인 폴더(수동)** 의 1단계 평면 구조이며, 한 통을 **여러 폴더에 동시에** 담을 수 있는 **다중 분류(태그형)** 입니다.

- **스마트 폴더** (고정·자동 분류)
  - `전체`: **내가 관여한 통** = `내 통` ∪ `공유받은 통` (전 조직 공개 아님) / `내 통`: 내가 **진행(`Tong.created_by`)했거나 참석자로 포함된** 통 / `공유받은 통`: 나에게 공유된 통(내가 진행·참석한 건 제외). 세 폴더 모두 휴지통 통 제외
  - `휴지통`: 삭제(소프트, `Tong.deleted_at`)한 통 → **복구 / 영구삭제 / 휴지통 비우기**, 항목 **읽기전용 보기**, **90일 후 자동 영구삭제**(pg_cron, 음원도 함께 정리)
  - 다중 선택(`선택` 모드)에서 **일괄 폴더 추가 / 일괄 휴지통 이동** 가능
  - 참석 판별은 참석자 저장 라벨 `이름 (조직명)` 으로 매칭 ([`src/lib/selectors.ts`](src/lib/selectors.ts))
- **개인 폴더** (사용자 생성, 다중 분류)
  - 만들기 / 이름 변경 / 삭제
  - 분류 진입점 4가지: ① 카드 `⋯` **다중 체크리스트**, ② **드래그앤드롭**(카드 → 좌측 폴더, 데스크톱), ③ **다중 선택 → 일괄 추가**, ④ **통 상세·통 생성에서 지정**([`src/components/FolderPicker.tsx`](src/components/FolderPicker.tsx))
  - 폴더는 **사람마다 개인 소유**(`Folder.owner_id`), 통-폴더는 다대다 매핑(`FolderItem`) → 같은 통을 사람마다, 또 여러 폴더에 분류 가능
- **목록**: 한 줄에 하나(가로 리스트 행) + **페이지네이션** 10개/페이지(필터·폴더 전환 시 1페이지로 리셋)
- **유형 필터**: 커스텀 유형 정의(`tong_types`) 기준으로 채움 — 통이 없는 유형도 노출, `sort_order` 반영
- **공유**: 통 상세의 `공유` 버튼 → 사원 검색·선택 + 권한(보기/편집). 공유받은 사람의 `공유받은 통` 에 노출 (`TongShare`)
  - **참석자 자동 공유**: 통 생성 시 참석자(본인 제외)에게 **편집(입력) 권한 공유가 자동 생성**되어, 참석자의 `공유받은 통` 에 바로 나타남
- 데이터: `tong_shares` / `folders` / `folder_items` 테이블, `tongs.created_by` 컬럼

> 결정 사항: 하위 폴더 없음(평면), 개인 폴더만(조직 공유 폴더 미도입), 한 통=여러 폴더 허용(태그형). 공유는 통 단위로 별도 제공.

### 참석자 검색 (대규모 사원 대응)

사원 1000명+ 규모를 고려해 전체 목록을 나열하지 않고 **검색해서 추가**합니다 ([`src/components/ParticipantPicker.tsx`](src/components/ParticipantPicker.tsx)).

- 이름·사번·조직으로 검색 → 결과 클릭해 추가, 선택자는 칩으로 표시·제거 (결과 최대 20명)
- 저장 형식은 **`이름 (조직명)`** — Teams 표기와 동일하게 동명이인 구분 (예: `심규빈 (AX추진 Cell)`)
- 검색은 현재 `employees` 메모리 배열 기반 — 추후 그룹웨어/MS Graph 연동 시 `searchEmployees()` 만 서버 쿼리로 교체

### 권한 / 사용자

- 현재 사용자(로그인) 개념을 `CurrentUserContext` 로 관리하고, **직책이 Core 리더 이상**이면 통 유형 관리 권한을 부여합니다.
- 지금은 **페르소나(헤더의 사용자 선택)** 방식이며, 추후 **Teams(Entra ID) 로그인**으로 교체 예정입니다. (인증부만 국소 교체)

### 통 상세 · 입력 탭 (입력 방식)

- **Teams 녹취**: `Teams 녹취 가져오기` 버튼 → Mock 녹취 생성
- **텍스트 입력**: 직접 입력
- **음성 녹음·메모**: 노트북 마이크로 **직접 녹음**하거나 mp3/wav 업로드
  - **녹음 메모(메모장)**: 녹음하면서 자유롭게 메모 → 종료 시 **'메모' 입력 1건**으로 자동 저장 (메모는 녹음 흐름에 통합, 단독 탭 없음). 녹음 상태 전환 시 레이아웃이 흔들리지 않도록 메모·레벨 영역 고정
  - **입력 장치 선택**: 사용할 마이크를 드롭다운에서 직접 지정(브라우저 기본 장치가 무음일 때 대응) + 장치 목록 새로고침
  - **입력 레벨 미터**: 녹음 중 입력 신호를 실시간 표시 → 마이크가 소리를 잡는지 즉시 확인. 무음이면 경고
  - **자동 저장**: 녹음 종료(또는 파일 선택) 즉시 음원이 **자동 저장**됨 — 별도 버튼을 안 눌러도 유실되지 않음
  - **원본(webm/Opus) 그대로 저장**: 저장 용량 최소화. Opus 는 음성에서 MP3 보다 2~3배 효율적이라 변환 저장하지 않음
  - **MP3 변환은 다운로드 시에만**: 외부 호환을 위해 다운로드 버튼을 누르면 그 순간 mp3 로 변환해 내려받음([`src/lib/mp3.ts`](src/lib/mp3.ts), lamejs). 업로드한 mp3/wav 는 변환 없이 그대로 다운로드
  - **저장 전 미리듣기** 제공 (앱 내 재생은 webm 그대로)
  - **STT 텍스트 변환은 선택**: `텍스트로 변환(STT)` 버튼(현재 Mock). 음원 저장과 분리되어 있음
  - 첨부 목록에서 각 음원 **재생 / 다운로드(mp3) / 삭제**(여러 개 누적 가능, 각각 개별 관리)
  - **동시 녹음 방지(실시간 잠금)**: 한 통은 동시에 한 명만 녹음. 다른 사람이 녹음 중이면 "○○님이 녹음 중" 표시 + 시작 버튼 비활성. Supabase Realtime Presence 기반([`src/lib/useRecordingLock.ts`](src/lib/useRecordingLock.ts))이라 **탭 닫힘/이탈 시 잠금 자동 해제**(잔류 없음). Supabase 미설정 시 비활성

### AI 요약 (4개 항목)

`generateTongSummary()` 가 입력 기록을 바탕으로 다음을 생성합니다 (현재 Mock, 사용자 수정 가능):

1. **한 줄 요약** 2. **전체 내용**(입력 내용 구조화·정리 본문) 3. **키워드**(메인 키워드) 4. **Comments**(참여자 의견 — 작성자 표시, 댓글식. `tong_comments`)

> Comments 는 보기 권한자도 작성 가능(의견 수렴 목적), 본인 댓글·편집권한자는 삭제 가능.

## Mock 연동 구조

외부 연동은 Mock 으로 구현되어 있으며, 실제 연동을 위한 `TODO` 주석이 포함되어 있습니다.

| 파일 | 함수 | 용도 |
|------|------|------|
| [`src/lib/ai.ts`](src/lib/ai.ts) | `generateTongSummary()` | AI 요약 |
| [`src/lib/stt.ts`](src/lib/stt.ts) | `transcribeAudioFile()` | 음성 → 텍스트 |
| [`src/lib/teams.ts`](src/lib/teams.ts) | `fetchTeamsTranscript()` | Teams 녹취 |

> 마이크 녹음·음원 Storage 업로드/재생/다운로드(다운로드 시 MP3 변환)/삭제는 모두 **실제 동작**합니다. **녹음 결과의 텍스트 변환(STT)만 Mock** 입니다.

### 음원 보관 / 90일 자동 삭제

녹음·업로드한 **음원 원본은 Supabase Storage(`recordings`)에 보관**하고, 업로드 후 **90일이 지나면 자동 파기**합니다. (요약 텍스트는 영구 보관)

- 업로드: [`src/lib/storage.ts`](src/lib/storage.ts) — `Attachment.expires_at = 업로드 + 90일`. 첨부 목록에 "자동 삭제 예정 / 만료" 표시
- 재생·다운로드: 비공개 버킷이므로 **서명 URL**(`getRecordingUrl`)로 인라인 재생·다운로드 제공
- 삭제: 첨부 개별 삭제 시 DB 레코드 + Storage 음원 파일 함께 제거(`deleteAttachment`). 통 삭제 시 해당 통의 모든 음원도 정리
- 자동 삭제: [`supabase/cron_purge_recordings.sql`](supabase/cron_purge_recordings.sql) — `pg_cron` 일일 작업이 만료 음원을 Storage 에서 삭제
- Supabase 미설정(데모) 모드에서는 음원을 보관하지 않습니다(텍스트 변환만).
- ⚠️ 개인정보(녹취)이므로 운영 전환 시 Storage 접근정책을 인증·소유자 기반으로 강화 필요

## 프로젝트 구조

```
src/
├── types/            # 도메인 타입 (Organization, Employee, Tong, TongInput, TongSummary, TongTypeDef, Attachment, TongShare, Folder, FolderItem)
├── lib/
│   ├── supabase.ts   # Supabase 클라이언트 (단일 인스턴스)
│   ├── db.ts         # Repository (Supabase ↔ In-Memory 자동 전환)
│   ├── seed.ts       # 샘플 데이터 (Core별 통 유형 포함)
│   ├── auth.ts       # 직책/권한 헬퍼 (Core 리더 이상 판별)
│   ├── ai.ts / stt.ts / teams.ts   # Mock 연동
│   ├── mp3.ts        # 녹음(webm) → MP3 변환 (다운로드 시에만 사용, lamejs 동적 import)
│   ├── storage.ts    # 음원 Storage 업로드/서명URL/삭제 + 90일 보존기간 계산
│   ├── selectors.ts  # 집계/파생 계산 + 폴더/관여(진행+참석)/공유 셀렉터
│   └── utils.ts      # 공통 유틸 (날짜/색상 등)
├── store/
│   ├── DataContext.tsx        # 전역 데이터 상태 + CRUD
│   └── CurrentUserContext.tsx # 현재 로그인 사용자 (페르소나 → 추후 Teams)
├── components/       # Layout, Sidebar, TongCalendar, FolderPicker, ParticipantPicker, 공용 UI, 아이콘
└── pages/            # 화면 (tong/ 하위는 상세 탭들·공유 모달)
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
