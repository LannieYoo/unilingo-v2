/**
 * WhisperController - Transformers.js Whisper 기반 STT
 * 
 * - 완전히 브라우저에서 실행 (서버 불필요)
 * - Google 서버 의존성 없음
 * - 실시간 오디오 청크 처리
 */

import { pipeline } from '@huggingface/transformers'
import { transcriptStore } from '../store/TranscriptStore'
import { debugLogger } from './debugLogger'

export class WhisperController {
  constructor(options = {}) {
    this.lang = options.lang || 'en'
    this.modelId = options.modelId || 'Xenova/whisper-tiny'
    this.onStatusChange = options.onStatusChange || (() => {})
    this.onProgress = options.onProgress || (() => {})
    
    this.transcriber = null
    this.isRunning = false
    this.isModelLoaded = false
    
    // 오디오 관련
    this.audioContext = null
    this.mediaStream = null
    this.processor = null
    this.audioChunks = []
    
    // 청크 처리 설정
    this.chunkDuration = 5 // 5초마다 처리
    this.sampleRate = 16000 // Whisper 요구 샘플레이트
    this.lastProcessTime = 0
    this.processInterval = null
  }

  /**
   * 모델 로드
   */
  async loadModel() {
    if (this.isModelLoaded) {
      debugLogger.info('Model already loaded')
      return true
    }

    try {
      this.onStatusChange('loading')
      debugLogger.info('Loading Whisper model...', { modelId: this.modelId })
      
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        this.modelId,
        {
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              const pct = Math.round((progress.loaded / progress.total) * 100)
              debugLogger.info('Model loading progress', { progress: pct })
              this.onProgress(pct)
            }
          }
        }
      )
      
      this.isModelLoaded = true
      debugLogger.info('Whisper model loaded successfully')
      this.onStatusChange('ready')
      return true
    } catch (error) {
      debugLogger.error('Failed to load model', { error: error.message })
      this.onStatusChange('error')
      return false
    }
  }

  /**
   * 언어 설정
   */
  setLanguage(lang) {
    // Whisper 언어 코드 변환 (en-US -> en)
    this.lang = lang.split('-')[0]
    debugLogger.info('Language set', { lang: this.lang })
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
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      // AudioContext 생성
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate })
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      
      // ScriptProcessor로 오디오 데이터 수집
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      this.audioChunks = []
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isRunning) return
        const inputData = e.inputBuffer.getChannelData(0)
        this.audioChunks.push(new Float32Array(inputData))
      }

      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)

      this.isRunning = true
      this.lastProcessTime = Date.now()
      
      // 주기적으로 오디오 처리
      this.processInterval = setInterval(() => {
        this.processAudioChunks()
      }, this.chunkDuration * 1000)

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

    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }

    // 남은 오디오 처리
    if (this.audioChunks.length > 0) {
      await this.processAudioChunks()
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

    debugLogger.info('Stopped')
    this.onStatusChange('stopped')
  }

  /**
   * 오디오 청크 처리 및 트랜스크립션
   */
  async processAudioChunks() {
    if (this.audioChunks.length === 0) return

    const chunks = this.audioChunks
    this.audioChunks = []

    // Float32Array로 병합
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const audioData = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      audioData.set(chunk, offset)
      offset += chunk.length
    }

    // 최소 길이 체크 (0.5초 이상)
    if (audioData.length < this.sampleRate * 0.5) {
      debugLogger.info('Audio too short, skipping')
      return
    }

    try {
      debugLogger.info('Processing audio chunk', { 
        duration: (audioData.length / this.sampleRate).toFixed(2) + 's'
      })

      const result = await this.transcriber(audioData, {
        language: this.lang,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      })

      if (result && result.text && result.text.trim()) {
        const text = result.text.trim()
        debugLogger.result('Transcription', { text })
        transcriptStore.appendFinal(text)
      }
    } catch (error) {
      debugLogger.error('Transcription failed', { error: error.message })
    }
  }

  /**
   * 지원 여부 확인
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  /**
   * 리소스 해제
   */
  destroy() {
    this.stop()
    this.transcriber = null
    this.isModelLoaded = false
  }
}

export default WhisperController
