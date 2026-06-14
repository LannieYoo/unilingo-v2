/**
 * STT WASM Worker — sherpa-onnx SenseVoice VAD+ASR in Browser
 *
 * Runs sherpa-onnx WebAssembly + SenseVoice model entirely in the browser.
 * No server, no language packs, no OS dependency.
 *
 * Uses the pre-built `sherpa-onnx-wasm-main-vad-asr` WASM binary with
 * bundled SenseVoice + Silero VAD models (in the .data file).
 *
 * Messages IN (from main thread):
 *   { type: 'init', wasmBaseUrl: '...' }
 *   { type: 'start', language: 'ko-KR' }
 *   { type: 'audio', samples: Float32Array }
 *   { type: 'stop' }
 *
 * Messages OUT (to main thread):
 *   { type: 'ready' }
 *   { type: 'model-loading', progress: 0.0~1.0, stage: '...' }
 *   { type: 'started' }
 *   { type: 'final', text: '...', confidence: 1.0 }
 *   { type: 'error', message: '...' }
 *   { type: 'end' }
 */

const SAMPLE_RATE = 16000

let recognizer = null
let vad = null
let circularBuffer = null
let isRunning = false
let speechDetected = false
let currentLanguage = ''

// ─── Language Mapping ──────────────────────────────────────────

function mapLanguage(bcp47) {
  if (!bcp47) return ''
  const code = bcp47.toLowerCase()
  if (code.startsWith('ko')) return 'ko'
  if (code.startsWith('en')) return 'en'
  if (code.startsWith('ja')) return 'ja'
  if (code.startsWith('zh')) return 'zh'
  if (code.startsWith('yue')) return 'yue'
  return ''
}

// ─── Korean Spacing Fix ────────────────────────────────────────

function fixKoreanSpacing(text) {
  const isHangul = (ch) => ch && ch.charCodeAt(0) >= 0xAC00 && ch.charCodeAt(0) <= 0xD7AF
  const words = text.split(/\s+/)
  const merged = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const next = words[i + 1]
    if (word.length === 1 && isHangul(word) && next && isHangul(next[0])) {
      merged.push(word + next)
      i++
    } else {
      merged.push(word)
    }
  }
  return merged.join(' ')
}

/**
 * Clean Korean STT result — remove non-Korean characters that
 * SenseVoice small model sometimes outputs (Japanese, Chinese).
 */
function cleanKoreanResult(text) {
  // Remove Japanese Hiragana (\u3040-\u309F), Katakana (\u30A0-\u30FF)
  // Remove CJK Unified Ideographs (\u4E00-\u9FFF) — Chinese/Kanji
  // Keep Hangul (\uAC00-\uD7AF), Hangul Jamo (\u1100-\u11FF, \u3130-\u318F)
  // Keep ASCII letters, digits, punctuation, spaces
  let cleaned = text.replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '')
  // Remove Japanese/Chinese punctuation
  cleaned = cleaned.replace(/[。、！？「」『』（）｛｝【】〈〉《》〔〕]/g, '')
  // Clean up leftover whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Check if a file exists in the WASM virtual filesystem.
 * Uses the C function _SherpaOnnxFileExists exposed by the WASM build.
 */
function fileExists(filename) {
  const filenameLen = Module.lengthBytesUTF8(filename) + 1
  const buffer = Module._malloc(filenameLen)
  Module.stringToUTF8(filename, buffer, filenameLen)
  const exists = Module._SherpaOnnxFileExists(buffer)
  Module._free(buffer)
  return exists === 1
}

/**
 * Initialize the offline recognizer.
 * Detects which model files are bundled in the .data file and configures accordingly.
 * @param {string} language - SenseVoice language code: 'ko', 'en', 'ja', 'zh', 'yue', or '' for auto
 */
function initOfflineRecognizer(language) {
  // Free previous recognizer if exists (for language change)
  if (recognizer) {
    try {
      recognizer.free()
    } catch (e) {
      console.warn('[STT Worker] Failed to free old recognizer:', e)
    }
    recognizer = null
  }

  const config = {
    modelConfig: {
      debug: 0,
      tokens: './tokens.txt',
    },
  }

  if (fileExists('sense-voice.onnx')) {
    config.modelConfig.senseVoice = {
      model: './sense-voice.onnx',
      language: language || '',
      useInverseTextNormalization: 1,
    }
    console.log(`[STT Worker] Using SenseVoice model (language: ${language || 'auto'})`)
  } else if (fileExists('model.int8.onnx')) {
    config.modelConfig.senseVoice = {
      model: './model.int8.onnx',
      language: language || '',
      useInverseTextNormalization: 1,
    }
    console.log(`[STT Worker] Using model.int8.onnx as SenseVoice (language: ${language || 'auto'})`)
  } else if (fileExists('whisper-encoder.onnx')) {
    config.modelConfig.whisper = {
      encoder: './whisper-encoder.onnx',
      decoder: './whisper-decoder.onnx',
    }
    console.log('[STT Worker] Using Whisper model')
  } else if (fileExists('paraformer.onnx')) {
    config.modelConfig.paraformer = {
      model: './paraformer.onnx',
    }
    console.log('[STT Worker] Using Paraformer model')
  } else {
    throw new Error('No supported model found in WASM data bundle')
  }

  recognizer = new OfflineRecognizer(config, Module)
  currentLanguage = language || ''
  console.log('[STT Worker] OfflineRecognizer created successfully')
}

