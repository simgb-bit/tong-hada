-- 통 HADA - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- 앱 최초 실행 시 organizations 가 비어 있으면 샘플 데이터가 자동으로 주입됩니다.

-- ── 조직 (Company → CoreGroup → Core → Cell) ───────────────────────────────
create table if not exists organizations (
  id          text primary key,
  name        text not null,
  level       text not null check (level in ('Company', 'CoreGroup', 'Core', 'Cell')),
  parent_id   text references organizations (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── 사원 ───────────────────────────────────────────────────────────────────
create table if not exists employees (
  id           text primary key,
  name         text not null,
  email        text,
  employee_no  text,
  position     text,
  org_id       text references organizations (id) on delete set null,
  org_name     text,
  created_at   timestamptz not null default now()
);

-- ── 통 유형 (Core 단위 커스텀) ───────────────────────────────────────────────
create table if not exists tong_types (
  id           text primary key,
  core_org_id  text not null references organizations (id) on delete cascade,
  label        text not null,
  color        text not null default 'gray',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ── 통(회의) ────────────────────────────────────────────────────────────────
create table if not exists tongs (
  id            text primary key,
  title         text not null,
  -- 통 유형: Core 별 커스텀 라벨(tong_types.label). 고정 CHECK 없음.
  type          text not null,
  scheduled_at  timestamptz not null,
  org_id        text references organizations (id) on delete set null,
  org_name      text,
  participants  jsonb not null default '[]'::jsonb,
  agenda        text default '',
  "references"  text default '',
  status        text not null check (status in ('예정', '진행 완료', '보류')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 통 입력 기록 ─────────────────────────────────────────────────────────────
create table if not exists tong_inputs (
  id          text primary key,
  tong_id     text not null references tongs (id) on delete cascade,
  input_type  text not null check (input_type in ('teams', 'text', 'memo', 'audio')),
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ── AI 요약 (통 1건당 1행) ───────────────────────────────────────────────────
create table if not exists tong_summaries (
  id                  text primary key,
  tong_id             text not null unique references tongs (id) on delete cascade,
  one_line            text default '',
  key_issues          jsonb not null default '[]'::jsonb,
  conclusions         jsonb not null default '[]'::jsonb,
  pending_items       jsonb not null default '[]'::jsonb,
  to_confirm          jsonb not null default '[]'::jsonb,
  action_item_drafts  jsonb not null default '[]'::jsonb,
  recurring_keywords  jsonb not null default '[]'::jsonb,
  source              text not null default 'mock' check (source in ('mock', 'manual')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 후속 과제 ────────────────────────────────────────────────────────────────
create table if not exists action_items (
  id                 text primary key,
  tong_id            text not null references tongs (id) on delete cascade,
  tong_title         text,
  title              text not null,
  assignee           text,            -- AI 가 확정하지 않음. null 이면 '확인 필요'
  assignee_org_id    text references organizations (id) on delete set null,
  assignee_org_name  text,
  due_date           date,
  status             text not null check (status in ('확인 필요', '진행 중', '완료', '보류')),
  evidence           text default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── 첨부 파일 메타데이터 ─────────────────────────────────────────────────────
create table if not exists attachments (
  id            text primary key,
  tong_id       text not null references tongs (id) on delete cascade,
  file_name     text not null,
  file_size     bigint not null default 0,
  mime_type     text,
  storage_path  text default '',
  uploaded_at   timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_tongs_org on tongs (org_id);
create index if not exists idx_inputs_tong on tong_inputs (tong_id);
create index if not exists idx_items_tong on action_items (tong_id);
create index if not exists idx_tongtypes_core on tong_types (core_org_id);

-- RLS: 이 스키마 실행 후 반드시 supabase/policies.sql 도 실행하세요.
-- (RLS 가 켜져 있으면 정책 없이는 anon 키의 읽기/쓰기가 모두 차단됩니다.)
-- 운영 전환 시 policies.sql 의 전체 허용 정책을 인증 기반 정책으로 교체하세요.
