import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAI } from '../../../common/hooks/useAI'
import { translateWord } from '../_06_services/pteWordService'
import { analyzeSummarizeWrittenText } from '../_07_utils/summarizeWrittenTextAnalyzer'
import { analyzeWriteEmail } from '../_07_utils/writeEmailAnalyzer'
import { buildModelAnswerVariants } from '../_07_utils/modelAnswerVariants'
import PteGrammarNoteChip from './PteGrammarNoteChip'

const LANG_OPTIONS = [
  { code: 'en', label: 'US EN' },
  { code: 'ko', label: 'KR KO' },
  { code: 'zh', label: 'CN ZH' },
]

const HINT_LIBRARY = {
  swt: {
    'swt-one-sentence': {
      title: 'One-sentence Summary',
      badge: 'Core',
      quickFormula: 'Main topic → key idea 1 → key idea 2 / result',
      skeleton: 'The passage discusses ____ , highlighting ____ while ____.',
      slots: ['main topic', 'key point 1', 'key point 2 / contrast / result'],
      tips: [
        'Keep it compact and academic.',
        'Use one main sentence when possible.',
        'Stay inside the word limit without listing too many details.',
      ],
    },
    'swt-cause-effect': {
      title: 'Cause / Effect Summary',
      badge: 'Flexible',
      quickFormula: 'Topic → reason / process → result',
      skeleton: 'The passage explains how ____ leads to ____ , showing that ____.',
      slots: ['main cause / process', 'main effect', 'overall takeaway'],
      tips: [
        'Best for science, policy, environment, and process passages.',
        'Focus on the most important relationship, not every fact.',
      ],
    },
  },
  we: {
    'we-formal-core': {
      title: 'Formal Email Template',
      badge: 'Core',
      quickFormula: 'Greeting → purpose → bullet coverage → closing',
      skeleton: 'Dear ____ , I am writing regarding ____ . Firstly, ____ . In addition, ____ . Finally, ____ . Please let me know ____ . Kind regards, ____',
      slots: ['name / title', 'purpose', 'bullet point 1', 'bullet point 2', 'bullet point 3', 'next step', 'your name'],
      tips: [
        'Cover every required bullet directly.',
        'Keep a polite professional tone.',
        'Use a clear closing request or confirmation line.',
      ],
    },
    'we-request-action': {
      title: 'Request / Action Email',
      badge: 'Common',
      quickFormula: 'Reason → request → arrangement → close',
      skeleton: 'Dear ____ , I am writing to ____ . Could you please ____ ? In addition, I would like to mention ____ . Please confirm ____ . Kind regards, ____',
      slots: ['reader', 'main purpose', 'action request', 'supporting point', 'confirmation', 'your name'],
      tips: [
        'Useful when the prompt asks you to arrange, request, or confirm something.',
        'Make the requested action explicit.',
      ],
    },
    'we-apology-follow-up': {
      title: 'Apology / Follow-up Email',
      badge: 'Situational',
      quickFormula: 'Acknowledge issue → explain → solution → close',
      skeleton: 'Dear ____ , I am sorry for ____ . The reason is ____ . To resolve this, I will ____ . Please let me know if ____ . Kind regards, ____',
      slots: ['reader', 'issue', 'reason', 'solution', 'confirmation', 'your name'],
      tips: [
        'Use this when the prompt involves a delay, complaint, or correction.',
        'Apologize briefly, then move to the solution quickly.',
      ],
    },
  },
}

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function tokenize(text = '') {
  return text.trim().split(/\s+/).filter(Boolean)
}

function sentenceCount(text = '') {
  return (text.match(/[^.!?]+[.!?]?/g) || []).map((item) => item.trim()).filter(Boolean).length
}

function extractBulletPointsFromText(text = '') {
  const source = String(text || '')
  const lineMatches = [...source.matchAll(/(?:^|\n)\s*[-•]\s*(.+?)(?=\n|$)/g)]
    .map((match) => (match[1] || '').trim())
    .filter(Boolean)

  if (lineMatches.length) return [...new Set(lineMatches)]

  const themeAnchor = source.match(/(?:the following(?:\s+\w+)?\s+(?:themes?|points?|ideas?|aspects?)|focus on the following|based on the following)([\s\S]*)/i)
  const candidate = themeAnchor ? themeAnchor[1] : source
  const stopAt = candidate.split(/(?:You should include|Provide supporting|Include all|Include both)/i)[0]

  return [...new Set(
    [...stopAt.matchAll(/(?:^|\s)-\s*(.+?)(?=\s+-\s+[A-Z0-9]|\s*$)/g)]
      .map((match) => (match[1] || '').trim())
      .filter(Boolean)
      .filter((part) => part.length <= 180),
  )].slice(0, 6)
}

function limitWords(text = '', maxWords = 50) {
  const words = tokenize(text)
  if (words.length <= maxWords) return text.trim()
  return `${words.slice(0, maxWords).join(' ').replace(/[,\s]+$/, '')}…`
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

function getMetricBadgeClass(score = 0) {
  if (score >= 75) return 'pte-ra-skill-card--strong'
  if (score >= 55) return 'pte-ra-skill-card--good'
  if (score >= 35) return 'pte-ra-skill-card--watch'
  return 'pte-ra-skill-card--weak'
}

function detectEmailTemplateId(question) {
  if (question?.templateHintId && HINT_LIBRARY.we[question.templateHintId]) return question.templateHintId
  const text = `${question?.promptTitle || ''} ${question?.text || ''}`.toLowerCase()
  if (/(delay|late|mistake|apolog|sorry|issue|problem|complaint|refund)/.test(text)) return 'we-apology-follow-up'
  if (/(request|arrange|confirm|availability|schedule|demonstrate|meeting|appointment)/.test(text)) return 'we-request-action'
  return 'we-formal-core'
}

function getDefaultTemplateId(taskType, question) {
  if (taskType === 'swt') return question?.templateHintId || 'swt-one-sentence'
  return detectEmailTemplateId(question)
}

function getModelAnswers(question, taskType) {
  if (taskType === 'swt') {
    return {
      examStyle: limitWords(question?.answer || '', 50),
      fullerVersion: question?.answer || '',
    }
  }
  const variants = buildModelAnswerVariants(question?.answer || '', 'generic')
  return {
    examStyle: limitWords(variants.examStyle || question?.answer || '', Number(question?.maxWords) || 120),
    fullerVersion: question?.answer || '',
  }
}

export default function WritingTaskPractice({
  initialMode = 'real',
  realQuestions = [],
  similarPracticeQuestions = [],
  taskLabel,
  taskType = 'swt',
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
  const [timeLeft, setTimeLeft] = useState(0)
  const [responseText, setResponseText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [feedbackLang, setFeedbackLang] = useState('en')
  const [translatedTextMap, setTranslatedTextMap] = useState({})

  const timerRef = useRef(null)
  const { checkGrammar } = useAI()

  const shuffledReal = useMemo(() => shuffleArray(realQuestions), [realQuestions])
  const shuffledSimilar = useMemo(() => shuffleArray(similarPracticeQuestions), [similarPracticeQuestions])
  const questions = questionMode === 'real' ? shuffledReal : shuffledSimilar
  const currentQuestion = questions[currentIdx]

  const defaultTemplateId = useMemo(() => getDefaultTemplateId(taskType, currentQuestion), [currentQuestion, taskType])
  const templateLibrary = HINT_LIBRARY[taskType] || {}
  const templateHint = templateLibrary[defaultTemplateId] || Object.values(templateLibrary)[0]
  const modelAnswers = useMemo(() => getModelAnswers(currentQuestion, taskType), [currentQuestion, taskType])

  const resetViewForQuestion = useCallback((nextStatus = 'ready', nextQuestion = currentQuestion) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus(nextStatus)
    setTimeLeft(Number(nextQuestion?.answerTime) || (taskType === 'swt' ? 600 : 540))
    setResponseText('')
    setAnalysis(null)
    setError(null)
    setLoading(false)
    setShowHint(false)
    setShowAnswer(false)
  }, [currentQuestion, taskType])

  useEffect(() => {
    if (!currentQuestion) return
    resetViewForQuestion('ready', currentQuestion)
  }, [currentIdx, questionMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'writing') return undefined
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setTimeout(() => {
            handleSubmit(true)
          }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
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

  const t = useCallback((text) => {
    if (feedbackLang === 'en') return text
    return translatedTextMap[`${feedbackLang}:${text}`] || text
  }, [feedbackLang, translatedTextMap])

  useEffect(() => {
    if (!analysis || feedbackLang === 'en' || !currentQuestion) return
    translateTexts([
      currentQuestion.text,
      currentQuestion.answer,
      modelAnswers.examStyle,
      modelAnswers.fullerVersion,
      analysis.correctedText,
      ...analysis.tips,
      ...analysis.scorePolicy.flatMap((item) => [item.label, item.detail]),
      ...analysis.grammarNotes.flatMap((item) => [item.category, item.reason, item.tip]),
      ...(analysis.coveredBullets || []),
      ...(analysis.missingBullets || []),
      ...(analysis.matchedKeywords || []),
      ...(analysis.missingKeywords || []),
      ...(currentQuestion.bulletPoints || []),
      templateHint?.title,
      templateHint?.quickFormula,
      templateHint?.skeleton,
      ...(templateHint?.tips || []),
      ...(templateHint?.slots || []),
    ].filter(Boolean), feedbackLang).catch(() => {})
  }, [analysis, currentQuestion, feedbackLang, modelAnswers.examStyle, modelAnswers.fullerVersion, templateHint, translateTexts])

  const handleStartWriting = () => {
    setError(null)
    setStatus('writing')
  }

  const handleSubmit = useCallback(async (auto = false) => {
    if (!currentQuestion) return
    const draft = responseText.trim()
    if (!draft) {
      setError(auto ? 'Time ended before any response was entered.' : 'Please write your response before submitting.')
      return
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('processing')
    setLoading(true)
    setError(null)

    try {
      const corrected = await checkGrammar(draft).catch(() => draft)
      const result = taskType === 'swt'
        ? analyzeSummarizeWrittenText({
          question: currentQuestion,
          responseText: draft,
          correctedText: corrected,
        })
        : analyzeWriteEmail({
          question: currentQuestion,
          responseText: draft,
          correctedText: corrected,
        })

      setAnalysis(result)
      setShowAnswer(true)
      setStatus('completed')
    } catch (submitError) {
      console.error(submitError)
      setError(submitError?.message || 'Failed to analyze the response.')
      setStatus('completed')
    } finally {
      setLoading(false)
    }
  }, [checkGrammar, currentQuestion, responseText, taskType])

  const handleRetry = () => {
    resetViewForQuestion('ready', currentQuestion)
  }

  const handleNext = () => {
    if (!questions.length) return
    setCurrentIdx((prev) => (prev + 1) % questions.length)
  }

  const handleSkipQuestion = () => {
    if (!questions.length) return
    if (timerRef.current) clearInterval(timerRef.current)
    setCurrentIdx((prev) => (prev + 1) % questions.length)
  }

  if (!currentQuestion) {
    return (
      <div className="pte-practice-modal__placeholder">
        <span className="material-symbols-outlined pte-practice-modal__placeholder-icon" style={{ color: '#5568fe' }}>quiz</span>
        <h3>No {taskLabel} questions found yet</h3>
        <p>We are still preparing practice items for this section.</p>
      </div>
    )
  }

  const wordCount = tokenize(responseText).length
  const responseSentences = sentenceCount(responseText)
  const minWords = Number(currentQuestion.minWords) || (taskType === 'swt' ? 25 : 80)
  const maxWords = Number(currentQuestion.maxWords) || (taskType === 'swt' ? 50 : 120)
  const maxSentences = Number(currentQuestion.maxSentences) || (taskType === 'swt' ? 2 : 20)
  const bulletPoints = Array.isArray(currentQuestion.bulletPoints) && currentQuestion.bulletPoints.length
    ? currentQuestion.bulletPoints
    : extractBulletPointsFromText(currentQuestion.text || '')

  const stageHeadline = status === 'ready'
    ? taskType === 'swt'
      ? 'Read the passage, then start writing your summary'
      : 'Read the email prompt, then start writing your response'
    : status === 'writing'
      ? `Writing in progress — ${Math.ceil(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} left`
      : status === 'processing'
        ? 'Analyzing your writing'
        : error
          ? 'Analysis finished with an issue'
          : 'Response analyzed — review feedback or continue'

  const scoreRings = analysis
    ? taskType === 'swt'
      ? [
        ['Content', analysis.content, '#22c55e'],
        ['Form', analysis.form, '#3b82f6'],
        ['Grammar', analysis.grammar, '#f59e0b'],
        ['Coherence', analysis.coherence, '#8b5cf6'],
        ['Vocabulary', analysis.vocabulary, '#06b6d4'],
      ]
      : [
        ['Content', analysis.content, '#22c55e'],
        ['Form', analysis.form, '#3b82f6'],
        ['Grammar', analysis.grammar, '#f59e0b'],
        ['Structure', analysis.structure, '#8b5cf6'],
        ['Tone', analysis.tone, '#ef4444'],
        ['Vocabulary', analysis.vocabulary, '#06b6d4'],
      ]
    : []

  return (
    <div className="pte-di-practice">
      <div className="pte-di-practice__headline">
        <div>
          <h3>{currentQuestion.promptTitle || currentQuestion.title || taskLabel}</h3>
          <div className="pte-di-practice__meta">
            <span className="pte-di-practice__source">Source: {currentQuestion.sourceLabel || getSourceFriendlyName(currentQuestion.source)}</span>
            {currentQuestion.source?.startsWith('http') && (
              <a href={currentQuestion.source} target="_blank" rel="noopener noreferrer" className="pte-di-practice__source-link">Open source</a>
            )}
            {getQuestionDifficultyLabel(currentQuestion) && <span className="pte-di-practice__badge">{getQuestionDifficultyLabel(currentQuestion)}</span>}
          </div>
        </div>
        <div className="pte-di-practice__index">Question {currentIdx + 1} of {questions.length}</div>
      </div>

      <div className="pte-di-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="pte-card__practice-btn pte-card__practice-btn--template"
            onClick={() => setShowHint((prev) => !prev)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>lightbulb</span>
            {showHint ? 'Hide Template Hint' : 'Show Template Hint'}
          </button>
          <button
            className="pte-card__practice-btn pte-card__practice-btn--similar"
            onClick={() => setShowAnswer((prev) => !prev)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>description</span>
            {showAnswer ? 'Hide Model Answer' : 'Show Model Answer'}
          </button>
        </div>
        <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={handleSkipQuestion}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>skip_next</span>
          Skip Question
        </button>
      </div>

      {showHint && templateHint && (
        <div className="pte-di-hint">
          <div className="pte-di-hint__header">
            <div className="pte-di-hint__title-wrap">
              <strong>{templateHint.title}</strong>
              {templateHint.badge && <span className="pte-di-hint__badge">{templateHint.badge}</span>}
            </div>
            <span className="pte-di-hint__formula">{templateHint.quickFormula}</span>
          </div>
          <div className="pte-di-hint__model">{templateHint.skeleton}</div>
          {!!templateHint.slots?.length && (
            <div className="pte-di-hint__slots">
              {templateHint.slots.map((slot) => (
                <span key={slot} className="pte-di-hint__slot">{slot}</span>
              ))}
            </div>
          )}
          <ul className="pte-di-hint__tips">
            {templateHint.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {showAnswer && currentQuestion.answer && (
        <div className="pte-di-answer">
          <div className="pte-di-answer__header">
            <strong>Model Answer</strong>
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
          <div className="pte-di-answer__panel pte-di-answer__panel--model">
            <h5>Exam-style Version</h5>
            <p>{t(modelAnswers.examStyle)}</p>
          </div>
          <div className="pte-di-answer__panel pte-di-answer__panel--model">
            <h5>Fuller Version</h5>
            <p>{t(modelAnswers.fullerVersion)}</p>
          </div>
        </div>
      )}

      <div className="pte-writing-prompt">
        <div className="pte-writing-prompt__label">{taskType === 'swt' ? 'Passage' : 'Email Prompt'}</div>
        <div className="pte-writing-prompt__body">
          <p>{t(currentQuestion.text)}</p>
          {bulletPoints.length > 0 && (
            <div className="pte-writing-prompt__bullets">
              <strong>Required themes</strong>
              <ul>
                {bulletPoints.map((point) => (
                  <li key={point}>{t(point)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="pte-di-timer-card">
        <div className="pte-di-timer-card__status">
          <span className={`pte-di-timer-card__pill pte-di-timer-card__pill--${status === 'ready' ? 'preparing' : status}`}>
            {status === 'ready' ? 'READY' : status === 'writing' ? 'WRITING' : status === 'processing' ? 'ANALYZING' : 'COMPLETED'}
          </span>
          <strong>{stageHeadline}</strong>
        </div>

        <div className="pte-di-timer-card__bar">
          <div
            className={`pte-di-timer-card__fill pte-di-timer-card__fill--${status === 'ready' ? 'preparing' : status}`}
            style={{
              width: status === 'writing'
                ? `${100 - ((timeLeft / (Number(currentQuestion.answerTime) || (taskType === 'swt' ? 600 : 540))) * 100)}%`
                : status === 'processing'
                  ? '72%'
                  : status === 'completed'
                    ? '100%'
                    : '0%',
            }}
          />
        </div>

        <div className="pte-writing-meta">
          <span>Words: <strong>{wordCount}</strong></span>
          {taskType === 'swt' && <span>Sentences: <strong>{responseSentences}</strong></span>}
          <span>Target: <strong>{minWords}–{maxWords} words</strong></span>
          {taskType === 'swt' && <span>Target sentences: <strong>1–{maxSentences}</strong></span>}
        </div>

        <div className="pte-writing-editor">
          <textarea
            className="pte-writing-editor__textarea"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            disabled={status !== 'writing'}
            placeholder={taskType === 'swt'
              ? 'Write your 25–50 word summary here…'
              : 'Write your email response here…'}
          />
        </div>

        <div className="pte-di-timer-card__controls">
          {status === 'ready' && (
            <button className="pte-di-record-btn" onClick={handleStartWriting}>
              <span className="material-symbols-outlined">edit</span>
              Start Writing Now
            </button>
          )}
          {status === 'writing' && (
            <button className="pte-di-record-btn" onClick={() => handleSubmit(false)}>
              <span className="material-symbols-outlined">task_alt</span>
              Submit for Analysis
            </button>
          )}
          {status === 'processing' && (
            <div className="pte-di-loading">
              <div className="pte-ra-spinner" />
              <span>{loading ? 'Checking content, grammar, structure, and writing form…' : 'Preparing results…'}</span>
            </div>
          )}
        </div>

        {error && <div className="pte-di-error">{error}</div>}

        {status === 'completed' && (
          <div className="pte-di-practice__footer-actions">
            <button className="pte-card__practice-btn pte-card__practice-btn--similar" onClick={handleRetry}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>refresh</span>
              Retry
            </button>
            <button className="pte-card__practice-btn pte-card__practice-btn--real" onClick={handleNext}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>arrow_forward</span>
              Next
            </button>
          </div>
        )}
      </div>

      {analysis && (
        <div className="pte-di-results">
          <div className="pte-di-results__headline">
            <div>
              <h4>{taskType === 'swt' ? 'Summary Evaluation' : 'Email Evaluation'}</h4>
              <p>{t(taskType === 'swt'
                ? 'Practice-oriented feedback for Content, Form, Grammar, Coherence, and Vocabulary.'
                : 'Practice-oriented feedback for Content, Form, Grammar, Structure, Tone, and Vocabulary.')}</p>
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
            {scoreRings.map(([label, score, color]) => (
              <ScoreRing key={label} label={label} score={score} color={color} />
            ))}
          </div>

          <div className="pte-di-results__transcripts">
            <div className="pte-di-grammar__panel">
              <h5>Your Response</h5>
              <p>{t(responseText || 'No response text available.')}</p>
            </div>
            <div className="pte-di-grammar__panel">
              <h5>Corrected Response</h5>
              <p>{t(analysis.correctedText || responseText || 'No corrected response available.')}</p>
            </div>
          </div>

          <div className="pte-ra-skill-panel">
            <div className="pte-ra-skill-panel__header">
              <div>
                <h4>{taskType === 'swt' ? 'Answer Check Analysis' : 'Email Check Analysis'}</h4>
                <p>{t(taskType === 'swt'
                  ? 'This section checks summary length, sentence compression, topic coverage, and language control.'
                  : 'This section checks bullet coverage, length control, email form, and reader-appropriate tone.')}</p>
              </div>
            </div>

            <div className="pte-ra-skill-panel__grid">
              <div className={`pte-ra-skill-card ${getMetricBadgeClass(analysis.content)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>Content</span>
                  <strong>{analysis.content}/90</strong>
                </div>
                <p>{t(analysis.scorePolicy.find((item) => item.label === 'Content')?.detail || '')}</p>
              </div>

              <div className={`pte-ra-skill-card ${getMetricBadgeClass(analysis.form)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>Form</span>
                  <strong>{analysis.form}/90</strong>
                </div>
                <p>{t(analysis.scorePolicy.find((item) => item.label === 'Form')?.detail || '')}</p>
              </div>

              <div className={`pte-ra-skill-card ${getMetricBadgeClass(analysis.grammar)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>Grammar</span>
                  <strong>{analysis.grammar}/90</strong>
                </div>
                <p>{t(analysis.scorePolicy.find((item) => item.label === 'Grammar')?.detail || '')}</p>
              </div>

              <div className={`pte-ra-skill-card ${getMetricBadgeClass(taskType === 'swt' ? analysis.coherence : analysis.structure)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>{taskType === 'swt' ? 'Coherence' : 'Structure'}</span>
                  <strong>{taskType === 'swt' ? analysis.coherence : analysis.structure}/90</strong>
                </div>
                <p>{t(analysis.scorePolicy.find((item) => item.label === (taskType === 'swt' ? 'Coherence' : 'Structure'))?.detail || '')}</p>
              </div>

              <div className={`pte-ra-skill-card ${getMetricBadgeClass(taskType === 'swt' ? analysis.vocabulary : analysis.tone)}`}>
                <div className="pte-ra-skill-card__title">
                  <span>{taskType === 'swt' ? 'Vocabulary' : 'Tone'}</span>
                  <strong>{taskType === 'swt' ? analysis.vocabulary : analysis.tone}/90</strong>
                </div>
                <p>{t(analysis.scorePolicy.find((item) => item.label === (taskType === 'swt' ? 'Vocabulary' : 'Tone'))?.detail || '')}</p>
              </div>
            </div>
          </div>

          <div className="pte-writing-checks">
            <div className="pte-di-grammar__panel">
              <h5>{taskType === 'swt' ? 'Length & Sentence Control' : 'Length & Bullet Coverage'}</h5>
              <div className="pte-di-keywords__chips">
                <span className={`pte-di-keywords__chip ${analysis.wordStatus === 'ideal' ? 'pte-di-keywords__chip--hit' : 'pte-di-keywords__chip--miss'}`}>
                  {analysis.wordCount} words
                </span>
                {taskType === 'swt' && (
                  <span className={`pte-di-keywords__chip ${analysis.sentenceStatus === 'ideal' ? 'pte-di-keywords__chip--hit' : 'pte-di-keywords__chip--miss'}`}>
                    {analysis.sentenceCount} sentence{analysis.sentenceCount === 1 ? '' : 's'}
                  </span>
                )}
                {taskType === 'we' && (analysis.coveredBullets || []).map((item) => (
                  <span key={item} className="pte-di-keywords__chip pte-di-keywords__chip--hit">{t(item)}</span>
                ))}
                {taskType === 'we' && (analysis.missingBullets || []).map((item) => (
                  <span key={item} className="pte-di-keywords__chip pte-di-keywords__chip--miss">{t(item)}</span>
                ))}
              </div>
            </div>
            <div className="pte-di-grammar__panel">
              <h5>{taskType === 'swt' ? 'Keyword Coverage' : 'Relevant Keyword Coverage'}</h5>
              <div className="pte-di-keywords__chips">
                {(analysis.matchedKeywords || []).map((item) => (
                  <span key={`hit-${item}`} className="pte-di-keywords__chip pte-di-keywords__chip--hit">{t(item)}</span>
                ))}
                {(analysis.missingKeywords || []).map((item) => (
                  <span key={`miss-${item}`} className="pte-di-keywords__chip pte-di-keywords__chip--miss">{t(item)}</span>
                ))}
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
    </div>
  )
}
