/**
 * Text Formatter Utilities
 * 텍스트 정규화 및 스마트 구두점 삽입 유틸리티
 */

/**
 * 텍스트를 정규화 (소문자, 공백 정리)
 * @param {string} text - 입력 텍스트
 * @returns {string} 정규화된 텍스트
 */
export function normalizeText(text) {
  if (!text) return ''
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

// ============================================
// 언어별 패턴 정의
// ============================================

// 한국어 패턴
const KOREAN_PATTERNS = {
  // 의문문 종결어미
  question: /(까요|나요|가요|세요|습니까|입니까|ㄹ까요|을까요|는가요|은가요|니까|는지|은지|ㄴ지|냐|니|뭐|무엇|어디|언제|누구|왜|어떻게|어느|몇)$/,
  // 감탄/명령 종결어미
  exclamation: /(아|야|어|여|네|군|구나|세요|십시오|해라|하자|자)$/,
  // 쉼표가 필요한 연결어미/접속사
  comma: {
    // 연결어미 (문장 중간)
    connective: /(그리고|그러나|그래서|하지만|그런데|또한|게다가|따라서|그러므로|왜냐하면|만약|비록|물론|사실|결국|아무튼|어쨌든|한편|반면|대신|즉|예를 들어|예컨대|다시 말해)/,
    // 나열 패턴
    listing: /(\S+(?:와|과|랑|이랑)\s+\S+(?:와|과|랑|이랑))/,
  },
  // 문장 종결 패턴 (마침표 필요)
  ending: /(다|요|죠|습니다|입니다|됩니다|합니다|했다|했습니다|이다|였다|였습니다|네요|군요|거든요|잖아요|래요|대요)$/,
}

// 영어 패턴
const ENGLISH_PATTERNS = {
  // 의문문 시작 단어
  questionStart: /^(what|where|when|who|why|how|which|whose|whom|can|could|would|should|will|do|does|did|is|are|was|were|have|has|had|may|might|shall)/i,
  // 의문문 종결 패턴
  questionEnd: /\?$/,
  // 감탄문 패턴
  exclamation: /^(wow|oh|hey|oops|ouch|yay|hooray|alas|bravo|congratulations|amazing|incredible|fantastic|great|wonderful|excellent)/i,
  // 쉼표가 필요한 접속사/부사
  comma: {
    // 문장 시작 접속사
    starter: /^(however|therefore|moreover|furthermore|nevertheless|meanwhile|consequently|additionally|similarly|likewise|otherwise|instead|thus|hence|accordingly|indeed|certainly|obviously|clearly|unfortunately|fortunately|surprisingly|interestingly|honestly|frankly|personally|generally|usually|typically|basically|essentially|actually|in fact|for example|for instance|in addition|on the other hand|as a result|in conclusion|to summarize|first|second|third|finally|lastly)/i,
    // 나열 접속사
    listing: /\b(and|or|but|yet|so|nor)\b/gi,
  },
  // 문장 종결 패턴
  ending: /[a-zA-Z]$/,
}

// 중국어 패턴
const CHINESE_PATTERNS = {
  question: /(吗|呢|吧|啊|么|嘛|什么|哪里|哪儿|谁|怎么|为什么|多少|几|何时|何地|是否)$/,
  exclamation: /(啊|呀|哇|哦|嘿|唉|哎|呸|嗯|哼)$/,
  comma: {
    connective: /(而且|但是|所以|因为|如果|虽然|不过|然而|因此|于是|另外|此外|同时|总之|首先|其次|最后|例如|比如)/,
  },
  ending: /(了|的|过|着|呢|吧|啊|嘛|哦|呀)$/,
}

// 일본어 패턴
const JAPANESE_PATTERNS = {
  question: /(か|の|かな|だろう|でしょう|ますか|ですか|なの|何|どこ|いつ|誰|なぜ|どう|どの|いくつ|いくら)$/,
  exclamation: /(よ|ね|な|わ|ぞ|ぜ|さ|かな|だな|ですね|ますね)$/,
  comma: {
    connective: /(そして|しかし|だから|でも|けど|それで|また|さらに|つまり|例えば|ところで|一方|逆に|要するに)/,
  },
  ending: /(です|ます|だ|である|た|ました|でした)$/,
}

/**
 * 언어 감지 (간단한 휴리스틱)
 * @param {string} text - 입력 텍스트
 * @returns {string} 감지된 언어 코드
 */
export function detectLanguage(text) {
  if (!text) return 'en'
  
  // 한글 포함
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return 'ko'
  // 일본어 (히라가나/카타카나)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'
  // 중국어 (한자만 있고 일본어 문자 없음)
  if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'zh'
  // 기본 영어
  return 'en'
}

/**
 * 스마트 구두점 추가 (문장 분석 기반)
 * @param {string} text - 입력 텍스트
 * @param {string} [lang] - 언어 코드 (자동 감지 가능)
 * @returns {string} 구두점이 추가된 텍스트
 */
export function addPunctuation(text, lang) {
  if (!text) return text

  let result = text.trim()
  const detectedLang = lang || detectLanguage(result)
  
  // 이미 구두점이 있으면 그대로 반환
  if (/[.!?。！？]$/.test(result)) {
    return capitalizeFirst(result, detectedLang)
  }

  // 언어별 처리
  switch (detectedLang) {
    case 'ko':
      result = processKorean(result)
      break
    case 'ja':
      result = processJapanese(result)
      break
    case 'zh':
      result = processChinese(result)
      break
    default:
      result = processEnglish(result)
  }

  return capitalizeFirst(result, detectedLang)
}

/**
 * 첫 글자 대문자 처리 (영어만)
 */
function capitalizeFirst(text, lang) {
  if (!text || lang !== 'en') return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * 한국어 문장 처리
 */
function processKorean(text) {
  let result = text
  
  // 쉼표 삽입: 연결어 뒤
  result = result.replace(
    new RegExp(`(${KOREAN_PATTERNS.comma.connective.source})\\s+`, 'g'),
    '$1, '
  )
  
  // 종결 구두점 결정
  if (KOREAN_PATTERNS.question.test(result)) {
    result += '?'
  } else if (KOREAN_PATTERNS.exclamation.test(result) && result.length < 20) {
    result += '!'
  } else {
    result += '.'
  }
  
  return result
}

/**
 * 영어 문장 처리
 */
function processEnglish(text) {
  let result = text
  
  // 쉼표 삽입: 문장 시작 접속사/부사 뒤
  const starterMatch = result.match(ENGLISH_PATTERNS.comma.starter)
  if (starterMatch && result.indexOf(starterMatch[0]) === 0) {
    const word = starterMatch[0]
    const rest = result.slice(word.length).trim()
    if (rest && !rest.startsWith(',')) {
      result = word + ', ' + rest
    }
  }
  
  // 종결 구두점 결정
  if (ENGLISH_PATTERNS.questionStart.test(result)) {
    result += '?'
  } else if (ENGLISH_PATTERNS.exclamation.test(result) && result.split(' ').length <= 5) {
    result += '!'
  } else {
    result += '.'
  }
  
  return result
}

/**
 * 중국어 문장 처리
 */
function processChinese(text) {
  let result = text
  
  // 쉼표 삽입: 연결어 뒤
  result = result.replace(
    new RegExp(`(${CHINESE_PATTERNS.comma.connective.source})`, 'g'),
    '$1，'
  )
  
  // 종결 구두점 결정
  if (CHINESE_PATTERNS.question.test(result)) {
    result += '？'
  } else if (CHINESE_PATTERNS.exclamation.test(result) && result.length < 10) {
    result += '！'
  } else {
    result += '。'
  }
  
  return result
}

/**
 * 일본어 문장 처리
 */
function processJapanese(text) {
  let result = text
  
  // 쉼표 삽입: 연결어 뒤
  result = result.replace(
    new RegExp(`(${JAPANESE_PATTERNS.comma.connective.source})`, 'g'),
    '$1、'
  )
  
  // 종결 구두점 결정
  if (JAPANESE_PATTERNS.question.test(result)) {
    result += '？'
  } else if (JAPANESE_PATTERNS.exclamation.test(result) && result.length < 15) {
    result += '！'
  } else {
    result += '。'
  }
  
  return result
}

/**
 * 비교를 위한 텍스트 정규화 (구두점 제거)
 * @param {string} text - 입력 텍스트
 * @returns {string} 비교용 정규화된 텍스트
 */
export function normalizeForComparison(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[.!?。！？,，、;；:：]/g, '')
    .replace(/\s+/g, ' ')
}

export default { normalizeText, addPunctuation, normalizeForComparison, detectLanguage }
