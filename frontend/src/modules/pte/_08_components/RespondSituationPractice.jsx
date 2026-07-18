import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecording } from '../../recording'
import { useWebSpeechInput } from '../../../common/hooks/useWebSpeechInput'
import { useAI } from '../../../common/hooks/useAI'
import { analyzeSpeechDiagnostics } from '../_07_utils/readAloudAnalyzer'
import { analyzeRespondSituation } from '../_07_utils/respondSituationAnalyzer'
import { blobToWAV, decodeBlobToPCM } from '../_07_utils/audioDecoder'
import { translateWord, fetchWordDetail } from '../_06_services/pteWordService'
import { buildModelAnswerVariants } from '../_07_utils/modelAnswerVariants'
import PteGrammarNoteChip from './PteGrammarNoteChip'

const WHISPER_SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://192.168.1.150:8200'
const STT_HEADERS = import.meta.env.VITE_RAG_API_KEY ? { 'X-API-Key': import.meta.env.VITE_RAG_API_KEY } : undefined

const LANG_OPTIONS = [
  { code: 'en', label: 'US EN' },
  { code: 'ko', label: 'KR KO' },
  { code: 'zh', label: 'CN ZH' },
]

const RTS_HINT_LIBRARY = {
  'rts-core-polite': {
    title: 'Polite Reply Template',
    badge: 'Core',
    quickFormula: 'Acknowledge → Main response → Polite close',
    reminders: [
      'Start with a short polite opener.',
      'Give one clear answer, request, or explanation.',
      'Finish with one natural closing sentence.',
    ],
    skeleton: 'Hi ____. Thanks for your message. I would like to ____ because ____. Please let me know ____. Thank you for your understanding.',
    slots: ['name / title', 'main response', 'reason', 'next step / confirmation'],
  },
  'rts-problem-solution': {
    title: 'Problem / Solution Template',
    badge: 'Common',
    quickFormula: 'Apology → Fix → Confirmation',
    reminders: [
      'For complaints, apology + solution works well.',
      'Do not over-explain. State the action clearly.',
    ],
    skeleton: 'I understand that ____, and I am sorry for the inconvenience. To solve this, I can ____. Please confirm whether ____ works for you.',
    slots: ['problem', 'solution', 'confirmation / next step'],
  },
  'rts-availability': {
    title: 'Scheduling Template',
    badge: 'Situational',
    quickFormula: 'Availability → Alternative → Confirmation',
    reminders: [
      'Mention your available time clearly.',
      'Offer one alternative if needed.',
      'End by asking for confirmation.',
    ],
    skeleton: 'Thank you for your message. I am available ____, but if needed, I can also ____. Please let me know which time suits you best.',
    slots: ['available time', 'alternative time / plan', 'confirmation'],
  },
}

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
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

function detectRtsTemplateId(question) {
  if (!question) return 'rts-core-polite'
  if (question?.templateHintId && RTS_HINT_LIBRARY[question.templateHintId]) return question.templateHintId
  const text = `${question?.promptTitle || ''} ${question?.text || ''} ${question?.answer || ''}`.toLowerCase()
  if (/(meeting|appointment|schedule|reschedule|time|available|availability|shift|interview|booking|reservation)/.test(text)) {
    return 'rts-availability'
  }
  if (/(problem|issue|complaint|delay|broken|error|mistake|refund|wrong|missing|late|cancel|apolog)/.test(text)) {
    return 'rts-problem-solution'
  }
  return 'rts-core-polite'
}

function getRecommendedTemplate(question) {
  return RTS_HINT_LIBRARY[detectRtsTemplateId(question)] || RTS_HINT_LIBRARY['rts-core-polite']
}

function inferRtsSlotSuggestions(question, templateId) {
  const prompt = question?.text || ''
  switch (templateId) {
    case 'rts-problem-solution':
      return [
        { label: 'problem', value: prompt.includes('.') ? prompt.split('.')[0].trim() : 'the issue mentioned in the situation' },
        { label: 'solution', value: 'offer a practical fix or next step' },
        { label: 'confirmation / next step', value: 'whether this solution works for the listener' },
      ]
    case 'rts-availability':
      return [
        { label: 'available time', value: 'your available time or preferred schedule' },
        { label: 'alternative time / plan', value: 'one backup time or alternate arrangement' },
        { label: 'confirmation', value: 'which option suits the listener best' },
      ]
    case 'rts-core-polite':
    default:
      return [
        { label: 'name / title', value: 'the person or role in the situation' },
        { label: 'main response', value: 'your answer, request, or explanation' },
        { label: 'reason', value: 'one short supporting reason' },
        { label: 'next step / confirmation', value: 'what you want the listener to do next' },
      ]
  }
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
      if (score >= 75) return 'Your pace stayed close to an exam-like speaking rate.'
      if ((diagnostics.speechWpm || 0) < 115) return 'Your pace was slower than ideal for a short RtS response.'
      return 'Your pace was uneven or rushed in parts.'
    case 'pauseControl':
      if (score >= 75) return 'Pauses were generally controlled and did not interrupt the message too much.'
      return 'Long or frequent pauses reduced the smooth flow of the answer.'
    case 'stress':
      if (score >= 75) return 'Word emphasis varied naturally and helped key points stand out.'
      return 'Stress sounded flat or uneven across important words.'
    case 'intonation':
      if (score >= 75) return 'Pitch movement sounded more natural and expressive.'
      return 'Pitch movement was limited, so the response sounded flatter than ideal.'
    case 'rhythm':
      if (score >= 75) return 'Word timing was reasonably even across phrases.'
      return 'Word timing varied too much from phrase to phrase.'
    case 'completeness':
      if (score >= 75) return 'Most of the response contained usable voiced speech.'
      return 'A large amount of silence or incomplete delivery lowered usable speech coverage.'
    default:
      return ''
  }
}

