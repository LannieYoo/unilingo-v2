/**
 * Sherpa-ONNX Worker Process
 * 
 * Runs in a plain Node.js child process (NOT in Electron's V8).
 * This sidesteps Electron's restriction on external ArrayBuffers
 * that native addons like sherpa-onnx create.
 * 
 * Communication: IPC messages with parent (Electron main process)
 * 
 * Messages IN (from parent):
 *   { type: 'init' }                    → Initialize recognizer + VAD
 *   { type: 'start', language: 'ko-KR'} → Start recognition
 *   { type: 'audio', samples: [...] }   → Push PCM audio (as plain array)
 *   { type: 'stop' }                    → Stop and finalize
 *   { type: 'get-languages' }           → Get supported languages
 *   { type: 'is-model-installed' }      → Check if model exists
 * 
 * Messages OUT (to parent):
 *   { type: 'ready' }
 *   { type: 'started' }
 *   { type: 'final', text: '...' }
 *   { type: 'interim', text: '...' }
 *   { type: 'error', message: '...' }
 *   { type: 'end' }
 *   { type: 'languages', data: {...} }
 *   { type: 'model-installed', installed: true/false }
 */

const path = require('path')
const fs = require('fs')

const SUPPORTED_LANGUAGES = [
  'zh', 'en', 'ja', 'ko', 'yue',
  'zh-CN', 'zh-TW', 'zh-Hans-CN', 'zh-Hant-TW',
  'en-US', 'en-GB', 'ko-KR', 'ja-JP',
]

const SAMPLE_RATE = 16000

// Models directory passed as command line arg or default
const modelsDir = process.argv[2] || path.join(__dirname, 'models')

let sherpa = null
let recognizer = null
let vad = null
let isRunning = false
let vadBuffer = []
let currentLanguage = ''

function loadSherpa() {
  if (!sherpa) {
    sherpa = require('sherpa-onnx-node')
  }
  return sherpa
}

/**
 * Map BCP-47 language codes to SenseVoice language identifiers.
 * SenseVoice accepts: 'zh', 'en', 'ja', 'ko', 'yue', or '' (auto-detect)
 */
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

function initRecognizer(language) {
  const s = loadSherpa()
  const modelPath = path.join(modelsDir, 'model.int8.onnx')
  const tokensPath = path.join(modelsDir, 'tokens.txt')

  if (!fs.existsSync(modelPath) || !fs.existsSync(tokensPath)) {
    throw new Error(`Model files not found in ${modelsDir}`)
  }

  const senseVoiceLang = mapLanguage(language)

  const config = {
    featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
    modelConfig: {
      senseVoice: {
        model: modelPath,
        language: senseVoiceLang,
        useInverseTextNormalization: 0,
      },
      tokens: tokensPath,
      numThreads: 2,
      provider: 'cpu',
      debug: 0,
    },
  }

  recognizer = new s.OfflineRecognizer(config)
  currentLanguage = senseVoiceLang
  console.log(`[Worker] OfflineRecognizer initialized (language: ${senseVoiceLang || 'auto'})`)
}

function initVad() {
  const s = loadSherpa()
  const vadModelPath = path.join(modelsDir, 'silero_vad.onnx')

  if (!fs.existsSync(vadModelPath)) {
    console.warn('[Worker] silero_vad.onnx not found — VAD disabled')
    return
  }

  const vadConfig = {
    sileroVad: {
      model: vadModelPath,
      threshold: 0.4,
      minSpeechDuration: 1.0,
      minSilenceDuration: 1.5,
      windowSize: 512,
    },
    sampleRate: SAMPLE_RATE,
    debug: false,
    numThreads: 1,
  }

  vad = new s.Vad(vadConfig, 60)
  console.log('[Worker] Silero VAD initialized (minSpeech=1.0s, minSilence=1.5s)')
}

/**
 * Fix Korean spacing issues from SenseVoice model.
 * The model often splits Korean words incorrectly: "지 금은" → "지금은"
 * Merges isolated single Hangul syllable + space + Hangul word.
 */
