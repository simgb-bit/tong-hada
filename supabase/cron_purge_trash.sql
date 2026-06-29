-- 통 HADA - 휴지통 90일 자동 비우기 예약 작업
-- 휴지통(deleted_at)에 들어간 지 90일이 지난 통을 영구 삭제한다.
-- 통 삭제 시 입력·요약·첨부·공유·폴더매핑은 FK on delete cascade 로 함께 삭제되고,
-- 음원 Storage 객체도 먼저 정리한다.
--
-- 전제: migration_trash.sql (tongs.deleted_at) 실행
-- Supabase 대시보드 > SQL Editor 에서 1회 실행하면 예약 작업이 등록됩니다.

create extension if not exists pg_cron;

-- 휴지통 90일 경과 통 파기 함수
create or replace function purge_old_trashed_tongs()
returns void
language plpgsql
security definer
as $$
begin
  -- 1) 파기 대상 통의 음원 Storage 객체 먼저 삭제
  delete from storage.objects o
  using attachments a, tongs t
  where o.bucket_id = 'recordings'
    and o.name = a.storage_path
    and a.storage_path <> ''
    and a.tong_id = t.id
    and t.deleted_at is not null
    and t.deleted_at < now() - interval '90 days';

  -- 2) 통 영구 삭제 (입력·요약·첨부·공유·폴더매핑은 cascade)
  delete from tongs
  where deleted_at is not null
    and deleted_at < now() - interval '90 days';
end;
$$;

-- 매일 03:10(UTC) 실행 예약 (이미 있으면 재생성)
select cron.unschedule('purge-old-trashed-tongs')
where exists (select 1 from cron.job where jobname = 'purge-old-trashed-tongs');

select cron.schedule('purge-old-trashed-tongs', '10 3 * * *', $$select purge_old_trashed_tongs();$$);

-- 수동 1회 실행: select purge_old_trashed_tongs();
-- 등록 확인:   select jobname, schedule from cron.job;
