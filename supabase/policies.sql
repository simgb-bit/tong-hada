-- 통 HADA - RLS 정책 (MVP)
--
-- Supabase 는 테이블에 RLS(Row Level Security)가 켜져 있으면 정책이 없을 때 모든 접근을 차단합니다.
-- MVP 단계에서는 anon 키로 읽기/쓰기를 모두 허용합니다.
-- ⚠️ 운영 전환 시에는 인증(M365 SSO 등) 기반의 세분화된 정책으로 반드시 교체하세요.
--
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

do $$
declare
  t text;
  tables text[] := array[
    'organizations', 'employees', 'tong_types', 'tongs', 'tong_inputs',
    'tong_summaries', 'action_items', 'attachments',
    'tong_shares', 'folders', 'folder_items', 'tong_comments'
  ];
begin
  foreach t in array tables loop
    -- RLS 활성화 (이미 켜져 있어도 무해)
    execute format('alter table public.%I enable row level security;', t);

    -- 기존 MVP 정책이 있으면 제거 후 재생성 (재실행 가능하도록)
    execute format('drop policy if exists "mvp_anon_all" on public.%I;', t);

    -- anon + authenticated 에게 전체 권한 허용
    execute format(
      'create policy "mvp_anon_all" on public.%I for all to anon, authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
