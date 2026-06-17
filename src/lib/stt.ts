// 통 HADA - 음성 → 텍스트 변환(STT) (Mock)
//
// 업로드된 음성 파일(mp3/wav) 을 텍스트로 변환합니다.
// 현재는 Mock 구현으로, 실제 변환 없이 그럴듯한 녹취 텍스트를 반환합니다.
//
// TODO: 실제 STT API 연동
//   - 예: Azure Speech-to-Text, OpenAI Whisper, Google STT 등
//   - 파일을 스토리지(Supabase Storage)에 업로드 후 변환 요청
//   - 화자 분리(diarization) 결과를 화자별 라인으로 정리하여 반환

const MOCK_TRANSCRIPT = `[음성 변환 결과]
진행자: 오늘 안건은 서비스 개선 의견 수렴입니다.
참석자A: 사용자 피드백을 보면 검색 기능에 대한 불만이 가장 많습니다.
참석자B: 검색 정확도 개선과 함께 응답 속도도 함께 봐야 할 것 같습니다.
진행자: 우선순위를 정해야 할 텐데, 리소스가 한정되어 있어 한 번에 다 하기는 어렵습니다.
참석자A: 그러면 이번 분기에는 검색 정확도에 집중하는 것으로 정리하면 어떨까요.
진행자: 좋습니다. 속도 개선은 다음 분기로 보류하겠습니다. 담당자는 추후 확정하겠습니다.`

/**
 * 음성 파일을 텍스트로 변환합니다. (Mock)
 *
 * @param file 업로드된 음성 파일 (mp3/wav)
 * @returns 변환된 녹취 텍스트
 */
export async function transcribeAudioFile(file: File): Promise<string> {
  // 변환 처리 시간을 흉내 내기 위한 지연 (파일 크기에 비례)
  const delay = Math.min(2500, 600 + file.size / 50000)
  await new Promise((r) => setTimeout(r, delay))

  return `${MOCK_TRANSCRIPT}\n\n(원본 파일: ${file.name}, ${(file.size / 1024).toFixed(1)} KB)`
}

/** 지원하는 음성 파일 확장자 */
export const SUPPORTED_AUDIO_TYPES = ['.mp3', '.wav']

/** 음성 파일 유효성 검사 */
export function isSupportedAudio(file: File): boolean {
  const name = file.name.toLowerCase()
  return SUPPORTED_AUDIO_TYPES.some((ext) => name.endsWith(ext))
}
