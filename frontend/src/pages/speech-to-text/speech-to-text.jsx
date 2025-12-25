import { useState, useRef, useEffect } from 'react'
import './speech-to-text.css'

function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef(null)
  const isRecordingRef = useRef(false)
  const textareaRef = useRef(null)
  const userScrolledRef = useRef(false)
  const lastProcessedIndexRef = useRef(0)
  const pendingInterimRef = useRef('')
  const isNewSessionRef = useRef(true)
  const interimTimerRef = useRef(null)
  const lastInterimTextRef = useRef('')
  const restartTimerRef = useRef(null)
  const isRestartingRef = useRef(false)
  const accumulatedTextRef = useRef('') // Store all finalized text to prevent loss

  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'ko-KR', label: '한국어' },
    { value: 'zh-CN', label: '中文 (简体)' },
  ]

  // Add basic punctuation
  const addBasicPunctuation = (text) => {
    if (!text) return text

    let result = text.trim()
    result = result.charAt(0).toUpperCase() + result.slice(1)

    if (!result.match(/[.!?]$/)) {
      const questionWords = /^(what|where|when|who|why|how|which|whose|whom|can|could|would|should|will|do|does|did|is|are|was|were|have|has|had)/i
      if (questionWords.test(result)) {
        result += '?'
      } else {
        result += '.'
      }
    }

    return result
  }

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false)
      setStatusMessage('Web Speech API not supported. Please use Chrome or Edge.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = selectedLanguage
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setStatusMessage('Listening...')
      isRestartingRef.current = false
      
      // Clear existing restart timer
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
      }
      
      // More aggressive 12-second restart timer to prevent text loss
      restartTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current && recognitionRef.current && !isRestartingRef.current) {
          console.log('Proactive restart at 12 seconds')
          isRestartingRef.current = true
          
          // CRITICAL: Save any pending interim text before restart
          if (pendingInterimRef.current && pendingInterimRef.current.trim().length > 0) {
            const pendingText = pendingInterimRef.current.trim()
            console.log('Emergency save before restart:', pendingText)
            const emergencyFinalText = addBasicPunctuation(pendingText)
            
            // Add to accumulated text immediately
            accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + emergencyFinalText
            
            setTranscribedText(prev => {
              const needsSpace = prev && !prev.match(/[.!?]\s*$/)
              return prev + (needsSpace ? ' ' : '') + emergencyFinalText
            })
            
            // Clear interim state after saving
            pendingInterimRef.current = ''
            setInterimText('')
            lastInterimTextRef.current = ''
          }
          
          try {
            recognitionRef.current.stop()
          } catch (e) {
            console.error('Restart failed:', e)
            isRestartingRef.current = false
          }
        }
      }, 12000) // 12 seconds - more aggressive to prevent text loss
    }

    recognition.onresult = async (event) => {
      let interimTranscript = ''
      let finalTranscript = ''
      
      console.log('onresult called, results length:', event.results.length, 'lastProcessedIndex:', lastProcessedIndexRef.current)

      // Process results from last processed index to avoid duplicates
      for (let i = lastProcessedIndexRef.current; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const isFinal = event.results[i].isFinal
        
        console.log(`Result[${i}]: isFinal=${isFinal}, transcript="${transcript}"`)

        if (isFinal) {
          finalTranscript += transcript + ' '
          console.log('Adding final (index ' + i + '):', transcript)
          lastProcessedIndexRef.current = i + 1
        } else {
          interimTranscript += transcript
        }
      }

      // Update interim text
      if (interimTranscript) {
        pendingInterimRef.current = interimTranscript
        setInterimText(interimTranscript)
        console.log('Updated interim:', interimTranscript)
        
        // Auto-finalize interim text after 2 seconds of no change
        if (interimTimerRef.current) {
          clearTimeout(interimTimerRef.current)
        }
        
        if (interimTranscript !== lastInterimTextRef.current) {
          lastInterimTextRef.current = interimTranscript
          
          const wordCount = interimTranscript.trim().split(/\s+/).filter(w => w.length > 0).length
          if (wordCount >= 1) { // Reduced threshold to capture more text
            interimTimerRef.current = setTimeout(() => {
              if (pendingInterimRef.current === interimTranscript && interimTranscript.trim().length > 0) {
                console.log('Auto-finalizing interim text:', interimTranscript)
                const autoFinalText = addBasicPunctuation(interimTranscript.trim())
                
                // Add to accumulated text to prevent loss
                accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + autoFinalText
                
                setTranscribedText(prev => {
                  const needsSpace = prev && !prev.match(/[.!?]\s*$/)
                  const newText = prev + (needsSpace ? ' ' : '') + autoFinalText
                  console.log('Auto-finalized: Updated transcribedText')
                  return newText
                })
                
                // Clear interim state
                pendingInterimRef.current = ''
                setInterimText('')
                lastInterimTextRef.current = ''
              }
            }, 1500) // Reduced from 2000ms to 1500ms for faster capture
          }
        }
      }

      // Process final transcript
      if (finalTranscript) {
        const punctuatedText = addBasicPunctuation(finalTranscript.trim())
        console.log('Processing final transcript:', punctuatedText)
        
        // Add to accumulated text to prevent loss
        accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + punctuatedText
        
        setTranscribedText(prev => {
          const needsSpace = prev && !prev.match(/[.!?]\s*$/)
          const newText = prev + (needsSpace ? ' ' : '') + punctuatedText
          console.log('Updated transcribedText with final')
          return newText
        })
        
        // Clear interim when we get final
        if (interimTimerRef.current) {
          clearTimeout(interimTimerRef.current)
          interimTimerRef.current = null
        }
        pendingInterimRef.current = ''
        setInterimText('')
        lastInterimTextRef.current = ''
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...')
        setStatusMessage('Listening...')
      } else if (event.error === 'audio-capture') {
        setStatusMessage('Microphone not found.')
        setIsRecording(false)
        isRecordingRef.current = false
      } else if (event.error === 'not-allowed') {
        setStatusMessage('Microphone access denied. Please allow microphone access in browser settings.')
        setIsRecording(false)
        isRecordingRef.current = false
      } else if (event.error === 'network') {
        console.log('Network error, continuing...')
        setStatusMessage('Listening...')
      } else if (event.error === 'aborted') {
        console.log('Recognition aborted (normal during restart)')
      } else {
        console.log(`Non-critical error: ${event.error}, continuing...`)
        setStatusMessage('Listening...')
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended, isRecording:', isRecordingRef.current)
      
      // Clear timers
      if (interimTimerRef.current) {
        clearTimeout(interimTimerRef.current)
        interimTimerRef.current = null
      }
      
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      
      // Save any pending interim text before restart
      if (pendingInterimRef.current && isRecordingRef.current && pendingInterimRef.current.trim().length > 0) {
        const pendingText = pendingInterimRef.current.trim()
        const wordCount = pendingText.split(/\s+/).filter(w => w.length > 0).length
        
        if (wordCount >= 1) {
          console.log('Saving pending interim before restart:', pendingText)
          const finalPendingText = addBasicPunctuation(pendingText)
          
          // Add to accumulated text
          accumulatedTextRef.current += (accumulatedTextRef.current ? ' ' : '') + finalPendingText
          
          setTranscribedText(prev => {
            // Prevent duplicate text
            if (prev.endsWith(finalPendingText)) {
              return prev
            }
            const needsSpace = prev && !prev.match(/[.!?]\s*$/)
            return prev + (needsSpace ? ' ' : '') + finalPendingText
          })
        }
        
        // Clear interim state
        pendingInterimRef.current = ''
        setInterimText('')
        lastInterimTextRef.current = ''
      }
      
      if (isRecordingRef.current) {
        // Simple restart with minimal delay
        const attemptRestart = (attempt = 1) => {
          try {
            if (!isRecordingRef.current || !recognitionRef.current) {
              console.log('Restart cancelled: recording stopped')
              return
            }
            
            // Reset for new session
            isNewSessionRef.current = true
            lastProcessedIndexRef.current = 0
            
            console.log(`Restart attempt ${attempt}`)
            recognitionRef.current.start()
            
          } catch (e) {
            console.error(`Restart attempt ${attempt} failed:`, e)
            
            if (attempt < 3) {
              const delay = attempt * 100 // 100ms, 200ms, 300ms
              setTimeout(() => attemptRestart(attempt + 1), delay)
            } else {
              console.error('All restart attempts failed')
              setStatusMessage('Speech recognition stopped. Click Start to resume.')
              setIsRecording(false)
              isRecordingRef.current = false
            }
          }
        }
        
        setTimeout(() => attemptRestart(), 50)
      } else {
        console.log('Not restarting, recording stopped')
        setStatusMessage('')
        lastProcessedIndexRef.current = 0
        isNewSessionRef.current = true
      }
    }

    recognitionRef.current = recognition

    return () => {
      // Clear timers
      if (interimTimerRef.current) {
        clearTimeout(interimTimerRef.current)
        interimTimerRef.current = null
      }
      
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.log('Cleanup:', e)
        }
      }
    }
  }, [selectedLanguage])

  const startRecording = () => {
    if (!isSupported) {
      alert('Please use Chrome or Edge browser.')
      return
    }

    if (recognitionRef.current) {
      try {
        lastProcessedIndexRef.current = 0
        isNewSessionRef.current = true
        pendingInterimRef.current = ''
        accumulatedTextRef.current = '' // Reset accumulated text on new start
        recognitionRef.current.lang = selectedLanguage
        recognitionRef.current.start()
        setIsRecording(true)
        isRecordingRef.current = true
        setStatusMessage('Listening...')
        console.log('Manual start: reset state')
      } catch (error) {
        console.error('Failed to start:', error)
        setStatusMessage('Failed to start. Please check microphone permissions.')
      }
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        isRecordingRef.current = false
        
        // Finalize any pending interim text before stopping
        if (pendingInterimRef.current && pendingInterimRef.current.trim().length > 0) {
          console.log('Finalizing pending interim before stop:', pendingInterimRef.current)
          const finalText = addBasicPunctuation(pendingInterimRef.current.trim())
          setTranscribedText(prev => {
            const needsSpace = prev && !prev.match(/[.!?]\s*$/)
            return prev + (needsSpace ? ' ' : '') + finalText
          })
        }
        
        // Clear timers
        if (interimTimerRef.current) {
          clearTimeout(interimTimerRef.current)
          interimTimerRef.current = null
        }
        
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current)
          restartTimerRef.current = null
        }
        
        recognitionRef.current.stop()
        setIsRecording(false)
        setInterimText('')
        setStatusMessage('')
        lastProcessedIndexRef.current = 0
        isNewSessionRef.current = true
        pendingInterimRef.current = ''
        lastInterimTextRef.current = ''
        console.log('Recording stopped: reset state')
      } catch (error) {
        console.error('Failed to stop:', error)
        setIsRecording(false)
        isRecordingRef.current = false
      }
    }
  }

  const saveToFile = () => {
    if (transcribedText) {
      const blob = new Blob([transcribedText], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleClear = () => {
    setTranscribedText('')
    setInterimText('')
    lastProcessedIndexRef.current = 0
    pendingInterimRef.current = ''
  }

  // Smart scroll
  const isAtBottom = () => {
    if (!textareaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current
    return scrollHeight - scrollTop - clientHeight < 50
  }

  const handleScroll = () => {
    if (textareaRef.current) {
      userScrolledRef.current = !isAtBottom()
    }
  }

  useEffect(() => {
    if (textareaRef.current && !userScrolledRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [transcribedText, interimText])

  const fullText = transcribedText + (interimText ? interimText : '')

  return (
    <div className="speech-to-text">
      <div className="speech-to-text-container">
        <div className="flex flex-col items-center text-center gap-4 -mt-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter" style={{ color: '#3E424D' }}>Speech to Text</h1>
          {!isSupported && (
            <div style={{ color: '#dc2626', padding: '8px 12px', background: '#fee2e2', borderRadius: '6px', fontSize: '13px' }}>
              ⚠️ Please use Chrome or Edge browser
            </div>
          )}
        </div>

        <div className="text-output">
          <div className="control-panel">
            <div className="language-select-wrapper">
              <label htmlFor="language-select">Language:</label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="language-select"
                disabled={isRecording}
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="button-group">
                <button
                  onClick={handleToggle}
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  disabled={!isSupported}
                >
                  {isRecording ? '⏹ Stop' : '▶ Start'}
                </button>
                <button
                  onClick={saveToFile}
                  className="save-btn"
                  disabled={isRecording || !transcribedText}
                >
                  Save
                </button>
                <button
                  onClick={handleClear}
                  className="clear-btn"
                  disabled={isRecording || (!fullText)}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="status-indicator">
            {isRecording && (
              <div className="recording-indicator">
                <span className="pulse-dot"></span>
                {statusMessage || 'Listening...'}
              </div>
            )}
            {!isRecording && statusMessage && (
              <div className="status-message">{statusMessage}</div>
            )}
          </div>
          
          <textarea
            ref={textareaRef}
            value={fullText}
            readOnly
            placeholder="Click Start and speak. Text will appear in real-time..."
            className="output-textarea"
            rows={15}
            onScroll={handleScroll}
            style={{
              color: interimText ? '#666' : '#000'
            }}
          />
          {fullText && (
            <div className="text-info">
              Characters: {fullText.length} | Words: {fullText.split(/\s+/).filter(w => w).length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpeechToText