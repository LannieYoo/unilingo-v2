import { useState, useRef, useEffect } from 'react'
import { PageLayout, PageBox } from '../../components/layout/PageLayout'
import { LANGUAGES, getTranslateCode, getVoiceCode, detectLanguage, getLanguageByCode } from '../../config/languages'
import './text-to-speech.css'

function TextToSpeech() {
  const [text, setText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [targetLanguage, setTargetLanguage] = useState('en-US')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)
  const [currentTranslatedText, setCurrentTranslatedText] = useState('')
  const [textareaHeight, setTextareaHeight] = useState(250)
  const [isResizing, setIsResizing] = useState(false)
  const [highlightStart, setHighlightStart] = useState(0)
  const [highlightEnd, setHighlightEnd] = useState(0)
  const [isRepeatMode, setIsRepeatMode] = useState(false)
  const [voiceWarning, setVoiceWarning] = useState(null)
  const utteranceRef = useRef(null)
  const resizeStartY = useRef(0)
  const resizeStartHeight = useRef(0)
  const isRepeatModeRef = useRef(false)

  // 번역 함수
  const translateText = async (text, sourceLang, targetLang) => {
    if (!text.trim()) return text
    
    // translateCode로 비교 (en-US, en-GB 등은 모두 'en'으로 변환됨)
    const sourceCode = getTranslateCode(sourceLang)
    const targetCode = getTranslateCode(targetLang)
    
    if (sourceCode === targetCode) return text

    setIsTranslating(true)
    
    try {
      // Google Translate API 사용
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`
      const response = await fetch(googleUrl)
      
      if (response.ok) {
        const data = await response.json()
        if (data?.[0] && Array.isArray(data[0])) {
          const translated = data[0]
            .filter(item => item && Array.isArray(item) && item[0] && typeof item[0] === 'string')
            .map(item => item[0])
            .join('')
            .trim()
          if (translated && translated.length > 0) {
            setIsTranslating(false)
            return translated
          }
        }
      }
      
      // Fallback: MyMemory API
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`
      const fallbackResponse = await fetch(myMemoryUrl)
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json()
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          const translated = data.responseData.translatedText.trim()
          setIsTranslating(false)
          return translated
        }
      }
      
      setIsTranslating(false)
      return text
    } catch (error) {
      console.error('Translation error:', error)
      setIsTranslating(false)
      return text
    }
  }

  // 텍스트 변경 핸들러
  const handleTextChange = (e) => {
    const newText = e.target.value
    setText(newText)
    
    // 텍스트가 있으면 언어 자동 감지
    if (newText.trim()) {
      const detectedLang = detectLanguage(newText)
      setSelectedLanguage(detectedLang)
      // target language도 source language와 같게 설정
      setTargetLanguage(detectedLang)
    }
  }

  // 속도 변경 핸들러
  const handleSpeedChange = (newRate) => {
    setSpeechRate(newRate)
    
    // 재생 중이면 현재 위치부터 새로운 속도로 재시작
    if (isSpeaking && window.speechSynthesis.speaking) {
      const remainingText = currentTranslatedText.substring(currentCharIndex)
      
      if (remainingText.trim()) {
        // 현재 재생 중단
        window.speechSynthesis.cancel()
        
        // 남은 텍스트를 새로운 속도로 재생
        speakText(remainingText, newRate, currentCharIndex)
      }
    }
  }

  // Target Language 변경 핸들러
  const handleTargetLanguageChange = async (newTargetLang) => {
    setTargetLanguage(newTargetLang)
    
    // 재생 중이면 현재 위치부터 새로운 언어로 재시작
    if (isSpeaking && window.speechSynthesis.speaking) {
      const remainingOriginalText = text.substring(currentCharIndex)
      
      if (remainingOriginalText.trim()) {
        // 현재 재생 중단
        window.speechSynthesis.cancel()
        
        // 남은 텍스트를 번역 (필요한 경우) - translateCode로 비교
        let textToSpeak = remainingOriginalText
        const sourceCode = getTranslateCode(selectedLanguage)
        const targetCode = getTranslateCode(newTargetLang)
        
        if (sourceCode !== targetCode) {
          textToSpeak = await translateText(remainingOriginalText, selectedLanguage, newTargetLang)
        }
        
        // 번역된 텍스트를 현재 속도와 새로운 언어로 재생
        speakText(textToSpeak, speechRate, 0, newTargetLang)
      }
    }
  }

  // 텍스트 읽기 함수
  const speakText = (textToSpeak, rate, startIndex = 0, langCode = targetLanguage) => {
    if (!textToSpeak.trim()) return

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    const voiceCode = getVoiceCode(langCode)
    utterance.lang = voiceCode
    
    // 브라우저에서 지원하는 음성 중 해당 언어에 맞는 음성 선택
    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find(voice => voice.lang === voiceCode)
    
    if (matchingVoice) {
      utterance.voice = matchingVoice
      console.log('[TTS] Using voice:', matchingVoice.name, 'for lang:', voiceCode)
      setVoiceWarning(null)
    } else {
      console.warn('[TTS] No matching voice found for:', voiceCode)
      
      // 언어 이름 가져오기
      const lang = getLanguageByCode(langCode)
      const langName = lang?.name || langCode
      
      // 경고 메시지 설정
      setVoiceWarning({
        language: langName,
        code: voiceCode
      })
    }
    
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // 단어 경계 이벤트로 현재 위치 추적 및 하이라이트
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const currentIndex = startIndex + event.charIndex
        setCurrentCharIndex(currentIndex)
        
        // 현재 단어의 끝 위치 계산 (다음 공백까지)
        const remainingText = textToSpeak.substring(event.charIndex)
        const wordMatch = remainingText.match(/^\S+/)
        const wordLength = wordMatch ? wordMatch[0].length : 0
        
        setHighlightStart(currentIndex)
        setHighlightEnd(currentIndex + wordLength)
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      utteranceRef.current = utterance
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setCurrentCharIndex(0)
      setHighlightStart(0)
      setHighlightEnd(0)
      utteranceRef.current = null
      
      // 반복 모드가 켜져 있으면 다시 재생 (ref 사용하여 최신 값 참조)
      if (isRepeatModeRef.current) {
        setTimeout(() => {
          handleSpeak()
        }, 500) // 0.5초 대기 후 재시작
      }
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setCurrentCharIndex(0)
      setHighlightStart(0)
      setHighlightEnd(0)
      utteranceRef.current = null
    }

    window.speechSynthesis.speak(utterance)
  }

  const handleSpeak = async () => {
    if (!text.trim()) return

    if ('speechSynthesis' in window) {
      // Pause 상태에서 Resume
      if (isPaused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
        setIsSpeaking(true)
        return
      }

      // 음성 목록 로드 대기 (브라우저에 따라 비동기로 로드됨)
      if (window.speechSynthesis.getVoices().length === 0) {
        await new Promise(resolve => {
          window.speechSynthesis.onvoiceschanged = resolve
        })
      }

      window.speechSynthesis.cancel()
      setCurrentCharIndex(0)
      
      // 번역이 필요한 경우 (translateCode로 비교)
      let textToSpeak = text
      const sourceCode = getTranslateCode(selectedLanguage)
      const targetCode = getTranslateCode(targetLanguage)
      
      if (sourceCode !== targetCode) {
        textToSpeak = await translateText(text, selectedLanguage, targetLanguage)
      }
      
      // 번역된 텍스트 저장
      setCurrentTranslatedText(textToSpeak)
      
      speakText(textToSpeak, speechRate, 0, targetLanguage)
    } else {
      alert('This browser does not support speech synthesis.')
    }
  }

  const handlePause = () => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsSpeaking(false)
    }
  }

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
      setCurrentCharIndex(0)
      setHighlightStart(0)
      setHighlightEnd(0)
    }
  }

  // 하이라이트된 텍스트 렌더링
  const renderHighlightedText = () => {
    if (!isSpeaking || highlightStart === 0 || highlightEnd === 0) {
      return text
    }

    const before = text.substring(0, highlightStart)
    const highlight = text.substring(highlightStart, highlightEnd)
    const after = text.substring(highlightEnd)

    return (
      <>
        {before}
        <span className="highlight-text">{highlight}</span>
        {after}
      </>
    )
  }

  // Resize 핸들러
  const handleResizeStart = (e) => {
    e.preventDefault()
    resizeStartY.current = e.clientY
    resizeStartHeight.current = textareaHeight
    setIsResizing(true)
  }

  // isRepeatMode 변경 시 ref 업데이트
  useEffect(() => {
    isRepeatModeRef.current = isRepeatMode
  }, [isRepeatMode])

  // 음성 목록 미리 로드
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // 음성 목록 로드 트리거
      window.speechSynthesis.getVoices()
      
      // 음성 목록 변경 이벤트 리스너
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('[TTS] Available voices loaded:', voices.length)
        voices.forEach(voice => {
          console.log(`  - ${voice.name} (${voice.lang})`)
        })
      }
      
      window.speechSynthesis.onvoiceschanged = loadVoices
      loadVoices() // 즉시 한 번 실행
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleResizeMove = (e) => {
      const deltaY = e.clientY - resizeStartY.current
      const newHeight = Math.min(Math.max(resizeStartHeight.current + deltaY, 200), 800)
      setTextareaHeight(newHeight)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing])

  return (
    <PageLayout title="Text to Speech">
      <PageBox flex>
          <div className="tts-controls-wrapper">
            <div className="language-select-wrapper">
              <label htmlFor="tts-source-language" className="control-label">Source Language</label>
              <select
                id="tts-source-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="language-select"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="language-select-wrapper">
              <label htmlFor="tts-target-language" className="control-label">Target Language</label>
              <select
                id="tts-target-language"
                value={targetLanguage}
                onChange={(e) => handleTargetLanguageChange(e.target.value)}
                className="language-select"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="speed-control-wrapper">
              <div className="speed-header">
                <label htmlFor="speech-rate" className="control-label">
                  Speed: {speechRate.toFixed(1)}x
                </label>
                <label className="repeat-checkbox-label" title="Repeat">
                  <input
                    type="checkbox"
                    checked={isRepeatMode}
                    onChange={(e) => setIsRepeatMode(e.target.checked)}
                    className="repeat-checkbox"
                  />
                  <span className="repeat-label-text">🔁</span>
                </label>
              </div>
              <input
                id="speech-rate"
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={speechRate}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="speed-slider"
              />
              <div className="speed-marks">
                <span>0.5x</span>
                <span>1.0x</span>
                <span>1.5x</span>
                <span>2.0x</span>
                <span>2.5x</span>
              </div>
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={handleSpeak}
              disabled={(isSpeaking && !isPaused) || !text.trim() || isTranslating}
              className="speak-btn"
            >
              {isTranslating ? '🔄 Translating...' : isPaused ? '▶ Resume' : isSpeaking ? '🔊 Playing...' : '▶ Play'}
            </button>
            <button
              onClick={handlePause}
              disabled={!isSpeaking || isPaused}
              className="pause-btn"
            >
              ⏸ Pause
            </button>
            <button
              onClick={handleStop}
              disabled={!isSpeaking && !isPaused}
              className="stop-btn"
            >
              ⏹ Stop
            </button>
          </div>

          {voiceWarning && (
            <div className="voice-warning">
              <div className="voice-warning-icon">⚠️</div>
              <div className="voice-warning-content">
                <div className="voice-warning-title">Voice Not Available</div>
                <div className="voice-warning-message">
                  The <strong>{voiceWarning.language}</strong> voice ({voiceWarning.code}) is not installed on your system.
                  The system will use a default voice instead.
                </div>
                <div className="voice-warning-instructions">
                  <strong>To install this voice:</strong>
                  <ul>
                    <li>
                      <strong>Windows:</strong>
                      <ol className="voice-warning-steps">
                        <li>Open Settings → Time & Language → <strong>Language & region</strong></li>
                        <li>Click <strong>"Add a language"</strong></li>
                        <li>Search and select your language (e.g., "English (India)")</li>
                        <li>Check <strong>"Text-to-speech"</strong> option</li>
                        <li>Click <strong>"Install"</strong> and wait for download to complete</li>
                        <li>Restart your browser</li>
                      </ol>
                    </li>
                    <li><strong>macOS:</strong> System Preferences → Accessibility → Spoken Content → System voice → Customize</li>
                    <li><strong>Linux:</strong> Install speech-dispatcher and language packs</li>
                  </ul>
                  {navigator.platform.toLowerCase().includes('win') && (
                    <button 
                      className="voice-warning-settings-btn"
                      onClick={() => window.open('ms-settings:regionlanguage', '_blank')}
                    >
                      🔧 Open Windows Language Settings
                    </button>
                  )}
                </div>
                <button 
                  className="voice-warning-close"
                  onClick={() => setVoiceWarning(null)}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="input-section">
            <div className="text-display-wrapper" style={{ height: `${textareaHeight}px` }}>
              {isSpeaking ? (
                <div className="text-display">
                  {renderHighlightedText()}
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Enter text to convert to speech..."
                  className="input-textarea"
                  style={{ height: `${textareaHeight}px` }}
                />
              )}
            </div>
            <div 
              className="resize-handle"
              onMouseDown={handleResizeStart}
            >
              <div className="resize-handle-bar"></div>
            </div>
          </div>
        </PageBox>
    </PageLayout>
  )
}

export default TextToSpeech

