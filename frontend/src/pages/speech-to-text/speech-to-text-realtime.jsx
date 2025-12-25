import { useState, useRef, useEffect } from 'react'
import './speech-to-text.css'

function SpeechToTextRealtime() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef(null)
  const isRecordingRef = useRef(false)  // Track recording state for event handlers
  const textareaRef = useRef(null)  // Reference to textarea for auto-scroll
  const userScrolledRef = useRef(false)  // Track if user manually scrolled

  const languageOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
  ]

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
    // Check if Web Speech API is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false)
      setStatusMessage('Web Speech API not supported in this browser. Please use Chrome or Edge.')
      return
    }

    // Initialize Speech Recognition only once
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true  // Keep listening
    recognition.interimResults = true  // Show interim results (real-time typing effect)
    recognition.lang = selectedLanguage
    recognition.maxAlternatives = 1
    
    // Enable automatic punctuation (Chrome only, some languages)
    // Note: This is experimental and may not work for all languages
    if ('webkitSpeechRecognition' in window) {
      try {
        recognition.continuous = true
        // Some browsers support automatic punctuation
      } catch (e) {
        console.log('Automatic punctuation not supported')
      }
    }

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setStatusMessage('Listening...')
    }

    recognition.onresult = (event) => {
      console.log('Speech recognition result:', event)
      let interimTranscript = ''
      let finalTranscript = ''

      // Process ALL results (not just from resultIndex)
      // This prevents text loss
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          // Final result - add to permanent text
          finalTranscript += transcript + ' '
          console.log('Final transcript:', finalTranscript)
        } else {
          // Interim result - show as typing
          interimTranscript += transcript
          console.log('Interim transcript:', interimTranscript)
        }
      }

      // Update interim text (typing effect)
      if (interimTranscript) {
        setInterimText(interimTranscript)
      }

      // Update final text with basic punctuation
      if (finalTranscript) {
        const punctuatedText = addBasicPunctuation(finalTranscript.trim())
        setTranscribedText(prev => {
          // Add space before new text if previous text doesn't end with punctuation
          const needsSpace = prev && !prev.match(/[.!?]\s*$/)
          return prev + (needsSpace ? ' ' : '') + punctuatedText
        })
        setInterimText('')  // Clear interim when finalized
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      
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
      console.log('Speech recognition ended')
      
      // Auto-restart if still recording (Web Speech API stops after ~15 seconds)
      if (isRecordingRef.current) {
        console.log('Auto-restarting recognition...')
        try {
          setTimeout(() => {
            if (isRecordingRef.current && recognitionRef.current) {
              recognitionRef.current.start()
            }
          }, 100)  // Small delay before restart
        } catch (e) {
          console.error('Failed to restart recognition:', e)
          setStatusMessage('Recognition stopped. Please click Start again.')
          setIsRecording(false)
          isRecordingRef.current = false
        }
      } else {
        setStatusMessage('')
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.log('Recognition cleanup:', e)
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
        console.log('Recording started - auto-restart enabled')
      } catch (error) {
        console.error('Failed to start recognition:', error)
        setStatusMessage('Failed to start. Please try again.')
      }
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        isRecordingRef.current = false  // Update ref first to prevent auto-restart
        recognitionRef.current.stop()
        setIsRecording(false)
        setInterimText('')
        setStatusMessage('')
        console.log('Recording stopped - auto-restart disabled')
      } catch (error) {
        console.error('Failed to stop recognition:', error)
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
  }

  const saveToFile = () => {
    const fullText = transcribedText + interimText
    if (fullText) {
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' })
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

  const fullText = transcribedText + (interimText ? interimText : '')
  const wordCount = fullText.trim() ? fullText.split(/\s+/).filter(w => w).length : 0

  // Check if user is at bottom of textarea
  const isAtBottom = () => {
    if (!textareaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current
    // Consider "at bottom" if within 50px of bottom
    return scrollHeight - scrollTop - clientHeight < 50
  }

  // Handle user scroll
  const handleScroll = () => {
    if (textareaRef.current) {
      userScrolledRef.current = !isAtBottom()
    }
  }

  // Smart auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (textareaRef.current && !userScrolledRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [transcribedText, interimText])

  return (
    <div className="speech-to-text">
      <div className="speech-to-text-container">
        <div className="flex flex-col items-center text-center gap-4 -mt-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter" style={{ color: '#3E424D' }}>
            Speech to Text (Real-time)
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
                  onClick={saveToFile}
                  className="save-btn"
                  disabled={isRecording || !fullText}
                >
                  Save
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
                {statusMessage || 'Listening...'}
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
            rows={15}
            onScroll={handleScroll}
            style={{
              color: interimText ? '#666' : '#000'  // Interim text is gray
            }}
          />
          
          {fullText && (
            <div className="text-info">
              Characters: {fullText.length} | Words: {wordCount}
              {interimText && <span style={{ color: '#999', marginLeft: '10px' }}>(typing...)</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpeechToTextRealtime
