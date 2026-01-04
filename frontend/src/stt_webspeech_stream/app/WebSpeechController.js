/**
 * WebSpeechController - Web Speech API 제어 (단일 Recognizer)
 * 
 * 핵심 전략:
 * - idle restart 제거 - Web Speech API의 자연스러운 onend에만 의존
 * - interim을 적극적으로 final로 승격 (3초 안정 시)
 * - onend 시 pending interim 저장 후 즉시 재시작
 */

import { transcriptStore } from '../store/TranscriptStore'
import { debugLogger } from './debugLogger'
import { addPunctuation } from './normalize'

export class WebSpeechController {
  constructor(options = {}) {
    this.lang = options.lang || 'en-US'
    this.onStatusChange = options.onStatusChange || (() => {})
    
    this.recognition = null
    this.isRunning = false
    this.pendingInterim = ''
    this.lastInterimText = ''
    this.lastInterimTime = 0
    
    // Interim 자동 승격 타이머 (3초 안정 시 승격)
    this.interimPromoteTimer = null
    this.interimStableTime = 3000
    
    // 재시작 관련
    this.restartCount = 0
    this.maxRestarts = 50
    this.isRestarting = false

    this.initRecognition()
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      debugLogger.error('Web Speech API not supported')
      return
    }

    this.recognition = new SpeechRecognition()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.lang
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = this.handleStart.bind(this)
    this.recognition.onresult = this.handleResult.bind(this)
    this.recognition.onerror = this.handleError.bind(this)
    this.recognition.onend = this.handleEnd.bind(this)
  }

  setLanguage(lang) {
    this.lang = lang
    if (this.recognition) {
      this.recognition.lang = lang
    }
  }

  start() {
    if (this.isRunning) {
      debugLogger.warn('Recognition already running')
      return false
    }

    try {
      this.isRunning = true
      this.pendingInterim = ''
      this.lastInterimText = ''
      this.lastInterimTime = Date.now()
      this.restartCount = 0
      this.recognition.start()
      debugLogger.info('Recognition start() called', { isRunning: this.isRunning })
      this.onStatusChange('starting')
      return true
    } catch (error) {
      debugLogger.error('Failed to start', { error: error.message })
      this.isRunning = false
      this.onStatusChange('error')
      return false
    }
  }

  stop() {
    debugLogger.info('stop() called', { isRunning: this.isRunning })
    this.isRunning = false
    this.clearInterimPromoteTimer()
    
    // pending interim 저장
    if (this.pendingInterim && this.pendingInterim.trim().length > 0) {
      debugLogger.info('Saving pending interim on stop', { pending: this.pendingInterim.trim() })
      const textToSave = addPunctuation(this.pendingInterim.trim())
      transcriptStore.appendFinal(textToSave)
    }
    this.pendingInterim = ''
    this.lastInterimText = ''
    transcriptStore.setInterim('')
    
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (e) {}
    }
    
    this.onStatusChange('stopped')
  }

  clearInterimPromoteTimer() {
    if (this.interimPromoteTimer) {
      clearTimeout(this.interimPromoteTimer)
      this.interimPromoteTimer = null
    }
  }

  /**
   * interim이 일정 시간 안정되면 final로 승격
   */
  startInterimPromoteTimer() {
    this.clearInterimPromoteTimer()
    
    this.interimPromoteTimer = setTimeout(() => {
      if (this.pendingInterim && this.pendingInterim.trim().length > 0) {
        const timeSinceLastInterim = Date.now() - this.lastInterimTime
        if (timeSinceLastInterim >= this.interimStableTime - 100) {
          debugLogger.info('Promoting stable interim to final', { 
            text: this.pendingInterim.trim(),
            stableFor: timeSinceLastInterim 
          })
          const textToSave = addPunctuation(this.pendingInterim.trim())
          transcriptStore.appendFinal(textToSave)
          transcriptStore.setInterim('')
          this.pendingInterim = ''
          this.lastInterimText = ''
        }
      }
    }, this.interimStableTime)
  }

  handleStart() {
    debugLogger.event('Recognition started', { isRunningBefore: this.isRunning })
    this.isRestarting = false
    this.onStatusChange('listening')
  }

  handleResult(event) {
    if (!this.isRunning) return

    const results = event.results
    let interimText = ''
    let finalText = ''

    // 모든 결과 처리
    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i]
      const transcript = result[0].transcript

      if (result.isFinal) {
        finalText += transcript
        debugLogger.result('Final', { text: transcript })
      } else {
        interimText += transcript
      }
    }

    // Final 결과 처리
    if (finalText) {
      this.clearInterimPromoteTimer()
      this.restartCount = 0 // 성공적인 인식 시 재시작 카운트 리셋
      
      const textToSave = addPunctuation(finalText.trim())
      transcriptStore.appendFinal(textToSave)
      
      // pending interim 클리어
      this.pendingInterim = ''
      this.lastInterimText = ''
      transcriptStore.setInterim('')
    }

    // Interim 결과 처리
    if (interimText) {
      this.lastInterimTime = Date.now()
      this.pendingInterim = interimText
      this.lastInterimText = interimText
      
      transcriptStore.setInterim(interimText)
      debugLogger.result('Interim', { text: interimText })
      
      // 안정화 타이머 시작
      this.startInterimPromoteTimer()
    }
  }

  handleError(event) {
    const error = event.error
    debugLogger.warn('Recognition error occurred', { error, isRunning: this.isRunning })

    if (error === 'aborted') {
      debugLogger.info('Recognition aborted (intentional)')
      return
    }

    if (error === 'no-speech') {
      debugLogger.info('No speech detected')
      // no-speech는 정상적인 상황, 재시작 시도
      return
    }

    if (error === 'network') {
      debugLogger.error('Network error')
      this.onStatusChange('error')
    }

    if (error === 'not-allowed') {
      debugLogger.error('Microphone permission denied')
      this.isRunning = false
      this.onStatusChange('error')
    }
  }

  handleEnd() {
    const canRestart = this.isRunning && this.restartCount < this.maxRestarts
    
    debugLogger.event('Recognition ended', { 
      isRunning: this.isRunning, 
      canRestart,
      pendingInterim: this.pendingInterim,
      restartCount: this.restartCount
    })

    // pending interim 저장
    if (this.pendingInterim && this.pendingInterim.trim().length > 0) {
      debugLogger.info('Saving pending interim on end', { pending: this.pendingInterim.trim() })
      const textToSave = addPunctuation(this.pendingInterim.trim())
      transcriptStore.appendFinal(textToSave)
      this.pendingInterim = ''
      this.lastInterimText = ''
      transcriptStore.setInterim('')
    }

    // 자동 재시작
    if (canRestart && !this.isRestarting) {
      this.isRestarting = true
      this.restartCount++
      debugLogger.info('Auto-restarting recognition', { restartCount: this.restartCount })
      
      // 즉시 재시작 (딜레이 없음)
      try {
        this.recognition.start()
      } catch (e) {
        debugLogger.error('Failed to restart', { error: e.message })
        // 약간의 딜레이 후 재시도
        setTimeout(() => {
          if (this.isRunning) {
            try {
              this.recognition.start()
            } catch (e2) {
              debugLogger.error('Retry failed', { error: e2.message })
              this.isRunning = false
              this.onStatusChange('error')
            }
          }
        }, 100)
      }
    } else if (!this.isRunning) {
      this.onStatusChange('stopped')
    }
  }

  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  }
}

export default WebSpeechController
