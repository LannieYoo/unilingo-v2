/**
 * debugLogger - 디버그 로깅 유틸리티
 */

import { debugStore } from '../store/DebugStore'

export const debugLogger = {
  info(message, data = null) {
    console.log(`[STT-INFO] ${message}`, data || '')
    debugStore.addLog('info', message, data)
  },

  warn(message, data = null) {
    console.warn(`[STT-WARN] ${message}`, data || '')
    debugStore.addLog('warn', message, data)
  },

  error(message, data = null) {
    console.error(`[STT-ERROR] ${message}`, data || '')
    debugStore.addLog('error', message, data)
  },

  event(message, data = null) {
    console.log(`[STT-EVENT] ${message}`, data || '')
    debugStore.addLog('event', message, data)
  },

  result(message, data = null) {
    console.log(`[STT-RESULT] ${message}`, data || '')
    debugStore.addLog('result', message, data)
  }
}

export default debugLogger
