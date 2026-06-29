-- 통 HADA - 만료 음원 자동 파기 (90일) 예약 작업
-- 매일 새벽 3시(UTC)에 보존기간이 지난 음원을 Storage 에서 삭제하고,
-- attachments.storage_path 를 비워 '만료(삭제됨)' 상태로 표시한다. (메타데이터·요약은 보존)
--
-- 전제: migration_audio_retention.sql 을 먼저 실행 (expires_at 컬럼 + recordings 버킷)
-- Supabase 대시보드 > SQL Editor 에서 1회 실행하면 예약 작업이 등록됩니다.

-- pg_cron 확장 활성화 (Supabase 지원)
create extension if not exists pg_cron;

-- 만료 음원 파기 함수
create or replace function purge_expired_recordings()
returns void
language plpgsql
security definer
as $$
begin
  -- 1) Storage 객체 삭제 (storage.objects 행 삭제 = 실제 파일 삭제)
  delete from storage.objects o
  using attachments a
  where o.bucket_id = 'recordings'
    and o.name = a.storage_path
    and a.storage_path <> ''
    and a.expires_at is not null
    and a.expires_at < now();

  -- 2) 경로 비우기 (UI 에서 '음원 만료(삭제됨)' 으로 표시됨)
  update attachments
  set storage_path = ''
  where storage_path <> ''
    and expires_at is not null
    and expires_at < now();
end;
$$;

-- 매일 03:00(UTC) 실행 예약 (이미 있으면 재생성)
select cron.unschedule('purge-expired-recordings')
where exists (select 1 from cron.job where jobname = 'purge-expired-recordings');

select cron.schedule('purge-expired-recordings', '0 3 * * *', $$select purge_expired_recordings();$$);

-- 수동 1회 실행: select purge_expired_recordings();
-- 등록 확인:   select jobname, schedule from cron.job;
