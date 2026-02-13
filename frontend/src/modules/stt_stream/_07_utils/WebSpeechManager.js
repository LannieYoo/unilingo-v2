// WebSpeechManager v3.0 - 완전히 새로 작성
// 2026-01-17 - 텍스트 유실 방지 및 실시간 받아쓰기 최적화

export class WebSpeechManager {
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
    
    // 설정
    this.WATCHDOG_INTERVAL = 2000
    this.MAX_SILENCE_DURATION = 5000
    this.RESTART_DELAY = 100
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
          this.lastActivityTime = Date.now()
          console.log('[WebSpeech v3] Started')
          resolve()
        }

        this.recognition.onresult = (event) => {
          this.lastActivityTime = Date.now()
          
          if (!this.callbacks.onResult) return

          let interimText = ''
          let finalText = ''

          // resultIndex부터 처리 (중복 방지)
          for (let i = this.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const text = result[0].transcript

            if (result.isFinal) {
              finalText += text + ' '
              this.resultIndex = i + 1
              this.lastInterimText = '' // final 받으면 interim 클리어
            } else {
              interimText += text
            }
          }

          // final 먼저 처리
          if (finalText.trim()) {
            console.log('[WebSpeech v3] FINAL:', finalText.trim())
            this.callbacks.onResult(finalText.trim(), true)
          }
          
          // interim 처리
          if (interimText.trim()) {
            this.lastInterimText = interimText.trim()
            this.callbacks.onResult(interimText.trim(), false)
          }
        }

        this.recognition.onend = () => {
          console.log('[WebSpeech v3] onend, shouldRestart:', this.shouldRestart, 'savedInterim:', this.lastInterimText)
          this.isRunning = false

          if (this.shouldRestart) {
            this.restartCount++
            const savedInterim = this.lastInterimText
            
            // onRestart 콜백 호출 (savedInterim 전달)
            if (this.callbacks.onRestart) {
              this.callbacks.onRestart(this.restartCount, savedInterim)
            }
            
            // 상태 초기화
            this.lastInterimText = ''
            this.resultIndex = 0
            
            // 재시작
            setTimeout(() => {
              if (this.shouldRestart && this.recognition) {
                try {
                  this.recognition.start()
                  console.log('[WebSpeech v3] Restarted #' + this.restartCount)
                } catch (e) {
                  console.error('[WebSpeech v3] Restart failed:', e)
                  // 재시도
                  setTimeout(() => {
                    if (this.shouldRestart && this.recognition) {
                      try {
                        this.recognition.start()
                        console.log('[WebSpeech v3] Retry restart succeeded')
                      } catch (e2) {
                        console.error('[WebSpeech v3] Retry restart failed:', e2)
                      }
                    }
                  }, 500)
                }
              }
            }, this.RESTART_DELAY)
          }
        }

        this.recognition.onerror = (event) => {
          console.log('[WebSpeech v3] Error:', event.error)
          
          // 무시할 에러들
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return
          }

          // onstart 전에 에러 발생 시 promise reject (not-allowed, audio-capture 등)
          if (!this.isRunning) {
            reject(new Error(`Speech recognition error: ${event.error}`))
            return
          }

          if (this.callbacks.onError) {
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

  startWatchdog() {
    this.stopWatchdog()
    
    this.watchdogTimer = setInterval(() => {
      if (!this.shouldRestart || !this.recognition) {
        this.stopWatchdog()
        return
      }

      const silenceDuration = Date.now() - this.lastActivityTime
      
      if (silenceDuration > this.MAX_SILENCE_DURATION) {
        console.log('[WebSpeech v3] Watchdog: Silence detected (' + silenceDuration + 'ms), forcing restart')
        
        try {
          this.recognition.stop()
        } catch (e) {
          console.error('[WebSpeech v3] Watchdog: stop() failed:', e)
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
    this.lastInterimText = ''
    this.stopWatchdog()

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.error('[WebSpeech v3] Error stopping:', error)
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