export default function RespondSituationPractice({
  initialMode = 'real',
  realQuestions = [],
  similarPracticeQuestions = [],
  taskLabel = 'Respond to a Situation',
}) {
  const [questionMode] = useState(() => (
    initialMode === 'similar' && similarPracticeQuestions.length
      ? 'similar'
      : realQuestions.length
        ? 'real'
        : 'similar'
  ))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState('preparing')
  const [timeLeft, setTimeLeft] = useState(20)
  const [analysis, setAnalysis] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentRecording, setCurrentRecording] = useState(null)
  const [browserTranscript, setBrowserTranscript] = useState('')
  const [serverTranscript, setServerTranscript] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isScriptRevealed, setIsScriptRevealed] = useState(false)
  const [wordPopup, setWordPopup] = useState(null)
  const [feedbackLang, setFeedbackLang] = useState('en')
  const [translatedTextMap, setTranslatedTextMap] = useState({})

  const timerRef = useRef(null)
  const browserTextRef = useRef('')
  const browserInterimRef = useRef('')
  const lastProcessedRecordingRef = useRef(null)

  const shuffledReal = useMemo(() => shuffleArray(realQuestions), [realQuestions])
  const shuffledSimilar = useMemo(() => shuffleArray(similarPracticeQuestions), [similarPracticeQuestions])
  const questions = questionMode === 'real' ? shuffledReal : shuffledSimilar
  const currentQuestion = questions[currentIdx]
  const recommendedTemplateId = detectRtsTemplateId(currentQuestion)
  const recommendedTemplate = getRecommendedTemplate(currentQuestion)
  const answerVariants = useMemo(
    () => buildModelAnswerVariants(currentQuestion?.answer || '', 'rts'),
    [currentQuestion?.answer],
  )
  const suggestedSlots = useMemo(
    () => inferRtsSlotSuggestions(currentQuestion, recommendedTemplateId),
    [currentQuestion, recommendedTemplateId],
  )

  const { checkGrammar } = useAI()
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

  const resetViewForQuestion = useCallback((nextStatus = 'preparing', nextQuestion = currentQuestion) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setAnalysis(null)
    setDiagnostics(null)
    setCurrentRecording(null)
    setBrowserTranscript('')
    setServerTranscript('')
    setShowHint(false)
    setShowAnswer(false)
    setIsScriptRevealed(false)
    setWordPopup(null)
    setError(null)
    setLoading(false)
    browserTextRef.current = ''
    browserInterimRef.current = ''
    setStatus(nextStatus)
    setTimeLeft(Number(nextQuestion?.preparationTime) || 20)
  }, [currentQuestion])

  useEffect(() => {
    if (!currentQuestion) return
    resetViewForQuestion('preparing', currentQuestion)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(currentQuestion.text)
        utterance.lang = 'en-US'
        utterance.rate = 1.0
        window.speechSynthesis.speak(utterance)
      }, 50)
    }
  }, [currentIdx, questionMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartRecording = async () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (!currentQuestion) return
    browserTextRef.current = ''
    browserInterimRef.current = ''
    setError(null)
    setTimeLeft(Number(currentQuestion.answerTime) || 40)
    setStatus('recording')
    await startRecording()
    webSpeech.start()
  }

  const handleStopRecording = useCallback(() => {
    webSpeech.stop()
    stopRecording()
    setStatus('processing')
  }, [stopRecording, webSpeech])

  useEffect(() => {
    if (!currentQuestion) return
    if (timerRef.current) clearInterval(timerRef.current)

    if (status === 'preparing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleStartRecording()
            return Number(currentQuestion.answerTime) || 40
          }
          return prev - 1
        })
      }, 1000)
    } else if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleStopRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status, currentQuestion, handleStopRecording]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'processing') return
    const latest = recordings[recordings.length - 1]
    if (!latest || lastProcessedRecordingRef.current === latest.id) return
    lastProcessedRecordingRef.current = latest.id
    processRecording(latest)
  }, [recordings, status]) // eslint-disable-line react-hooks/exhaustive-deps

  const isRecordingRef = useRef(isRecording)
  const stopRecordingRef = useRef(stopRecording)
  const stopWebSpeechRef = useRef(webSpeech.stop)

  useEffect(() => {
    isRecordingRef.current = isRecording
    stopRecordingRef.current = stopRecording
    stopWebSpeechRef.current = webSpeech.stop
  }, [isRecording, stopRecording, webSpeech.stop])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (isRecordingRef.current) stopRecordingRef.current?.()
      stopWebSpeechRef.current?.()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const translateTexts = useCallback(async (texts, lang) => {
    if (lang === 'en') return
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
    const diagnosticTexts = diagnostics ? [
      getDiagnosticHint('speed', diagnostics),
      getDiagnosticExplanation('speed', diagnostics.scores?.speed || 0, diagnostics),
      getDiagnosticHint('pauseControl', diagnostics),
      getDiagnosticExplanation('pauseControl', diagnostics.scores?.pauseControl || 0, diagnostics),
      getDiagnosticHint('stress', diagnostics),
      getDiagnosticExplanation('stress', diagnostics.scores?.stress || 0, diagnostics),
      getDiagnosticHint('intonation', diagnostics),
      getDiagnosticExplanation('intonation', diagnostics.scores?.intonation || 0, diagnostics),
      getDiagnosticHint('rhythm', diagnostics),
      getDiagnosticExplanation('rhythm', diagnostics.scores?.rhythm || 0, diagnostics),
      getDiagnosticHint('completeness', diagnostics),
      getDiagnosticExplanation('completeness', diagnostics.scores?.completeness || 0, diagnostics),
    ] : []

    translateTexts([
      currentQuestion.text,
      currentQuestion.answer,
      answerVariants.examStyle,
      analysis.correctedText,
      ...analysis.tips,
      ...analysis.scorePolicy.map((item) => item.detail),
      ...analysis.grammarNotes.map((item) => item.reason),
      ...analysis.grammarNotes.map((item) => item.tip),
      ...analysis.grammarNotes.map((item) => item.category),
      ...diagnosticTexts,
      'Before',
      'After',
      'Why',
      'Exam tip',
      'Practice-oriented feedback for Content, Oral Fluency, Pronunciation, Grammar, Structure, and Vocabulary.',
      'Practice-oriented feedback for Speed, Pause Control, Rhythm, Stress, and Intonation.',
    ], feedbackLang).catch(() => {})
  }, [analysis, answerVariants.examStyle, currentQuestion, diagnostics, feedbackLang, translateTexts])

  const t = useCallback((text) => {
    if (feedbackLang === 'en') return text
    return translatedTextMap[`${feedbackLang}:${text}`] || text
  }, [feedbackLang, translatedTextMap])

  const handleWordClick = async (word, e) => {
    e.stopPropagation()
    const rect = e.target.getBoundingClientRect()
    // position roughly below the word
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

  const transcribeOnServer = useCallback(async (recording) => {
    const wavBlob = await blobToWAV(recording.blob)
    const formData = new FormData()
    formData.append('audio', wavBlob, 'respond-situation.wav')
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

  const processRecording = useCallback(async (recording) => {
    if (!currentQuestion) return

    try {
      const browserText = `${browserTextRef.current} ${browserInterimRef.current}`.trim()
      const pcm = await decodeBlobToPCM(recording.blob)

      if (!browserText) {
        let sumSquares = 0
        const step = Math.floor(pcm.length / 10000) || 1
        let count = 0
        for (let i = 0; i < pcm.length; i += step) {
          sumSquares += pcm[i] * pcm[i]
          count++
        }
        const rms = Math.sqrt(sumSquares / count)
        if (rms < 0.01) {
          setCurrentRecording(recording)
          setError('No speech was detected. Please try recording again.')
          setStatus('completed')
          return
        }
      }

      setLoading(true)
      setCurrentRecording(recording)
      setError(null)

      let sttPayload = null
      try {
        sttPayload = await transcribeOnServer(recording)
      } catch (serverError) {
        console.warn('[RTS] Server STT failed:', serverError)
      }

      const primaryText = (sttPayload?.text || browserText || '').trim()
      if (!primaryText) {
        throw new Error('No speech was detected. Please try recording again.')
      }

      const correctedText = await checkGrammar(primaryText).catch(() => primaryText)
      const diagnosticsResult = analyzeSpeechDiagnostics(
        correctedText || primaryText,
        primaryText,
        pcm,
        {
          sampleRate: 16000,
          wordTimings: Array.isArray(sttPayload?.words) ? sttPayload.words : [],
          taskType: 'ra',
          alignedWords: [],
        },
      )

      const scoring = analyzeRespondSituation({
        question: currentQuestion,
        recognizedText: primaryText,
        browserText,
        correctedText,
        diagnostics: diagnosticsResult,
      })

      setBrowserTranscript(browserText)
      setServerTranscript(primaryText)
      setDiagnostics(diagnosticsResult)
      setAnalysis(scoring)
      setShowAnswer(true)
      setStatus('completed')
    } catch (err) {
      console.error('[RTS] Analysis failed:', err)
      setError(err.message || 'Analysis failed')
      setStatus('completed')
    } finally {
      setLoading(false)
    }
  }, [checkGrammar, currentQuestion, transcribeOnServer])

  const handleRetry = () => {
    resetViewForQuestion('preparing', currentQuestion)
  }

  const handleNext = () => {
    if (!questions.length) return
    setCurrentIdx((prev) => (prev + 1) % questions.length)
  }

  const handleSkipQuestion = () => {
    if (!questions.length) return
    if (timerRef.current) clearInterval(timerRef.current)
    if (isRecording) stopRecording()
    webSpeech.stop()
    setLoading(false)
    setError(null)
    setCurrentRecording(null)
    setCurrentIdx((prev) => (prev + 1) % questions.length)
  }

  const scoreCards = analysis ? [
    { key: 'content', label: 'Content', score: analysis.content, color: '#22c55e', detail: analysis.scorePolicy.find((item) => item.label === 'Content')?.detail },
    { key: 'oralFluency', label: 'Oral Fluency', score: analysis.oralFluency, color: '#3b82f6', detail: analysis.scorePolicy.find((item) => item.label === 'Oral Fluency')?.detail },
    { key: 'pronunciation', label: 'Pronunciation', score: analysis.pronunciation, color: '#f59e0b', detail: analysis.scorePolicy.find((item) => item.label === 'Pronunciation')?.detail },
    { key: 'grammar', label: 'Grammar', score: analysis.grammar, color: '#8b5cf6', detail: analysis.scorePolicy.find((item) => item.label === 'Grammar')?.detail },
    { key: 'structure', label: 'Structure', score: analysis.structure, color: '#06b6d4', detail: analysis.scorePolicy.find((item) => item.label === 'Structure')?.detail },
    { key: 'vocabulary', label: 'Vocabulary', score: analysis.vocabulary, color: '#ef4444', detail: analysis.scorePolicy.find((item) => item.label === 'Vocabulary')?.detail },
  ] : []

  const diagnosticCards = diagnostics ? [
    { key: 'speed', label: 'Speed', score: diagnostics.scores?.speed || 0, level: getDiagnosticLevel(diagnostics.scores?.speed || 0) },
    { key: 'pauseControl', label: 'Pause Control', score: diagnostics.scores?.pauseControl || 0, level: getDiagnosticLevel(diagnostics.scores?.pauseControl || 0) },
    { key: 'stress', label: 'Stress', score: diagnostics.scores?.stress || 0, level: getDiagnosticLevel(diagnostics.scores?.stress || 0) },
    { key: 'intonation', label: 'Intonation', score: diagnostics.scores?.intonation || 0, level: getDiagnosticLevel(diagnostics.scores?.intonation || 0) },
    { key: 'rhythm', label: 'Rhythm', score: diagnostics.scores?.rhythm || 0, level: getDiagnosticLevel(diagnostics.scores?.rhythm || 0) },
    { key: 'completeness', label: 'Delivery', score: diagnostics.scores?.completeness || 0, level: getDiagnosticLevel(diagnostics.scores?.completeness || 0) },
  ] : []

  if (!currentQuestion) {
    return <div className="pte-practice-modal__placeholder"><p>No {taskLabel} questions available yet.</p></div>
  }

  return (
    <div className="pte-di-practice">
      <div className="pte-di-practice__head">
        <div>
          <h3 className="pte-di-practice__title">{currentQuestion.promptTitle || currentQuestion.title}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div className="pte-di-practice__position" style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 600 }}>{currentIdx + 1} / {questions.length}</div>
        </div>
      </div>

      <div className="pte-di-practice__toolbar">
        <button className="pte-card__practice-btn pte-card__practice-btn--template" onClick={() => setShowHint((prev) => !prev)}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>lightbulb</span>
          {showHint ? 'Hide Template Hint' : 'Show Template Hint'}
        </button>
        <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={() => setShowAnswer((prev) => !prev)}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>description</span>
          {showAnswer ? 'Hide Model Answer' : 'Show Model Answer'}
        </button>
        <button
          className="pte-card__practice-btn pte-card__practice-btn--similar pte-di-practice__skip-btn"
          onClick={handleSkipQuestion}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>skip_next</span>
          Skip Question
        </button>
      </div>

      {showHint && (
        <div className="pte-di-hint">
          <div className="pte-di-hint__header">
            <div className="pte-di-hint__title-wrap">
              <strong>{recommendedTemplate.title}</strong>
              {recommendedTemplate.badge && <span className="pte-di-hint__badge">{recommendedTemplate.badge}</span>}
            </div>
            <span className="pte-di-hint__formula">{recommendedTemplate.quickFormula}</span>
          </div>
          <div className="pte-di-hint__model">{recommendedTemplate.skeleton}</div>
          {!!recommendedTemplate.slots?.length && (
            <div className="pte-di-hint__slots">
              {recommendedTemplate.slots.map((slot) => (
                <span key={slot} className="pte-di-hint__slot">{slot}</span>
              ))}
            </div>
          )}
          <ul className="pte-di-hint__tips">
            {recommendedTemplate.reminders.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {showAnswer && currentQuestion.answer && (
        <div className="pte-di-answer">
          <div className="pte-di-answer__header">
            <strong>Model Answer & Template Guide</strong>
            <div className="pte-ra-tips__lang-toggle">
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
          </div>
          <div className="pte-di-answer__grid">
            <div className="pte-di-answer__panel">
              <h5>Template Skeleton</h5>
              <p className="pte-di-answer__skeleton">{recommendedTemplate.skeleton}</p>
            </div>
            <div className="pte-di-answer__panel">
              <h5>Fill Targets</h5>
              <div className="pte-di-answer__slot-list">
                {suggestedSlots.map((slot) => (
                  <div key={slot.label} className="pte-di-answer__slot-item">
                    <span className="pte-di-answer__slot-label">{slot.label}</span>
                    <span className="pte-di-answer__slot-value">{t(slot.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pte-di-answer__panel pte-di-answer__panel--model">
            <h5>Exam-style Version</h5>
            <p>{t(answerVariants.examStyle || currentQuestion.answer)}</p>
          </div>
          <div className="pte-di-answer__panel pte-di-answer__panel--model">
            <h5>Fuller Version</h5>
            <p>{t(answerVariants.fullerVersion || currentQuestion.answer)}</p>
          </div>
        </div>
      )}

      <div className="pte-rts-prompt">
        <div className="pte-rts-prompt__label">Situation</div>
        <div>
          <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#1e293b' }}>
            {renderInteractiveText(currentQuestion.text)}
          </p>
          {feedbackLang !== 'en' && (
            <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#64748b', marginTop: '8px' }}>
              {t(currentQuestion.text)}
            </p>
          )}
        </div>
      </div>

      <div className="pte-di-practice__meta" style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', marginTop: '-12px', marginBottom: 0, color: '#9ca3af' }}>
        <span className="pte-di-practice__source">Source: {currentQuestion.sourceLabel || getSourceFriendlyName(currentQuestion.source)}</span>
        {currentQuestion.source?.startsWith('http') && (
          <a href={currentQuestion.source} target="_blank" rel="noopener noreferrer" className="pte-di-practice__source-link" style={{ marginLeft: '6px' }}>Open source</a>
        )}
        {getQuestionDifficultyLabel(currentQuestion) && (
          <span className="pte-di-practice__badge" style={{ marginLeft: '6px' }}>{getQuestionDifficultyLabel(currentQuestion)}</span>
        )}
      </div>

      <div className="pte-di-timer-card">
        <div className="pte-di-timer-card__status">
          <span
            className={`pte-di-timer-card__pill pte-di-timer-card__pill--${status}`}
            style={status === 'completed' && error ? { backgroundColor: '#fee2e2', color: '#ef4444' } : undefined}
          >
            {status === 'preparing' ? 'PREPARING' : status === 'recording' ? 'RECORDING' : status === 'processing' ? 'ANALYZING' : (error ? 'NO RECORDING' : 'COMPLETED')}
          </span>
          <strong>
            {status === 'preparing' && `Beginning in ${timeLeft}s`}
            {status === 'recording' && `Recording ${timeLeft}s left`}
            {status === 'processing' && 'Analyzing your response'}
            {status === 'completed' && (error ? 'Recording failed' : 'Recording finished')}
          </strong>
        </div>
        <div className="pte-di-timer-card__bar">
          <div
            className={`pte-di-timer-card__fill pte-di-timer-card__fill--${status}`}
            style={{
              width: status === 'preparing'
                ? `${100 - ((timeLeft / (Number(currentQuestion.preparationTime) || 20)) * 100)}%`
                : status === 'recording'
                  ? `${100 - ((timeLeft / (Number(currentQuestion.answerTime) || 40)) * 100)}%`
                  : status === 'processing'
                    ? '72%'
                    : '100%',
            }}
          />
        </div>

        <div className="pte-di-timer-card__controls">
          {status === 'preparing' && (
            <button className="pte-di-record-btn" onClick={handleStartRecording}>
              <span className="material-symbols-outlined">mic</span>
              Start Recording Now
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
              <span>{loading ? 'Scoring Content, Oral Fluency, Pronunciation, Grammar, and Structure…' : 'Preparing results…'}</span>
            </div>
          )}
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
              <h4>Response Evaluation</h4>
              <p>{t('Practice-oriented feedback for Content, Oral Fluency, Pronunciation, Grammar, Structure, and Vocabulary.')}</p>
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

          <div className="pte-di-results__transcripts">
            <div className="pte-di-grammar__panel">
              <h5>Your Response</h5>
              <p>{t(serverTranscript || browserTranscript || 'No transcript available.')}</p>
            </div>
            <div className="pte-di-grammar__panel">
              <h5>Corrected Response</h5>
              <p>{t(analysis.correctedText || serverTranscript || browserTranscript || 'No corrected response available.')}</p>
            </div>
          </div>

          <div className="pte-di-results__rings">
            {scoreCards.map((card) => (
              <ScoreRing key={card.key} label={card.label} score={card.score} color={card.color} />
            ))}
          </div>

          <div className="pte-di-results__grid">
            {scoreCards.map((card) => (
              <div key={card.key} className="pte-di-metric-card">
                <div className="pte-di-metric-card__top">
                  <strong>{card.label}</strong>
                  <span>{card.score}/90</span>
                </div>
                <div className="pte-di-metric-card__bar">
                  <div className="pte-di-metric-card__fill" style={{ width: `${(card.score / 90) * 100}%` }} />
                </div>
                <p>{t(card.detail || '')}</p>
              </div>
            ))}
          </div>

          <div className="pte-di-keywords">
            <div className="pte-di-grammar__panel">
              <h5>Matched Situation Keywords</h5>
              <div className="pte-di-keywords__chips">
                {analysis.matchedKeywords.length ? analysis.matchedKeywords.map((keyword) => (
                  <span key={keyword} className="pte-di-keywords__chip pte-di-keywords__chip--hit">{keyword}</span>
                )) : <span className="pte-di-keywords__empty">No strong keyword matches yet.</span>}
              </div>
            </div>
            <div className="pte-di-grammar__panel">
              <h5>Missing Useful Keywords</h5>
              <div className="pte-di-keywords__chips">
                {analysis.missingKeywords.length ? analysis.missingKeywords.map((keyword) => (
                  <span key={keyword} className="pte-di-keywords__chip pte-di-keywords__chip--miss">{keyword}</span>
                )) : <span className="pte-di-keywords__empty">Good coverage of the situation details.</span>}
              </div>
            </div>
          </div>

          <div className="pte-di-grammar">
            <div className="pte-di-grammar__panel">
              <h5>Grammar Notes</h5>
              {analysis.grammarNotes.length ? (
                <div className="pte-di-grammar__chips">
                  {analysis.grammarNotes.map((note, index) => (
                    <PteGrammarNoteChip
                      key={`${note.before}-${note.after}-${index}`}
                      note={note}
                      translate={t}
                    />
                  ))}
                </div>
              ) : (
                <p>No major grammar corrections were needed.</p>
              )}
            </div>
            <div className="pte-di-grammar__panel">
              <h5>Improvement Tips</h5>
              <ul className="pte-di-hint__tips">
                {analysis.tips.map((tip) => (
                  <li key={tip}>{t(tip)}</li>
                ))}
              </ul>
            </div>
          </div>

          {diagnostics && (
            <div className="pte-ra-diagnostics">
              <div className="pte-ra-diagnostics__header">
                <div>
                  <h5>Speech Skill Analysis</h5>
                  <p>{t('Practice-oriented feedback for Speed, Pause Control, Rhythm, Stress, and Intonation.')}</p>
                </div>
                <div className="pte-ra-diagnostics__meta">
                  <span>{(diagnostics.audioDurationSec || 0).toFixed(2)}s audio</span>
                  <span>{diagnostics.speechRatio || 0}% voiced</span>
                </div>
              </div>

              <div className="pte-ra-diagnostics__grid">
                {diagnosticCards.map((item) => (
                  <div key={item.key} className={`pte-ra-diagnostic-card pte-ra-diagnostic-card--${item.level}`}>
                    <div className="pte-ra-diagnostic-card__top">
                      <strong>{item.label}</strong>
                      <span>{item.score}/90</span>
                    </div>
                    <div className="pte-ra-diagnostic-card__bar">
                      <div className="pte-ra-diagnostic-card__fill" style={{ width: `${(item.score / 90) * 100}%` }} />
                    </div>
                    <div className="pte-ra-diagnostic-card__hint">{t(getDiagnosticHint(item.key, diagnostics))}</div>
                    <div className="pte-ra-diagnostic-card__explanation">{t(getDiagnosticExplanation(item.key, item.score, diagnostics))}</div>
                  </div>
                ))}
              </div>

              <div className="pte-ra-diagnostics__footer">
                <span>Speech pace: <strong>{diagnostics.speechWpm || 0} WPM</strong></span>
                <span>Pauses: <strong>{diagnostics.pauseCount || 0}</strong></span>
                <span>Average pause: <strong>{diagnostics.averagePauseMs || 0} ms</strong></span>
                <span>Longest pause: <strong>{diagnostics.longestPauseMs || 0} ms</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
