import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecording } from '../../recording'
import { useWebSpeechInput } from '../../../common/hooks/useWebSpeechInput'
import { analyzeSpeechDiagnostics } from '../_07_utils/readAloudAnalyzer'
import { analyzeAnswerShortQuestion } from '../_07_utils/answerShortQuestionAnalyzer'
import { blobToWAV, decodeBlobToPCM } from '../_07_utils/audioDecoder'
import { translateWord, fetchWordDetail } from '../_06_services/pteWordService'

const WHISPER_SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://192.168.1.150:8200'
const STT_HEADERS = import.meta.env.VITE_RAG_API_KEY ? { 'X-API-Key': import.meta.env.VITE_RAG_API_KEY } : undefined

const LANG_OPTIONS = [
  { code: 'en', label: 'US EN' },
  { code: 'ko', label: 'KR KO' },
  { code: 'zh', label: 'CN ZH' },
]

const SPEECH_SAFE_PREFIX = ', '

function getSafeSpeechText(text = '') {
  const trimmed = text.toString().trim()
  return trimmed ? `${SPEECH_SAFE_PREFIX}${trimmed}` : trimmed
}

function createEnglishUtterance(text, options = {}) {
  const utterance = new SpeechSynthesisUtterance(getSafeSpeechText(text))
  utterance.lang = 'en-US'
  if (options.rate) utterance.rate = options.rate
  return utterance
}

function primeAudioOutput() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    const gain = context.createGain()
    const oscillator = context.createOscillator()
    gain.gain.value = 0
    oscillator.connect(gain)
    gain.connect(context.destination)
    if (context.state === 'suspended') context.resume()
    oscillator.start()
    oscillator.stop(context.currentTime + 0.08)
    setTimeout(() => context.close().catch(() => {}), 120)
  } catch {
    // Ignore audio priming failures and continue with normal playback.
  }
}

function chooseEnglishVoice(voices = []) {
  if (!voices.length) return null
  return (
    voices.find((voice) => voice.lang === 'en-CA')
    || voices.find((voice) => voice.lang === 'en-US')
    || voices.find((voice) => voice.lang === 'en-GB')
    || voices.find((voice) => voice.lang?.startsWith('en-'))
    || null
  )
}

async function loadSpeechVoices(timeoutMs = 1200) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const existingVoices = window.speechSynthesis.getVoices()
  if (existingVoices.length) return existingVoices

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged)
      clearTimeout(timeoutId)
      resolve(window.speechSynthesis.getVoices())
    }
    const handleVoicesChanged = () => finish()
    const timeoutId = setTimeout(finish, timeoutMs)

    window.speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged)
  })
}

function isQuestionAudioProbablyPlayable(audioUrl) {
  if (typeof document === 'undefined' || !audioUrl) return false
  const probe = document.createElement('audio')
  const lowerUrl = audioUrl.toLowerCase()

  if (lowerUrl.endsWith('.m4a') || lowerUrl.includes('.m4a?')) {
    return Boolean(
      probe.canPlayType('audio/mp4; codecs="mp4a.40.2"')
      || probe.canPlayType('audio/x-m4a')
      || probe.canPlayType('audio/aac'),
    )
  }

  if (lowerUrl.endsWith('.mp3') || lowerUrl.includes('.mp3?')) {
    return Boolean(probe.canPlayType('audio/mpeg'))
  }

  if (lowerUrl.endsWith('.wav') || lowerUrl.includes('.wav?')) {
    return Boolean(probe.canPlayType('audio/wav'))
  }

  if (lowerUrl.endsWith('.ogg') || lowerUrl.includes('.ogg?')) {
    return Boolean(probe.canPlayType('audio/ogg'))
  }

  return true
}

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getSourceFriendlyName(source) {
  if (!source) return 'PTE Practice'
  if (!source.startsWith('http')) return source
  const lower = source.toLowerCase()
  if (lower.includes('onepte.com')) return 'OnePTE'
  if (lower.includes('easypte.com')) return 'EasyPTE'
  if (lower.includes('apeuni.com')) return 'APEUni'
  if (lower.includes('gurully.com')) return 'Gurully'
  if (lower.includes('alfapte.com')) return 'Alfa PTE'
  try {
    return new URL(source).hostname.replace('www.', '')
  } catch {
    return 'PTE Source'
  }
}

function getQuestionDifficultyLabel(question) {
  if (!question) return ''
  if (question.difficultyLabel) return question.difficultyLabel
  if (question.difficulty === 0) return 'Easy'
  if (question.difficulty === 1) return 'Medium'
  if (question.difficulty === 2) return 'Hard'
  return ''
}

