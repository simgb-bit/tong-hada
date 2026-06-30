-- 통 HADA - 입력 기록 작성자 마이그레이션
-- tong_inputs 에 작성자(사원) 정보를 추가한다.
-- (입력 상세 보기에서 "누가 입력했는지" 표시용. 구버전 행은 NULL → '미상' 표시)
--
-- Supabase 대시보드 > SQL Editor 에서 실행하세요. (이미 schema.sql 최신본을 적용했다면 불필요)

alter table tong_inputs add column if not exists created_by text references employees (id) on delete set null;
alter table tong_inputs add column if not exists created_by_name text;
-- 입력 소프트 삭제(복구 가능). null = 활성, 값 있으면 삭제됨(목록·AI 요약에서 제외)
alter table tong_inputs add column if not exists deleted_at timestamptz;
