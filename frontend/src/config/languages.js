// 언어 설정 중앙 관리
// TTS, STT, Dictionary, Translator 등 모든 모듈에서 공통으로 사용

export const LANGUAGES = [
  {
    code: 'en-US',
    name: 'English (US)',
    voice: 'en-US',
    translateCode: 'en',
    sttCode: 'en-us'
  },
  {
    code: 'en-GB',
    name: 'English (UK)',
    voice: 'en-GB',
    translateCode: 'en',
    sttCode: 'en-gb'
  },
  {
    code: 'en-IN',
    name: 'English (India)',
    voice: 'en-IN',
    translateCode: 'en',
    sttCode: 'en-in'
  },
  {
    code: 'en-AU',
    name: 'English (Australia)',
    voice: 'en-AU',
    translateCode: 'en',
    sttCode: 'en-au'
  },
  {
    code: 'ko',
    name: 'Korean',
    voice: 'ko-KR',
    translateCode: 'ko',
    sttCode: 'ko-kr'
  },
  {
    code: 'zh',
    name: 'Chinese (Simplified)',
    voice: 'zh-CN',
    translateCode: 'zh',
    sttCode: 'zh-cn'
  },
  // {
  //   code: 'ja',
  //   name: 'Japanese',
  //   voice: 'ja-JP',
  //   translateCode: 'ja',
  //   sttCode: 'ja-jp'
  // },
  // {
  //   code: 'es',
  //   name: 'Spanish',
  //   voice: 'es-ES',
  //   translateCode: 'es',
  //   sttCode: 'es-es'
  // },
  // {
  //   code: 'fr',
  //   name: 'French',
  //   voice: 'fr-FR',
  //   translateCode: 'fr',
  //   sttCode: 'fr-fr'
  // },
  // {
  //   code: 'de',
  //   name: 'German',
  //   voice: 'de-DE',
  //   translateCode: 'de',
  //   sttCode: 'de-de'
  // },
  // {
  //   code: 'ar',
  //   name: 'Arabic',
  //   voice: 'ar-SA',
  //   translateCode: 'ar',
  //   sttCode: 'ar-sa'
  // },
  // {
  //   code: 'hi',
  //   name: 'Hindi',
  //   voice: 'hi-IN',
  //   translateCode: 'hi',
  //   sttCode: 'hi-in'
  // },
  // {
  //   code: 'pt',
  //   name: 'Portuguese',
  //   voice: 'pt-PT',
  //   translateCode: 'pt',
  //   sttCode: 'pt-pt'
  // },
  // {
  //   code: 'ru',
  //   name: 'Russian',
  //   voice: 'ru-RU',
  //   translateCode: 'ru',
  //   sttCode: 'ru-ru'
  // },
  // {
  //   code: 'it',
  //   name: 'Italian',
  //   voice: 'it-IT',
  //   translateCode: 'it',
  //   sttCode: 'it-it'
  // }
]

// 언어 코드로 언어 정보 찾기
export const getLanguageByCode = (code) => {
  return LANGUAGES.find(lang => lang.code === code)
}

// 번역 API용 언어 코드 가져오기
export const getTranslateCode = (code) => {
  const lang = getLanguageByCode(code)
  return lang?.translateCode || code
}

// 음성 합성용 언어 코드 가져오기
export const getVoiceCode = (code) => {
  const lang = getLanguageByCode(code)
  return lang?.voice || 'en-US'
}

// STT용 언어 코드 가져오기
export const getSTTCode = (code) => {
  const lang = getLanguageByCode(code)
  return lang?.sttCode || 'en-us'
}

// 언어 감지 함수
export const detectLanguage = (text) => {
  if (!text.trim()) return 'en-US'
  
  // 한글 감지
  const koreanRegex = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/
  if (koreanRegex.test(text)) {
    return 'ko'
  }
  
  // 중국어 감지
  const chineseRegex = /[\u4E00-\u9FFF]/
  if (chineseRegex.test(text)) {
    return 'zh'
  }
  
  // 일본어 감지
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/
  if (japaneseRegex.test(text)) {
    return 'ja'
  }
  
  // 아랍어 감지
  const arabicRegex = /[\u0600-\u06FF]/
  if (arabicRegex.test(text)) {
    return 'ar'
  }
  
  // 히브리어 감지
  const hebrewRegex = /[\u0590-\u05FF]/
  if (hebrewRegex.test(text)) {
    return 'he'
  }
  
  // 키릴 문자 (러시아어 등) 감지
  const cyrillicRegex = /[\u0400-\u04FF]/
  if (cyrillicRegex.test(text)) {
    return 'ru'
  }
  
  // 기본값은 미국 영어
  return 'en-US'
}
