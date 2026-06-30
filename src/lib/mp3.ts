// 통 HADA - 오디오 → MP3 변환
//
// 브라우저 MediaRecorder 는 mp3 직접 출력을 지원하지 않으므로(webm/opus 등만 가능),
// 녹음 결과(webm)를 클라이언트에서 mp3 로 재인코딩한다.
//   1) AudioContext.decodeAudioData 로 PCM 추출
//   2) lamejs 로 MP3 인코딩
// lamejs 는 용량이 있으므로 변환 시점에 동적 import 한다(초기 번들 영향 최소화).

const MP3_KBPS = 128
const BLOCK = 1152 // MP3 프레임 샘플 수

function floatToInt16(f32: Float32Array): Int16Array {
  const out = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/**
 * 오디오 파일(webm/ogg 등)을 MP3 File 로 변환한다.
 * 변환 실패 시 예외를 던진다(호출부에서 원본 유지 처리).
 */
export async function convertToMp3(input: File): Promise<File> {
  const arrayBuf = await input.arrayBuffer()

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) throw new Error('AudioContext 미지원')
  const ctx = new Ctor()
  let audioBuf: AudioBuffer
  try {
    audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0))
  } finally {
    void ctx.close().catch(() => {})
  }

  const channels = Math.min(2, audioBuf.numberOfChannels)
  const sampleRate = audioBuf.sampleRate

  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const encoder = new Mp3Encoder(channels, sampleRate, MP3_KBPS)

  const left = floatToInt16(audioBuf.getChannelData(0))
  const right = channels > 1 ? floatToInt16(audioBuf.getChannelData(1)) : null

  const chunks: Uint8Array[] = []
  for (let i = 0; i < left.length; i += BLOCK) {
    const l = left.subarray(i, i + BLOCK)
    const buf = right ? encoder.encodeBuffer(l, right.subarray(i, i + BLOCK)) : encoder.encodeBuffer(l)
    if (buf.length > 0) chunks.push(buf)
  }
  const end = encoder.flush()
  if (end.length > 0) chunks.push(end)

  const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' })
  const name = input.name.replace(/\.[^.]+$/, '') + '.mp3'
  return new File([blob], name, { type: 'audio/mpeg' })
}
