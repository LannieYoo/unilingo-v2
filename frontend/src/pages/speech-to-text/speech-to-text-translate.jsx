import { useState, useRef, useEffect } from 'react'
import './speech-to-text.css'

function SpeechToTextTranslate() {
  const [isRecording, setIsRecording] = useState(false)
  const [originalText, setOriginalText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [selectedSourceLang, setSelectedSourceLang] = useState('en-US')
  const [selectedTargetLang, setSelectedTargetLang] = useState('ko')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [isTranslating, setIsTranslating] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking') // checking, online, offline
  const recognitionARef = useRef(null)
  const recognitionBRef = useRef(null)
  const activeInstanceRef = useRef('A') // 'A' or 'B'
  const isRecordingRef = useRef(false)
  const originalTextareaRef = useRef(null)
  const translatedTextareaRef = useRef(null)
  const userScrolledOriginalRef = useRef(false)
  const userScrolledTranslatedRef = useRef(false)
  const processedSentencesRef = useRef(new Set()) // Track recently processed unique sentences
  const lastProcessedIndexARef = useRef(0)
  const lastProcessedIndexBRef = useRef(0)
  const pendingInterimRef = useRef('')
  const handoffTimerRef = useRef(null)
  const interimTimerRef = useRef(null)
  const lastInterimTextRef = useRef('')

  const sourceLanguageOptions = [
    { value: 'en-US', label: 'English (US)', code: 'en' },
    { value: 'en-GB', label: 'English (UK)', code: 'en' },
    { value: 'ko-KR', label: '한국어', code: 'ko' },
    { value: 'zh-CN', label: '中文 (简体)', code: 'zh' },
  ]

  const targetLanguageOptions = [
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文 (简体)' },
    { value: 'en', label: 'English' },
  ]


  // Calculate text similarity (simple Jaccard similarity)
  const calculateSimilarity = (text1, text2) => {
    if (!text1 || !text2) return 0
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))

    if (words1.size === 0 || words2.size === 0) return 0

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  const isSemanticDuplicate = (text, history) => {
    const cleanNew = text.trim().toLowerCase()
    if (cleanNew.length < 3) return false

    // Check exact matches in history
    if (history.has(text.trim())) return true

    // Check fuzzy matches against recent history
    // Only block if similarity is VERY high (meaning it's the exact same sentence with minor punctuation diffs)
    for (const item of Array.from(history).slice(-5)) {
      const similarity = calculateSimilarity(item, text)
      if (similarity > 0.85) return true
    }
    return false
  }

  // Get language code from speech recognition language
  const getLanguageCode = (speechLang) => {
    const option = sourceLanguageOptions.find(opt => opt.value === speechLang)
    return option ? option.code : 'en'
  }

  // Translate text using backend API with better error handling
  const translateText = async (text, sourceLang, targetLang) => {
    if (!text || sourceLang === targetLang) {
      return text
    }

    // Skip translation if text is too short or contains only punctuation
    const cleanText = text.replace(/[.!?。！？\s]/g, '')
    if (cleanText.length < 3) {
      return text
    }

    try {
      setIsTranslating(true)

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Translation API error:', response.status, errorData)

        // Return original text instead of error message for better UX
        return text
      }

      const data = await response.json()

      // Validate translation result
      if (!data.translated_text || data.translated_text.trim().length === 0) {
        console.warn('Empty translation result, returning original text')
        return text
      }

      return data.translated_text
    } catch (error) {
      console.error('Translation error:', error)

      // Return original text instead of error message
      if (error.name === 'AbortError') {
        console.warn('Translation timeout, returning original text')
      } else if (error.message === 'Failed to fetch') {
        console.warn('Translation server unavailable, returning original text')
      }

      return text // Return original text instead of error message
    } finally {
      setIsTranslating(false)
    }
  }

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

  // Check backend server status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        })
        if (response.ok) {
          setBackendStatus('online')
        } else {
          setBackendStatus('offline')
        }
      } catch (error) {
        setBackendStatus('offline')
        console.warn('Backend server is not running:', error)
      }
    }
    checkBackend()

    // 주기적으로 상태 확인 (30초마다)
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false)
      setStatusMessage('Web Speech API not supported. Please use Chrome or Edge.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    const createRecognition = (id) => {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = selectedSourceLang
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        console.log(`Speech recognition ${id} started`)
        if (activeInstanceRef.current === id) {
          setStatusMessage('Listening...')
        }
      }

      recognition.onresult = async (event) => {
        let interimTranscript = ''
        let finalTranscript = ''
        const lastIndexRef = id === 'A' ? lastProcessedIndexARef : lastProcessedIndexBRef

        // Process results from resultIndex to avoid old results in current session
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          const isFinal = event.results[i].isFinal

          if (isFinal) {
            finalTranscript += transcript + ' '
          } else {
            // Only capture interim from the active instance to avoid noise/duplication in UI
            if (activeInstanceRef.current === id) {
              interimTranscript += transcript
            }
          }
        }

        // Update interim text
        if (interimTranscript && activeInstanceRef.current === id) {
          setInterimText(interimTranscript)
          pendingInterimRef.current = interimTranscript

          if (interimTimerRef.current) clearTimeout(interimTimerRef.current)
          interimTimerRef.current = setTimeout(() => {
            if (pendingInterimRef.current === interimTranscript && interimTranscript.trim().length > 0) {
              handleFinalResult(interimTranscript.trim(), id)
              setInterimText('')
              pendingInterimRef.current = ''
            }
          }, 1500)
        }

        // Process final transcript
        if (finalTranscript) {
          handleFinalResult(finalTranscript.trim(), id)
        }
      }

      recognition.onerror = (event) => {
        console.error(`Speech recognition ${id} error:`, event.error)
        if (event.error === 'not-allowed') {
          setIsRecording(false)
          isRecordingRef.current = false
          setStatusMessage('Microphone access denied.')
        }
      }

      recognition.onend = () => {
        console.log(`Speech recognition ${id} ended`)
        if (isRecordingRef.current && activeInstanceRef.current === id) {
          // If the active one ended unexpectedly, restart it immediately or hand off
          console.log(`Active recognition ${id} ended unexpectedly, restarting...`)
          try {
            recognition.start()
          } catch (e) {
            console.error(`Failed to restart ${id}:`, e)
          }
        }
      }

      return recognition
    }

    const handleFinalResult = async (text, id) => {
      if (!text) return

      const punctuatedText = addBasicPunctuation(text)
      const cleanText = punctuatedText.trim()

      // Robust De-duplication: Check if this was recently processed (fuzzy check)
      if (isSemanticDuplicate(cleanText, processedSentencesRef.current)) {
        console.log(`Semantic duplicate prevented from instance ${id}:`, cleanText)
        return
      }

      setOriginalText(prev => {
        // Robust Overlap De-duplication (for handoff between A and B)
        // If the new text significantly overlaps with the VERY END of the current text, skip it.
        const cleanPrev = prev.trim().toLowerCase()
        const cleanNewLower = cleanText.toLowerCase()

        // Check if the last 30 chars of existing text are contained in the start of the new text
        // This handles cases where Instance B repeats the end of Instance A
        if (cleanPrev.length > 20) {
          const tail = cleanPrev.slice(-30)
          if (cleanNewLower.startsWith(tail.slice(0, 15))) {
            console.log(`Overlap duplicate prevented from instance ${id}:`, cleanText)
            return prev
          }
        }

        // "Delete before writing" - clear interim ONLY after ensuring it's not a duplicate
        if (activeInstanceRef.current === id) {
          setInterimText('')
          pendingInterimRef.current = ''
        }

        // Add to history
        processedSentencesRef.current.add(cleanText)
        if (processedSentencesRef.current.size > 50) {
          const firstItem = processedSentencesRef.current.values().next().value
          processedSentencesRef.current.delete(firstItem)
        }

        const needsSpace = prev && !prev.match(/[.!?]\s*$/)
        return prev + (needsSpace ? ' ' : '') + cleanText
      })

      // Translate
      const sourceLang = getLanguageCode(selectedSourceLang)
      if (sourceLang !== selectedTargetLang) {
        const translated = await translateText(cleanText, sourceLang, selectedTargetLang)
        if (translated) {
          setTranslatedText(prev => {
            const needsSpace = prev && !prev.match(/[.!?。！？]\s*$/)
            return prev + (needsSpace ? ' ' : '') + translated
          })
        }
      } else {
        setTranslatedText(prev => {
          const needsSpace = prev && !prev.match(/[.!?。！？]\s*$/)
          return prev + (needsSpace ? ' ' : '') + cleanText
        })
      }
    }

    recognitionARef.current = createRecognition('A')
    recognitionBRef.current = createRecognition('B')

    return () => {
      isRecordingRef.current = false
      if (handoffTimerRef.current) clearInterval(handoffTimerRef.current)
      if (interimTimerRef.current) clearTimeout(interimTimerRef.current)
      if (recognitionARef.current) {
        try { recognitionARef.current.abort() } catch (e) { }
      }
      if (recognitionBRef.current) {
        try { recognitionBRef.current.abort() } catch (e) { }
      }
    }
  }, [selectedSourceLang, selectedTargetLang])

  const toggleHandoff = () => {
    if (!isRecordingRef.current) return

    const nextInstance = activeInstanceRef.current === 'A' ? 'B' : 'A'
    const currentInstance = activeInstanceRef.current
    const nextRec = nextInstance === 'A' ? recognitionARef.current : recognitionBRef.current
    const currentRec = currentInstance === 'A' ? recognitionARef.current : recognitionBRef.current

    console.log(`Performing handoff: ${currentInstance} -> ${nextInstance}`)

    try {
      // Start next one first for overlapping coverage
      nextRec.start()
      activeInstanceRef.current = nextInstance

      // Stop current one after a long delay (5s) to ensure no words are lost during warm-up
      setTimeout(() => {
        try {
          if (isRecordingRef.current) {
            currentRec.stop()
            console.log(`Stopped ${currentInstance} after 5s overlap`)
          }
        } catch (e) {
          console.log(`Error stopping ${currentInstance} during handoff:`, e)
        }
      }, 5000)
    } catch (e) {
      console.error('Handoff failed:', e)
    }
  }

  const startRecording = () => {
    if (!isSupported) {
      alert('Please use Chrome or Edge browser.')
      return
    }

    try {
      isRecordingRef.current = true
      setIsRecording(true)
      setStatusMessage('Listening...')
      processedSentencesRef.current.clear()

      // Start instance A
      activeInstanceRef.current = 'A'
      recognitionARef.current.start()

      // Set up handoff timer (every 15 seconds)
      if (handoffTimerRef.current) clearInterval(handoffTimerRef.current)
      handoffTimerRef.current = setInterval(toggleHandoff, 15000)

    } catch (error) {
      console.error('Failed to start:', error)
      setStatusMessage('Failed to start. Please check microphone permissions.')
      setIsRecording(false)
      isRecordingRef.current = false
    }
  }

  const stopRecording = () => {
    isRecordingRef.current = false
    setIsRecording(false)
    setStatusMessage('')
    setInterimText('')

    if (handoffTimerRef.current) clearInterval(handoffTimerRef.current)
    if (interimTimerRef.current) clearTimeout(interimTimerRef.current)

    try {
      if (recognitionARef.current) recognitionARef.current.abort()
      if (recognitionBRef.current) recognitionBRef.current.abort()
    } catch (e) {
      console.log('Error stopping instances:', e)
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
    setOriginalText('')
    setTranslatedText('')
    setInterimText('')
    lastProcessedIndexARef.current = 0
    lastProcessedIndexBRef.current = 0
    processedSentencesRef.current.clear()
    pendingInterimRef.current = ''
  }

  const handleDownload = () => {
    const sourceLangLabel = sourceLanguageOptions.find(opt => opt.value === selectedSourceLang)?.label || 'Original'
    const targetLangLabel = targetLanguageOptions.find(opt => opt.value === selectedTargetLang)?.label || 'Translation'

    const content = `=== ${sourceLangLabel} ===\n\n${originalText}\n\n\n=== ${targetLangLabel} ===\n\n${translatedText}`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `speech-translation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Smart scroll for original textarea
  const isAtBottomOriginal = () => {
    if (!originalTextareaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = originalTextareaRef.current
    return scrollHeight - scrollTop - clientHeight < 50
  }

  const handleScrollOriginal = () => {
    if (originalTextareaRef.current) {
      userScrolledOriginalRef.current = !isAtBottomOriginal()
    }
  }

  useEffect(() => {
    if (originalTextareaRef.current && !userScrolledOriginalRef.current) {
      originalTextareaRef.current.scrollTop = originalTextareaRef.current.scrollHeight
    }
  }, [originalText, interimText])

  // Smart scroll for translated textarea
  const isAtBottomTranslated = () => {
    if (!translatedTextareaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = translatedTextareaRef.current
    return scrollHeight - scrollTop - clientHeight < 50
  }

  const handleScrollTranslated = () => {
    if (translatedTextareaRef.current) {
      userScrolledTranslatedRef.current = !isAtBottomTranslated()
    }
  }

  useEffect(() => {
    if (translatedTextareaRef.current && !userScrolledTranslatedRef.current) {
      translatedTextareaRef.current.scrollTop = translatedTextareaRef.current.scrollHeight
    }
  }, [translatedText])

  const fullOriginalText = originalText + (interimText ? interimText : '')

  return (
    <div className="speech-to-text">
      <div className="speech-to-text-container">
        <div className="flex flex-col items-center text-center gap-4 -mt-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter" style={{ color: '#3E424D' }}>
            Real-time Speech Translation
          </h1>
          {!isSupported && (
            <div style={{ color: '#dc2626', padding: '8px 12px', background: '#fee2e2', borderRadius: '6px', fontSize: '13px' }}>
              ⚠️ Please use Chrome or Edge browser
            </div>
          )}
        </div>

        <div className="text-output">
          <div className="control-panel">
            <div className="language-select-wrapper">
              <label htmlFor="source-language-select">Speak in:</label>
              <select
                id="source-language-select"
                value={selectedSourceLang}
                onChange={(e) => setSelectedSourceLang(e.target.value)}
                className="language-select"
                disabled={isRecording}
              >
                {sourceLanguageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="target-language-select" style={{ marginLeft: '20px' }}>Translate to:</label>
              <select
                id="target-language-select"
                value={selectedTargetLang}
                onChange={(e) => setSelectedTargetLang(e.target.value)}
                className="language-select"
                disabled={isRecording}
              >
                {targetLanguageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', minWidth: '100px' }}>
                  {backendStatus === 'offline' && (
                    <span style={{ fontSize: '11px', color: '#d97706', whiteSpace: 'nowrap' }}>
                      ⚠️ Server offline
                    </span>
                  )}
                  {backendStatus === 'online' && (
                    <span style={{ fontSize: '11px', color: '#059669', whiteSpace: 'nowrap' }}>
                      ✅ Ready
                    </span>
                  )}
                  {isRecording && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#059669', whiteSpace: 'nowrap' }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        background: '#059669',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'pulse 1.5s infinite'
                      }}></span>
                      Listening{isTranslating && ' • Translating'}
                    </span>
                  )}
                  {!isRecording && statusMessage && (
                    <span style={{ fontSize: '11px', color: '#dc2626', whiteSpace: 'nowrap' }}>{statusMessage}</span>
                  )}
                </div>
                <button
                  onClick={handleToggle}
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  disabled={!isSupported}
                >
                  {isRecording ? '⏹ Stop' : '▶ Start'}
                </button>
                <button
                  onClick={handleDownload}
                  className="save-btn"
                  disabled={isRecording || (!originalText && !translatedText)}
                  title={isRecording ? "Stop recording to download" : "Download as TXT file"}
                >
                  ⬇
                </button>
                <button
                  onClick={handleClear}
                  className="clear-btn"
                  disabled={isRecording || (!fullOriginalText && !translatedText)}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div>
              <h3 style={{ marginBottom: '10px', color: '#3E424D', fontSize: '16px', fontWeight: '600' }}>
                Original ({sourceLanguageOptions.find(opt => opt.value === selectedSourceLang)?.label})
              </h3>
              <textarea
                ref={originalTextareaRef}
                value={fullOriginalText}
                readOnly
                placeholder="Your speech will appear here..."
                className="output-textarea"
                rows={15}
                onScroll={handleScrollOriginal}
                style={{
                  color: interimText ? '#666' : '#000',
                  width: '100%'
                }}
              />
              {fullOriginalText && (
                <div className="text-info">
                  {fullOriginalText.length} characters
                </div>
              )}
            </div>

            <div>
              <h3 style={{ marginBottom: '10px', color: '#3E424D', fontSize: '16px', fontWeight: '600' }}>
                Translation ({targetLanguageOptions.find(opt => opt.value === selectedTargetLang)?.label})
              </h3>
              <textarea
                ref={translatedTextareaRef}
                value={translatedText}
                readOnly
                placeholder="Translation will appear here..."
                className="output-textarea"
                rows={15}
                onScroll={handleScrollTranslated}
                style={{
                  color: '#000',
                  width: '100%',
                  backgroundColor: '#f8f9fa'
                }}
              />
              {translatedText && (
                <div className="text-info">
                  {translatedText.length} characters
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpeechToTextTranslate
