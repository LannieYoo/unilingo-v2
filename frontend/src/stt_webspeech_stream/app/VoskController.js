/**
 * VoskController - Vosk 기반 실시간 STT
 * 
 * - 완전히 브라우저에서 실행 (서버 불필요)
 * - 실시간 partial result 지원 (단어 단위 즉시 표시)
 * - 오프라인 동작
 */

import { createModel } from 'vosk-browser'
import { transcriptStore } from '../store/TranscriptStore'
import { debugLogger } from './debugLogger'

// 언어별 모델 URL (Vite 프록시를 통해 CORS 우회)
const MODEL_URLS = {
  'en': '/vosk-models/vosk-model-small-en-us-0.15.zip',
  'ko': '/vosk-models/vosk-model-small-ko-0.22.zip',
  'zh': '/vosk-models/vosk-model-small-cn-0.22.zip',
  'ja': '/vosk-models/vosk-model-small-ja-0.22.zip',
  'es': '/vosk-models/vosk-model-small-es-0.42.zip',
  'fr': '/vosk-models/vosk-model-small-fr-0.22.zip',
  'de': '/vosk-models/vosk-model-small-de-0.15.zip',
}

export class VoskController {
  constructor(options = {}) {
    this.lang = options.lang || 'en'
    this.onStatusChange = options.onStatusChange || (() => {})
    this.onProgress = options.onProgress || (() => {})
    
    this.model = null
    this.recognizer = null
    this.isRunning = false
    this.isModelLoaded = false
    
    // 오디오 관련
    this.audioContext = null
    this.mediaStream = null
    this.processor = null
  }

  /**
   * 모델 로드
   */
  async loadModel() {
    if (this.isModelLoaded && this.model) {
      debugLogger.info('Model already loaded')
      return true
    }

    const modelUrl = MODEL_URLS[this.lang]
    if (!modelUrl) {
      debugLogger.error('Unsupported language', { lang: this.lang })
      this.onStatusChange('error')
      return false
    }

    try {
      this.onStatusChange('loading')
      debugLogger.info('Loading Vosk model...', { lang: this.lang, url: modelUrl })
      
      this.model = await createModel(modelUrl, (progress) => {
        const pct = Math.round(progress * 100)
        debugLogger.info('Model loading progress', { progress: pct })
        this.onProgress(pct)
      })
      
      this.isModelLoaded = true
      debugLogger.info('Vosk model loaded successfully')
      this.onStatusChange('ready')
      return true
    } catch (error) {
      debugLogger.error('Failed to load model', { error: error.message })
      this.onStatusChange('error')
      return false
    }
  }

  /**
   * 언어 설정 (모델 재로드 필요)
   */
  async setLanguage(lang) {
    const newLang = lang.split('-')[0] // en-US -> en
    if (this.lang === newLang) return
    
    this.lang = newLang
    this.isModelLoaded = false
    this.model = null
    debugLogger.info('Language changed, model needs reload', { lang: this.lang })
  }

  /**
   * 녹음 시작
   */
  async start() {
    if (this.isRunning) {
      debugLogger.warn('Already running')
      return false
    }

    if (!this.isModelLoaded) {
      const loaded = await this.loadModel()
      if (!loaded) return false
    }

    try {
      // 마이크 접근
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000
        }
      })

      // AudioContext 생성
      this.audioContext = new AudioContext({ sampleRate: 16000 })
      
      // Recognizer 생성
      this.recognizer = new this.model.KaldiRecognizer(16000)
      
      // 이벤트 핸들러 설정
      this.recognizer.on('result', (message) => {
        const text = message.result?.text
        if (text && text.trim()) {
          debugLogger.result('Final', { text })
          transcriptStore.appendFinal(text.trim())
          transcriptStore.setInterim('')
        }
      })

      this.recognizer.on('partialresult', (message) => {
        const partial = message.result?.partial
        if (partial) {
          debugLogger.result('Partial', { text: partial })
          transcriptStore.setInterim(partial)
        }
      })

      // 오디오 처리
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      this.processor.onaudioprocess = (event) => {
        if (!this.isRunning || !this.recognizer) return
        try {
          this.recognizer.acceptWaveform(event.inputBuffer)
        } catch (error) {
          debugLogger.error('acceptWaveform failed', { error: error.message })
        }
      }

      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.isRunning = true
      debugLogger.info('Recording started')
      this.onStatusChange('listening')
      return true
    } catch (error) {
      debugLogger.error('Failed to start recording', { error: error.message })
      this.onStatusChange('error')
      return false
    }
  }

  /**
   * 녹음 중지
   */
  async stop() {
    debugLogger.info('Stopping...')
    this.isRunning = false

    // 마지막 결과 가져오기
    if (this.recognizer) {
      try {
        // Final result 강제 추출
        const finalResult = this.recognizer.retrieveFinalResult()
        if (finalResult?.text && finalResult.text.trim()) {
          debugLogger.result('Final on stop', { text: finalResult.text })
          transcriptStore.appendFinal(finalResult.text.trim())
        }
      } catch (e) {
        debugLogger.warn('Could not retrieve final result', { error: e.message })
      }
      
      this.recognizer.remove()
      this.recognizer = null
    }

    // 리소스 정리
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    transcriptStore.setInterim('')
    debugLogger.info('Stopped')
    this.onStatusChange('stopped')
  }

  /**
   * 지원 여부 확인
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  /**
   * 지원 언어 목록
   */
  static getSupportedLanguages() {
    return Object.keys(MODEL_URLS)
  }

  /**
   * 리소스 해제
   */
  destroy() {
    this.stop()
    if (this.model) {
      this.model.terminate()
      this.model = null
    }
    this.isModelLoaded = false
  }
}

export default VoskController
