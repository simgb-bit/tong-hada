-- 통 HADA - 음원 보관 + 90일 자동 삭제 마이그레이션
-- 녹음/업로드한 음원 원본을 Storage('recordings' 버킷)에 보관하고,
-- 업로드 후 90일이 지나면 자동으로 파기한다. (요약 텍스트는 영구 보관)
--
-- 실행 순서: 1) 컬럼 추가  2) 버킷 생성  3) cron_purge_recordings.sql 로 예약 작업 등록
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

-- 1) attachments.expires_at 컬럼 추가
alter table attachments add column if not exists expires_at timestamptz;
create index if not exists idx_attachments_expires_at on attachments (expires_at);

-- 2) 음원 버킷 생성 (비공개). 이미 있으면 무시.
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- 3) Storage 접근 정책 (MVP: anon/authenticated 허용 — 운영 전환 시 인증 기반으로 교체)
--    개인정보(녹취)이므로 운영에서는 반드시 소유자/권한 기반 정책으로 강화할 것.
drop policy if exists "recordings_mvp_all" on storage.objects;
create policy "recordings_mvp_all" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'recordings')
  with check (bucket_id = 'recordings');
