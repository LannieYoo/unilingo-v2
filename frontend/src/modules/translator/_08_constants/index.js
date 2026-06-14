/**
 * Translator 모듈 상수
 * 중앙 언어 설정(config/languages.js)을 사용
 */

import { LANGUAGES, getTranslateCode } from '../../../config/languages'

// Translator에서 사용할 언어만 필터링
const TRANSLATOR_LANG_CODES = ['en-US', 'en-GB', 'en-AU', 'ko', 'zh', 'ja', 'es', 'fr', 'de', 'ar', 'hi', 'pt', 'ru', 'it']

export const SOURCE_LANGUAGES = LANGUAGES
  .filter(lang => TRANSLATOR_LANG_CODES.includes(lang.code))
  .map(lang => ({
    code: lang.translateCode,
    name: lang.name,
    translateCode: lang.translateCode,
  }))
  // 중복 제거 (en-US, en-GB 등은 'en'으로 통합)
  .filter((item, index, self) =>
    index === self.findIndex(t => t.code === item.code)
  )

export const TARGET_LANGUAGES = [...SOURCE_LANGUAGES]

// 언어 코드 매핑 함수
export const getLangCode = (code) => {
  return getTranslateCode(code)
}

// 하위 호환성을 위한 LANG_MAP
export const LANG_MAP = LANGUAGES.reduce((acc, lang) => {
  acc[lang.translateCode] = lang.translateCode
  return acc
}, {})
