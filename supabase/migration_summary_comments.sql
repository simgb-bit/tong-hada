-- 통 HADA - AI 요약 개편 + 댓글 마이그레이션
-- 1) tong_summaries.full_summary 추가 (전체 내용 구조화 정리)
-- 2) tong_comments 테이블 추가 (참여자 의견/댓글)
-- 키워드는 기존 recurring_keywords 컬럼을 재사용합니다(라벨만 '키워드').
--
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

-- 1) 전체 내용 컬럼
alter table tong_summaries add column if not exists full_summary text default '';

-- 2) 댓글 테이블
create table if not exists tong_comments (
  id           text primary key,
  tong_id      text not null references tongs (id) on delete cascade,
  author_id    text references employees (id) on delete set null,
  author_name  text,
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_comments_tong on tong_comments (tong_id);

-- 3) RLS: 댓글 테이블에도 MVP 전체 허용 정책 (운영 시 인증 기반으로 교체)
alter table tong_comments enable row level security;
drop policy if exists "mvp_anon_all" on tong_comments;
create policy "mvp_anon_all" on tong_comments
  for all to anon, authenticated using (true) with check (true);
