import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecording } from '../../recording'
import { useWebSpeechInput } from '../../../common/hooks/useWebSpeechInput'
import { useAI } from '../../../common/hooks/useAI'
import { analyzeSpeechDiagnostics } from '../_07_utils/readAloudAnalyzer'
import { analyzeDescribeImage } from '../_07_utils/describeImageAnalyzer'
import { blobToWAV, decodeBlobToPCM } from '../_07_utils/audioDecoder'
import { translateWord } from '../_06_services/pteWordService'
import { buildModelAnswerVariants } from '../_07_utils/modelAnswerVariants'
import PteGrammarNoteChip from './PteGrammarNoteChip'

const WHISPER_SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://192.168.1.150:8200'
const STT_HEADERS = import.meta.env.VITE_RAG_API_KEY ? { 'X-API-Key': import.meta.env.VITE_RAG_API_KEY } : undefined

const LANG_OPTIONS = [
  { code: 'en', label: 'US EN' },
  { code: 'ko', label: 'KR KO' },
  { code: 'zh', label: 'CN ZH' },
]

const DI_HINT_LIBRARY = {
  'di-graph-core': {
    title: 'Graph / General Data',
    badge: 'All Charts',
    quickFormula: 'Type → Topic → Highest / Lowest → Trend / Comparison → Overall takeaway',
    reminders: [
      'Name the visual first.',
      'Pick the highest and the lowest instead of every number.',
      'Finish with one overall message.',
    ],
    skeleton: 'The ____ shows ____. At first glance, ____ is the highest, while ____ is the lowest. Overall, the visual suggests ____.',
    slots: ['visual type', 'main topic', 'highest item', 'lowest item', 'overall message'],
  },
  'di-bar-chart': {
    title: 'Bar Chart',
    badge: 'Data',
    quickFormula: 'Bar chart → Topic → Highest bar → Lowest bar → Comparison',
    reminders: [
      'Focus on category comparison instead of listing every bar.',
      'Use highest / lowest / compared with language.',
    ],
    skeleton: 'The bar chart shows ____. Among all categories, ____ is the highest, whereas ____ is the lowest. Overall, the chart highlights ____.',
    slots: ['comparison topic', 'highest category', 'lowest category', 'main comparison'],
  },
  'di-line-chart': {
    title: 'Line Chart',
    badge: 'Trend',
    quickFormula: 'Line graph → Topic → Starting point → Main trend → End point',
    reminders: [
      'Use trend verbs like rises, falls, remains stable, or fluctuates.',
      'Start-middle-end is enough for most DI answers.',
    ],
    skeleton: 'The line graph illustrates ____ over ____. It starts at ____ and then ____. By the end, it reaches ____, so the overall trend is ____.',
    slots: ['topic', 'time period', 'starting level', 'main trend', 'ending level', 'overall trend'],
  },
  'di-pie-chart': {
    title: 'Pie Chart',
    badge: 'Share',
    quickFormula: 'Pie chart → Topic → Largest slice → Smallest slice → Overall balance',
    reminders: [
      'Talk about proportion, percentage, share, and distribution.',
      'Highlight the dominant and smallest segments only.',
    ],
    skeleton: 'The pie chart presents ____. The largest proportion belongs to ____, while ____ accounts for the smallest share. Overall, the chart indicates ____.',
    slots: ['distribution topic', 'largest segment', 'smallest segment', 'overall balance'],
  },
  'di-process': {
    title: 'Process',
    badge: 'Flow',
    quickFormula: 'What it is → Starting stage → Main steps → Final stage',
    reminders: [
      'Use sequence words like first, then, next, and finally.',
      'Keep the process easy to follow.',
    ],
    skeleton: 'The image presents ____. It begins with ____, then moves through ____. Finally, it ends with ____, showing ____.',
    slots: ['process topic', 'starting stage', 'main steps', 'final stage', 'overall purpose'],
  },
  'di-map': {
    title: 'Map',
    badge: 'Layout',
    quickFormula: 'Map → Key locations → Direction / change → Overall layout',
    reminders: [
      'Mention only the major locations or changes.',
      'Use location words when they help clarity.',
    ],
    skeleton: 'The map shows ____. Key features include ____ around ____. Overall, the layout suggests ____.',
    slots: ['place / area', 'main features', 'central area / route', 'overall layout point'],
  },
  'di-photo': {
    title: 'Photo',
    badge: 'Scene',
    quickFormula: 'Scene → Main focus → Background details → Overall impression',
    reminders: [
      'Say what the picture shows in one simple sentence.',
      'Describe the main object or person first.',
      'Add one background detail and one overall impression.',
    ],
    skeleton: 'The picture shows ____ in ____. The main focus appears to be ____, while the background includes ____. Overall, the image gives the impression of ____.',
    slots: ['main subject', 'setting', 'main focus', 'background detail', 'overall impression'],
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

function detectDiTemplateId(question) {
  if (!question) return 'di-graph-core'
  if (question?.templateHintId && DI_HINT_LIBRARY[question.templateHintId]) return question.templateHintId

  const text = `${question?.promptTitle || ''} ${question?.answer || ''} ${question?.imageUrl || ''}`.toLowerCase()
  const chartType = (question?.chartType || question?.render?.chartType || '').toLowerCase()
  const visualCategory = (question?.visualCategory || question?.render?.kind || '').toLowerCase()

  if (visualCategory === 'process' || /(process|cycle|flow|stage|steps|diagram)/.test(text)) return 'di-process'
  if (visualCategory === 'map' || /(map|layout|route|floor plan|location|area)/.test(text)) return 'di-map'
  if (visualCategory === 'scene' || /(photo|picture|scene|people|person|object)/.test(text)) return 'di-photo'
  if (chartType === 'bar' || /(bar chart|column chart|bars\b)/.test(text)) return 'di-bar-chart'
  if (chartType === 'line' || /(line graph|line chart|trend over time)/.test(text)) return 'di-line-chart'
  if (chartType === 'pie' || /(pie chart|share|distribution|percentage breakdown)/.test(text)) return 'di-pie-chart'
  return 'di-graph-core'
}

function getRecommendedTemplate(question) {
  return DI_HINT_LIBRARY[detectDiTemplateId(question)] || DI_HINT_LIBRARY['di-graph-core']
}

function inferDiSlotSuggestions(question, templateId) {
  const title = (question?.promptTitle || question?.title || '').trim()
  const answer = (question?.answer || '').trim()
  const render = question?.render || {}
  const labels = Array.isArray(render?.labels) ? render.labels : []
  const steps = Array.isArray(render?.steps) ? render.steps : []
  const details = Array.isArray(render?.details) ? render.details : []

  const genericComparison = labels.length >= 2 ? `${labels[0]} compared with ${labels[1]}` : 'a clear difference among the categories'
  const genericFeatures = steps.length ? steps.slice(0, 3).join(', ') : 'the main landmarks'

  switch (templateId) {
    case 'di-bar-chart':
      return [
        { label: 'comparison topic', value: title || 'the given categories' },
        { label: 'highest category', value: labels[0] || 'the leading category' },
        { label: 'lowest category', value: labels[labels.length - 1] || 'the smallest category' },
        { label: 'main comparison', value: genericComparison },
      ]
    case 'di-line-chart':
      return [
        { label: 'topic', value: title || 'the measured trend' },
        { label: 'time period', value: 'the given period' },
        { label: 'starting level', value: 'the initial point shown' },
        { label: 'main trend', value: 'changes gradually over time' },
        { label: 'ending level', value: 'the final point shown' },
        { label: 'overall trend', value: 'an overall upward or downward pattern' },
      ]
    case 'di-pie-chart':
      return [
        { label: 'distribution topic', value: title || 'the overall distribution' },
        { label: 'largest segment', value: labels[0] || 'the largest portion' },
        { label: 'smallest segment', value: labels[labels.length - 1] || 'the smallest portion' },
        { label: 'overall balance', value: 'an uneven distribution across the segments' },
      ]
    case 'di-process':
      return [
        { label: 'process topic', value: title || 'the process shown' },
        { label: 'starting stage', value: steps[0] || 'the first stage' },
        { label: 'main steps', value: steps.slice(1, 3).join(', ') || 'the middle stages' },
        { label: 'final stage', value: steps[steps.length - 1] || 'the final stage' },
        { label: 'overall purpose', value: 'how the process develops from start to finish' },
      ]
    case 'di-map':
      return [
        { label: 'place / area', value: title || 'the mapped area' },
        { label: 'main features', value: genericFeatures },
        { label: 'central area / route', value: steps[1] || 'the main route or center' },
        { label: 'overall layout point', value: 'how the key areas are arranged and connected' },
      ]
    case 'di-photo':
      return [
        { label: 'main subject', value: title || 'the visible scene' },
        { label: 'setting', value: 'the given setting' },
        { label: 'main focus', value: render.focus || details[0] || 'the main subject' },
        { label: 'background detail', value: details[1] || details[0] || 'one supporting detail' },
        { label: 'overall impression', value: 'an active and realistic overall scene' },
      ]
    case 'di-graph-core':
    default:
      return [
        { label: 'visual type', value: question?.chartType ? `${question.chartType} chart` : 'graph or chart' },
        { label: 'main topic', value: title || 'the given data' },
        { label: 'highest item', value: labels[0] || 'the highest item' },
        { label: 'lowest item', value: labels[labels.length - 1] || 'the lowest item' },
        { label: 'overall message', value: answer ? 'the main idea reflected in the model answer' : 'a clear overall trend or comparison' },
      ]
  }
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + (r * Math.cos(angleRad)),
    y: cy + (r * Math.sin(angleRad)),
  }
}

function buildPieSlicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function DescribeImageCanvas({ question }) {
  if (!question) return null

  if (question.imageUrl) {
    return (
      <div className="pte-di-canvas pte-di-canvas--image">
        <img src={question.imageUrl} alt={question.promptTitle || question.title} className="pte-di-canvas__image" />
      </div>
    )
  }

  const render = question.render
  if (!render) {
    return (
      <div className="pte-di-canvas pte-di-canvas--empty">
        <span className="material-symbols-outlined">image</span>
        <span>Visual preview unavailable.</span>
      </div>
    )
  }

  if (render.kind === 'chart') {
    const maxValue = Math.max(...render.values, 1)
    if (render.chartType === 'pie') {
      const total = render.values.reduce((sum, value) => sum + value, 0) || 1
      let currentAngle = 0
      const colors = ['#5568fe', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6']
      return (
        <div className="pte-di-canvas pte-di-canvas--chart">
          <svg viewBox="0 0 520 280" className="pte-di-canvas__svg" role="img" aria-label={question.promptTitle}>
            <text x="24" y="28" className="pte-di-canvas__title">{question.promptTitle}</text>
            <g transform="translate(165 150)">
              {render.values.map((value, index) => {
                const angle = (value / total) * 360
                const path = buildPieSlicePath(0, 0, 72, currentAngle, currentAngle + angle)
                const labelAngle = currentAngle + (angle / 2)
                const labelPos = polarToCartesian(0, 0, 96, labelAngle)
                currentAngle += angle
                return (
                  <g key={`${render.labels[index]}-${value}`}>
                    <path d={path} fill={colors[index % colors.length]} opacity="0.88" />
                    <text x={labelPos.x} y={labelPos.y} textAnchor="middle" className="pte-di-canvas__small-label">
                      {render.labels[index]}
                    </text>
                  </g>
                )
              })}
            </g>
            <g transform="translate(320 72)">
              {render.labels.map((label, index) => (
                <g key={`legend-${label}`} transform={`translate(0 ${index * 34})`}>
                  <rect width="16" height="16" rx="4" fill={colors[index % colors.length]} />
                  <text x="24" y="12" className="pte-di-canvas__legend-label">{label}: {render.values[index]}{render.unit}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      )
    }

    return (
      <div className="pte-di-canvas pte-di-canvas--chart">
        <svg viewBox="0 0 520 280" className="pte-di-canvas__svg" role="img" aria-label={question.promptTitle}>
          <text x="24" y="28" className="pte-di-canvas__title">{question.promptTitle}</text>
          <line x1="60" y1="220" x2="470" y2="220" className="pte-di-canvas__axis" />
          <line x1="60" y1="48" x2="60" y2="220" className="pte-di-canvas__axis" />

          {render.chartType === 'table' ? (
            <g transform="translate(88 70)">
              {render.labels.map((label, index) => (
                <g key={`row-${label}`} transform={`translate(0 ${index * 38})`}>
                  <rect width="280" height="32" rx="10" fill={index % 2 === 0 ? '#eef2ff' : '#f8fafc'} stroke="#d7defa" />
                  <text x="18" y="21" className="pte-di-canvas__legend-label">{label}</text>
                  <text x="248" y="21" textAnchor="end" className="pte-di-canvas__legend-label">{render.values[index]} {render.unit}</text>
                </g>
              ))}
            </g>
          ) : render.chartType === 'line' ? (
            <g>
              <polyline
                fill="none"
                stroke="#5568fe"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={render.values.map((value, index) => `${110 + (index * 96)},${220 - ((value / maxValue) * 130)}`).join(' ')}
              />
              {render.values.map((value, index) => {
                const x = 110 + (index * 96)
                const y = 220 - ((value / maxValue) * 130)
                return (
                  <g key={`line-${render.labels[index]}`}>
                    <circle cx={x} cy={y} r="8" fill="#5568fe" />
                    <text x={x} y="242" textAnchor="middle" className="pte-di-canvas__small-label">{render.labels[index]}</text>
                    <text x={x} y={y - 14} textAnchor="middle" className="pte-di-canvas__small-label">{value}</text>
                  </g>
                )
              })}
            </g>
          ) : (
            render.values.map((value, index) => {
              const barWidth = 58
              const gap = 34
              const x = 94 + (index * (barWidth + gap))
              const barHeight = (value / maxValue) * 130
              const y = 220 - barHeight
              return (
                <g key={`bar-${render.labels[index]}`}>
                  <rect x={x} y={y} width={barWidth} height={barHeight} rx="14" fill="#5568fe" opacity="0.88" />
                  <text x={x + (barWidth / 2)} y="242" textAnchor="middle" className="pte-di-canvas__small-label">{render.labels[index]}</text>
                  <text x={x + (barWidth / 2)} y={y - 10} textAnchor="middle" className="pte-di-canvas__small-label">{value}</text>
                </g>
              )
            })
          )}
        </svg>
      </div>
    )
  }

  if (render.kind === 'process' || render.kind === 'map') {
    return (
      <div className="pte-di-canvas pte-di-canvas--process">
        <svg viewBox="0 0 520 280" className="pte-di-canvas__svg" role="img" aria-label={question.promptTitle}>
          <text x="24" y="28" className="pte-di-canvas__title">{question.promptTitle}</text>
          {render.steps.map((step, index) => {
            const x = 32 + (index % 2 === 0 ? 0 : 246)
            const y = 60 + (Math.floor(index / 2) * 86)
            return (
              <g key={`${step}-${index}`}>
                <rect x={x} y={y} width="206" height="56" rx="18" fill={render.kind === 'map' ? '#ecfeff' : '#eef2ff'} stroke={render.kind === 'map' ? '#22c55e' : '#5568fe'} />
                <circle cx={x + 24} cy={y + 28} r="14" fill={render.kind === 'map' ? '#22c55e' : '#5568fe'} />
                <text x={x + 24} y={y + 33} textAnchor="middle" className="pte-di-canvas__step-number">{index + 1}</text>
                <text x={x + 50} y={y + 34} className="pte-di-canvas__legend-label">{step}</text>
                {index < render.steps.length - 1 && (
                  <path
                    d={index % 2 === 0
                      ? `M ${x + 206} ${y + 28} L ${x + 234} ${y + 28}`
                      : `M ${x + 103} ${y + 56} L ${x + 103} ${y + 76}`}
                    className="pte-di-canvas__connector"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="pte-di-canvas pte-di-canvas--scene">
      <svg viewBox="0 0 520 280" className="pte-di-canvas__svg" role="img" aria-label={question.promptTitle}>
        <defs>
          <linearGradient id="sceneBg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#ecfeff" />
          </linearGradient>
        </defs>
        <rect x="24" y="24" width="472" height="232" rx="26" fill="url(#sceneBg)" />
        <text x="44" y="54" className="pte-di-canvas__title">{question.promptTitle}</text>
        <circle cx="126" cy="142" r="44" fill="#5568fe" opacity="0.18" />
        <rect x="194" y="94" width="108" height="74" rx="18" fill="#ffffff" stroke="#d7defa" />
        <rect x="322" y="126" width="110" height="84" rx="18" fill="#ffffff" stroke="#d7defa" />
        <text x="96" y="146" className="pte-di-canvas__focus-label">{render.focus}</text>
        {render.details.map((item, index) => (
          <text key={`${item}-${index}`} x="214" y={118 + (index * 26)} className="pte-di-canvas__legend-label">{item}</text>
        ))}
        <text x="346" y="174" className="pte-di-canvas__legend-label">visible scene details</text>
      </svg>
    </div>
  )
}

function ScoreRing({ label, score, color }) {
  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - (score / 90))
  return (
    <div className="pte-di-score-ring">
      <svg viewBox="0 0 100 100">
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
      if (score >= 75) return 'Your pace stayed close to an exam-like speaking rate.'
      if ((diagnostics.speechWpm || 0) < 115) return 'Your pace was slower than ideal for a compact DI response.'
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

export default function DescribeImagePractice({
  color,
  initialMode = 'real',
  realQuestions = [],
  similarPracticeQuestions = [],
  taskLabel = 'Describe Image',
}) {
  const [questionMode] = useState(() => (
    initialMode === 'similar' && similarPracticeQuestions.length
      ? 'similar'
      : realQuestions.length
        ? 'real'
        : 'similar'
  ))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState('preparing') // preparing | recording | processing | completed
  const [timeLeft, setTimeLeft] = useState(25)
  const [analysis, setAnalysis] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentRecording, setCurrentRecording] = useState(null)
  const [browserTranscript, setBrowserTranscript] = useState('')
  const [serverTranscript, setServerTranscript] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
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
  const recommendedTemplateId = detectDiTemplateId(currentQuestion)
  const recommendedTemplate = getRecommendedTemplate(currentQuestion)
  const answerVariants = useMemo(
    () => buildModelAnswerVariants(currentQuestion?.answer || '', 'di'),
    [currentQuestion?.answer],
  )
  const suggestedSlots = useMemo(
    () => inferDiSlotSuggestions(currentQuestion, recommendedTemplateId),
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
    setError(null)
    setLoading(false)
    browserTextRef.current = ''
    browserInterimRef.current = ''
    setStatus(nextStatus)
    setTimeLeft(Number(nextQuestion?.preparationTime) || 25)
  }, [currentQuestion])

  useEffect(() => {
    if (!currentQuestion) return
    resetViewForQuestion('preparing', currentQuestion)
  }, [currentIdx, questionMode]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [status, currentQuestion]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const diagnosticCards = diagnostics ? [
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
      ...analysis.tips,
      ...analysis.scorePolicy.map((item) => item.detail),
      ...analysis.grammarNotes.map((item) => item.reason),
      ...analysis.grammarNotes.map((item) => item.tip),
      ...analysis.grammarNotes.map((item) => item.category),
      currentQuestion.answer,
      answerVariants.examStyle,
      analysis.correctedText,
      ...diagnosticCards,
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

  const handleStartRecording = async () => {
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

  const transcribeOnServer = useCallback(async (recording) => {
    const wavBlob = await blobToWAV(recording.blob)
    const formData = new FormData()
    formData.append('audio', wavBlob, 'describe-image.wav')
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
        console.warn('[DI] Server STT failed:', serverError)
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

      const scoring = analyzeDescribeImage({
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
      console.error('[DI] Analysis failed:', err)
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
    return <div className="pte-practice-modal__placeholder"><p>No DI questions available yet.</p></div>
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

      <DescribeImageCanvas question={currentQuestion} />
      
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
                ? `${100 - ((timeLeft / (Number(currentQuestion.preparationTime) || 25)) * 100)}%`
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
          <div className="pte-ra-diagnostics__header" style={{ marginBottom: '1rem' }}>
            <div>
              <h5 className="pte-ra-diagnostics__title">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>analytics</span>
                Describe Image Analysis
              </h5>
              <p className="pte-ra-diagnostics__subtitle">
                {t('Practice-oriented feedback for Content, Oral Fluency, Pronunciation, Grammar, Structure, and Vocabulary.')}
              </p>
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

          <div className="pte-di-results__headline">
            <div className="pte-di-results__overall">
              <span>Overall</span>
              <strong>{analysis.overall}</strong>
              <em>/90</em>
            </div>
            <div className="pte-di-results__transcripts">
              <div><strong>Server transcript:</strong> {serverTranscript || '—'}</div>
              <div><strong>Browser transcript:</strong> {browserTranscript || '—'}</div>
            </div>
          </div>

          <div className="pte-di-results__rings">
            <ScoreRing label="Content" score={analysis.content} color="#22c55e" />
            <ScoreRing label="Oral Fluency" score={analysis.oralFluency} color="#3b82f6" />
            <ScoreRing label="Pronunciation" score={analysis.pronunciation} color="#f59e0b" />
          </div>

          <div className="pte-di-results__grid">
            {scoreCards.map((card) => (
              <div key={card.key} className="pte-di-metric-card" title={t(card.detail || '')}>
                <div className="pte-di-metric-card__top">
                  <span>{card.label}</span>
                  <strong>{card.score}/90</strong>
                </div>
                <div className="pte-di-metric-card__bar">
                  <div className="pte-di-metric-card__fill" style={{ width: `${Math.max(4, (card.score / 90) * 100)}%`, background: card.color }} />
                </div>
                <p>{t(card.detail || '')}</p>
              </div>
            ))}
          </div>

          <div className="pte-di-keywords">
            <div>
              <strong>Matched key points</strong>
              <div className="pte-di-keywords__chips">
                {analysis.matchedKeywords.length
                  ? analysis.matchedKeywords.map((item) => <span key={`hit-${item}`} className="pte-di-keywords__chip pte-di-keywords__chip--hit">{item}</span>)
                  : <span className="pte-di-keywords__empty">No major keyword match yet.</span>}
              </div>
            </div>
            <div>
              <strong>Still missing</strong>
              <div className="pte-di-keywords__chips">
                {analysis.missingKeywords.length
                  ? analysis.missingKeywords.map((item) => <span key={`miss-${item}`} className="pte-di-keywords__chip pte-di-keywords__chip--miss">{item}</span>)
                  : <span className="pte-di-keywords__empty">Good coverage.</span>}
              </div>
            </div>
          </div>

          <div className="pte-di-grammar">
            <div className="pte-di-grammar__panel">
              <h5>Corrected Response</h5>
              <p>{feedbackLang === 'en' ? analysis.correctedText : t(analysis.correctedText)}</p>
            </div>
            <div className="pte-di-grammar__panel">
              <h5>Grammar Notes</h5>
              <div className="pte-di-grammar__chips">
                {analysis.grammarNotes.length ? analysis.grammarNotes.map((note, index) => (
                  <PteGrammarNoteChip
                    key={`${note.before}-${note.after}-${index}`}
                    note={note}
                    translate={t}
                  />
                )) : (
                  <span className="pte-di-keywords__empty">No major grammar corrections were needed.</span>
                )}
              </div>
            </div>
          </div>

          {diagnostics && (
            <div className="pte-ra-diagnostics">
              <div className="pte-ra-diagnostics__header">
                <div>
                  <h5 className="pte-ra-diagnostics__title">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>equalizer</span>
                    Speech Skill Analysis
                  </h5>
                  <p className="pte-ra-diagnostics__subtitle">
                    {t('Practice-oriented feedback for Speed, Pause Control, Rhythm, Stress, and Intonation.')}
                  </p>
                </div>
                <div className="pte-ra-diagnostics__summary">
                  <span>{diagnostics.durationSec}s audio</span>
                  <span>{diagnostics.speechRatio}% voiced</span>
                </div>
              </div>

              <div className="pte-ra-diagnostics__grid">
                {diagnosticCards.map((item) => (
                  <div key={item.key} className={`pte-ra-diagnostic-card pte-ra-diagnostic-card--${item.level}`}>
                    <div className="pte-ra-diagnostic-card__top">
                      <div className="pte-ra-diagnostic-card__label">{item.label}</div>
                      <strong>{item.score}/90</strong>
                    </div>
                    <div className="pte-ra-diagnostic-card__bar">
                      <div className="pte-ra-diagnostic-card__fill" style={{ width: `${Math.max(4, (item.score / 90) * 100)}%` }} />
                    </div>
                    <div className="pte-ra-diagnostic-card__hint">{t(getDiagnosticHint(item.key, diagnostics))}</div>
                    <div className="pte-ra-diagnostic-card__explanation">{t(getDiagnosticExplanation(item.key, item.score, diagnostics))}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pte-ra-tips">
            <div className="pte-ra-tips__header">
              <h5 className="pte-ra-tips__title">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>lightbulb</span>
                Improvement Tips
              </h5>
            </div>
            <ul>
              {analysis.tips.map((tip) => (
                <li key={tip}>{t(tip)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