// ─── WASM Module Initialization ────────────────────────────────

async function initEngine(wasmBaseUrl, initLanguage) {
  self.postMessage({ type: 'model-loading', progress: 0, stage: 'Loading WASM runtime...' })

  // Set up the Emscripten Module object
  // The WASM glue code will attach to self.Module
  self.Module = {
    // locateFile tells Emscripten where to find .wasm and .data files
    locateFile: (path, scriptDirectory) => {
      console.log(`[STT Worker] locateFile: ${path}`)
      return wasmBaseUrl + path
    },
  }

  // Track .data file loading progress
  self.Module.setStatus = (text) => {
    if (text) {
      // Emscripten emits status like "Downloading data... (X/Y)"
      const match = text.match(/(\d+)\/(\d+)/)
      if (match) {
        const loaded = parseInt(match[1])
        const total = parseInt(match[2])
        const progress = total > 0 ? loaded / total : 0
        self.postMessage({
          type: 'model-loading',
          progress: progress * 0.85,
          stage: `Loading models... (${(loaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`,
        })
      } else {
        console.log('[STT Worker] Status:', text)
      }
    }
  }

  // Import the JS wrappers (OfflineRecognizer, Vad, CircularBuffer classes)
  importScripts(wasmBaseUrl + 'sherpa-onnx-asr.js')
  importScripts(wasmBaseUrl + 'sherpa-onnx-vad.js')

  // Import the WASM glue code (this triggers Module initialization)
  importScripts(wasmBaseUrl + 'sherpa-onnx-wasm-main-vad-asr.js')

  self.postMessage({ type: 'model-loading', progress: 0.1, stage: 'Waiting for WASM runtime...' })

  // Wait for Emscripten runtime to initialize
  // The .data file (with bundled models) is loaded during this phase
  await new Promise((resolve, reject) => {
    if (self.Module.calledRun) {
      resolve()
    } else {
      const origCallback = self.Module.onRuntimeInitialized
      self.Module.onRuntimeInitialized = () => {
        if (origCallback) origCallback()
        resolve()
      }
      // Timeout after 120 seconds (large .data file may take time)
      setTimeout(() => reject(new Error('WASM runtime initialization timed out')), 120000)
    }
  })

  self.postMessage({ type: 'model-loading', progress: 0.9, stage: 'Initializing engine...' })

  // Initialize VAD with tuned parameters for better speech segmentation
  // Longer minSilenceDuration = longer segments = better recognition
  const vadConfig = {
    sileroVad: {
      model: './silero_vad.onnx',
      threshold: 0.45,
      minSilenceDuration: 0.4,    // Wait 0.4s silence before splitting → near-realtime output
      minSpeechDuration: 0.25,    // Catch shorter speech bursts
      maxSpeechDuration: 3,       // Force-split at 3s even without silence
      windowSize: 512,
    },
    sampleRate: SAMPLE_RATE,
    numThreads: 1,
    provider: 'cpu',
    debug: 0,
    bufferSizeInSeconds: 60,
  }
  vad = createVad(Module, vadConfig)
  console.log('[STT Worker] VAD created (tuned for near-realtime: 0.4s silence, 5s max)')

  // Initialize CircularBuffer (30 seconds of audio at 16kHz)
  circularBuffer = new CircularBuffer(30 * SAMPLE_RATE, Module)
  console.log('[STT Worker] CircularBuffer created')

  // Initialize OfflineRecognizer (default language from init message)
  initOfflineRecognizer(initLanguage)

  self.postMessage({ type: 'model-loading', progress: 1.0, stage: 'Ready ✓' })
}

// ─── Audio Processing (follows app-vad-asr.js pattern) ─────────

