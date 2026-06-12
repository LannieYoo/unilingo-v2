/**
 * Translator 모듈 상수
 * 중앙 언어 설정(config/languages.js)을 사용
 */

import { LANGUAGES, getTranslateCode } from '../../../config/languages'

// Translator에서 사용할 언어만 필터링
const TRANSLATOR_LANG_CODES = ['en-US', 'en-GB', 'en-IN', 'en-AU', 'ko', 'zh', 'ja', 'es', 'fr', 'de', 'ar', 'hi', 'pt', 'ru', 'it']
// STT 엔진 라우팅이 필요한 영어 변형은 별도 항목으로 유지
// en-IN → 서버 Whisper (인도 영어 정확도), 나머지 → WASM SenseVoice
const STT_VARIANT_CODES = ['en-IN'] // 별도 STT 라우팅이 필요한 코드

export const SOURCE_LANGUAGES = LANGUAGES
  .filter(lang => TRANSLATOR_LANG_CODES.includes(lang.code))
  .map(lang => ({
    code: STT_VARIANT_CODES.includes(lang.code)
      ? lang.code.toLowerCase() // 'en-in' — STT 라우팅용 별도 코드
      : lang.translateCode,     // 'en' — 기본 번역 코드
    name: lang.name,
    translateCode: lang.translateCode, // 번역 API용 (항상 'en')
  }))
  // 중복 제거 (en-US, en-GB 등은 'en'으로 통합, en-IN만 별도)
  .filter((item, index, self) =>
    index === self.findIndex(t => t.code === item.code)
  )

export const TARGET_LANGUAGES = [...SOURCE_LANGUAGES]

// 언어 코드 매핑 함수
// en-in → en (번역 API용), 일반 코드는 그대로 반환
export const getLangCode = (code) => {
  if (code === 'en-in') return 'en'
  return getTranslateCode(code)
}

// 하위 호환성을 위한 LANG_MAP
export const LANG_MAP = {
  ...LANGUAGES.reduce((acc, lang) => {
    acc[lang.translateCode] = lang.translateCode
    return acc
  }, {}),
  'en-in': 'en', // English (India) → 번역 API는 'en' 사용
}
