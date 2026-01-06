/**
 * STT Stream Constants
 * 상수 정의
 */

// 지원 언어 옵션
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
]

// Vosk 모델 URL (Vite 프록시를 통해 CORS 우회)
export const MODEL_URLS = {
  'en': '/vosk-models/vosk-model-small-en-us-0.15.zip',
  'ko': '/vosk-models/vosk-model-small-ko-0.22.zip',
  'zh': '/vosk-models/vosk-model-small-cn-0.22.zip',
  'ja': '/vosk-models/vosk-model-small-ja-0.22.zip',
  'es': '/vosk-models/vosk-model-small-es-0.42.zip',
  'fr': '/vosk-models/vosk-model-small-fr-0.22.zip',
  'de': '/vosk-models/vosk-model-small-de-0.15.zip',
}

// 상태 메시지
export const STATUS = {
  INIT: 'init',
  LOADING: 'loading',
  READY: 'ready',
  LISTENING: 'listening',
  STOPPED: 'stopped',
  ERROR: 'error'
}

// 디버그 로그 타입
export const LOG_TYPES = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  EVENT: 'event',
  RESULT: 'result'
}

// 디버그 로그 색상
export const LOG_TYPE_COLORS = {
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
  event: '#8b5cf6',
  result: '#10b981'
}

// 기본 설정
export const DEFAULT_LANGUAGE = 'en'
export const MAX_LOGS = 100
export const SAMPLE_RATE = 16000

export default {
  LANGUAGE_OPTIONS,
  MODEL_URLS,
  STATUS,
  LOG_TYPES,
  LOG_TYPE_COLORS,
  DEFAULT_LANGUAGE,
  MAX_LOGS,
  SAMPLE_RATE
}
