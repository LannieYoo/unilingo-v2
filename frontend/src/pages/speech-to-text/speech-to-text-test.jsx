import { useState, useRef, useEffect } from 'react'
import '../../modules/stt_stream/_10_styles/stt-stream.css'

function SpeechToTextTest() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [debugLog, setDebugLog] = useState([])
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [restartCount, setRestartCount] = useState(0)
  const recognitionRef = useRef(null)
  const isRecordingRef = useRef(false)
  const timerIntervalRef = useRef(null)
  const sessionStartRef = useRef(null)
  const textareaRef = useRef(null)  // Reference to textarea for auto-scroll
  const userScrolledRef = useRef(false)  // Track if user manually scrolled

  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
  ]

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[DEBUG] ${message}`)
  }

  // Add basic punctuation to text
  const addBasicPunctuation = (text) => {
    if (!text) return text

    let result = text.trim()

    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1)

    // Add period at the end if no punctuation exists
    if (!result.match(/[.!?]$/)) {
      // Check if it's a question (starts with question words)
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
    addDebugLog('Component mounted')
    
    // Check if Web Speech API is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false)
      setStatusMessage('Web Speech API not supported in this browser. Please use Chrome or Edge.')
      addDebugLog('Web Speech API NOT supported')
      return
    }

    addDebugLog('Web Speech API supported')

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = selectedLanguage
    recognition.maxAlternatives = 1

    addDebugLog(`Recognition initialized with language: ${selectedLanguage}`)

    recognition.onstart = () => {
      const now = Date.now()
      if (!sessionStartRef.current) {
        sessionStartRef.current = now
        setSessionStartTime(now)
        addDebugLog('=== SESSION STARTED ===')
      }
      const elapsed = ((now - sessionStartRef.current) / 1000).toFixed(1)
      addDebugLog(`Recognition started (${elapsed}s from session start)`)
      setStatusMessage('Listening...')
    }

    recognition.onresult = (event) => {
      addDebugLog(`Result received: ${event.results.length} results`)
      let interimTranscript = ''
      let finalTranscript = ''

      // Process ALL results (not just from resultIndex) to prevent text loss
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
          addDebugLog(`Final: "${transcript}" (confidence: ${confidence})`)
        } else {
          interimTranscript += transcript
          addDebugLog(`Interim: "${transcript}"`)
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript)
      }

      if (finalTranscript) {
        const punctuatedText = addBasicPunctuation(finalTranscript.trim())
        addDebugLog(`Punctuated: "${punctuatedText}"`)
        setTranscribedText(prev => {
          const needsSpace = prev && !prev.match(/[.!?]\s*$/)
          return prev + (needsSpace ? ' ' : '') + punctuatedText
        })
        setInterimText('')
      }
    }

    recognition.onerror = (event) => {
      addDebugLog(`Error: ${event.error}`)
      
      if (event.error === 'no-speech') {
        setStatusMessage('No speech detected. Please try again.')
      } else if (event.error === 'audio-capture') {
        setStatusMessage('Microphone not found. Please check your device.')
      } else if (event.error === 'not-allowed') {
        setStatusMessage('Microphone access denied. Please allow microphone access.')
        setIsRecording(false)
      } else {
        setStatusMessage(`Error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      const elapsed = sessionStartRef.current 
        ? ((Date.now() - sessionStartRef.current) / 1000).toFixed(1)
        : '0.0'
      addDebugLog(`Recognition ended (${elapsed}s from session start)`)
      
      // Auto-restart if still recording (Web Speech API stops after ~15 seconds)
      if (isRecordingRef.current) {
        setRestartCount(prev => prev + 1)
        addDebugLog(`⚠️ AUTO-RESTART #${restartCount + 1} - API timeout detected at ${elapsed}s`)
        try {
          setTimeout(() => {
            if (isRecordingRef.current && recognitionRef.current) {
              recognitionRef.current.start()
              addDebugLog('Recognition restarted successfully')
            }
          }, 100)  // Small delay before restart
        } catch (e) {
          addDebugLog(`Failed to restart: ${e.message}`)
          setStatusMessage('Recognition stopped. Please click Start again.')
          setIsRecording(false)
          isRecordingRef.current = false
        }
      } else {
        setStatusMessage('')
        sessionStartRef.current = null
        setSessionStartTime(null)
      }
    }

    recognition.onaudiostart = () => {
      addDebugLog('Audio capture started')
    }

    recognition.onaudioend = () => {
      addDebugLog('Audio capture ended')
    }

    recognition.onsoundstart = () => {
      addDebugLog('Sound detected')
    }

    recognition.onsoundend = () => {
      addDebugLog('Sound ended')
    }

    recognition.onspeechstart = () => {
      addDebugLog('Speech detected')
    }

    recognition.onspeechend = () => {
      addDebugLog('Speech ended')
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          addDebugLog('Recognition stopped (cleanup)')
        } catch (e) {
          addDebugLog(`Cleanup error: ${e.message}`)
        }
      }
    }
  }, [selectedLanguage])

  const startRecording = () => {
    if (!isSupported) {
      alert('Web Speech API is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = selectedLanguage
        recognitionRef.current.start()
        setIsRecording(true)
        isRecordingRef.current = true
        setStatusMessage('Listening...')
        setRestartCount(0)
        addDebugLog('Start button clicked - recognition.start() called')
        
        // Start timer
        timerIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 0.1)
        }, 100)
      } catch (error) {
        addDebugLog(`Start failed: ${error.message}`)
        setStatusMessage('Failed to start. Please try again.')
      }
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        isRecordingRef.current = false
        recognitionRef.current.stop()
        setIsRecording(false)
        setInterimText('')
        setStatusMessage('')
        addDebugLog('Stop button clicked - recognition.stop() called')
        
        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        setRecordingDuration(0)
        sessionStartRef.current = null
        setSessionStartTime(null)
        addDebugLog('=== SESSION ENDED ===')
      } catch (error) {
        addDebugLog(`Stop failed: ${error.message}`)
        setIsRecording(false)
        isRecordingRef.current = false
      }
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
    addDebugLog('Text cleared')
  }

  const clearDebugLog = () => {
    setDebugLog([])
    setRestartCount(0)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  // Check if user is at bottom of textarea
  const isAtBottom = () => {
    if (!textareaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current
    return scrollHeight - scrollTop - clientHeight < 50
  }

  // Handle user scroll
  const handleScroll = () => {
    if (textareaRef.current) {
      const wasScrolled = userScrolledRef.current
      userScrolledRef.current = !isAtBottom()
      if (wasScrolled !== userScrolledRef.current) {
        addDebugLog(userScrolledRef.current ? 'User scrolled up - auto-scroll disabled' : 'User at bottom - auto-scroll enabled')
      }
    }
  }

  // Smart auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (textareaRef.current && !userScrolledRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [transcribedText, interimText])

  const fullText = transcribedText + (interimText ? interimText : '')
  const wordCount = fullText.trim() ? fullText.split(/\s+/).filter(w => w).length : 0

  return (
    <div className="speech-to-text">
      <div className="speech-to-text-container">
        <div className="flex flex-col items-center text-center gap-4 -mt-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter" style={{ color: '#3E424D' }}>
            Speech to Text (Debug Mode)
          </h1>
          {!isSupported && (
            <div style={{ color: 'red', padding: '10px', background: '#ffe6e6', borderRadius: '5px' }}>
              ⚠️ This feature requires Chrome or Edge browser
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
                  onClick={handleClear}
                  className="clear-btn"
                  disabled={isRecording || !fullText}
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
                {statusMessage || 'Listening...'} | ⏱️ {recordingDuration.toFixed(1)}s
                {restartCount > 0 && ` | 🔄 Restarts: ${restartCount}`}
              </div>
            )}
            {!isRecording && statusMessage && (
              <div className="processing-indicator">{statusMessage}</div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={fullText}
            readOnly
            placeholder="Click Start and speak. Text will appear in real-time as you talk..."
            className="output-textarea"
            rows={10}
            onScroll={handleScroll}
            style={{
              color: interimText ? '#666' : '#000'
            }}
          />
          
          {fullText && (
            <div className="text-info">
              Characters: {fullText.length} | Words: {wordCount}
              {interimText && <span style={{ color: '#999', marginLeft: '10px' }}>(typing...)</span>}
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Debug Log:</h3>
              <button onClick={clearDebugLog} style={{ padding: '5px 10px', fontSize: '12px' }}>
                Clear Log
              </button>
            </div>
            <div style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '5px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {debugLog.length === 0 ? (
                <div style={{ color: '#999' }}>No logs yet...</div>
              ) : (
                debugLog.map((log, index) => (
                  <div key={index} style={{ marginBottom: '5px' }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpeechToTextTest
