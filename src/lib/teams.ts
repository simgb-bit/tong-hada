// 통 HADA - Microsoft Teams 녹취 가져오기 (Mock)
//
// Teams 회의의 녹취록(transcript) 을 가져옵니다.
// 현재는 Mock 구현으로, 버튼 클릭 시 샘플 녹취 텍스트를 반환합니다.
//
// TODO: 실제 Microsoft Teams / Graph API 연동
//   - M365 SSO(MSAL) 로 사용자 인증
//   - Microsoft Graph: /me/onlineMeetings/{id}/transcripts 로 녹취 조회
//   - .vtt 자막을 파싱하여 화자/타임스탬프 포함 텍스트로 변환

const MOCK_TEAMS_TRANSCRIPT = `[Teams 회의 녹취]
0:00 김도윤: 오늘 통은 하반기 제품 로드맵 확정을 위한 자리입니다.
0:15 이서연: 상반기에 일정 지연이 반복됐던 만큼, 이번에는 우선순위를 명확히 했으면 합니다.
0:40 최하은: 동의합니다. 다만 요구사항 변경이 잦아 범위 관리가 핵심일 것 같습니다.
1:10 김도윤: 그러면 핵심 기능 3가지에 집중하고, 나머지는 보류로 두겠습니다.
1:35 이서연: 리소스 배분은 다음 주까지 확인해서 공유하겠습니다.
2:00 김도윤: 좋습니다. 결정사항은 정리해서 후속 과제로 등록하겠습니다. 담당자는 확인 후 확정하겠습니다.`

/**
 * Teams 회의 녹취록을 가져옵니다. (Mock)
 *
 * @param meetingHint 회의 식별 힌트(통명 등). Mock 에서는 결과 텍스트에만 반영됩니다.
 * @returns 녹취 텍스트
 */
export async function fetchTeamsTranscript(meetingHint?: string): Promise<string> {
  // API 호출 지연 흉내
  await new Promise((r) => setTimeout(r, 1100))

  const suffix = meetingHint ? `\n\n(연동 회의: ${meetingHint})` : ''
  return MOCK_TEAMS_TRANSCRIPT + suffix
}