function ScoreRing({ label, score, color }) {
  const circumference = 2 * Math.PI * 42
  const offset = circumference - ((score / 90) * circumference)
  return (
    <div className="pte-di-score-ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" className="pte-di-score-ring__bg" />
        <circle
          cx="50"
          cy="50"
          r="42"
          className="pte-di-score-ring__fg"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pte-di-score-ring__copy">
        <strong>{score}</strong>
        <span>/90</span>
        <label>{label}</label>
      </div>
    </div>
  )
}

function getDiagnosticLevel(score = 0) {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'good'
  if (score >= 35) return 'watch'
  return 'weak'
}

function getDiagnosticHint(key, diagnostics) {
  switch (key) {
    case 'speed':
      return `${diagnostics.speechWpm || 0} WPM`
    case 'pauseControl':
      return `${diagnostics.pauseCount || 0} pauses · avg ${diagnostics.averagePauseMs || 0} ms`
    case 'stress':
      return `variation ${diagnostics.stressVariation || 0}%`
    case 'intonation':
      return `range ${diagnostics.pitchRange || 0} st`
    case 'rhythm':
      return `variation ${diagnostics.rhythmVariation || 0}%`
    case 'completeness':
      return `${diagnostics.speechRatio || 0}% voiced`
    default:
      return ''
  }
}

function getDiagnosticExplanation(key, score = 0, diagnostics) {
  switch (key) {
    case 'speed':
      if (score >= 75) return 'Your answer was delivered at a natural exam-style speed.'
      if ((diagnostics.speechWpm || 0) < 100) return 'You answered a little too slowly for a short ASQ response.'
      return 'The speaking rate was uneven or rushed.'
    case 'pauseControl':
      if (score >= 75) return 'Pauses were controlled and did not interrupt the short answer.'
      return 'A long hesitation made the short answer less direct.'
    case 'stress':
      if (score >= 75) return 'Word emphasis was clear enough for a short answer.'
      return 'The answer sounded a bit flat or uneven in emphasis.'
    case 'intonation':
      if (score >= 75) return 'Pitch movement sounded natural for a short spoken reply.'
      return 'Pitch movement was limited, so the answer sounded flatter than ideal.'
    case 'rhythm':
      if (score >= 75) return 'The short answer kept a clean rhythm.'
      return 'Word timing was slightly uneven for such a short response.'
    case 'completeness':
      if (score >= 75) return 'Most of the recording contained usable voiced speech.'
      return 'Silence or incomplete speech reduced the usable answer signal.'
    default:
      return ''
  }
}

function getStatusBadgeClass(status = '') {
  if (status === 'exact' || status === 'ideal' || status === 'good') return 'pte-ra-skill-card--strong'
  if (status === 'close' || status === 'fair') return 'pte-ra-skill-card--watch'
  return 'pte-ra-skill-card--weak'
}

