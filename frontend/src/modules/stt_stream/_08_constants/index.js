/**
 * STT Stream Constants
 */

// Language options (pure languages, no engine variants)
export const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese' },
]

// STT Engine modes
export const STT_MODES = {
  LOCAL: 'local',
  SERVER: 'server',
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
export const DEFAULT_LANGUAGE = 'en-US'
export const DEFAULT_STT_MODE = 'local'
export const MAX_LOGS = 100
export const SAMPLE_RATE = 16000

// Backend URL for hybrid STT
export const BACKEND_STT_URL = import.meta.env.VITE_BACKEND_STT_URL || '/api/stt/process-missing'

export default {
  LANGUAGE_OPTIONS,
  STT_MODES,
  STATUS,
  LOG_TYPES,
  LOG_TYPE_COLORS,
  DEFAULT_LANGUAGE,
  DEFAULT_STT_MODE,
  MAX_LOGS,
  SAMPLE_RATE
}
