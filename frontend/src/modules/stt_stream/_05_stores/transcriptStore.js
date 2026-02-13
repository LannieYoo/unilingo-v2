/**
 * Transcript Store
 * Speech recognition result state management (Zustand)
 */

import { create } from 'zustand'
import { DEFAULT_LANGUAGE, STATUS } from '../_08_constants'

export const useTranscriptStore = create((set, get) => ({
  // State
  finalText: '',
  interimText: '',
  status: STATUS.INIT,
  errorMessage: '',
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

  setStatus: (status, errorMessage = '') => set({ status, errorMessage }),
  
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
    errorMessage: '',
    loadProgress: 0
  })
}))

export default useTranscriptStore
