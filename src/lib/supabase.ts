// Supabase 클라이언트 (단일 인스턴스)
//
// 요구사항:
//  - localStorage 사용 금지
//  - 모든 데이터는 Supabase 에 저장
//
// 환경 변수 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 모두 설정된 경우에만
// 실제 Supabase 클라이언트를 생성합니다. 미설정 시(로컬 데모) 에는 null 을 반환하며,
// 데이터 레이어(repository)가 In-Memory 저장소로 자동 폴백합니다.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase 연결 정보가 모두 설정되었는지 여부 */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Supabase 클라이언트.
 * 환경 변수가 없으면 null 이며, 이 경우 In-Memory 저장소가 사용됩니다.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
    })
  : null
