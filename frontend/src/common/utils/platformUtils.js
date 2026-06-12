/**
 * Platform Detection Utility
 * Detects whether the app is running as a native mobile app (Capacitor),
 * desktop app (Electron), or regular web browser.
 */

import { Capacitor } from '@capacitor/core'

export const Platform = {
  /**
   * True if running inside a native mobile app (iOS or Android via Capacitor)
   */
  isNative: () => {
    try {
      return Capacitor.isNativePlatform()
    } catch {
      return false
    }
  },

  /**
   * True if running on iOS (Capacitor)
   */
  isIOS: () => {
    try {
      return Capacitor.getPlatform() === 'ios'
    } catch {
      return false
    }
  },

  /**
   * True if running on Android (Capacitor)
   */
  isAndroid: () => {
    try {
      return Capacitor.getPlatform() === 'android'
    } catch {
      return false
    }
  },

  /**
   * True if running inside Electron desktop app
   */
  isElectron: () => {
    return typeof window !== 'undefined'
      && window.electronAPI?.isElectron === true
  },

  /**
   * True if running in a regular web browser (not native, not Electron)
   */
  isWeb: () => {
    return !Platform.isNative() && !Platform.isElectron()
  },

  /**
   * Returns the current platform name for logging/debugging
   */
  getName: () => {
    if (Platform.isIOS()) return 'ios'
    if (Platform.isAndroid()) return 'android'
    if (Platform.isElectron()) return 'electron'
    return 'web'
  },

  /**
   * True if native STT (speech recognition) should be used.
   * Native STT is preferred on mobile for stability and accuracy.
   * Desktop/web falls back to WASM or Web Speech API.
   */
  useNativeSTT: () => {
    return Platform.isNative()
  },

  /**
   * True if WebAssembly is supported in this browser.
   * Required for sherpa-onnx WASM SenseVoice STT.
   */
  supportsWasm: () => {
    return typeof WebAssembly !== 'undefined'
  },

  /**
   * True if Web Audio API is available (required for microphone capture).
   */
  supportsWebAudio: () => {
    return typeof window !== 'undefined'
      && (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined')
  },

  /**
   * True if WASM-based STT is available on this platform.
   * Requires both WebAssembly and Web Audio API.
   */
  supportsWasmSTT: () => {
    return Platform.isWeb() && Platform.supportsWasm() && Platform.supportsWebAudio()
  },

  /**
   * Returns the recommended STT engine for the current platform.
   * @returns {'native' | 'electron' | 'wasm' | 'web-speech' | 'server'}
   */
  getSTTEngine: (language) => {
    if (Platform.isNative()) return 'native'
    if (Platform.isElectron()) return 'electron'
    // Web browser: check language for server Whisper (future)
    const code = (language || '').toLowerCase()
    if (code === 'en-in' || code === 'en-accent') return 'server'
    if (Platform.supportsWasmSTT()) return 'wasm'
    return 'web-speech'
  },
}
