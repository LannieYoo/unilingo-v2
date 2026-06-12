/**
 * useSpeechInput - Unified Speech Input Hook
 *
 * Automatically selects the best STT engine based on platform and language:
 * - Mobile (Capacitor): Native OS STT (Siri on iOS, Gboard on Android)
 * - Desktop (Electron): sherpa-onnx SenseVoice (offline, no OS dependency)
 * - Web browser:
 *     - Default: WASM SenseVoice (local, no server, no language pack)
 *     - English (Indian): Server Whisper (future, Docker container)
 *     - Fallback: Web Speech API (if WASM unavailable)
 *
 * Usage:
 *   const { start, stop, isListening, transcript, interimTranscript, error, isAvailable,
 *           isModelLoading, modelLoadProgress, modelLoadStage }
 *     = useSpeechInput({ language: 'en-US', onResult, continuous: false })
 *
 * Common interface for all platforms:
 *   start()           - Begin speech recognition
 *   stop()            - Stop speech recognition
 *   isListening       - Whether currently recording
 *   transcript        - Accumulated final transcript
 *   interimTranscript - Current interim (partial) transcript
 *   error             - Error object if any
 *   isAvailable       - Whether STT is available on this platform
 *   isModelLoading    - (WASM only) Whether model is downloading
 *   modelLoadProgress - (WASM only) Download progress 0.0~1.0
 *   modelLoadStage    - (WASM only) Current loading stage description
 */

import { Platform } from '../utils/platformUtils'
import { useNativeSpeechInput } from './useNativeSpeechInput'
import { useElectronSpeechInput } from './useElectronSpeechInput'
import { useWasmSpeechInput } from './useWasmSpeechInput'
import { useWebSpeechInput } from './useWebSpeechInput'

/**
 * Check if the language should use server-side STT (Whisper)
 * Currently: English (Indian) accent → server Whisper (Phase 4)
 */
function shouldUseServerSTT(language) {
  if (!language) return false
  const code = language.toLowerCase()
  return code === 'en-in' || code === 'en-accent'
}

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
 * Platform detection values don't change during the app lifecycle.
 */
function detectSTTEngine() {
  if (typeof window === 'undefined') return 'web-speech' // SSR fallback
  if (Platform.isNative()) return 'native'
  if (Platform.isElectron()) return 'electron'
  if (isWasmSupported()) return 'wasm'
  return 'web-speech'
}

// Determine engine once at module load time - it never changes during runtime
const STT_ENGINE = detectSTTEngine()

export function useSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  // Call ALL hooks unconditionally - React requires hooks to always be called
  // in the same order on every render. Only one engine's result is actually used.
  const nativeResult = useNativeSpeechInput({ language, onResult, continuous })
  const electronResult = useElectronSpeechInput({ language, onResult, continuous })
  const wasmResult = useWasmSpeechInput({ language, onResult, continuous })
  const webSpeechResult = useWebSpeechInput({ language, onResult, continuous })

  // Return the appropriate result based on the detected engine
  // With dynamic fallback: if WASM init failed, use Web Speech API
  switch (STT_ENGINE) {
    case 'native':
      return { ...nativeResult, activeEngine: 'native' }
    case 'electron':
      return { ...electronResult, activeEngine: 'electron' }
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
  'en-in': 'en-IN',      // Indian English → future server Whisper
  'en-accent': 'en-IN',  // Generic accented English
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
