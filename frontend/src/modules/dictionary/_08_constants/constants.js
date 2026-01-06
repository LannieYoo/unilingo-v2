/**
 * Dictionary 모듈 상수
 */

export const DEFAULT_TARGET_LANG = 'ko'

export const DIRECTIONS = [
  { value: 'ko', label: 'Korean' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' }
]

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
