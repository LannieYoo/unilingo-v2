/**
 * useSpeechInput - Unified Speech Input Hook
 *
 * Automatically selects the best STT engine based on the current platform:
 * - Mobile (Capacitor): Native OS STT (Siri on iOS, Gboard on Android)
 * - Desktop (Electron): sherpa-onnx SenseVoice (offline, no OS dependency)
 * - Web browser: Web Speech API
 *
 * Usage:
 *   const { start, stop, isListening, transcript, interimTranscript, error, isAvailable }
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
 */

import { Platform } from '../utils/platformUtils'
import { useNativeSpeechInput } from './useNativeSpeechInput'
import { useElectronSpeechInput } from './useElectronSpeechInput'
import { useWebSpeechInput } from './useWebSpeechInput'

export function useSpeechInput({ language = 'en-US', onResult, continuous = false }) {
  // Platform auto-detection: select the best STT engine per platform
  if (Platform.isNative()) {
    // Mobile: Capacitor native STT (Siri/Gboard)
    return useNativeSpeechInput({ language, onResult, continuous })
  }
  if (Platform.isElectron()) {
    // Desktop: sherpa-onnx SenseVoice (offline, no OS dependency)
    return useElectronSpeechInput({ language, onResult, continuous })
  }
  // Web: Browser Web Speech API
  return useWebSpeechInput({ language, onResult, continuous })
}

/**
 * Language code mapping for STT
 * Maps translator/dictionary language codes to BCP-47 codes used by STT engines
 */
export const STT_LANG_MAP = {
  'en': 'en-US',
  'en-us': 'en-US',
  'en-gb': 'en-GB',
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