function fixKoreanSpacing(text) {
  // Range: Hangul Syllables U+AC00-U+D7AF
  const isHangul = (ch) => ch && ch.charCodeAt(0) >= 0xAC00 && ch.charCodeAt(0) <= 0xD7AF

  const words = text.split(/\s+/)
  const merged = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const next = words[i + 1]

    // Single Hangul syllable followed by a word starting with Hangul → merge
    if (word.length === 1 && isHangul(word) && next && isHangul(next[0])) {
      merged.push(word + next)
      i++ // skip next
    } else {
      merged.push(word)
    }
  }

  return merged.join(' ')
}

function decodeSegment(samples) {
  try {
    const stream = recognizer.createStream()
    stream.acceptWaveform({ samples, sampleRate: SAMPLE_RATE })
    recognizer.decode(stream)
    const result = recognizer.getResult(stream)

    if (result && result.text && result.text.trim()) {
      let text = result.text.trim()

      // Apply Korean spacing fix if current language is Korean
      if (currentLanguage === 'ko') {
        text = fixKoreanSpacing(text)
      }

      console.log(`[Worker] Recognized: ${text}`)
      process.send({ type: 'final', text, confidence: 1.0 })
    }
  } catch (err) {
    console.error('[Worker] Decode error:', err.message)
  }
}

function processWithVad(samples) {
  const windowSize = vad.config.sileroVad.windowSize

  // Append to JS-managed buffer
  for (let i = 0; i < samples.length; i++) {
    vadBuffer.push(samples[i])
  }

  // Feed windows to VAD
  while (vadBuffer.length >= windowSize) {
    const chunk = new Float32Array(vadBuffer.splice(0, windowSize))
    vad.acceptWaveform(chunk)
  }

  // Decode any complete speech segments
  while (!vad.isEmpty()) {
    const segment = vad.front()
    vad.pop()
    decodeSegment(segment.samples)
  }
}

function handleStop() {
  if (!isRunning) return

  // Flush remaining audio through VAD
  if (vad) {
    if (vadBuffer.length > 0) {
      const remaining = new Float32Array(vadBuffer)
      vadBuffer = []
      vad.acceptWaveform(remaining)
    }
    vad.flush()

    while (!vad.isEmpty()) {
      const segment = vad.front()
      vad.pop()
      decodeSegment(segment.samples)
    }
    vad.reset()
  }

  isRunning = false
  vadBuffer = []
  process.send({ type: 'end' })
  console.log('[Worker] Stopped')
}

// Handle messages from parent (Electron main process)
process.on('message', (msg) => {
  try {
    switch (msg.type) {
      case 'init':
        initRecognizer(msg.language || '')
        initVad()
        process.send({ type: 'ready' })
        break

      case 'start': {
        if (isRunning) handleStop()

        // Re-initialize recognizer if language changed
        const newLang = mapLanguage(msg.language)
        if (newLang !== currentLanguage) {
          initRecognizer(msg.language)
        }

        isRunning = true
        vadBuffer = []
        process.send({ type: 'started' })
        console.log(`[Worker] Started (language: ${currentLanguage || 'auto'})`)
        break
      }

      case 'audio':
        if (!isRunning || !recognizer) return
        // msg.samples is a plain number array (serialized through IPC)
        const float32 = new Float32Array(msg.samples)
        if (vad) {
          processWithVad(float32)
        }
        break

      case 'stop':
        handleStop()
        break

      case 'get-languages':
        process.send({
          type: 'languages',
          data: { languages: [...SUPPORTED_LANGUAGES], engine: 'sherpa-onnx-sensevoice' },
        })
        break

      case 'is-model-installed': {
        const modelPath = path.join(modelsDir, 'model.int8.onnx')
        const tokensPath = path.join(modelsDir, 'tokens.txt')
        process.send({
          type: 'model-installed',
          installed: fs.existsSync(modelPath) && fs.existsSync(tokensPath),
        })
        break
      }
    }
  } catch (err) {
    console.error('[Worker] Error:', err.message)
    process.send({ type: 'error', message: err.message })
  }
})

// Signal that worker is alive
process.send({ type: 'alive' })
console.log('[Worker] Sherpa-ONNX worker started')
