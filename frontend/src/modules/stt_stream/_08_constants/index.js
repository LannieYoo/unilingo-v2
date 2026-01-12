/**
 * STT Stream Constants
 * Constants definition
 */

// Supported language options
export const LANGUAGE_OPTIONS = [
  { value: 'en-us', label: 'English (US)' },
  { value: 'en-in', label: 'English (Indian)' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
]

// Vosk 모델 URL (Vite 프록시를 통해 CORS 우회)
export const MODEL_URLS = {
  'en-us': '/vosk-models/vosk-model-small-en-us-0.15.zip',
  'en-in': '/vosk-models/vosk-model-small-en-in-0.4.zip',
  'ko': '/vosk-models/vosk-model-small-ko-0.22.zip',
  'zh': '/vosk-models/vosk-model-small-cn-0.22.zip',
  'ja': '/vosk-models/vosk-model-small-ja-0.22.zip',
  'es': '/vosk-models/vosk-model-small-es-0.42.zip',
  'fr': '/vosk-models/vosk-model-small-fr-0.22.zip',
  'de': '/vosk-models/vosk-model-small-de-0.15.zip',
  'hi': '/vosk-models/vosk-model-small-hi-0.22.zip',
}

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
