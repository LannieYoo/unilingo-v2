/**
 * Dictionary 모듈 상수
 * 중앙 언어 설정(config/languages.js)을 사용
 */

import { LANGUAGES } from '../../../config/languages'

export const DEFAULT_TARGET_LANG = 'ko'

// 중앙 언어 설정에서 Dictionary에서 사용할 언어만 필터링
export const DIRECTIONS = LANGUAGES
  .filter(lang => ['ko', 'en', 'zh', 'en-US', 'en-GB', 'en-IN', 'en-AU'].includes(lang.code))
  .map(lang => ({
    value: lang.translateCode,
    label: lang.name
  }))
  // 중복 제거 (en-US, en-GB 등이 모두 'en'으로 매핑됨)
  .filter((item, index, self) => 
    index === self.findIndex(t => t.value === item.value)
  )

export const LANGUAGE_NAMES = {
  ko: 'Korean',
  en: 'English',
  zh: 'Chinese'
}

export const LANGUAGE_DETECTION = {
  korean: { regex: '[\\uAC00-\\uD7AF\\u1100-\\u11FF\\u3130-\\u318F]' },
  chinese: { regex: '[\\u4E00-\\u9FFF\\u3400-\\u4DBF]' },
  english: { regex: '[a-zA-Z]' }
}

export default {
  DEFAULT_TARGET_LANG,
  DIRECTIONS,
  LANGUAGE_NAMES,
  LANGUAGE_DETECTION
}
