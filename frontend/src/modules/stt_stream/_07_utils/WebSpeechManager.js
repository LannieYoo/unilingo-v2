// WebSpeechManager - Web Speech API 래퍼 클래스
// 자동 재시작 및 텍스트 유실 방지
// 
// 텍스트 유실 방지 메커니즘:
// 1. sessionStartIndex로 이미 처리된 결과 추적 (중복 방지)
// 2. onend 이벤트 시 200ms 대기 후 재시작 (브라우저가 interim→final 변환할 시간 확보)
// 3. interim 결과는 실시간 표시, final 결과만 transcript에 누적
// 4. 브라우저가 자동으로 마지막 interim을 final로 변환하여 onresult 호출
// 5. 무응답 감지: 30초 동안 결과가 없으면 강제 재시작

export class WebSpeechManager {
  constructor(language, callbacks) {
    this.language = language
    this.callbacks = callbacks
    this.recognition = null
    this.isRunning = false
    this.shouldRestart = false
    this.sessionStartIndex = 0
    this.restartCount = 0
    this.lastInterimText = ''
    this.lastActivityTime = 0
    this.watchdogTimer = null
    this.WATCHDOG_INTERVAL = 2000
    this.MAX_SILENCE_DURATION = 5000
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
          console.log('[WebSpeech] Started')
          resolve()
        }

        this.recognition.onresult = (event) => {
          this.lastActivityTime = Date.now()
          
          if (!this.callbacks.onResult) return

          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = this.sessionStartIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const text = result[0].transcript

            if (result.isFinal) {
              finalTranscript += text + ' '
              this.sessionStartIndex = i + 1
              // final 결과 받으면 interim 초기화하지 않음 - onend에서 처리
            } else {
              interimTranscript += text
            }
          }

          if (finalTranscript) {
            this.lastInterimText = '' // final 받으면 interim 클리어
            this.callbacks.onResult(finalTranscript.trim(), true)
          }
          
          if (interimTranscript) {
            this.lastInterimText = interimTranscript
            this.callbacks.onResult(interimTranscript, false)
          }
        }

        this.recognition.onend = () => {
          const savedInterim = this.lastInterimText
          console.log('[WebSpeech] onend, shouldRestart:', this.shouldRestart, 'savedInterim:', savedInterim)
          this.isRunning = false

          if (this.shouldRestart) {
            this.restartCount++
            
            // 즉시 콜백 호출 (interim 저장)
            if (this.callbacks.onRestart) {
              this.callbacks.onRestart(this.restartCount, savedInterim)
            }
            
            this.lastInterimText = ''
            this.sessionStartIndex = 0
            
            // 약간의 딜레이 후 재시작
            setTimeout(() => {
              if (this.shouldRestart) {
                try {
                  this.recognition.start()
                  console.log('[WebSpeech] Restarted #' + this.restartCount)
                } catch (e) {
                  console.error('[WebSpeech] Restart failed:', e)
                  setTimeout(() => {
                    if (this.shouldRestart) {
                      try {
                        this.recognition.start()
                      } catch (e2) {
                        console.error('[WebSpeech] Retry restart failed:', e2)
                      }
                    }
                  }, 500)
                }
              }
            }, 100)
          }
        }

        this.recognition.onerror = (event) => {
          console.log('[WebSpeech] Error:', event.error)
          
          if (event.error === 'no-speech') {
            return
          }

          if (event.error === 'aborted') {
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
      if (!this.shouldRestart) {
        this.stopWatchdog()
        return
      }

      const silenceDuration = Date.now() - this.lastActivityTime
      
      if (silenceDuration > this.MAX_SILENCE_DURATION) {
        console.log('[WebSpeech] Watchdog: No activity for', silenceDuration, 'ms, forcing restart')
        
        try {
          this.recognition.stop()
        } catch (e) {
          console.log('[WebSpeech] Watchdog: stop() failed, trying abort()')
          try {
            this.recognition.abort()
          } catch (e2) {
            console.error('[WebSpeech] Watchdog: abort() also failed')
          }
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
    this.shouldRestart = false
    this.lastInterimText = ''
    this.stopWatchdog()

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.error('Error stopping recognition:', error)
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
