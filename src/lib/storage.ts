// 통 HADA - 음원 파일 스토리지 (Supabase Storage)
//
// 녹음/업로드한 음원 원본을 Supabase Storage 의 'recordings' 버킷에 보관한다.
// 보존기간(90일) 경과 시 자동 삭제는 백엔드 예약 작업이 담당한다.
//   → supabase/cron_purge_recordings.sql 참고
//
// Supabase 미설정(데모/In-Memory) 환경에서는 업로드를 건너뛴다(경로 빈 값).

import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/** 음원 보존기간 (일). 이 기간 경과 시 자동 삭제 대상이 된다. */
export const RECORDING_RETENTION_DAYS = 90

/** 음원 버킷 이름 */
export const RECORDINGS_BUCKET = 'recordings'

/** 휴지통 보존기간 (일). 휴지통에 들어간 지 이 기간 경과 시 자동 영구삭제 대상. */
export const TRASH_RETENTION_DAYS = 90

/** 업로드 시각 기준 만료 시각(ISO) 계산 */
export function recordingExpiresAt(uploadedAtIso: string): string {
  const d = new Date(uploadedAtIso)
  d.setDate(d.getDate() + RECORDING_RETENTION_DAYS)
  return d.toISOString()
}

/** 휴지통 자동 삭제 예정 시각(ISO) = 삭제일 + TRASH_RETENTION_DAYS */
export function trashPurgeAt(deletedAtIso: string): string {
  const d = new Date(deletedAtIso)
  d.setDate(d.getDate() + TRASH_RETENTION_DAYS)
  return d.toISOString()
}

/** 음원 파일들을 Storage 에서 삭제 (영구삭제 시 호출). 실패해도 무시. */
export async function removeRecordings(paths: string[]): Promise<void> {
  const valid = paths.filter(Boolean)
  if (!isSupabaseConfigured || !supabase || valid.length === 0) return
  try {
    await supabase.storage.from(RECORDINGS_BUCKET).remove(valid)
  } catch (e) {
    console.warn('[storage] 음원 삭제 실패:', e)
  }
}

/** 파일명에서 확장자 추출 (없으면 webm) */
function extOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : 'webm'
}

/**
 * 음원 파일을 Storage 에 업로드하고 저장 경로를 반환한다.
 * Supabase 미설정 시에는 업로드를 건너뛰고 빈 문자열을 반환한다.
 *
 * @returns storage_path (버킷 내 경로). 업로드 안 됨이면 ''
 */
export async function uploadRecording(file: File, tongId: string, attachmentId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return ''
  const path = `${tongId}/${attachmentId}.${extOf(file.name)}`
  try {
    const { error } = await supabase.storage.from(RECORDINGS_BUCKET).upload(path, file, {
      contentType: file.type || 'audio/webm',
      upsert: true,
    })
    if (error) throw error
    return path
  } catch (e) {
    // 버킷 미설정 등으로 업로드 실패해도 녹취 변환 흐름은 막지 않는다(음원 미보관 처리).
    // 음원을 실제로 보관하려면 supabase/migration_audio_retention.sql 을 먼저 실행하세요.
    console.warn('[storage] 음원 업로드 실패 — 음원 미보관으로 진행:', e)
    return ''
  }
}
