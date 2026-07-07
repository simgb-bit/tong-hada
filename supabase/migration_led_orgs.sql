-- 통 HADA - 조직 리더십(led_org_ids) 마이그레이션 (분석 권한·스코프용)
--
-- employees.led_org_ids: 이 사람이 리드하는 조직 id 목록(겸직 시 복수).
-- 그룹웨어 조직도 동기화가 채우는 값. 비어 있으면 앱이 직책+소속으로 파생하므로
-- 이 마이그레이션은 필수는 아님. (겸직/조직 드롭다운 데모를 보려면 실행)
--
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

alter table employees add column if not exists led_org_ids jsonb not null default '[]'::jsonb;

-- (선택) 겸직 데모: 최하은(emp-4)을 AX추진 Core + 유아콘텐츠 Cell 리더로 지정
--   → 분석에서 두 조직을 드롭다운으로 선택해 볼 수 있음. 필요 없으면 아래 줄은 생략.
update employees set led_org_ids = '["core-ax","cell-kids"]'::jsonb where id = 'emp-4';
