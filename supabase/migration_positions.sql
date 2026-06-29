-- 통 HADA - 직책(position) 정리 마이그레이션
-- 비상교육은 전 직원의 직책이 'CP' 이며, 조직 리더만 별도 리더 직책을 가진다.
-- 기존 Supabase 의 employees 직책(책임/선임/사원 등)을 'CP' 로 통일하고,
-- 리더(...Leader)는 그대로 유지한다.
--
-- Supabase 대시보드 > SQL Editor 에서 실행하세요. (재실행 가능)

update employees
set position = 'CP'
where position is null
   or position not like '%Leader%';

-- 확인용: 리더만 남고 나머지는 CP 여야 함
-- select name, position, org_name from employees order by position;
