/**
 * Electron Preload Script
 * 
 * Runs in a sandboxed context before the renderer process loads.
 * Exposes a safe bridge between Node.js and the browser context
 * via contextBridge.
 * 
 * The renderer (React app) can access these APIs via window.electronAPI
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Platform ─────────────────────────────────────────────
  isElectron: true,
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // ─── Speech Recognition (sherpa-onnx) ─────────────────────
  speech: {
    /** Get supported speech recognition languages */
    getLanguages: () => ipcRenderer.invoke('speech:get-languages'),

    /** Check if SenseVoice model files are installed */
    isModelInstalled: () => ipcRenderer.invoke('speech:is-model-installed'),

    /** Start speech recognition with the given language */
    start: (language) => ipcRenderer.invoke('speech:start', { language }),

    /** Stop speech recognition */
    stop: () => ipcRenderer.invoke('speech:stop'),

    /**
     * Push PCM audio data to the main process for recognition.
     * Uses ipcRenderer.send (fire-and-forget) for low-latency streaming.
     * @param {ArrayBuffer} samples - Float32 PCM audio samples (16kHz mono)
     */
    pushAudio: (samples) => ipcRenderer.send('speech:push-audio', samples),

    /** Listen for speech recognition events (started, final, interim, error, end) */
    onEvent: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('speech:event', handler)
      // Return cleanup function
      return () => ipcRenderer.removeListener('speech:event', handler)
    },
  },
})
