/**
 * Sherpa-ONNX Speech Recognition Engine
 * 
 * Wraps a child_process.fork() worker that runs sherpa-onnx in plain Node.js.
 * This avoids Electron's V8 restriction on external ArrayBuffers.
 * 
 * Architecture:
 *   Electron Main → fork() → sherpaWorker.cjs (plain Node.js)
 *   Audio: Float32 array sent via IPC message
 *   Results: IPC message back to main → forwarded to renderer
 */

const { EventEmitter } = require('events')
const { fork } = require('child_process')
const path = require('path')
const fs = require('fs')

const SUPPORTED_LANGUAGES = [
  'zh', 'en', 'ja', 'ko', 'yue',
  'zh-CN', 'zh-TW', 'zh-Hans-CN', 'zh-Hant-TW',
  'en-US', 'en-GB', 'ko-KR', 'ja-JP',
]

function getModelsDir() {
  const { app } = require('electron')
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'models')
  }
  return path.join(__dirname, 'models')
}

class SherpaOnnxRecognizer extends EventEmitter {
  constructor() {
    super()
    this.worker = null
    this.isRunning = false
    this._ready = false
    this._pendingCallbacks = new Map()
  }

  /**
   * Spawn the worker process and initialize recognizer + VAD.
   * Returns a promise that resolves when the worker is ready.
   */
  _ensureWorker() {
    if (this.worker && this._ready) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'sherpaWorker.cjs')
      const modelsDir = getModelsDir()

      // Fork using system Node.js (NOT Electron's binary)
      // Electron's V8 blocks external ArrayBuffers from native addons.
      // System Node.js allows them.
      const systemNode = process.platform === 'win32'
        ? 'node.exe'   // Found via PATH
        : 'node'

      this.worker = fork(workerPath, [modelsDir], {
        execPath: systemNode,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        windowsHide: true,
        silent: true,
      })

      // Pipe worker stdout/stderr to main process console (without opening a window)
      this.worker.stdout?.on('data', (d) => process.stdout.write(d))
      this.worker.stderr?.on('data', (d) => process.stderr.write(d))

      const onReady = (msg) => {
        if (msg.type === 'alive') {
          // Worker is alive, send init
          this.worker.send({ type: 'init' })
        } else if (msg.type === 'ready') {
          this._ready = true
          console.log('[SherpaOnnx] Worker ready')
          resolve()
        } else if (msg.type === 'error') {
          reject(new Error(msg.message))
        }
      }

      this.worker.on('message', onReady)

      // Set up permanent message handler after init
      const initTimeout = setTimeout(() => {
        reject(new Error('Worker init timeout'))
      }, 30000)

      const originalResolve = resolve
      resolve = (...args) => {
        clearTimeout(initTimeout)
        this.worker.removeListener('message', onReady)
        this._setupMessageHandler()
        originalResolve(...args)
      }

      this.worker.on('error', (err) => {
        console.error('[SherpaOnnx] Worker error:', err.message)
        this._ready = false
      })

      this.worker.on('exit', (code) => {
        console.log(`[SherpaOnnx] Worker exited with code ${code}`)
        this._ready = false
        this.worker = null
        if (this.isRunning) {
          this.isRunning = false
          this.emit('end', { type: 'end' })
        }
      })
    })
  }

  /**
   * Set up the permanent message handler for worker responses.
   */
  _setupMessageHandler() {
    if (!this.worker) return

    this.worker.on('message', (msg) => {
      switch (msg.type) {
        case 'started':
          this.emit('started', { type: 'started' })
          break
        case 'final':
          this.emit('final', { type: 'final', text: msg.text, confidence: msg.confidence })
          break
        case 'interim':
          this.emit('interim', { type: 'interim', text: msg.text })
          break
        case 'error':
          this.emit('error', { type: 'error', message: msg.message })
          break
        case 'end':
          this.isRunning = false
          this.emit('end', { type: 'end' })
          break
        case 'languages':
          this._resolveCallback('get-languages', msg.data)
          break
        case 'model-installed':
          this._resolveCallback('is-model-installed', msg.installed)
          break
      }
    })
  }

  _resolveCallback(key, data) {
    const cb = this._pendingCallbacks.get(key)
    if (cb) {
      this._pendingCallbacks.delete(key)
      cb(data)
    }
  }

  _requestFromWorker(type) {
    return new Promise((resolve) => {
      this._pendingCallbacks.set(type, resolve)
      this.worker.send({ type })
    })
  }

  /**
   * Start speech recognition.
   */
  async start(language = 'en-US') {
    if (this.isRunning) this.stop()

    try {
      await this._ensureWorker()
      this.worker.send({ type: 'start', language })
      this.isRunning = true
    } catch (err) {
      this.emit('error', { type: 'error', message: err.message })
    }
  }

  /**
   * Push PCM audio to the worker.
   * Converts Float32Array to plain Array for IPC serialization.
   */
  pushAudio(samples) {
    if (!this.isRunning || !this.worker) return

    // IPC messages serialize typed arrays, send as plain array
    this.worker.send({
      type: 'audio',
      samples: Array.from(samples),
    })
  }

  /**
   * Stop recognition and finalize.
   */
  stop() {
    if (this.worker && this.isRunning) {
      this.worker.send({ type: 'stop' })
    }
    this.isRunning = false
  }

  /**
   * Kill the worker process.
   */
  destroy() {
    if (this.worker) {
      this.worker.kill()
      this.worker = null
      this._ready = false
    }
  }

  static async getAvailableLanguages() {
    return {
      languages: [...SUPPORTED_LANGUAGES],
      engine: 'sherpa-onnx-sensevoice',
    }
  }

  static isModelInstalled() {
    const modelsDir = getModelsDir()
    const modelPath = path.join(modelsDir, 'model.int8.onnx')
    const tokensPath = path.join(modelsDir, 'tokens.txt')
    return fs.existsSync(modelPath) && fs.existsSync(tokensPath)
  }
}

module.exports = { SherpaOnnxRecognizer, SUPPORTED_LANGUAGES }
