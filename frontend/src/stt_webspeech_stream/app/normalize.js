/**
 * normalize - 텍스트 정규화 유틸리티
 */

/**
 * 텍스트를 정규화 (소문자, 공백 정리)
 */
export function normalizeText(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * 기본 구두점 추가
 */
export function addPunctuation(text) {
  if (!text) return text

  let result = text.trim()
  
  // 첫 글자 대문자
  result = result.charAt(0).toUpperCase() + result.slice(1)

  // 끝에 구두점이 없으면 추가
  if (!result.match(/[.!?。！？]$/)) {
    const questionWords = /^(what|where|when|who|why|how|which|whose|whom|can|could|would|should|will|do|does|did|is|are|was|were|have|has|had)/i
    if (questionWords.test(result)) {
      result += '?'
    } else {
      result += '.'
    }
  }

  return result
}

/**
 * 비교를 위한 텍스트 정규화 (구두점 제거)
 */
export function normalizeForComparison(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[.!?。！？,，;；:：]/g, '')
    .replace(/\s+/g, ' ')
}

export default { normalizeText, addPunctuation, normalizeForComparison }
