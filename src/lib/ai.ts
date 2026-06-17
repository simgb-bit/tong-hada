// 통 HADA - AI 요약 (Mock)
//
// 회의 기록 텍스트를 입력받아 구조화된 요약을 생성합니다.
// 현재는 Mock 구현으로, 입력 텍스트에서 키워드를 추출해 그럴듯한 결과를 만듭니다.
//
// TODO: 실제 AI API(Claude 등) 연동
//   - generateTongSummary 내부에서 Anthropic Messages API 를 호출하도록 교체
//   - 권장 모델: claude-opus-4-8 (최신/최고 성능) 또는 비용 효율형 claude-haiku-4-5
//   - 프롬프트로 아래 7개 항목(JSON) 을 강제하고 응답을 파싱
//   - API 키는 서버 사이드(Supabase Edge Function 등) 에서 관리하여 클라이언트 노출 방지

import { sampleKeywords } from '@/lib/seed'
import type { TongSummary } from '@/types'

/** AI 요약 결과 (저장 전 형태) */
export type AiSummaryResult = Omit<TongSummary, 'id' | 'tong_id' | 'created_at' | 'updated_at'>

function pickKeywords(text: string): string[] {
  const found = sampleKeywords.filter((k) => text.includes(k.replace(/\s/g, '')) || text.includes(k))
  if (found.length > 0) return Array.from(new Set(found)).slice(0, 4)
  // 휴리스틱: 자주 등장하는 신호어로 키워드 추정
  const guesses: string[] = []
  if (/지연|밀리|늦/.test(text)) guesses.push('일정 지연')
  if (/변경|바뀌|수정/.test(text)) guesses.push('요구사항 변경')
  if (/소통|공유|전달/.test(text)) guesses.push('의사소통 부족')
  if (/우선순위|먼저|중요도/.test(text)) guesses.push('우선순위 불명확')
  return guesses.length > 0 ? guesses : ['논의 진행']
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/[\n.。!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4)
}

/**
 * 회의 기록을 구조화된 요약으로 변환합니다. (Mock)
 *
 * @param transcript 합쳐진 회의 기록 텍스트
 * @returns 7개 항목으로 구성된 AI 요약 결과
 */
export async function generateTongSummary(transcript: string): Promise<AiSummaryResult> {
  // 실제 API 호출을 흉내 내기 위한 지연
  await new Promise((r) => setTimeout(r, 900))

  const clean = transcript?.trim() ?? ''
  const sentences = splitSentences(clean)
  const keywords = pickKeywords(clean)

  if (sentences.length === 0) {
    return {
      one_line: '입력된 회의 기록이 없어 요약할 내용이 부족합니다.',
      key_issues: ['회의 기록 입력 필요'],
      conclusions: [],
      pending_items: [],
      to_confirm: ['회의 기록(Teams 녹취/텍스트/메모) 입력 여부'],
      action_item_drafts: ['회의 기록 입력 후 AI 요약 재실행'],
      recurring_keywords: [],
      source: 'mock',
    }
  }

  const head = sentences[0]
  const issues = sentences.filter((s) => /문제|우려|부족|지연|리스크|이슈|어렵|필요/.test(s)).slice(0, 4)
  const conclusions = sentences.filter((s) => /결정|확정|하기로|진행|추진|합의/.test(s)).slice(0, 3)
  const pending = sentences.filter((s) => /보류|다음|추후|미정|대기/.test(s)).slice(0, 3)
  const confirm = sentences.filter((s) => /확인|검토|가능 여부|체크/.test(s)).slice(0, 3)

  return {
    one_line: head.length > 80 ? head.slice(0, 80) + '…' : head,
    key_issues: issues.length > 0 ? issues : sentences.slice(0, 2),
    conclusions: conclusions.length > 0 ? conclusions : ['논의 후 결론 정리 필요'],
    pending_items: pending,
    to_confirm: confirm.length > 0 ? confirm : ['담당자 및 기한 확정 필요'],
    action_item_drafts: [
      ...conclusions.slice(0, 2).map((c) => `${c.slice(0, 40)} 관련 후속 조치`),
      ...issues.slice(0, 1).map((i) => `${i.slice(0, 40)} 대응 방안 마련`),
    ].slice(0, 4),
    recurring_keywords: keywords,
    source: 'mock',
  }
}
