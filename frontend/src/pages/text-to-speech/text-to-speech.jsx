import { useState } from 'react'
import { PageLayout, PageBox } from '../../components/layout/PageLayout'
import './text-to-speech.css'

function TextToSpeech() {
  const [text, setText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [isSpeaking, setIsSpeaking] = useState(false)

  const languages = [
    { code: 'en', name: 'English', voice: 'en-US' },
    { code: 'ko', name: 'Korean', voice: 'ko-KR' },
    { code: 'zh', name: 'Chinese (Simplified)', voice: 'zh-CN' },
  ]

  const handleSpeak = () => {
    if (!text.trim()) return

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // 이전 음성 중지

      const utterance = new SpeechSynthesisUtterance(text)
      const selectedLang = languages.find(lang => lang.code === selectedLanguage)
      utterance.lang = selectedLang?.voice || 'ko-KR'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
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
          <div className="language-select-wrapper">
            <select
              id="tts-language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="language-select"
              disabled={isSpeaking}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="input-section">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
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

