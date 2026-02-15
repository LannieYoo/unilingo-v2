/**
 * 단어 난이도 계산 유틸리티
 */

const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
])

const INTERMEDIATE_WORDS = new Set([
  'however', 'although', 'therefore', 'moreover', 'furthermore', 'nevertheless',
  'consequently', 'meanwhile', 'otherwise', 'whereas', 'thus', 'hence',
  'accordingly', 'besides', 'indeed', 'instead', 'likewise', 'nonetheless',
  'particularly', 'specifically', 'generally', 'especially', 'significantly',
  'approximately', 'relatively', 'absolutely', 'completely', 'entirely',
  'extremely', 'frequently', 'immediately', 'obviously', 'probably', 'recently',
  'seriously', 'simply', 'suddenly', 'usually', 'actually', 'basically',
  'certainly', 'clearly', 'definitely', 'directly', 'easily', 'effectively'
])

/**
 * 단어 난이도 계산
 * @param {string} word - 단어
 * @returns {string} - 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
 */
export function getWordLevel(word) {
  if (!word) return 'A1'
  
  const lowerWord = word.toLowerCase().trim()
  const length = lowerWord.length
  
  // A1: 매우 기본적인 단어 (1-3글자, 일반 단어)
  if (length <= 3 && COMMON_WORDS.has(lowerWord)) {
    return 'A1'
  }
  
  // A2: 기본 단어 (4-5글자, 일반 단어)
  if (length <= 5 && COMMON_WORDS.has(lowerWord)) {
    return 'A2'
  }
  
  // B1: 일반 단어 (6-7글자 또는 일반 단어)
  if (COMMON_WORDS.has(lowerWord) || length <= 7) {
    return 'B1'
  }
  
  // B2: 중급 단어 (8-10글자 또는 중급 단어)
  if (INTERMEDIATE_WORDS.has(lowerWord) || (length >= 8 && length <= 10)) {
    return 'B2'
  }
  
  // C1: 고급 단어 (11-13글자)
  if (length >= 11 && length <= 13) {
    return 'C1'
  }
  
  // C2: 매우 고급 단어 (14글자 이상)
  return 'C2'
}

/**
 * 난이도 레벨 색상 반환
 * @param {string} level - 난이도 레벨
 * @returns {string} - CSS 색상 클래스
 */
export function getLevelColor(level) {
  const colors = {
    'A1': '#22c55e', // green
    'A2': '#84cc16', // lime
    'B1': '#eab308', // yellow
    'B2': '#f97316', // orange
    'C1': '#ef4444', // red
    'C2': '#991b1b'  // dark red
  }
  return colors[level] || colors['B1']
}