export default function AnswerShortQuestionPractice({
  initialMode = 'real',
  realQuestions = [],
  similarPracticeQuestions = [],
  taskLabel = 'Answer Short Question',
}) {
  const [questionMode] = useState(() => (
    initialMode === 'similar' && similarPracticeQuestions.length
      ? 'similar'
      : realQuestions.length
        ? 'real'
        : 'similar'
  ))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState('ready')
  const [timeLeft, setTimeLeft] = useState(10)
  const [analysis, setAnalysis] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentRecording, setCurrentRecording] = useState(null)
  const [browserTranscript, setBrowserTranscript] = useState('')
  const [serverTranscript, setServerTranscript] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [feedbackLang, setFeedbackLang] = useState('en')
  const [translatedTextMap, setTranslatedTextMap] = useState({})
  const [wordPopup, setWordPopup] = useState(null)
  const [isPromptPlaying, setIsPromptPlaying] = useState(false)
  const [promptProgress, setPromptProgress] = useState(0)

  const timerRef = useRef(null)
  const promptTimerRef = useRef(null)
  const browserTextRef = useRef('')
  const browserInterimRef = useRef('')
  const lastProcessedRecordingRef = useRef(null)
  const promptAudioRef = useRef(null)
  const promptAutoRecordRef = useRef(false)
  const speechUtteranceRef = useRef(null)
  const promptStartedAtRef = useRef(0)
  const promptDurationMsRef = useRef(0)

  const shuffledReal = useMemo(() => shuffleArray(realQuestions), [realQuestions])
  const shuffledSimilar = useMemo(() => shuffleArray(similarPracticeQuestions), [similarPracticeQuestions])
  const questions = questionMode === 'real' ? shuffledReal : shuffledSimilar
  const currentQuestion = questions[currentIdx]

  const { isRecording, recordings, startRecording, stopRecording, downloadRecording } = useRecording()

  const webSpeechHandler = useCallback((text, isFinal) => {
    if (!text) return
    if (isFinal) {
      browserTextRef.current += `${text} `
      browserInterimRef.current = ''
    } else {
      browserInterimRef.current = text
    }
  }, [])

  const webSpeech = useWebSpeechInput({
    language: 'en-US',
    onResult: webSpeechHandler,
    continuous: true,
  })

  const stopPrompt = useCallback(() => {
    promptAutoRecordRef.current = false
    if (promptTimerRef.current) {
      clearInterval(promptTimerRef.current)
      promptTimerRef.current = null
    }
    if (promptAudioRef.current) {
      promptAudioRef.current.pause()
      promptAudioRef.current.currentTime = 0
      promptAudioRef.current = null
    }
    if (speechUtteranceRef.current) {
      window.speechSynthesis?.cancel?.()
      speechUtteranceRef.current = null
    }
    setIsPromptPlaying(false)
    setPromptProgress(0)
    if (status === 'prompting') {
      setStatus('ready')
    }
  }, [status])

  const startPromptProgress = useCallback((durationMs) => {
    if (promptTimerRef.current) {
      clearInterval(promptTimerRef.current)
      promptTimerRef.current = null
    }
    promptStartedAtRef.current = Date.now()
    promptDurationMsRef.current = Math.max(1200, durationMs || 1200)
    setPromptProgress(0)
    promptTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - promptStartedAtRef.current
      const duration = Math.max(1200, promptDurationMsRef.current || 1200)
      setPromptProgress(Math.min(95, (elapsed / duration) * 100))
    }, 100)
  }, [])

  const resetViewForQuestion = useCallback((nextStatus = 'ready', nextQuestion = currentQuestion) => {
    if (timerRef.current) clearInterval(timerRef.current)
    stopPrompt()
    webSpeech.stop()
    setAnalysis(null)
    setDiagnostics(null)
    setCurrentRecording(null)
    setBrowserTranscript('')
    setServerTranscript('')
    setShowAnswer(false)
    setError(null)
    setLoading(false)
    setWordPopup(null)
    browserTextRef.current = ''
    browserInterimRef.current = ''
    setStatus(nextStatus)
    setTimeLeft(Number(nextQuestion?.answerTime) || 10)
    setPromptProgress(0)
  }, [currentQuestion, stopPrompt, webSpeech])

  useEffect(() => {
    if (!currentQuestion) return
    resetViewForQuestion('ready', currentQuestion)
  }, [currentIdx, questionMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartRecording = useCallback(async () => {
    if (!currentQuestion || isRecording) return
    stopPrompt()
    browserTextRef.current = ''
    browserInterimRef.current = ''
    setError(null)
    setTimeLeft(Number(currentQuestion.answerTime) || 10)
    setStatus('recording')
    await startRecording()
    webSpeech.start()
  }, [currentQuestion, isRecording, startRecording, stopPrompt, webSpeech])

  const handlePromptFinished = useCallback(() => {
    if (promptTimerRef.current) {
      clearInterval(promptTimerRef.current)
      promptTimerRef.current = null
    }
    setPromptProgress(100)
    setIsPromptPlaying(false)
    const shouldAutoRecord = promptAutoRecordRef.current
    promptAutoRecordRef.current = false
    if (shouldAutoRecord) {
      handleStartRecording()
    } else if (status === 'prompting') {
      setStatus('ready')
    }
  }, [handleStartRecording, status])

  const fallbackToSpeechPrompt = useCallback(async (autoRecord = false) => {
    const promptText = currentQuestion?.text || ''
    if (!promptText) {
      setError('Prompt audio could not be played. You can still start recording manually.')
      handlePromptFinished()
      return
    }

    if (!window.speechSynthesis || typeof window.speechSynthesis.speak !== 'function') {
      setError('Question audio is unavailable in this browser. You can still start recording manually.')
      handlePromptFinished()
      return
    }

    const utterance = createEnglishUtterance(promptText, { rate: 0.96 })
    const voices = await loadSpeechVoices()
    const englishVoice = chooseEnglishVoice(voices)
    if (englishVoice) {
      utterance.voice = englishVoice
      utterance.lang = englishVoice.lang || 'en-US'
    }
    speechUtteranceRef.current = utterance
    const estimatedDurationMs = Math.max(1200, Math.round(promptText.split(/\s+/).filter(Boolean).length * 420))
    promptAutoRecordRef.current = autoRecord
    startPromptProgress(estimatedDurationMs)
    utterance.onend = handlePromptFinished
    utterance.onerror = () => {
      setError('Question audio could not be played in this browser. You can still start recording manually.')
      handlePromptFinished()
    }
    setIsPromptPlaying(true)
    primeAudioOutput()
    window.speechSynthesis.cancel()
    setTimeout(() => {
      try {
        window.speechSynthesis.resume?.()
        window.speechSynthesis.speak(utterance)
      } catch {
        setError('Question audio could not be played in this browser. You can still start recording manually.')
        handlePromptFinished()
      }
    }, 50)
  }, [currentQuestion, handlePromptFinished, startPromptProgress])

  const playPrompt = useCallback((autoRecord = false) => {
    if (!currentQuestion || status === 'recording' || status === 'processing') return
    stopPrompt()
    setError(null)
    if (status !== 'completed') {
      setStatus('prompting')
    }
    promptAutoRecordRef.current = autoRecord
    const fallbackDurationMs = Math.max(1200, Math.round((currentQuestion.text || '').split(/\s+/).filter(Boolean).length * 420))
    startPromptProgress(fallbackDurationMs)

    if (currentQuestion.audioUrl && isQuestionAudioProbablyPlayable(currentQuestion.audioUrl)) {
      const audio = new Audio(currentQuestion.audioUrl)
      audio.preload = 'auto'
      promptAudioRef.current = audio
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          promptDurationMsRef.current = audio.duration * 1000
        }
      }
      audio.ontimeupdate = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setPromptProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
        }
      }
      audio.onended = handlePromptFinished
      audio.onerror = () => {
        if (promptAudioRef.current === audio) {
          promptAudioRef.current = null
        }
        void fallbackToSpeechPrompt(autoRecord)
      }
      setIsPromptPlaying(true)
      primeAudioOutput()
      audio.load()
      setTimeout(() => {
        audio.play().catch(() => {
          if (promptAudioRef.current === audio) {
            promptAudioRef.current = null
          }
          void fallbackToSpeechPrompt(autoRecord)
        })
      }, 60)
      return
    }

    void fallbackToSpeechPrompt(autoRecord)
  }, [currentQuestion, fallbackToSpeechPrompt, handlePromptFinished, startPromptProgress, status, stopPrompt])

  const handleStopRecording = useCallback(() => {
    if (!isRecording && status !== 'recording') return
    if (timerRef.current) clearInterval(timerRef.current)
    webSpeech.stop()
    stopRecording()
    setStatus('processing')
  }, [isRecording, status, stopRecording, webSpeech])

  useEffect(() => {
    if (status !== 'recording') return undefined
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setTimeout(() => handleStopRecording(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status, handleStopRecording])

  const transcribeOnServer = useCallback(async (recording) => {
    const wavBlob = await blobToWAV(recording.blob)
    const formData = new FormData()
    formData.append('audio', wavBlob, 'answer-short-question.wav')
    formData.append('language', 'en')

    const response = await fetch(`${WHISPER_SERVER_URL}/api/stt/transcribe`, {
      method: 'POST',
      body: formData,
      headers: STT_HEADERS,
    })
    if (!response.ok) {
      throw new Error(`Server transcription failed (${response.status})`)
    }
    return response.json()
  }, [])

  useEffect(() => {
    if (status !== 'processing') return
    if (!recordings.length) return
    const latest = recordings[recordings.length - 1]
    if (!latest || lastProcessedRecordingRef.current === latest.id) return
    lastProcessedRecordingRef.current = latest.id
    setCurrentRecording(latest)

    ;(async () => {
      try {
        setLoading(true)
        const serverData = await transcribeOnServer(latest).catch(() => null)
        const recognizedText = (serverData?.text || '').trim()
        const browserText = browserTextRef.current.trim()
        const pcmSamples = await decodeBlobToPCM(latest.blob)
        const diagnosticsResult = analyzeSpeechDiagnostics(
          currentQuestion?.answer || currentQuestion?.acceptedAnswers?.[0] || '',
          recognizedText || browserText,
          pcmSamples,
          { taskType: 'rs' },
        )
        const analysisResult = analyzeAnswerShortQuestion({
          question: currentQuestion,
          recognizedText: recognizedText || browserText,
          browserText,
          diagnostics: diagnosticsResult,
        })

        setServerTranscript(recognizedText)
        setBrowserTranscript(browserText)
        setDiagnostics(diagnosticsResult)
        setAnalysis(analysisResult)
        setStatus('completed')
      } catch (err) {
        console.error(err)
        setError(err?.message || 'Failed to analyze your answer.')
        setStatus('completed')
      } finally {
        setLoading(false)
      }
    })()
  }, [currentQuestion, recordings, status, transcribeOnServer])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (promptTimerRef.current) clearInterval(promptTimerRef.current)
      if (promptAudioRef.current) promptAudioRef.current.pause()
      if (window.speechSynthesis) window.speechSynthesis.cancel()
      webSpeech.stop()
    }
  }, [webSpeech])

  const handleNext = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % Math.max(questions.length, 1))
  }, [questions.length])

  const handleRetry = useCallback(() => {
    lastProcessedRecordingRef.current = null
    resetViewForQuestion('ready', currentQuestion)
  }, [currentQuestion, resetViewForQuestion])

  const queueTranslationTexts = useCallback(async (texts, lang) => {
    const uniqueTexts = [...new Set(texts.filter(Boolean))]
    const uncached = uniqueTexts.filter((text) => !translatedTextMap[`${lang}:${text}`])
    if (!uncached.length) return
    const results = await Promise.all(uncached.map((text) => translateWord(text, lang)))
    setTranslatedTextMap((prev) => {
      const next = { ...prev }
      uncached.forEach((text, index) => {
        next[`${lang}:${text}`] = results[index] || text
      })
      return next
    })
  }, [translatedTextMap])

  useEffect(() => {
    if (feedbackLang === 'en' || !analysis || !currentQuestion) return
    const texts = [
      currentQuestion.text,
      currentQuestion.answer,
      ...(currentQuestion.acceptedAnswers || []),
      analysis.bestAnswer,
      analysis.matchedAnswer,
      analysis.recognizedAnswer,
      ...analysis.tips,
      ...analysis.scorePolicy.flatMap((item) => [item.label, item.detail]),
      ...(diagnostics ? [
        getDiagnosticHint('speed', diagnostics),
        getDiagnosticExplanation('speed', diagnostics.scores?.speed || 0, diagnostics),
        getDiagnosticHint('pauseControl', diagnostics),
        getDiagnosticExplanation('pauseControl', diagnostics.scores?.pauseControl || 0, diagnostics),
        getDiagnosticHint('stress', diagnostics),
        getDiagnosticExplanation('stress', diagnostics.scores?.stress || 0, diagnostics),
        getDiagnosticHint('intonation', diagnostics),
        getDiagnosticExplanation('intonation', diagnostics.scores?.intonation || 0, diagnostics),
      ] : []),
    ].filter(Boolean)
    queueTranslationTexts(texts, feedbackLang)
  }, [analysis, currentQuestion, diagnostics, feedbackLang, queueTranslationTexts])

  const t = useCallback((text) => {
    if (feedbackLang === 'en') return text
    return translatedTextMap[`${feedbackLang}:${text}`] || text
  }, [feedbackLang, translatedTextMap])

  const handleWordClick = async (word, e) => {
    e.stopPropagation()
    const rect = e.target.getBoundingClientRect()
    setWordPopup({ word, loading: true, x: rect.left, y: rect.bottom + window.scrollY + 5 })
    
    const detail = await fetchWordDetail(word)
    if (detail) {
       setWordPopup(prev => prev?.word === word ? { ...prev, loading: false, detail } : prev)
    } else {
       setWordPopup(prev => prev?.word === word ? { ...prev, loading: false, error: 'Not found' } : prev)
    }
  }

  const renderInteractiveText = (text) => {
    if (!text) return null
    return text.split(/(\b[\w'-]+\b)/g).map((part, i) => {
      if (/^[\w'-]+$/.test(part)) {
        return (
          <span 
            key={i} 
            className="pte-interactive-word" 
            onClick={(e) => handleWordClick(part, e)}
            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.target.style.textDecorationColor = '#94a3b8'}
            onMouseLeave={(e) => e.target.style.textDecorationColor = 'transparent'}
          >
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const stageHeadline = status === 'ready'
    ? 'Play the question once, then answer immediately'
    : status === 'prompting'
      ? 'Question audio is playing — recording starts automatically next'
      : status === 'recording'
        ? `Answer now — ${timeLeft}s left`
        : status === 'processing'
          ? 'Scoring your answer'
          : error
            ? 'Recording failed'
            : 'Answer recorded — review feedback or continue'

  const stageHelper = status === 'ready'
    ? 'Exam flow: hear the question first, then your 10-second answer recording begins automatically.'
    : status === 'prompting'
      ? 'Keep listening. When the question ends, the microphone opens automatically.'
      : status === 'recording'
        ? 'Give a one- or two-word answer only. Short and direct answers score best.'
        : status === 'processing'
          ? 'We are checking answer match, clarity, timing, and delivery.'
          : error
            ? 'Try replaying the question or retry this item.'
            : 'You can replay the question, retry, or move to the next item.'

  if (!currentQuestion) {
    return (
      <div className="pte-practice-modal__placeholder">
        <span className="material-symbols-outlined pte-practice-modal__placeholder-icon" style={{ color: '#5568fe' }}>quiz</span>
        <h3>No ASQ questions found yet</h3>
        <p>We are still preparing Answer Short Question items for this section.</p>
      </div>
    )
  }

  const difficultyLabel = getQuestionDifficultyLabel(currentQuestion)
  const answerTime = Number(currentQuestion.answerTime) || 10

  return (
    <div className="pte-di-practice">
      <div className="pte-di-practice__headline">
        <div>
          <h3>{status === 'completed' ? (currentQuestion.promptTitle || currentQuestion.title || taskLabel) : taskLabel}</h3>
          <div className="pte-di-practice__meta">
            <span className="pte-di-practice__source">Source: {currentQuestion.sourceLabel || getSourceFriendlyName(currentQuestion.source)}</span>
            {currentQuestion.source?.startsWith('http') && (
              <a href={currentQuestion.source} target="_blank" rel="noopener noreferrer" className="pte-di-practice__source-link">Open source</a>
            )}
            {difficultyLabel && <span className="pte-di-practice__badge">{difficultyLabel}</span>}
          </div>
        </div>
        <div className="pte-di-practice__index">Question {currentIdx + 1} of {questions.length}</div>
      </div>

      <div className="pte-asq-prompt-card">
        <div className="pte-asq-prompt-card__header">
          <div>
            <div className="pte-asq-prompt-card__label">Question Audio</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h4>{status === 'completed' ? 'Question Transcript' : 'Listen first, then answer in one or two words.'}</h4>
              {status === 'completed' && (
                <div className="pte-ra-tips__lang-toggle" style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                  {LANG_OPTIONS.map((lang) => (
                    <button
                      key={`answer-${lang.code}`}
                      className={`pte-word-popup__lang-btn ${feedbackLang === lang.code ? 'pte-word-popup__lang-btn--active' : ''}`}
                      onClick={() => setFeedbackLang(lang.code)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="pte-asq-prompt-card__actions">
            <button
              className="pte-card__practice-btn pte-card__practice-btn--real"
              onClick={() => playPrompt(false)}
              disabled={status === 'recording' || status === 'processing'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>play_arrow</span>
              {status === 'completed' ? 'Replay Question Audio' : 'Listen Only'}
            </button>
            {isPromptPlaying && (
              <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={stopPrompt}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>stop</span>
                Stop Audio
              </button>
            )}
          </div>
        </div>

        {status === 'completed' ? (
          <div className="pte-asq-prompt-card__text" style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#1e293b' }}>
            <p>{renderInteractiveText(currentQuestion.text)}</p>
            {feedbackLang !== 'en' && (
              <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#64748b', marginTop: '8px' }}>
                {t(currentQuestion.text)}
              </p>
            )}
          </div>
        ) : (
          <p className="pte-asq-prompt-card__text pte-asq-prompt-card__text--muted">
            The transcript stays hidden until your answer is recorded and analyzed.
          </p>
        )}
      </div>

      <div className="pte-di-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {status === 'completed' && (
            <button
              className="pte-card__practice-btn pte-card__practice-btn--similar"
              onClick={() => setShowAnswer((prev) => !prev)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>description</span>
              {showAnswer ? 'Hide Model Answer' : 'Show Model Answer'}
            </button>
          )}
        </div>
        <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={handleNext}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>skip_next</span>
          Skip Question
        </button>
      </div>

      {showAnswer && (
        <div className="pte-di-answer" style={{ marginTop: '1rem' }}>
          <div className="pte-di-answer__panel pte-di-answer__panel--model">
            <h5>Best Answer</h5>
            <p>{t(currentQuestion.answer)}</p>
          </div>
          {!!currentQuestion.acceptedAnswers?.length && (
            <div className="pte-di-answer__panel pte-di-answer__panel--model">
              <h5>Accepted Alternatives</h5>
              <p>{currentQuestion.acceptedAnswers.map((value) => t(value)).join(' · ')}</p>
            </div>
          )}
        </div>
      )}

      <div className="pte-di-timer-card">
        <div className="pte-di-timer-card__status">
          <span
            className={`pte-di-timer-card__pill pte-di-timer-card__pill--${status === 'ready' ? 'preparing' : status}`}
            style={status === 'completed' && error ? { backgroundColor: '#fee2e2', color: '#ef4444' } : undefined}
          >
            {status === 'ready' ? 'READY' : status === 'prompting' ? 'QUESTION PLAYING' : status === 'recording' ? 'ANSWER RECORDING' : status === 'processing' ? 'ANALYZING' : (error ? 'NO RECORDING' : 'COMPLETED')}
          </span>
          <strong>{stageHeadline}</strong>
        </div>

        <div className="pte-di-timer-card__bar">
          <div
            className={`pte-di-timer-card__fill pte-di-timer-card__fill--${status === 'ready' ? 'preparing' : status}`}
            style={{
              width: status === 'recording'
                ? `${100 - ((timeLeft / answerTime) * 100)}%`
                : status === 'prompting'
                  ? `${promptProgress}%`
                : status === 'processing'
                  ? '72%'
                  : status === 'completed'
                    ? '100%'
                    : '0%',
            }}
          />
        </div>

        <div className="pte-di-timer-card__controls">
          {status === 'ready' && (
            <button className="pte-di-record-btn" onClick={() => playPrompt(true)}>
              <span className="material-symbols-outlined">play_arrow</span>
              Play Question + Start Answer
            </button>
          )}
          {status === 'prompting' && (
            <button className="pte-di-record-btn pte-di-record-btn--stop" onClick={stopPrompt}>
              <span className="material-symbols-outlined">stop_circle</span>
                Stop Question Audio
              </button>
            )}
          {status === 'recording' && (
            <button className="pte-di-record-btn pte-di-record-btn--stop" onClick={handleStopRecording}>
              <span className="material-symbols-outlined">stop_circle</span>
              Stop Recording
            </button>
          )}
          {status === 'processing' && (
            <div className="pte-di-loading">
              <div className="pte-ra-spinner" />
              <span>{loading ? 'Scoring Content, Oral Fluency, Pronunciation, and Delivery…' : 'Preparing results…'}</span>
            </div>
          )}
        </div>

        <div className="pte-asq-stage-helper">
          {stageHelper}
        </div>

        {error && <div className="pte-di-error">{error}</div>}

        {currentRecording && (
          <>
            {!error && <audio controls src={currentRecording.url} className="pte-di-practice__audio" />}
            <div className="pte-di-practice__footer-actions">
              {!error && (
                <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={() => downloadRecording(currentRecording)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>download</span>
                  Download
                </button>
              )}
              <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={handleRetry}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>refresh</span>
                Retry
              </button>
              <button className="pte-card__practice-btn pte-card__practice-btn--real" onClick={handleNext}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>arrow_forward</span>
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {analysis && (
        <div className="pte-di-results">
          <div className="pte-di-results__headline">
            <div>
              <h4>Answer Evaluation</h4>
              <p>{t('Practice-oriented feedback for answer match, oral fluency, pronunciation, and delivery.')}</p>
            </div>
            <div className="pte-ra-tips__lang-toggle">
              {LANG_OPTIONS.map((lang) => (
                <button
                  key={`feedback-${lang.code}`}
                  className={`pte-word-popup__lang-btn ${feedbackLang === lang.code ? 'pte-word-popup__lang-btn--active' : ''}`}
                  onClick={() => setFeedbackLang(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pte-di-results__overall">
            <span>Overall</span>
            <strong>{analysis.overall}</strong>
            <em>/90</em>
          </div>

          <div className="pte-di-results__score-grid">
            <ScoreRing label="Content" score={analysis.content} color="#22c55e" />
            <ScoreRing label="Oral Fluency" score={analysis.oralFluency} color="#3b82f6" />
            <ScoreRing label="Pronunciation" score={analysis.pronunciation} color="#f59e0b" />
            <ScoreRing label="Delivery" score={analysis.delivery} color="#8b5cf6" />
          </div>

          <div className="pte-di-results__transcripts">
            <div className="pte-di-grammar__panel">
              <h5>Question Transcript</h5>
              <p>{t(currentQuestion.text)}</p>
            </div>
            <div className="pte-di-grammar__panel">
              <h5>Your Recognized Answer</h5>
              <p>{t(analysis.recognizedAnswer || serverTranscript || browserTranscript || 'No transcript available.')}</p>
            </div>
          </div>

          <div className="pte-di-answer">
            <div className="pte-di-answer__panel">
              <h5>Expected Answer</h5>
              <p>{t(analysis.bestAnswer)}</p>
            </div>
            <div className="pte-di-answer__panel">
              <h5>Accepted Alternatives</h5>
              <p>{analysis.acceptedAnswers?.length ? analysis.acceptedAnswers.map((value) => t(value)).join(' · ') : t(analysis.bestAnswer)}</p>
            </div>
            <div className="pte-di-answer__panel">
              <h5>Answer Status</h5>
              <p>{analysis.answerStatus === 'exact' ? 'Exact match' : analysis.answerStatus === 'close' ? 'Close match' : 'Missed answer'}</p>
              {analysis.matchedAnswer && analysis.answerStatus !== 'exact' && (
                <p className="pte-di-answer__subtle">Closest expected answer: {t(analysis.matchedAnswer)}</p>
              )}
              <p className="pte-di-answer__subtle">Match confidence: {analysis.matchConfidence}%</p>
            </div>
          </div>

          <div className="pte-ra-skill-panel">
            <div className="pte-ra-skill-panel__header">
              <div>
                <h4>Answer Check Analysis</h4>
                <p>{t('This section explains whether your short answer matched, stayed concise, and arrived with exam-style timing.')}</p>
              </div>
            </div>

            <div className="pte-ra-skill-panel__grid">
              <div className={`pte-ra-skill-card ${getStatusBadgeClass(analysis.answerStatus)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>Answer Match</span>
                  <strong>{analysis.answerStatus === 'exact' ? 'Exact' : analysis.answerStatus === 'close' ? 'Close' : 'Missed'}</strong>
                </div>
                <p>{t(analysis.contentReason)}</p>
              </div>

              <div className={`pte-ra-skill-card ${getStatusBadgeClass(analysis.brevityStatus)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>Brevity</span>
                  <strong>{analysis.brevityStatus === 'ideal' ? 'Ideal' : analysis.brevityStatus === 'long' ? 'Long' : analysis.brevityStatus === 'missing' ? 'Missing' : 'Too long'}</strong>
                </div>
                <p>{t(analysis.brevityReason)}</p>
              </div>

              <div className={`pte-ra-skill-card ${getStatusBadgeClass(analysis.timingStatus)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>Timing</span>
                  <strong>{analysis.timingStatus === 'good' ? 'Good' : analysis.timingStatus === 'fair' ? 'Fair' : analysis.timingStatus === 'missing' ? 'Missing' : 'Slow'}</strong>
                </div>
                <p>{t(analysis.timingReason)}</p>
              </div>
            </div>
          </div>

          {diagnostics && (
            <div className="pte-ra-skill-panel">
              <div className="pte-ra-skill-panel__header">
                <div>
                  <h4>Speech Skill Analysis</h4>
                  <p>{t('Quick acoustic diagnostics for pace, pauses, stress, intonation, and spoken delivery.')}</p>
                </div>
                <div className="pte-ra-skill-panel__stats">
                  <span>{diagnostics.durationSec?.toFixed?.(2) || '0.00'}s audio</span>
                  <span>{diagnostics.speechRatio || 0}% voiced</span>
                </div>
              </div>

              <div className="pte-ra-skill-panel__grid">
                {[
                  ['speed', 'Speed', diagnostics.scores?.speed || 0],
                  ['pauseControl', 'Pause Control', diagnostics.scores?.pauseControl || 0],
                  ['stress', 'Stress', diagnostics.scores?.stress || 0],
                  ['intonation', 'Intonation', diagnostics.scores?.intonation || 0],
                ].map(([key, label, score]) => (
                  <div key={key} className={`pte-ra-skill-card pte-ra-skill-card--${getDiagnosticLevel(score)}`}>
                    <div className="pte-ra-skill-card__title">
                      <span>{label}</span>
                      <strong>{score}/90</strong>
                    </div>
                    <div className="pte-ra-skill-card__meter">
                      <div className="pte-ra-skill-card__meter-fill" style={{ width: `${(score / 90) * 100}%` }} />
                    </div>
                    <div className="pte-ra-skill-card__hint">{t(getDiagnosticHint(key, diagnostics))}</div>
                    <p>{t(getDiagnosticExplanation(key, score, diagnostics))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pte-ra-tips">
            <div className="pte-ra-tips__header">
              <h4>Improvement Tips</h4>
            </div>
            <ul>
              {analysis.tips.map((tip) => (
                <li key={tip}>{t(tip)}</li>
              ))}
            </ul>
          </div>

          <div className="pte-di-policy">
            <h4>How the score is estimated</h4>
            <div className="pte-di-policy__grid">
              {analysis.scorePolicy.map((item) => (
                <div key={item.label} className="pte-di-policy__item">
                  <strong>{t(item.label)}</strong>
                  <p>{t(item.detail)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {wordPopup && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
            onClick={() => setWordPopup(null)} 
          />
          <div
            style={{
              position: 'absolute',
              left: Math.min(wordPopup.x, window.innerWidth - 300),
              top: wordPopup.y,
              zIndex: 1000,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              width: '280px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>{wordPopup.word}</h3>
              <button 
                onClick={() => setWordPopup(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
              </button>
            </div>
            
            {wordPopup.loading ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                Searching dictionary...
              </div>
            ) : wordPopup.error ? (
              <div style={{ padding: '10px 0', color: '#ef4444', fontSize: '0.9rem' }}>
                Definition not found.
              </div>
            ) : wordPopup.detail ? (
              <div>
                {wordPopup.detail.phonetic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#64748b' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{wordPopup.detail.phonetic}</span>
                    {wordPopup.detail.phonetics?.[0]?.audio && (
                      <button 
                        onClick={() => {
                          const audio = new Audio(wordPopup.detail.phonetics[0].audio)
                          audio.play().catch(() => {})
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', padding: 0 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>volume_up</span>
                      </button>
                    )}
                  </div>
                )}
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {wordPopup.detail.meanings?.slice(0, 2).map((meaning, idx) => (
                    <div key={idx} style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {meaning.partOfSpeech}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {meaning.definitions?.slice(0, 2).map((def, dIdx) => (
                          <li key={dIdx} style={{ marginBottom: '4px' }}>{def.definition}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
