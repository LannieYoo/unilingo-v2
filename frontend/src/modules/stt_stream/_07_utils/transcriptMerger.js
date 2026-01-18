// transcriptMerger - 트랜스크립트 병합 유틸리티
// Web Speech API와 Vosk 결과를 시간순으로 병합 및 중복 제거

export function mergeSegments(segments) {
  if (!segments || segments.length === 0) return []

  return segments.sort((a, b) => a.startTime - b.startTime)
}

export function deduplicateSegments(segments) {
  if (!segments || segments.length === 0) return []

  const deduplicated = []
  const seen = new Set()

  for (const segment of segments) {
    const key = `${segment.startTime}-${segment.text.trim()}`

    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(segment)
    }
  }

  return deduplicated
}

export function markVoskSegments(segments) {
  return segments.map(segment => ({
    ...segment,
    isVosk: segment.source === 'vosk',
    displayText: segment.source === 'vosk' 
      ? `[Vosk] ${segment.text}` 
      : segment.text
  }))
}
