/**
 * Platform Detection Utility
 * Detects browser capabilities for the web application.
 */

export const Platform = {
  /**
   * Always true — app runs in the browser (desktop or mobile responsive)
   */
  isWeb: () => true,

  /**
   * Always false — this is a web-only app, not an Electron desktop app.
   */
  isElectron: () => false,

  /**
   * Always false — this is a web-only app, not a native mobile app.
   */
  isNative: () => false,

  /**
   * Returns the current platform name
   */
  getName: () => 'web',

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
    return Platform.supportsWasm() && Platform.supportsWebAudio()
  },

  /**
   * Returns the recommended STT engine for the current platform.
   * @returns {'wasm' | 'web-speech'}
   */
  getSTTEngine: () => {
    if (Platform.supportsWasmSTT()) return 'wasm'
    return 'web-speech'
  },
}
