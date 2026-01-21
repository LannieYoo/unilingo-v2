// WebSpeechManagerV3 - 안정적인 Web Speech API 구현
// 2026-01-19 - Chrome 확장 프로그램 수준의 안정성

export class WebSpeechManagerV3 {
  constructor(language, callbacks) {
    this.language = language
    this.callbacks = callbacks
    this.recognition = null
    this.isRunning = false
    this.shouldRestart = false
    this.restartCount = 0
    this.lastInterimText = ''
    this.lastActivityTime = 0
    this.watchdogTimer = null
    this.resultIndex = 0
    this.isRestarting = false
    
    // 최적화된 타이밍
    this.WATCHDOG_INTERVAL = 1000 // 1초마다 체크 (더 빠른 감지)
    this.MAX_SILENCE_DURATION = 4000 // 4초 침묵 후 재시작 (더 빠른 재시작)
    this.RESTART_DELAY = 50 // 50ms 지연 (거의 즉시)
    this.ERROR_RESTART_DELAY = 200 // 에러 시 200ms 지연
  }

  start() {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Web Speech API not supported'))
        return
      }

      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        this.recognition = new SpeechRecognition()

        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = this.language
        this.recognition.maxAlternatives = 1

        this.recognition.onstart = () => {
          this.isRunning = true
          this.isRestarting = false
          this.lastActivityTime = Date.now()
          console.log('[WebSpeech v3] Started')
          resolve()
        }

        this.recognition.onresult = (event) => {
          this.lastActivityTime = Date.now()
          
          if (!this.callbacks.onResult) return

          let interimText = ''
          let finalText = ''

          for (let i = this.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const text = result[0].transcript

            if (result.isFinal) {
              finalText += text + ' '
              this.resultIndex = i + 1
              this.lastInterimText = ''
            } else {
              interimText += text
            }
          }

          if (finalText.trim()) {
            console.log('[WebSpeech v3] FINAL:', finalText.trim())
            this.callbacks.onResult(finalText.trim(), true)
          }
          
          if (interimText.trim()) {
            this.lastInterimText = interimText.trim()
            this.callbacks.onResult(interimText.trim(), false)
          }
        }

        this.recognition.onend = () => {
          const savedInterim = this.lastInterimText
          console.log('[WebSpeech v3] onend, shouldRestart:', this.shouldRestart, 'savedInterim:', savedInterim)
          this.isRunning = false

          if (this.shouldRestart && !this.isRestarting) {
            this.isRestarting = true
            this.restartCount++
            
            if (this.callbacks.onRestart) {
              console.log('[WebSpeech v3] Auto-restarted, count:', this.restartCount)
              this.callbacks.onRestart(this.restartCount, savedInterim)
            }
            
            this.lastInterimText = ''
            this.resultIndex = 0
            
            setTimeout(() => {
              if (this.shouldRestart && this.recognition) {
                this.restartRecognition()
              }
            }, this.RESTART_DELAY)
          }
        }

        this.recognition.onerror = (event) => {
          console.log('[WebSpeech v3] Error:', event.error)
          
          // no-speech와 aborted는 정상적인 상황
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return
          }
          
          // 다른 에러는 재시작 시도
          if (event.error === 'network' || event.error === 'audio-capture') {
            console.log('[WebSpeech v3] Recoverable error, will restart')
            // onend에서 자동 재시작됨
          } else if (this.callbacks.onError) {
            this.callbacks.onError(new Error(`Speech recognition error: ${event.error}`))
          }
        }

        this.shouldRestart = true
        this.recognition.start()
        this.startWatchdog()

      } catch (error) {
        reject(error)
      }
    })
  }

  restartRecognition() {
    if (!this.recognition || !this.shouldRestart) return

    try {
      this.recognition.start()
      console.log('[WebSpeech v3] Restarted #' + this.restartCount)
    } catch (e) {
      console.error('[WebSpeech v3] Restart failed:', e)
      
      // 재시도 (더 긴 지연)
      setTimeout(() => {
        if (this.shouldRestart && this.recognition) {
          try {
            this.recognition.start()
            console.log('[WebSpeech v3] Retry succeeded')
          } catch (e2) {
            console.error('[WebSpeech v3] Retry failed:', e2)
            
            // 마지막 재시도
            setTimeout(() => {
              if (this.shouldRestart && this.recognition) {
                try {
                  this.recognition.start()
                  console.log('[WebSpeech v3] Final retry succeeded')
                } catch (e3) {
                  console.error('[WebSpeech v3] All retries failed:', e3)
                  if (this.callbacks.onError) {
                    this.callbacks.onError(new Error('Failed to restart recognition'))
                  }
                }
              }
            }, this.ERROR_RESTART_DELAY * 2)
          }
        }
      }, this.ERROR_RESTART_DELAY)
    }
  }

  startWatchdog() {
    this.stopWatchdog()
    
    this.watchdogTimer = setInterval(() => {
      if (!this.shouldRestart || !this.recognition) {
        this.stopWatchdog()
        return
      }

      const silenceDuration = Date.now() - this.lastActivityTime
      
      // 침묵이 너무 길면 강제 재시작
      if (silenceDuration > this.MAX_SILENCE_DURATION && !this.isRestarting) {
        console.log('[WebSpeech v3] Watchdog: Silence detected (' + silenceDuration + 'ms), forcing restart')
        
        try {
          this.recognition.stop()
        } catch (e) {
          console.error('[WebSpeech v3] Watchdog stop failed:', e)
          // stop 실패 시 직접 재시작
          this.isRestarting = true
          this.restartRecognition()
        }
        
        this.lastActivityTime = Date.now()
      }
    }, this.WATCHDOG_INTERVAL)
  }

  stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  stop() {
    console.log('[WebSpeech v3] Stopping...')
    this.shouldRestart = false
    this.isRestarting = false
    this.lastInterimText = ''
    this.stopWatchdog()

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.error('[WebSpeech v3] Stop error:', error)
      }
    }

    this.isRunning = false
  }

  isActive() {
    return this.isRunning
  }

  getRestartCount() {
    return this.restartCount
  }
}
