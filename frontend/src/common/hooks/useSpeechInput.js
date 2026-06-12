/**
 * useSpeechInput - Unified Speech Input Hook
 *
 * STT engine selection for browser-based app:
 * - Default: WASM SenseVoice (local, offline, high accuracy for ko/en/zh/ja)
 * - Fallback: Web Speech API (if WASM unavailable)
 *
 * Usage:
 *   const { start, stop, isListening, isAvailable,
 *           isModelLoading, modelLoadProgress, modelLoadStage, activeEngine }
 *     = useSpeechInput({ language: 'en-US', onResult, continuous: false })
 */

import { useWasmSpeechInput } from './useWasmSpeechInput'
import { useWebSpeechInput } from './useWebSpeechInput'

/**
 * Check if WASM STT is supported in this browser
 */
function isWasmSupported() {
  return typeof WebAssembly !== 'undefined'
    && typeof window !== 'undefined'
    && (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined')
}

/**
 * Determine which STT engine to use at module level.
 * This must be constant across renders to avoid violating React hooks rules.
 */
function detectSTTEngine() {
  if (typeof window === 'undefined') return 'web-speech' // SSR fallback
  if (isWasmSupported()) return 'wasm'
  return 'web-speech'
}

// Determine engine once at module load time
const STT_ENGINE = detectSTTEngine()

export function useSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  // Call ALL hooks unconditionally - React requires hooks to always be called
  // in the same order on every render.
  const wasmResult = useWasmSpeechInput({ language, onResult, continuous })
  const webSpeechResult = useWebSpeechInput({ language, onResult, continuous })

  switch (STT_ENGINE) {
    case 'wasm':
      // Dynamic fallback: if WASM STT init failed, use Web Speech API
      if (!wasmResult.isAvailable) {
        return { ...webSpeechResult, activeEngine: 'web-speech' }
      }
      return { ...wasmResult, activeEngine: 'wasm' }
    case 'web-speech':
    default:
      return { ...webSpeechResult, activeEngine: 'web-speech' }
  }
}

/**
 * Language code mapping for STT
 * Maps translator/dictionary language codes to BCP-47 codes used by STT engines
 */
export const STT_LANG_MAP = {
  'en': 'en-US',
  'en-us': 'en-US',
  'en-gb': 'en-GB',
  'en-in': 'en-IN',
  'ko': 'ko-KR',
  'zh': 'zh-CN',
  'zh-tw': 'zh-TW',
  'ja': 'ja-JP',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'it': 'it-IT',
}

/**
 * Get the correct STT language code for a given language code
 */
export function getSTTLanguage(langCode) {
  if (!langCode) return 'en-US'
  const normalized = langCode.toLowerCase()
  return STT_LANG_MAP[normalized] || STT_LANG_MAP[normalized.split('-')[0]] || 'en-US'
}
