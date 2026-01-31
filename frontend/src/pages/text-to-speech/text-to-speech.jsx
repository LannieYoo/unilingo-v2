import { useState, useRef } from 'react'
import { PageLayout, PageBox } from '../../components/layout/PageLayout'
import './text-to-speech.css'

function TextToSpeech() {
  const [text, setText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const utteranceRef = useRef(null)

  const languages = [
    { code: 'en', name: 'English', voice: 'en-US' },
    { code: 'ko', name: 'Korean', voice: 'ko-KR' },
    { code: 'zh', name: 'Chinese (Simplified)', voice: 'zh-CN' },
  ]

  // 언어 감지 함수
  const detectLanguage = (text) => {
    if (!text.trim()) return 'en'
    
    // 한글 감지
    const koreanRegex = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/
    if (koreanRegex.test(text)) {
      return 'ko'
    }
    
    // 중국어 감지
    const chineseRegex = /[\u4E00-\u9FFF]/
    if (chineseRegex.test(text)) {
      return 'zh'
    }
    
    // 기본값은 영어
    return 'en'
  }

  // 텍스트 변경 핸들러
  const handleTextChange = (e) => {
    const newText = e.target.value
    setText(newText)
    
    // 텍스트가 있으면 언어 자동 감지
    if (newText.trim()) {
      const detectedLang = detectLanguage(newText)
      setSelectedLanguage(detectedLang)
    }
  }

  // 속도 변경 핸들러
  const handleSpeedChange = (newRate) => {
    setSpeechRate(newRate)
    
    // 재생 중이면 현재 위치부터 새로운 속도로 재시작
    if (isSpeaking && window.speechSynthesis.speaking) {
      const remainingText = text.substring(currentCharIndex)
      
      if (remainingText.trim()) {
        // 현재 재생 중단
        window.speechSynthesis.cancel()
        
        // 남은 텍스트를 새로운 속도로 재생
        speakText(remainingText, newRate, currentCharIndex)
      }
    }
  }

  // 텍스트 읽기 함수
  const speakText = (textToSpeak, rate, startIndex = 0) => {
    if (!textToSpeak.trim()) return

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    const selectedLang = languages.find(lang => lang.code === selectedLanguage)
    utterance.lang = selectedLang?.voice || 'ko-KR'
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // 단어 경계 이벤트로 현재 위치 추적
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setCurrentCharIndex(startIndex + event.charIndex)
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      utteranceRef.current = utterance
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setCurrentCharIndex(0)
      utteranceRef.current = null
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setCurrentCharIndex(0)
      utteranceRef.current = null
    }

    window.speechSynthesis.speak(utterance)
  }

  const handleSpeak = () => {
    if (!text.trim()) return

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setCurrentCharIndex(0)
      speakText(text, speechRate, 0)
    } else {
      alert('This browser does not support speech synthesis.')
    }
  }

  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  return (
    <PageLayout title="Text to Speech">
      <PageBox>
          <div className="tts-controls-wrapper">
            <div className="language-select-wrapper">
              <label htmlFor="tts-language" className="control-label">Language</label>
              <select
                id="tts-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="language-select"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="speed-control-wrapper">
              <label htmlFor="speech-rate" className="control-label">
                Speed: {speechRate.toFixed(1)}x
              </label>
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

          <div className="input-section">
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="Enter text to convert to speech..."
              className="input-textarea"
              rows={10}
            />
          </div>

          <div className="button-group">
            <button
              onClick={handleSpeak}
              disabled={isSpeaking || !text.trim()}
              className="speak-btn"
            >
              {isSpeaking ? '🔊 Playing...' : '▶ Play'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isSpeaking}
              className="stop-btn"
            >
              ⏹ Stop
            </button>
          </div>
        </PageBox>
    </PageLayout>
  )
}

export default TextToSpeech

