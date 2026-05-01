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
   * Desktop/web falls back to Web Speech API.
   */
  useNativeSTT: () => {
    return Platform.isNative()
  },
}
