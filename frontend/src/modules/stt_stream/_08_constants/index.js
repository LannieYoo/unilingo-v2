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
    value: lang.voice, // BCP-47 format: en-US, zh-CN, ko-KR (Web Speech API requires proper casing)
    label: lang.name,
  }))

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
export const MAX_LOGS = 100
export const SAMPLE_RATE = 16000

// Backend URL for hybrid STT
export const BACKEND_STT_URL = import.meta.env.VITE_BACKEND_STT_URL || '/api/stt/process-missing'

export default {
  LANGUAGE_OPTIONS,
  STATUS,
  LOG_TYPES,
  LOG_TYPE_COLORS,
  DEFAULT_LANGUAGE,
  MAX_LOGS,
  SAMPLE_RATE
}
