// 통 HADA - AI 요약 (Mock)
//
// 회의 기록 텍스트를 입력받아 요약을 생성합니다.
// 현재는 Mock 구현으로, 입력 텍스트를 구조화·정리해 그럴듯한 결과를 만듭니다.
//
// 결과 항목: ① 한 줄 요약  ② 전체 내용(구조화 정리)  ③ 키워드
//
// TODO: 실제 AI API(Claude 등) 연동
//   - generateTongSummary 내부에서 Anthropic Messages API 를 호출하도록 교체
//   - 권장 모델: claude-opus-4-8 (최신/최고 성능) 또는 비용 효율형 claude-haiku-4-5
//   - 프롬프트로 아래 3개 항목(JSON: one_line/full_summary/keywords) 을 강제하고 응답을 파싱
//   - API 키는 서버 사이드(Supabase Edge Function 등) 에서 관리하여 클라이언트 노출 방지

import { sampleKeywords } from '@/lib/seed'
import type { TongSummary } from '@/types'

/** AI 요약 결과 (저장 전 형태) — 한 줄 요약 / 전체 내용 / 키워드 */
export type AiSummaryResult = Pick<TongSummary, 'one_line' | 'full_summary' | 'recurring_keywords' | 'source'>

function pickKeywords(text: string): string[] {
  const found = sampleKeywords.filter((k) => text.includes(k.replace(/\s/g, '')) || text.includes(k))
  if (found.length > 0) return Array.from(new Set(found)).slice(0, 5)
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
 * 회의 기록을 한 줄 요약 + 전체 내용(구조화) + 키워드로 변환합니다. (Mock)
 *
 * @param transcript 합쳐진 회의 기록 텍스트
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
      full_summary: '회의 기록(Teams 녹취 / 텍스트 / 음성·메모)을 먼저 입력한 뒤 AI 요약을 실행하세요.',
      recurring_keywords: [],
      source: 'mock',
    }
  }

  const head = sentences[0]
  const issues = sentences.filter((s) => /문제|우려|부족|지연|리스크|이슈|어렵|필요/.test(s)).slice(0, 5)
  const conclusions = sentences.filter((s) => /결정|확정|하기로|진행|추진|합의/.test(s)).slice(0, 5)
  const pending = sentences.filter((s) => /보류|다음|추후|미정|대기/.test(s)).slice(0, 5)

  // 전체 내용: 입력을 주제별 섹션으로 구조화
  const sections: string[] = []
  if (issues.length) sections.push('■ 주요 논의\n' + issues.map((s) => `- ${s}`).join('\n'))
  if (conclusions.length) sections.push('■ 결정·진행\n' + conclusions.map((s) => `- ${s}`).join('\n'))
  if (pending.length) sections.push('■ 보류·후속\n' + pending.map((s) => `- ${s}`).join('\n'))
  if (sections.length === 0) {
    sections.push('■ 내용\n' + sentences.slice(0, 8).map((s) => `- ${s}`).join('\n'))
  }

  return {
    one_line: head.length > 80 ? head.slice(0, 80) + '…' : head,
    full_summary: sections.join('\n\n'),
    recurring_keywords: keywords,
    source: 'mock',
  }
}