function processAudio(samples) {
  if (!vad || !circularBuffer || !recognizer) return

  // Push audio into circular buffer
  circularBuffer.push(samples)

  // Process in VAD window-sized chunks
  const windowSize = vad.config.sileroVad.windowSize

  while (circularBuffer.size() > windowSize) {
    const chunk = circularBuffer.get(circularBuffer.head(), windowSize)
    vad.acceptWaveform(chunk)
    circularBuffer.pop(windowSize)

    // Check for speech detection
    if (vad.isDetected() && !speechDetected) {
      speechDetected = true
      console.log('[STT Worker] Speech detected')
    }

    if (!vad.isDetected()) {
      speechDetected = false
    }

    // Process any complete speech segments
    while (!vad.isEmpty()) {
      const segment = vad.front()
      const duration = segment.samples.length / SAMPLE_RATE
      vad.pop()

      console.log(`[STT Worker] Segment: ${duration.toFixed(2)}s`)

      // Skip very short segments — they produce garbage results
      if (duration < 0.4) {
        console.log(`[STT Worker] Skipping short segment (${duration.toFixed(2)}s)`)
        continue
      }

      // Decode with offline recognizer
      const stream = recognizer.createStream()
      stream.acceptWaveform(SAMPLE_RATE, segment.samples)
      recognizer.decode(stream)
      const result = recognizer.getResult(stream)
      stream.free()

      let text = result.text || ''
      text = text.trim()

      if (text) {
        if (currentLanguage === 'ko') {
          text = cleanKoreanResult(text)
          text = fixKoreanSpacing(text)
        }
        if (text) {
          // Detect forced split: segment near maxSpeechDuration (5s) means
          // VAD hit the limit, not a natural silence boundary
          const forcedSplit = duration >= 2.5
          console.log(`[STT Worker] Recognized: "${text}" (${duration.toFixed(1)}s, ${forcedSplit ? 'forced' : 'natural'})`)
          self.postMessage({ type: 'final', text, confidence: 1.0, forcedSplit })
        }
      }
    }
  }
}

function handleStop() {
  if (!isRunning) return

  // Flush remaining audio through VAD
  if (vad) {
    vad.flush()

    // Process any remaining segments
    while (!vad.isEmpty()) {
      const segment = vad.front()
      vad.pop()

      const stream = recognizer.createStream()
      stream.acceptWaveform(SAMPLE_RATE, segment.samples)
      recognizer.decode(stream)
      const result = recognizer.getResult(stream)
      stream.free()

      let text = (result.text || '').trim()
      if (text) {
        if (currentLanguage === 'ko') {
          text = cleanKoreanResult(text)
          text = fixKoreanSpacing(text)
        }
        if (text) {
          console.log(`[STT Worker] Final segment: "${text}"`)
          self.postMessage({ type: 'final', text, confidence: 1.0 })
        }
      }
    }

    vad.reset()
  }

  if (circularBuffer) {
    circularBuffer.reset()
  }

  speechDetected = false
  isRunning = false
  self.postMessage({ type: 'end' })
  console.log('[STT Worker] Stopped')
}

// ─── Message Handler ───────────────────────────────────────────

let initializationPromise = null

self.onmessage = async (event) => {
  const msg = event.data

  try {
    switch (msg.type) {
      case 'init': {
        if (!initializationPromise) {
          // Default: load from same origin's public directory
          const wasmUrl = msg.wasmBaseUrl || '/'
          const lang = mapLanguage(msg.language)
          initializationPromise = initEngine(wasmUrl, lang)
        }
        try {
          await initializationPromise
          self.postMessage({ type: 'ready' })
        } catch (err) {
          initializationPromise = null
          throw err
        }
        break
      }

      case 'start': {
        if (isRunning) handleStop()

        const newLang = mapLanguage(msg.language)
        // Recreate recognizer if language changed (SenseVoice needs it at config time)
        if (newLang !== currentLanguage && recognizer) {
          console.log(`[STT Worker] Language changed: ${currentLanguage} → ${newLang}, recreating recognizer`)
          initOfflineRecognizer(newLang)
        } else if (!currentLanguage && newLang) {
          // First start with explicit language
          console.log(`[STT Worker] Setting language: ${newLang}`)
          initOfflineRecognizer(newLang)
        }

        isRunning = true
        speechDetected = false
        self.postMessage({ type: 'started' })
        console.log(`[STT Worker] Started (language: ${currentLanguage || 'auto'}, maxSpeech: 5s)`)
        break
      }

      case 'audio': {
        if (!isRunning || !recognizer) return
        const float32 = msg.samples instanceof Float32Array
          ? msg.samples
          : new Float32Array(msg.samples)

        processAudio(float32)
        break
      }

      case 'stop':
        handleStop()
        break

      default:
        console.warn('[STT Worker] Unknown message type:', msg.type)
    }
  } catch (err) {
    console.error('[STT Worker] Error:', err)
    self.postMessage({ type: 'error', message: err.message })
  }
}

console.log('[STT Worker] WASM STT worker loaded (VAD+ASR build)')
