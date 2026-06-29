-- 통 HADA - 휴지통(소프트 삭제) 마이그레이션
-- 통 삭제 시 즉시 영구삭제 대신 deleted_at 을 기록해 휴지통에 보관한다.
-- Supabase 대시보드 > SQL Editor 에서 실행하세요. (재실행 가능)

alter table tongs add column if not exists deleted_at timestamptz;

-- 휴지통/정상 통 조회 성능용 인덱스
create index if not exists idx_tongs_deleted_at on tongs (deleted_at);
