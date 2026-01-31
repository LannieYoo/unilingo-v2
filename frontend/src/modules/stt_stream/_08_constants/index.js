/**
 * STT Stream Constants
 * 중앙 언어 설정(config/languages.js)을 사용
 */

import { LANGUAGES } from '../../../config/languages'

// STT에서 지원하는 언어 (Web Speech API 기반)
const STT_SUPPORTED_CODES = ['en-US', 'en-GB', 'en-IN', 'en-AU', 'ko', 'zh', 'ja', 'es', 'fr', 'de', 'ar']

export const LANGUAGE_OPTIONS = LANGUAGES
  .filter(lang => STT_SUPPORTED_CODES.includes(lang.code))
  .map(lang => ({
    value: lang.voice.toLowerCase(), // en-US -> en-us
    label: lang.name,
    usesHybrid: lang.code === 'en-US' // 미국 영어만 하이브리드 모드
  }))

// Vosk 모델 URL (현재 사용하지 않음 - 참고용으로만 유지)
export const MODEL_URLS = {
  'en-us': '/vosk-models/vosk-model-small-en-us-0.15.zip',
  'en-us-lgraph': '/vosk-models/vosk-model-en-us-0.22-lgraph.zip',
  'en-in': '/vosk-models/vosk-model-small-en-in-0.4.zip',
  'ko': '/vosk-models/vosk-model-small-ko-0.22.zip',
  'zh': '/vosk-models/vosk-model-small-cn-0.22.zip',
  'ja': '/vosk-models/vosk-model-small-ja-0.22.zip',
  'es': '/vosk-models/vosk-model-small-es-0.42.zip',
  'fr': '/vosk-models/vosk-model-small-fr-0.22.zip',
  'de': '/vosk-models/vosk-model-small-de-0.15.zip',
  'ar': '/vosk-models/vosk-model-ar-mgb2-0.4.zip',
}

// Vosk lgraph 모델 URL (128MB, 7.82% WER - gap filling용)
export const VOSK_LGRAPH_MODEL_URL = '/vosk-models/vosk-model-en-us-0.22-lgraph.zip'

// Status messages
export const STATUS = {
  INIT: 'init',
  LOADING: 'loading',
  READY: 'ready',
  LISTENING: 'listening',
  STOPPED: 'stopped',
  ERROR: 'error'
}

// Debug log types
export const LOG_TYPES = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  EVENT: 'event',
  RESULT: 'result'
}

// Debug log colors
export const LOG_TYPE_COLORS = {
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
  event: '#8b5cf6',
  result: '#10b981'
}

// Default settings
export const DEFAULT_LANGUAGE = 'en-us'
export const MAX_LOGS = 100
export const SAMPLE_RATE = 16000

// Backend URL for hybrid STT
export const BACKEND_STT_URL = import.meta.env.VITE_BACKEND_STT_URL || 'http://localhost:8001/api/stt/process-missing'

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
