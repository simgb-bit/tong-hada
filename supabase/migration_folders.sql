-- 통 HADA - 폴더 기능 마이그레이션
-- 이미 schema.sql 로 초기화된 기존 Supabase 프로젝트에 폴더/공유 기능을 추가합니다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일을 한 번 실행하세요. (재실행 가능)

-- ── 1. tongs.created_by 컬럼 추가 ("내 통" 판별 근거) ────────────────────────
-- create table if not exists 로는 기존 테이블에 컬럼이 추가되지 않으므로 alter 필요.
alter table tongs add column if not exists created_by text references employees (id) on delete set null;

-- ── 2. 통 공유 ───────────────────────────────────────────────────────────────
create table if not exists tong_shares (
  id           text primary key,
  tong_id      text not null references tongs (id) on delete cascade,
  shared_with  text not null references employees (id) on delete cascade,
  shared_by    text references employees (id) on delete set null,
  permission   text not null default 'view' check (permission in ('view', 'edit')),
  created_at   timestamptz not null default now(),
  unique (tong_id, shared_with)
);

-- ── 3. 개인 폴더 (1단계 평면 구조) ───────────────────────────────────────────
create table if not exists folders (
  id          text primary key,
  owner_id    text not null references employees (id) on delete cascade,
  name        text not null,
  parent_id   text references folders (id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 4. 폴더-통 매핑 ──────────────────────────────────────────────────────────
create table if not exists folder_items (
  folder_id  text not null references folders (id) on delete cascade,
  tong_id    text not null references tongs (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (folder_id, tong_id)
);

-- ── 5. 인덱스 ────────────────────────────────────────────────────────────────
create index if not exists idx_tongs_created_by on tongs (created_by);
create index if not exists idx_shares_with on tong_shares (shared_with);
create index if not exists idx_folders_owner on folders (owner_id);
create index if not exists idx_folderitems_tong on folder_items (tong_id);

-- ── 6. RLS 정책 (MVP: anon/authenticated 전체 허용) ──────────────────────────
do $$
declare
  t text;
  tables text[] := array['tong_shares', 'folders', 'folder_items'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "mvp_anon_all" on public.%I;', t);
    execute format(
      'create policy "mvp_anon_all" on public.%I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ── 7. (선택) 기존 시드 통에 진행자(created_by) 백필 ─────────────────────────
-- 데모 "내 통 / 공유받은 통" 구분을 보려면 실행하세요. 이미 값이 있으면 건너뜁니다.
update tongs set created_by = 'emp-4' where id = 'tong-1' and created_by is null;
update tongs set created_by = 'emp-3' where id = 'tong-2' and created_by is null;
update tongs set created_by = 'emp-4' where id = 'tong-3' and created_by is null;
update tongs set created_by = 'emp-5' where id = 'tong-4' and created_by is null;

-- ── 8. (선택) 데모용 공유/폴더 시드 ──────────────────────────────────────────
insert into tong_shares (id, tong_id, shared_with, shared_by, permission)
  values ('share-1', 'tong-2', 'emp-4', 'emp-3', 'view')
  on conflict (id) do nothing;

insert into folders (id, owner_id, name, parent_id, sort_order)
  values ('folder-1', 'emp-4', '1분기 회의', null, 1),
         ('folder-2', 'emp-4', '공유 자료', null, 2)
  on conflict (id) do nothing;

insert into folder_items (folder_id, tong_id)
  values ('folder-1', 'tong-1'),
         ('folder-2', 'tong-2')
  on conflict (folder_id, tong_id) do nothing;
