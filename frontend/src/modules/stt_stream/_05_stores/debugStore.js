/**
 * Debug Store
 * 디버그 로그 상태 관리 (Zustand)
 */

import { create } from 'zustand'
import { MAX_LOGS, LOG_TYPES } from '../_08_constants'

export const useDebugStore = create((set, get) => ({
  // State
  logs: [],

  // Actions
  addLog: (type, message, data = null) => set((state) => {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    
    const newLogs = [...state.logs, entry]
    
    // 최대 로그 수 유지
    if (newLogs.length > MAX_LOGS) {
      return { logs: newLogs.slice(-MAX_LOGS) }
    }
    
    return { logs: newLogs }
  }),

  // 편의 메서드
  info: (message, data = null) => {
    get().addLog(LOG_TYPES.INFO, message, data)
    console.log(`[STT-INFO] ${message}`, data || '')
  },

  warn: (message, data = null) => {
    get().addLog(LOG_TYPES.WARN, message, data)
    console.warn(`[STT-WARN] ${message}`, data || '')
  },

  error: (message, data = null) => {
    get().addLog(LOG_TYPES.ERROR, message, data)
    console.error(`[STT-ERROR] ${message}`, data || '')
  },

  event: (message, data = null) => {
    get().addLog(LOG_TYPES.EVENT, message, data)
    console.log(`[STT-EVENT] ${message}`, data || '')
  },

  result: (message, data = null) => {
    get().addLog(LOG_TYPES.RESULT, message, data)
    console.log(`[STT-RESULT] ${message}`, data || '')
  },

  clear: () => set({ logs: [] })
}))

export default useDebugStore
