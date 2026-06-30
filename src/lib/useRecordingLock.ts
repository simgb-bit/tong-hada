// 통 HADA - 녹음 잠금 (Supabase Realtime Presence)
//
// 한 통(회의)에 대해 동시에 한 명만 녹음할 수 있도록 조정한다.
//  - 통별 Presence 채널(`recording:{tongId}`)에 접속
//  - 녹음 시작 시 presence 에 { recording:true, name } 을 track
//  - 다른 사용자가 녹음 중이면 lockedByOther=true + 이름 노출
//  - 탭 닫힘/이탈/연결 끊김 시 presence 가 자동 제거되어 잠금이 자동 해제됨(잔류 없음)
//
// Supabase 미설정(데모) 환경에서는 실시간 조정이 불가하므로 잠금이 비활성(항상 허용)된다.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface PresenceMeta {
  recording: boolean
  name: string
  since: string
}

export interface RecordingLock {
  /** 다른 사용자가 현재 녹음 중인지 */
  lockedByOther: boolean
  /** 녹음 중인 다른 사용자 이름 (없으면 null) */
  lockedByName: string | null
  /** 실시간 조정 활성 여부 (Supabase 연결 시 true) */
  active: boolean
  /** 녹음 시작 알림(presence track) */
  acquire: () => Promise<void>
  /** 녹음 종료 알림(presence untrack) */
  release: () => Promise<void>
}

export function useRecordingLock(tongId: string, userId: string, userName: string): RecordingLock {
  const [presence, setPresence] = useState<Record<string, PresenceMeta[]>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !tongId || !userId) return
    const client = supabase
    const channel = client.channel(`recording:${tongId}`, {
      config: { presence: { key: userId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        setPresence(channel.presenceState<PresenceMeta>() as Record<string, PresenceMeta[]>)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      void channel.untrack()
      void client.removeChannel(channel)
      channelRef.current = null
      setPresence({})
    }
  }, [tongId, userId])

  // 나를 제외하고 녹음 중인 사용자 탐색
  let lockedByName: string | null = null
  for (const [key, metas] of Object.entries(presence)) {
    if (key === userId) continue
    const rec = metas.find((m) => m.recording)
    if (rec) {
      lockedByName = rec.name
      break
    }
  }

  const acquire = useCallback(async () => {
    const meta: PresenceMeta = { recording: true, name: userName, since: new Date().toISOString() }
    await channelRef.current?.track(meta)
  }, [userName])

  const release = useCallback(async () => {
    await channelRef.current?.untrack()
  }, [])

  return {
    lockedByOther: lockedByName !== null,
    lockedByName,
    active: Boolean(channelRef.current),
    acquire,
    release,
  }
}
