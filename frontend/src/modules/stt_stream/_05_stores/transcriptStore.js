/**
 * Transcript Store
 * 음성 인식 결과 상태 관리 (Zustand)
 */

import { create } from 'zustand'
import { DEFAULT_LANGUAGE, STATUS } from '../_08_constants'

export const useTranscriptStore = create((set, get) => ({
  // State
  finalText: '',
  interimText: '',
  status: STATUS.INIT,
  selectedLang: DEFAULT_LANGUAGE,
  loadProgress: 0,
  isSupported: true,
  showDebug: false,

  // Computed
  getFullText: () => {
    const state = get()
    return state.finalText + state.interimText
  },

  // Actions
  setInterim: (text) => set({ interimText: text }),

  appendFinal: (text) => set((state) => {
    if (!text || !text.trim()) return state
    
    const trimmed = text.trim()
    const needsSpace = state.finalText && !state.finalText.endsWith(' ')
    return {
      finalText: state.finalText + (needsSpace ? ' ' : '') + trimmed,
      interimText: ''
    }
  }),

  setStatus: (status) => set({ status }),
  
  setSelectedLang: (lang) => set({ selectedLang: lang }),
  
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  
  setIsSupported: (isSupported) => set({ isSupported }),
  
  setShowDebug: (show) => set({ showDebug: show }),
  
  toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),

  clear: () => set({
    finalText: '',
    interimText: ''
  }),

  reset: () => set({
    finalText: '',
    interimText: '',
    status: STATUS.INIT,
    loadProgress: 0
  })
}))

export default useTranscriptStore
