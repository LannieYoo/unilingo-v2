/**
 * PtePrepView
 * PTE Core 시험 준비 메인 뷰
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useRecording } from '../../recording'
import { useWebSpeechInput } from '../../../common/hooks/useWebSpeechInput'
import { analyzeReadAloud, analyzeSpeechDiagnostics } from '../_07_utils/readAloudAnalyzer'
import { decodeBlobToPCM, blobToWAV, encodeWAV } from '../_07_utils/audioDecoder'
import { fetchWordDetail, saveWordToPTE, toggleWordFavorite, translateWord } from '../_06_services/pteWordService'
import readAloudQuestions from '../_01_data/read_aloud_questions.json'
import similarQuestions from '../_01_data/similar_read_aloud_questions.json'
import repeatSentenceQuestions from '../_01_data/repeat_sentence_questions.json'
import similarRepeatSentenceQuestions from '../_01_data/similar_repeat_sentence_questions.json'
import describeImageQuestions from '../_01_data/describe_image_questions.json'
import similarDescribeImageQuestions from '../_01_data/similar_describe_image_questions.json'
import respondSituationQuestions from '../_01_data/respond_situation_questions.json'
import similarRespondSituationQuestions from '../_01_data/similar_respond_situation_questions.json'
import answerShortQuestionQuestions from '../_01_data/answer_short_question_questions.json'
import similarAnswerShortQuestionQuestions from '../_01_data/similar_answer_short_question_questions.json'
import summarizeWrittenTextQuestions from '../_01_data/summarize_written_text_questions.json'
import similarSummarizeWrittenTextQuestions from '../_01_data/similar_summarize_written_text_questions.json'
import writeEmailQuestions from '../_01_data/write_email_questions.json'
import similarWriteEmailQuestions from '../_01_data/similar_write_email_questions.json'
import DescribeImagePractice from '../_08_components/DescribeImagePractice'
import RespondSituationPractice from '../_08_components/RespondSituationPractice'
import AnswerShortQuestionPractice from '../_08_components/AnswerShortQuestionPractice'
import WritingTaskPractice from '../_08_components/WritingTaskPractice'
import useAuthStore from '../../auth/_05_stores/authStore'
import '../_10_styles/pte.css'

/* Whisper server URL — uses ngrok proxy in production */
const WHISPER_SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://192.168.1.150:8200'

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
    setTimeout(() => context.close?.(), 250)
  } catch {
    // Best-effort only: speech synthesis still works if audio priming is blocked.
  }
}

const CHUNK_BOUNDARY_BEFORE = new Set([
  'and', 'but', 'or', 'because', 'while', 'when', 'if', 'although', 'though',
  'which', 'who', 'that', 'where', 'after', 'before', 'since', 'unless',
  'until', 'whereas', 'despite', 'however', 'therefore',
])

const CHUNK_BOUNDARY_AFTER = new Set([
  'in', 'on', 'at', 'for', 'with', 'from', 'into', 'during', 'through',
  'between', 'without', 'under', 'over', 'across', 'beyond', 'within',
])

function buildChunkGuide(text = '', options = {}) {
  const isRepeatSentence = Boolean(options.isRepeatSentence)
  const normalizeChunkWord = (value = '') => value.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '')
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= 3) return words.length ? [words.join(' ')] : []

  const chunks = []
  let current = []
  const minChunkSize = isRepeatSentence ? 3 : 4
  const maxChunkSize = isRepeatSentence ? 5 : 7

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const nextWord = words[i + 1]
    const prevWord = current[current.length - 2]
    const nextNorm = normalizeChunkWord(nextWord || '')
    const wordNorm = normalizeChunkWord(word || '')
    const prevNorm = normalizeChunkWord(prevWord || '')

    current.push(word)

    const isHardStop = /[.!?;:]$/.test(word)
    const isSoftStop = /[,)]$/.test(word)
    const longChunk = current.length >= maxChunkSize
    const naturalBoundary = current.length >= minChunkSize && (
      isSoftStop
      || CHUNK_BOUNDARY_BEFORE.has(nextNorm)
      || (CHUNK_BOUNDARY_AFTER.has(prevNorm) && current.length >= minChunkSize + 1)
      || (/ing$/.test(wordNorm) && CHUNK_BOUNDARY_BEFORE.has(nextNorm))
    )

    const avoidDanglingFunctionWord = (
      current.length <= minChunkSize
      && CHUNK_BOUNDARY_AFTER.has(wordNorm)
      && nextWord
    )

    const avoidTinyTail = words.length - (i + 1) > 0 && words.length - (i + 1) <= 2

    if ((isHardStop || longChunk || naturalBoundary) && !avoidDanglingFunctionWord && !avoidTinyTail) {
      chunks.push(current.join(' '))
      current = []
    }
  }

  if (current.length) chunks.push(current.join(' '))

  if (chunks.length >= 3) {
    const merged = []
    for (let i = 0; i < chunks.length; i++) {
      const wordsInChunk = chunks[i].split(/\s+/).filter(Boolean)
      const nextChunk = chunks[i + 1]
      if (wordsInChunk.length <= 2 && nextChunk) {
        merged.push(`${chunks[i]} ${nextChunk}`.trim())
        i += 1
      } else {
        merged.push(chunks[i])
      }
    }
    return merged.length ? merged : [text.trim()]
  }

  return chunks.length ? chunks : [text.trim()]
}

function extractTimedWordsFromSTTResponse(data) {
  if (!data || typeof data !== 'object') return []

  const directWords = Array.isArray(data.words) ? data.words : []
  if (directWords.length > 0) {
    return directWords
      .map((word) => ({
        word: word?.word || word?.text || '',
        start: Number.isFinite(word?.start) ? word.start : null,
        end: Number.isFinite(word?.end) ? word.end : null,
      }))
      .filter((word) => word.word)
  }

  const segments = Array.isArray(data.segments) ? data.segments : []
  return segments
    .flatMap((segment) => Array.isArray(segment?.words) ? segment.words : [])
    .map((word) => ({
      word: word?.word || word?.text || '',
      start: Number.isFinite(word?.start) ? word.start : null,
      end: Number.isFinite(word?.end) ? word.end : null,
    }))
    .filter((word) => word.word)
}

function getDiagnosticLevel(score = 0) {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'good'
  if (score >= 35) return 'watch'
  return 'weak'
}

function getDiagnosticHint(key, diagnostics) {
  if (!diagnostics) return ''

  switch (key) {
    case 'speed':
      return `${diagnostics.speechWpm || 0} WPM · target ~${diagnostics.expectedDurationSec || 0}s`
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

function getDiagnosticExplanation(key, score = 0, diagnostics = null) {
  if (!diagnostics) return ''

  switch (key) {
    case 'speed':
      if (score >= 75) return 'Your pace stayed close to an exam-like speaking rate.'
      if ((diagnostics.speechWpm || 0) < 115) return 'You sounded slow overall, so the sentence lost forward momentum.'
      if ((diagnostics.speechWpm || 0) > 190) return 'You rushed parts of the sentence, which can weaken clarity.'
      return 'Your pace was uneven compared with the ideal timing for this sentence.'
    case 'pauseControl':
      if (score >= 75) return 'Pauses were short and controlled, which supports smooth delivery.'
      if ((diagnostics.longestPauseMs || 0) > 1100) return 'A long mid-sentence stop pulled the score down.'
      return 'There were more or longer pauses than ideal for a fluent read.'
    case 'stress':
      if (score >= 75) return 'Word emphasis varied naturally instead of sounding flat.'
      if ((diagnostics.stressVariation || 0) < 14) return 'Stress sounded fairly flat, so key words did not stand out enough.'
      return 'Stress changed unevenly, so emphasis may have felt choppy.'
    case 'intonation':
      if (score >= 75) return 'Your pitch moved enough to sound natural and expressive.'
      if ((diagnostics.pitchRange || 0) < 1.5) return 'Pitch range sounded narrow, which can make the sentence feel monotone.'
      return 'Pitch movement was present, but not consistently natural across the sentence.'
    case 'rhythm':
      if (score >= 75) return 'Word timing stayed fairly even from phrase to phrase.'
      return 'Some words were stretched or compressed too much, which affected rhythm.'
    case 'completeness':
      if (score >= 75) return 'Most of the recording was active speech with solid delivery coverage.'
      return 'Too much silence or uneven delivery reduced the amount of usable spoken material.'
    default:
      return ''
  }
}

function applyWordTimingsToAnalysis(analysis, timedWords = [], recordingDurationSec = null) {
  if (!analysis || !Array.isArray(analysis.wordDiff) || !Array.isArray(timedWords) || timedWords.length === 0) {
    return analysis
  }

  const mappedWords = analysis.wordDiff.map((word) => {
    const idx = Number.isInteger(word?.recognizedIndex) ? word.recognizedIndex : null
    if (idx == null) return { ...word }
    const timing = timedWords[idx]
    if (!timing) return { ...word }
    return {
      ...word,
      matchedAs: word.matchedAs || timing.word || word.word,
      spokenStart: Number.isFinite(timing.start) ? timing.start : word.spokenStart ?? null,
      spokenEnd: Number.isFinite(timing.end) ? timing.end : word.spokenEnd ?? null,
      timingEstimated: false,
    }
  })

  const timedDurations = timedWords
    .map((timing) => {
      const start = Number.isFinite(timing?.start) ? timing.start : null
      const end = Number.isFinite(timing?.end) ? timing.end : null
      if (start == null || end == null || end <= start) return null
      return end - start
    })
    .filter((value) => value != null)

  const avgDuration = timedDurations.length
    ? timedDurations.reduce((sum, value) => sum + value, 0) / timedDurations.length
    : 0.22

  const durationSec = Number.isFinite(recordingDurationSec) && recordingDurationSec > 0
    ? recordingDurationSec
    : timedWords.reduce((max, timing) => Math.max(max, Number.isFinite(timing?.end) ? timing.end : 0), 0)

  const firstStart = timedWords.find((timing) => Number.isFinite(timing?.start))?.start ?? Math.min(0.12, durationSec * 0.08)
  const lastEnd = [...timedWords].reverse().find((timing) => Number.isFinite(timing?.end))?.end ?? durationSec
  const usableStart = Math.max(0, firstStart)
  const usableEnd = Math.max(usableStart + 0.2, lastEnd || durationSec)
  const usableDuration = Math.max(0.2, usableEnd - usableStart)
  const totalWords = Math.max(1, mappedWords.length)

  const withEstimates = mappedWords.map((word, index, words) => {
    if (Number.isFinite(word.spokenStart) && Number.isFinite(word.spokenEnd) && word.spokenEnd > word.spokenStart) {
      return word
    }

    const prevTimed = [...words.slice(0, index)].reverse().find((entry) => Number.isFinite(entry.spokenEnd))
    const nextTimed = words.slice(index + 1).find((entry) => Number.isFinite(entry.spokenStart))

    const proportionalStart = usableStart + usableDuration * (index / totalWords)
    const proportionalEnd = usableStart + usableDuration * ((index + 1) / totalWords)

    let start = proportionalStart
    let end = Math.max(proportionalEnd, start + avgDuration * 0.8)

    if (prevTimed && nextTimed && nextTimed.spokenStart > prevTimed.spokenEnd) {
      const gapStart = prevTimed.spokenEnd
      const gapEnd = nextTimed.spokenStart
      if (gapEnd - gapStart >= 0.08) {
        start = gapStart
        end = gapEnd
      }
    } else if (prevTimed && prevTimed.spokenEnd < usableEnd) {
      start = Math.max(prevTimed.spokenEnd, proportionalStart)
      end = Math.min(usableEnd, Math.max(start + avgDuration, proportionalEnd))
    } else if (nextTimed && nextTimed.spokenStart > usableStart) {
      end = Math.min(nextTimed.spokenStart, Math.max(proportionalEnd, nextTimed.spokenStart))
      start = Math.max(usableStart, Math.min(proportionalStart, end - avgDuration))
    }

    start = Math.max(0, Math.min(start, durationSec - 0.05))
    end = Math.min(durationSec, Math.max(end, start + 0.16))

    return {
      ...word,
      spokenStart: Number(start.toFixed(3)),
      spokenEnd: Number(end.toFixed(3)),
      timingEstimated: true,
    }
  })

  return {
    ...analysis,
    recognizedWordTimings: timedWords,
    wordDiff: withEstimates,
  }
}

function enrichWordSelectionWithBestTiming(word = {}, engineResults = {}) {
  if (!word || !Number.isFinite(word.wordIndex)) return word

  const currentHasRealTiming = Number.isFinite(word.spokenStart)
    && Number.isFinite(word.spokenEnd)
    && word.spokenEnd > word.spokenStart
    && word.timingEstimated !== true

  if (currentHasRealTiming) return word

  const preferredEngines = ['server', 'wasm', 'browser']

  for (const engineKey of preferredEngines) {
    const candidateWord = engineResults?.[engineKey]?.wordDiff?.[word.wordIndex]
    if (!candidateWord) continue

    const hasRealTiming = Number.isFinite(candidateWord.spokenStart)
      && Number.isFinite(candidateWord.spokenEnd)
      && candidateWord.spokenEnd > candidateWord.spokenStart
      && candidateWord.timingEstimated !== true

    if (!hasRealTiming) continue

    return {
      ...word,
      matchedAs: candidateWord.matchedAs || word.matchedAs || null,
      recognizedIndex: Number.isFinite(candidateWord.recognizedIndex) ? candidateWord.recognizedIndex : word.recognizedIndex,
      spokenStart: candidateWord.spokenStart,
      spokenEnd: candidateWord.spokenEnd,
      timingEstimated: false,
      timingSourceEngine: engineKey,
    }
  }

  return {
    ...word,
    timingSourceEngine: word.timingEstimated ? 'estimated' : (word.timingSourceEngine || null),
  }
}

/* ─── Translations ─── */
const MODAL_LANGS = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
]

const MODAL_I18N = {
  en: {
    title: 'What is PTE Core?',
    overviewTitle: 'Overview',
    overviewBody: (
      <>
        <strong>PTE Core (Pearson Test of English Core)</strong> is a computer-based English
        proficiency test developed by Pearson, designed specifically for
        <strong> Canadian immigration</strong> purposes. It is recognized by IRCC
        (Immigration, Refugees and Citizenship Canada) for PR, work permits (including PGWP),
        and citizenship applications.
      </>
    ),
    format: <><strong>Format:</strong> 100% computer-based, AI-scored</>,
    duration: <><strong>Duration:</strong> ~2 hours</>,
    results: <><strong>Results:</strong> Typically within 2 business days</>,
    validity: <><strong>Validity:</strong> 2 years from the test date</>,
    whenTitle: 'When Do You Need PTE Core?',
    pgwp: 'Post-Graduation Work Permit — CLB 5 for college/polytechnic graduates, CLB 7 for university graduates (since Nov 2024)',
    pr: 'Permanent Residency (Express Entry) — CLB 7+ recommended',
    citizen: 'Canadian Citizenship — CLB 4+ minimum',
    clbTitle: 'CLB Score Conversion',
    clbNote: 'PGWP: College/Polytechnic = CLB 5, University = CLB 7 (L ≥ 39, R ≥ 42, W ≥ 51, S ≥ 51 for CLB 5)',
    costTitle: 'Cost & Registration',
    costFee: <><strong>Test Fee:</strong> CAD $350 (Canada, as of 2025)</>,
    costReports: <><strong>Score Reports:</strong> Unlimited, free of charge</>,
    costReschedule: <><strong>Reschedule:</strong> Free if done 48+ hours before the test</>,
    costRetake: <><strong>Retake Interval:</strong> Minimum 5 days between attempts</>,
    costNote: (
      <>Register at <a href="https://www.pearsonpte.com" target="_blank" rel="noopener noreferrer">pearsonpte.com</a>. Make sure to select <strong>PTE Core</strong> (not PTE Academic).</>
    ),
    structTitle: 'Exam Structure',
    part1: 'Speaking & Writing',
    part1Detail: 'Read Aloud, Repeat Sentence, Describe Image, Respond to a Situation, Answer Short Question, Summarize Written Text, Write Email',
    part2: 'Reading',
    part2Detail: 'Fill in the Blanks, Multiple Choice, Reorder Paragraphs',
    part3: 'Listening',
    part3Detail: 'Summarize Spoken Text, Fill in the Blanks, Highlight Incorrect Words, Write from Dictation',
    disclaimer: 'Information is based on IRCC (Immigration, Refugees and Citizenship Canada) regulations effective as of November 2024. Fees and exam policies reflect 2025 standards. Please verify the latest official requirements at canada.ca before submitting any application.',
  },
  ko: {
    title: 'PTE Core란?',
    overviewTitle: '개요',
    overviewBody: (
      <>
        <strong>PTE Core (Pearson Test of English Core)</strong>는 Pearson에서 개발한 컴퓨터 기반 영어 능력 시험으로,
        <strong> 캐나다 이민</strong> 전용으로 설계되었습니다. IRCC(캐나다 이민·난민·시민권부)에서
        영주권(PR), 워크퍼밋(PGWP 포함), 시민권 신청 시 영어 능력 증명으로 인정합니다.
      </>
    ),
    format: <><strong>형식:</strong> 100% 컴퓨터 기반, AI 채점</>,
    duration: <><strong>시간:</strong> 약 2시간</>,
    results: <><strong>결과:</strong> 보통 2영업일 이내 발표</>,
    validity: <><strong>유효기간:</strong> 시험일로부터 2년</>,
    whenTitle: 'PTE Core가 필요한 경우',
    pgwp: '졸업 후 취업비자(PGWP) — 컬리지/폴리텍 졸업 CLB 5, 대학교 졸업 CLB 7 (2024년 11월부터)',
    pr: '영주권 (Express Entry) — CLB 7 이상 권장',
    citizen: '캐나다 시민권 — 최소 CLB 4 이상',
    clbTitle: 'CLB 점수 환산표',
    clbNote: 'PGWP: 컬리지/폴리텍 = CLB 5, 대학교 = CLB 7 (CLB 5 기준: L ≥ 39, R ≥ 42, W ≥ 51, S ≥ 51)',
    costTitle: '비용 및 등록',
    costFee: <><strong>응시료:</strong> CAD $350 (캐나다 기준, 2025년)</>,
    costReports: <><strong>성적표 발송:</strong> 무제한 무료</>,
    costReschedule: <><strong>일정 변경:</strong> 48시간 전까지 무료</>,
    costRetake: <><strong>재시험 간격:</strong> 최소 5일</>,
    costNote: (
      <><a href="https://www.pearsonpte.com" target="_blank" rel="noopener noreferrer">pearsonpte.com</a>에서 등록하세요. 반드시 <strong>PTE Core</strong>를 선택하세요 (PTE Academic이 아님).</>
    ),
    structTitle: '시험 구조',
    part1: 'Speaking & Writing',
    part1Detail: 'Read Aloud, Repeat Sentence, Describe Image, Respond to a Situation, Answer Short Question, Summarize Written Text, Write Email',
    part2: 'Reading',
    part2Detail: 'Fill in the Blanks, Multiple Choice, Reorder Paragraphs',
    part3: 'Listening',
    part3Detail: 'Summarize Spoken Text, Fill in the Blanks, Highlight Incorrect Words, Write from Dictation',
    disclaimer: '본 정보는 2024년 11월 시행된 IRCC(캐나다 이민부) 규정을 기준으로 작성되었습니다. 시험 비용 및 정책은 2025년 기준입니다. 신청 전에 반드시 공식 IRCC 웹사이트(canada.ca)에서 최신 요건을 교차 확인하시기 바랍니다.',
  },
  zh: {
    title: '什么是PTE Core？',
    overviewTitle: '概述',
    overviewBody: (
      <>
        <strong>PTE Core（培生核心英语考试）</strong>是由培生集团开发的计算机化英语能力考试，
        专为<strong>加拿大移民</strong>设计。获得IRCC（加拿大移民、难民和公民部）认可，
        可用于永久居留（PR）、工作许可（包括PGWP）和公民身份申请。
      </>
    ),
    format: <><strong>形式：</strong>100%计算机考试，AI评分</>,
    duration: <><strong>时长：</strong>约2小时</>,
    results: <><strong>成绩：</strong>通常2个工作日内出分</>,
    validity: <><strong>有效期：</strong>考试日起2年</>,
    whenTitle: '何时需要PTE Core？',
    pgwp: '毕业后工作许可（PGWP）— 学院/理工毕业CLB 5，大学毕业CLB 7（2024年11月起）',
    pr: '永久居留权（快速通道）— 建议CLB 7+',
    citizen: '加拿大公民身份 — 最低CLB 4',
    clbTitle: 'CLB分数对照表',
    clbNote: 'PGWP：学院/理工 = CLB 5，大学 = CLB 7（CLB 5标准：L ≥ 39, R ≥ 42, W ≥ 51, S ≥ 51）',
    costTitle: '费用与报名',
    costFee: <><strong>考试费：</strong>CAD $350（加拿大，2025年）</>,
    costReports: <><strong>成绩单：</strong>无限免费发送</>,
    costReschedule: <><strong>改期：</strong>48小时前免费</>,
    costRetake: <><strong>重考间隔：</strong>最少5天</>,
    costNote: (
      <>请在 <a href="https://www.pearsonpte.com" target="_blank" rel="noopener noreferrer">pearsonpte.com</a> 注册。务必选择 <strong>PTE Core</strong>（非PTE Academic）。</>
    ),
    structTitle: '考试结构',
    part1: 'Speaking & Writing（口语和写作）',
    part1Detail: 'Read Aloud, Repeat Sentence, Describe Image, Respond to a Situation, Answer Short Question, Summarize Written Text, Write Email',
    part2: 'Reading（阅读）',
    part2Detail: 'Fill in the Blanks, Multiple Choice, Reorder Paragraphs',
    part3: 'Listening（听力）',
    part3Detail: 'Summarize Spoken Text, Fill in the Blanks, Highlight Incorrect Words, Write from Dictation',
    disclaimer: '本信息基于 2024年11月 生效的 IRCC（加拿大移民局）最新规定。考试费用及政策为 2025年 标准。申请前请务必在加拿大官方网站 (canada.ca) 核实最新要求。',
  },
}

/* ─── PTE Core Info Modal ─── */
function PteInfoModal({ isOpen, onClose }) {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null

  const t = MODAL_I18N[lang]

  return (
    <div className="pte-modal-overlay" onClick={onClose}>
      <div className="pte-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pte-modal__close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="pte-modal__header">
          <div className="pte-modal__icon-wrap">
            <span className="material-symbols-outlined pte-modal__icon">school</span>
          </div>
          <h2 className="pte-modal__title">{t.title}</h2>
        </div>

        {/* Language toggle */}
        <div className="pte-modal__lang-toggle">
          {MODAL_LANGS.map((l) => (
            <button
              key={l.code}
              className={`pte-modal__lang-btn ${lang === l.code ? 'pte-modal__lang-btn--active' : ''}`}
              onClick={() => setLang(l.code)}
            >
              <span className="pte-modal__lang-flag">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>

        <div className="pte-modal__body">
          {/* Overview */}
          <section className="pte-modal__section">
            <h3>{t.overviewTitle}</h3>
            <p>{t.overviewBody}</p>
            <ul>
              <li>{t.format}</li>
              <li>{t.duration}</li>
              <li>{t.results}</li>
              <li>{t.validity}</li>
            </ul>
          </section>

          {/* When do you need it */}
          <section className="pte-modal__section">
            <h3>{t.whenTitle}</h3>
            <div className="pte-modal__use-cases">
              <div className="pte-modal__use-case">
                <span className="pte-modal__use-badge pte-modal__use-badge--pgwp">PGWP</span>
                <span>{t.pgwp}</span>
              </div>
              <div className="pte-modal__use-case">
                <span className="pte-modal__use-badge pte-modal__use-badge--pr">PR</span>
                <span>{t.pr}</span>
              </div>
              <div className="pte-modal__use-case">
                <span className="pte-modal__use-badge pte-modal__use-badge--citizen">Citizenship</span>
                <span>{t.citizen}</span>
              </div>
            </div>
          </section>

          {/* CLB Conversion */}
          <section className="pte-modal__section">
            <h3>{t.clbTitle}</h3>
            <div className="pte-modal__table-wrap">
              <table className="pte-modal__table">
                <thead>
                  <tr>
                    <th>CLB</th>
                    <th>Listening</th>
                    <th>Reading</th>
                    <th>Writing</th>
                    <th>Speaking</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="pte-modal__row--highlight">
                    <td><strong>CLB 9</strong></td><td>82–88</td><td>78–87</td><td>88–89</td><td>84–88</td>
                  </tr>
                  <tr>
                    <td><strong>CLB 8</strong></td><td>71–81</td><td>69–77</td><td>79–87</td><td>76–83</td>
                  </tr>
                  <tr>
                    <td><strong>CLB 7</strong></td><td>60–70</td><td>60–68</td><td>69–78</td><td>68–75</td>
                  </tr>
                  <tr>
                    <td><strong>CLB 6</strong></td><td>50–59</td><td>51–59</td><td>60–68</td><td>59–67</td>
                  </tr>
                  <tr className="pte-modal__row--pgwp">
                    <td><strong>CLB 5</strong></td><td>39–49</td><td>42–50</td><td>51–59</td><td>51–58</td>
                  </tr>
                  <tr>
                    <td><strong>CLB 4</strong></td><td>28–38</td><td>33–41</td><td>41–50</td><td>42–50</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="pte-modal__note">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>info</span>{' '}
              {t.clbNote}
            </p>
          </section>

          {/* Cost */}
          <section className="pte-modal__section">
            <h3>{t.costTitle}</h3>
            <ul>
              <li>{t.costFee}</li>
              <li>{t.costReports}</li>
              <li>{t.costReschedule}</li>
              <li>{t.costRetake}</li>
            </ul>
            <p className="pte-modal__note">{t.costNote}</p>
          </section>

          {/* Exam Structure */}
          <section className="pte-modal__section">
            <h3>{t.structTitle}</h3>
            <div className="pte-modal__structure">
              <div className="pte-modal__part">
                <span className="pte-modal__part-num">Part 1</span>
                <div>
                  <strong>{t.part1}</strong>
                  <span className="pte-modal__part-time">~50–67 min</span>
                  <div className="pte-modal__part-detail">{t.part1Detail}</div>
                </div>
              </div>
              <div className="pte-modal__part">
                <span className="pte-modal__part-num">Part 2</span>
                <div>
                  <strong>{t.part2}</strong>
                  <span className="pte-modal__part-time">~27–38 min</span>
                  <div className="pte-modal__part-detail">{t.part2Detail}</div>
                </div>
              </div>
              <div className="pte-modal__part">
                <span className="pte-modal__part-num">Part 3</span>
                <div>
                  <strong>{t.part3}</strong>
                  <span className="pte-modal__part-time">~30–37 min</span>
                  <div className="pte-modal__part-detail">{t.part3Detail}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <div className="pte-modal__disclaimer">
            <span className="material-symbols-outlined pte-modal__disclaimer-icon">info</span>
            <p>{t.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Tab Data ─── */

const TABS = [
  {
    id: 'speaking-writing',
    label: 'Speaking & Writing',
    icon: 'record_voice_over',
    color: '#6366f1',
  },
  {
    id: 'reading',
    label: 'Reading',
    icon: 'menu_book',
    color: '#0ea5e9',
  },
  {
    id: 'listening',
    label: 'Listening',
    icon: 'headphones',
    color: '#f59e0b',
  },
]

const QUESTION_TYPES = {
  'speaking-writing': [
    { name: 'Read Aloud', abbr: 'RA', impact: 5, skills: ['Speaking', 'Reading'], desc: 'Read a text aloud with natural fluency and pronunciation.', time: '30–40s prep + 40s', tip: 'Focus on chunking and stress patterns. Never self-correct.', volume: '6' },
    { name: 'Repeat Sentence', abbr: 'RS', impact: 5, skills: ['Speaking', 'Listening'], desc: 'Listen to a sentence and repeat it immediately.', time: 'Audio ends → 40s recording', tip: 'Understand meaning first. Mimic rhythm and intonation.', volume: '10–12' },
    { name: 'Describe Image', abbr: 'DI', impact: 3, skills: ['Speaking'], desc: 'Describe a graph, chart, map, or image.', time: '25s prep + 40s', tip: 'Use a template: intro → highest/lowest → trend → conclusion.', volume: '3–4' },
    { name: 'Respond to a Situation', abbr: 'RtS', impact: 3, skills: ['Speaking'], desc: 'Read a situation and give an appropriate spoken response.', time: '20s prep + 40s', tip: 'Use 3-sentence structure: acknowledge → main point → closing.', core: true, volume: '2' },
    { name: 'Answer Short Question', abbr: 'ASQ', impact: 2, skills: ['Speaking', 'Listening'], desc: 'Answer a short question with one or two words.', time: '10s', tip: 'Answer with a single word. Guess if unsure — silence scores zero.', volume: '5–6' },
    { name: 'Summarize Written Text', abbr: 'SWT', impact: 4, skills: ['Writing', 'Reading'], desc: 'Read a passage and write a 25–50 word summary in 1–2 sentences.', time: '10 min', tip: 'Must be 25–50 words. Use template: "The passage discusses X, highlighting Y, while Z."', volume: '1–2' },
    { name: 'Write Email', abbr: 'WE', impact: 3, skills: ['Writing'], desc: 'Write a 100–120 word email addressing 3 bullet points.', time: '9 min', tip: 'Address ALL 3 bullet points. Match formality to the recipient.', core: true, volume: '2' },
  ],
  reading: [
    { name: 'R&W Fill in the Blanks', abbr: 'RWFIB', impact: 4, skills: ['Reading', 'Writing'], desc: 'Select appropriate words from dropdown menus to fill blanks.', time: '~2 min each', tip: 'Determine the part of speech first, then check collocations.', volume: '5–6' },
    { name: 'Multiple Choice (Multiple)', abbr: 'MCM', impact: 2, skills: ['Reading'], desc: 'Read a passage and select multiple correct answers.', time: '~2 min', tip: 'Only select answers you are confident about — wrong picks lose points.', volume: '1–2' },
    { name: 'Reorder Paragraphs', abbr: 'RO', impact: 4, skills: ['Reading'], desc: 'Drag sentences into the correct logical order.', time: '~2–3 min', tip: 'Find the topic sentence (no pronouns/connectors). Track pronoun references.', volume: '2–3' },
    { name: 'Fill in the Blanks (Drag)', abbr: 'FIB', impact: 3, skills: ['Reading'], desc: 'Drag words from a list into the correct blanks.', time: '~2 min each', tip: 'Use elimination: fill confident blanks first, then narrow remaining words.', volume: '4–5' },
    { name: 'Multiple Choice (Single)', abbr: 'MCS', impact: 2, skills: ['Reading'], desc: 'Read a passage and select one correct answer.', time: '~1.5 min', tip: 'No negative marking — always pick an answer. Look for paraphrasing.', volume: '1–2' },
  ],
  listening: [
    { name: 'Summarize Spoken Text', abbr: 'SST', impact: 4, skills: ['Listening', 'Writing'], desc: 'Listen to a lecture and write a 20–30 word summary.', time: '10 min', tip: 'Note the topic (first 10s), 2–3 key points, and the conclusion.', volume: '1–2' },
    { name: 'MC Multiple (Listening)', abbr: 'MCML', impact: 2, skills: ['Listening'], desc: 'Listen and select multiple correct answers.', time: 'Varies', tip: 'Read options before audio plays. Only select confident answers.', volume: '1–2' },
    { name: 'Fill in the Blanks (Listening)', abbr: 'LFIB', impact: 3, skills: ['Listening', 'Writing'], desc: 'Type the missing words while listening.', time: 'Varies', tip: 'Spelling is critical. If you miss one blank, move on to the next.', volume: '2–3' },
    { name: 'Highlight Incorrect Words', abbr: 'HIW', impact: 3, skills: ['Listening', 'Reading'], desc: 'Click words in the transcript that differ from the audio.', time: 'Varies', tip: 'Follow along at audio speed. Don\'t click if unsure — wrong clicks lose points.', volume: '2–3' },
    { name: 'Select Missing Word', abbr: 'SMW', impact: 2, skills: ['Listening'], desc: 'Listen and choose the word that completes the audio.', time: 'Varies', tip: 'Focus on the conclusion. The missing word fits the overall context.', volume: '1–2' },
    { name: 'Write from Dictation', abbr: 'WFD', impact: 5, skills: ['Listening', 'Writing'], desc: 'Listen to a sentence and type it exactly.', time: 'Varies', tip: 'The HIGHEST impact item! Note keywords on the erasable noteboard, then reconstruct.', volume: '3–4' },
  ],
}

const TEMPLATE_LIBRARY = {
  DI: [
    {
      id: 'di-graph-core',
      priority: 1,
      label: 'Most Useful',
      buttonBadge: 'All Charts',
      buttonLabel: 'Graph / General Data',
      buttonHint: 'mixed graph · table · fallback',
      title: 'Describe Image — Graph / General Data',
      useCase: 'Best fallback for mixed graphs, tables, or data visuals when the exact subtype is unclear.',
      memoryFlow: ['Intro', 'Key figure', 'Trend / comparison', 'Conclusion'],
      quickFormula: 'Type → Topic → Highest/Lowest → Trend → Overall takeaway',
      lines: [
        [
          { type: 'text', value: 'The ' },
          { type: 'blank', key: 'visual_type', label: 'chart / graph / table' },
          { type: 'text', value: ' illustrates ' },
          { type: 'blank', key: 'main_topic', label: 'main topic' },
          { type: 'text', value: ' for ' },
          { type: 'blank', key: 'context', label: 'time / place / group' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'At first glance, ' },
          { type: 'blank', key: 'highest_item', label: 'highest item' },
          { type: 'text', value: ' records the highest figure, while ' },
          { type: 'blank', key: 'lowest_item', label: 'lowest item' },
          { type: 'text', value: ' remains the lowest.' },
        ],
        [
          { type: 'text', value: 'Overall, the data shows ' },
          { type: 'blank', key: 'main_trend', label: 'main trend / comparison' },
          { type: 'text', value: ', which suggests ' },
          { type: 'blank', key: 'conclusion', label: 'overall message' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Do not describe every number. Pick the highest, the lowest, and one clear trend.',
        'If exact numbers are hard to read, use approximate language such as “about”, “nearly”, or “roughly”.',
      ],
    },
    {
      id: 'di-bar-chart',
      priority: 2,
      label: 'High',
      buttonBadge: 'Data',
      buttonLabel: 'Bar Chart',
      buttonHint: 'categories · highest vs lowest',
      title: 'Describe Image — Bar Chart',
      useCase: 'Best for column charts and bar charts comparing categories.',
      memoryFlow: ['Intro', 'Highest', 'Lowest', 'Comparison'],
      quickFormula: 'Bar chart → Topic → Highest bar → Lowest bar → Comparison',
      lines: [
        [
          { type: 'text', value: 'The bar chart shows ' },
          { type: 'blank', key: 'bar_topic', label: 'what is being compared' },
          { type: 'text', value: ' across ' },
          { type: 'blank', key: 'bar_groups', label: 'groups / categories' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Among all categories, ' },
          { type: 'blank', key: 'bar_highest', label: 'highest category' },
          { type: 'text', value: ' has the highest value, whereas ' },
          { type: 'blank', key: 'bar_lowest', label: 'lowest category' },
          { type: 'text', value: ' is the lowest.' },
        ],
        [
          { type: 'text', value: 'Overall, the chart highlights ' },
          { type: 'blank', key: 'bar_comparison', label: 'main comparison / contrast' },
          { type: 'text', value: ', suggesting ' },
          { type: 'blank', key: 'bar_message', label: 'overall message' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Focus on category comparison rather than listing every bar.',
        'Mention one strong contrast clearly.',
      ],
    },
    {
      id: 'di-line-chart',
      priority: 3,
      label: 'High',
      buttonBadge: 'Trend',
      buttonLabel: 'Line Chart',
      buttonHint: 'increase · decrease · fluctuation',
      title: 'Describe Image — Line Chart',
      useCase: 'Best for trend visuals over time such as line graphs.',
      memoryFlow: ['Intro', 'Start', 'Trend', 'End / overall'],
      quickFormula: 'Line graph → Topic → Starting point → Main trend → End point',
      lines: [
        [
          { type: 'text', value: 'The line graph illustrates ' },
          { type: 'blank', key: 'line_topic', label: 'topic / measure' },
          { type: 'text', value: ' over ' },
          { type: 'blank', key: 'line_period', label: 'time period' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'It starts at ' },
          { type: 'blank', key: 'line_start', label: 'starting level' },
          { type: 'text', value: ' and then ' },
          { type: 'blank', key: 'line_trend', label: 'rises / falls / fluctuates' },
          { type: 'text', value: ' during the period.' },
        ],
        [
          { type: 'text', value: 'By the end, it reaches ' },
          { type: 'blank', key: 'line_end', label: 'ending level' },
          { type: 'text', value: ', so the overall trend is ' },
          { type: 'blank', key: 'line_summary', label: 'main takeaway' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Use trend verbs like rise, drop, remain stable, or fluctuate.',
        'Start-middle-end is usually enough.',
      ],
    },
    {
      id: 'di-pie-chart',
      priority: 4,
      label: 'High',
      buttonBadge: 'Share',
      buttonLabel: 'Pie Chart',
      buttonHint: 'proportion · share · percentage',
      title: 'Describe Image — Pie Chart',
      useCase: 'Best for proportion, percentage, and distribution visuals.',
      memoryFlow: ['Intro', 'Largest share', 'Smallest share', 'Overall distribution'],
      quickFormula: 'Pie chart → Topic → Largest slice → Smallest slice → Overall balance',
      lines: [
        [
          { type: 'text', value: 'The pie chart presents ' },
          { type: 'blank', key: 'pie_topic', label: 'distribution topic' },
          { type: 'text', value: ' in terms of percentage share.' },
        ],
        [
          { type: 'text', value: 'The largest proportion belongs to ' },
          { type: 'blank', key: 'pie_largest', label: 'largest segment' },
          { type: 'text', value: ', while ' },
          { type: 'blank', key: 'pie_smallest', label: 'smallest segment' },
          { type: 'text', value: ' accounts for the smallest share.' },
        ],
        [
          { type: 'text', value: 'Overall, the chart indicates ' },
          { type: 'blank', key: 'pie_balance', label: 'dominant / balanced distribution' },
          { type: 'text', value: ', which shows ' },
          { type: 'blank', key: 'pie_message', label: 'main insight' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Use words like proportion, share, percentage, and distribution.',
        'Do not list every slice unless there are only a few.',
      ],
    },
    {
      id: 'di-process',
      priority: 5,
      label: 'Useful',
      buttonBadge: 'Flow',
      buttonLabel: 'Process',
      buttonHint: 'cycle · step-by-step · flowchart',
      title: 'Describe Image — Process',
      useCase: 'Best for stages, life cycles, and flowcharts.',
      memoryFlow: ['Intro', 'Start', 'Middle stages', 'Final result'],
      quickFormula: 'What it is → Starting stage → Main steps → Final stage',
      lines: [
        [
          { type: 'text', value: 'The image presents ' },
          { type: 'blank', key: 'process_topic', label: 'process topic' },
          { type: 'text', value: ' and explains how it works step by step.' },
        ],
        [
          { type: 'text', value: 'It begins with ' },
          { type: 'blank', key: 'process_start', label: 'starting stage' },
          { type: 'text', value: ', then continues through ' },
          { type: 'blank', key: 'process_middle', label: 'main stages' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Finally, it ends with ' },
          { type: 'blank', key: 'process_end', label: 'final stage / outcome' },
          { type: 'text', value: ', showing ' },
          { type: 'blank', key: 'process_message', label: 'overall purpose / result' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Sequence words matter here: first, then, next, finally.',
      ],
    },
    {
      id: 'di-map',
      priority: 6,
      label: 'Useful',
      buttonBadge: 'Layout',
      buttonLabel: 'Map',
      buttonHint: 'location · route · area change',
      title: 'Describe Image — Map',
      useCase: 'Best for town maps, floor plans, and before/after layout visuals.',
      memoryFlow: ['Intro', 'Main areas', 'Direction / change', 'Overall layout'],
      quickFormula: 'Map → Key locations → Direction / change → Overall layout',
      lines: [
        [
          { type: 'text', value: 'The map shows ' },
          { type: 'blank', key: 'map_topic', label: 'place / area' },
          { type: 'text', value: ' and highlights its layout.' },
        ],
        [
          { type: 'text', value: 'Key features include ' },
          { type: 'blank', key: 'map_features', label: 'main locations / landmarks' },
          { type: 'text', value: ', which are arranged around ' },
          { type: 'blank', key: 'map_center', label: 'central area / route' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Overall, the map suggests ' },
          { type: 'blank', key: 'map_change', label: 'main change / direction / layout point' },
          { type: 'text', value: ', making the area look ' },
          { type: 'blank', key: 'map_result', label: 'more connected / organized / accessible' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Mention only the most important landmarks or changes.',
        'Use location words like north, south, left, right, near, and between when needed.',
      ],
    },
    {
      id: 'di-photo',
      priority: 7,
      label: 'Backup',
      buttonBadge: 'Scene',
      buttonLabel: 'Photo',
      buttonHint: 'people · place · object',
      title: 'Describe Image — Photo / Scene',
      useCase: 'Best for photographs, posters, screenshots, objects, or people-based visuals.',
      memoryFlow: ['Intro', 'Main object', 'Surroundings', 'Overall impression'],
      quickFormula: 'Scene → Main focus → Supporting details → Overall impression',
      lines: [
        [
          { type: 'text', value: 'The picture shows ' },
          { type: 'blank', key: 'scene_topic', label: 'person / object / scene' },
          { type: 'text', value: ' in ' },
          { type: 'blank', key: 'scene_location', label: 'setting / place' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'The main focus appears to be ' },
          { type: 'blank', key: 'main_focus', label: 'main focus' },
          { type: 'text', value: ', while the background includes ' },
          { type: 'blank', key: 'background_detail', label: 'supporting detail' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Overall, the image gives the impression of ' },
          { type: 'blank', key: 'overall_impression', label: 'overall message / feeling' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Keep it simple and concrete. Name the visible things first, then add one overall impression.',
      ],
    },
  ],
  RtS: [
    {
      id: 'rts-core-polite',
      priority: 1,
      label: 'Most Useful',
      buttonBadge: 'Core',
      buttonLabel: 'Polite Reply Template',
      buttonHint: 'general response / safe default',
      title: 'Respond to a Situation — Polite Core',
      useCase: 'Best default structure for most workplace, service, and everyday situations.',
      memoryFlow: ['Acknowledge', 'Main response', 'Polite close'],
      quickFormula: 'Acknowledge → Answer / request → Friendly close',
      lines: [
        [
          { type: 'text', value: 'Hi ' },
          { type: 'blank', key: 'listener', label: 'name / title' },
          { type: 'text', value: ', thanks for ' },
          { type: 'blank', key: 'situation_reason', label: 'the message / request' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'I would like to ' },
          { type: 'blank', key: 'main_action', label: 'respond / request / explain' },
          { type: 'text', value: ' because ' },
          { type: 'blank', key: 'main_reason', label: 'reason / detail' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Please let me know ' },
          { type: 'blank', key: 'next_step', label: 'next step / confirmation' },
          { type: 'text', value: '. Thank you for your understanding.' },
        ],
      ],
      tips: [
        'This task rewards appropriateness. Sound natural, direct, and polite.',
        'Mention one clear reason and one next step. Do not over-explain.',
      ],
    },
    {
      id: 'rts-problem-solution',
      priority: 2,
      label: 'High',
      buttonBadge: 'Common',
      buttonLabel: 'Problem / Solution Template',
      buttonHint: 'complaint · issue · fix',
      title: 'Respond to a Situation — Problem / Solution',
      useCase: 'Use when there is a delay, complaint, scheduling issue, or mistake to fix.',
      memoryFlow: ['Problem', 'Solution', 'Action'],
      quickFormula: 'State issue → Offer solution → Confirm action',
      lines: [
        [
          { type: 'text', value: 'I understand that ' },
          { type: 'blank', key: 'problem', label: 'the problem' },
          { type: 'text', value: ', and I am sorry for the inconvenience.' },
        ],
        [
          { type: 'text', value: 'To solve this, I can ' },
          { type: 'blank', key: 'solution', label: 'offer a solution' },
          { type: 'text', value: ' as soon as possible.' },
        ],
        [
          { type: 'text', value: 'Please confirm whether ' },
          { type: 'blank', key: 'confirmation', label: 'this option works' },
          { type: 'text', value: ', and I will take action immediately.' },
        ],
      ],
      tips: [
        'For complaints, apology + fix + action works well.',
      ],
    },
    {
      id: 'rts-availability',
      priority: 3,
      label: 'Useful',
      buttonBadge: 'Situational',
      buttonLabel: 'Scheduling Template',
      buttonHint: 'meeting · appointment · time change',
      title: 'Respond to a Situation — Availability / Scheduling',
      useCase: 'Use for meeting, appointment, shift, interview, or event scheduling.',
      memoryFlow: ['Availability', 'Alternative', 'Confirmation'],
      quickFormula: 'State availability → Offer alternative → Confirm',
      lines: [
        [
          { type: 'text', value: 'Thank you for inviting me to ' },
          { type: 'blank', key: 'event_name', label: 'meeting / event' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'I am ' },
          { type: 'blank', key: 'availability_status', label: 'available / unavailable' },
          { type: 'text', value: ' at that time because ' },
          { type: 'blank', key: 'availability_reason', label: 'reason' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'If needed, I can ' },
          { type: 'blank', key: 'alternative_option', label: 'offer another time / option' },
          { type: 'text', value: '. Please let me know what suits you best.' },
        ],
      ],
      tips: [
        'If you cannot attend, always offer one alternative.',
      ],
    },
  ],
  SWT: [
    {
      id: 'swt-one-sentence',
      priority: 1,
      label: 'Most Useful',
      buttonBadge: 'Core',
      buttonLabel: 'One-sentence Template',
      buttonHint: 'safe 25–50 word summary',
      title: 'Summarize Written Text — One-sentence Core',
      useCase: 'Best for most passages when you want a safe 25–50 word summary.',
      memoryFlow: ['Topic', 'Point 1', 'Point 2', 'Conclusion'],
      quickFormula: 'The passage discusses X, highlighting Y and Z, while emphasizing A.',
      lines: [
        [
          { type: 'text', value: 'The passage discusses ' },
          { type: 'blank', key: 'passage_topic', label: 'main topic' },
          { type: 'text', value: ', highlighting ' },
          { type: 'blank', key: 'key_point_one', label: 'key point 1' },
          { type: 'text', value: ' and ' },
          { type: 'blank', key: 'key_point_two', label: 'key point 2' },
          { type: 'text', value: ', while emphasizing ' },
          { type: 'blank', key: 'author_message', label: 'overall message' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Keep it to one sentence if possible.',
        'Use commas and one “while” or “and” to connect ideas cleanly.',
      ],
    },
    {
      id: 'swt-cause-effect',
      priority: 2,
      label: 'High',
      buttonBadge: 'Flexible',
      buttonLabel: 'Cause / Effect Template',
      buttonHint: 'reason → result structure',
      title: 'Summarize Written Text — Cause / Effect',
      useCase: 'Useful when the passage explains reasons, impacts, or results.',
      memoryFlow: ['Topic', 'Cause', 'Effect', 'Importance'],
      quickFormula: 'The text explains X, showing that Y leads to Z and affects A.',
      lines: [
        [
          { type: 'text', value: 'The text explains ' },
          { type: 'blank', key: 'cause_topic', label: 'topic / issue' },
          { type: 'text', value: ', showing that ' },
          { type: 'blank', key: 'cause_factor', label: 'cause / driver' },
          { type: 'text', value: ' leads to ' },
          { type: 'blank', key: 'effect_result', label: 'effect / result' },
          { type: 'text', value: ' and affects ' },
          { type: 'blank', key: 'broader_impact', label: 'broader impact' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'This pattern works well for science, economy, policy, and environment passages.',
      ],
    },
  ],
  WE: [
    {
      id: 'we-formal-core',
      priority: 1,
      label: 'Most Useful',
      buttonBadge: 'Core',
      buttonLabel: 'Formal Email Template',
      buttonHint: 'safe default for most prompts',
      title: 'Write Email — Formal / Safe Core',
      useCase: 'Best default template for school, office, service, and official emails.',
      memoryFlow: ['Greeting', 'Purpose', '3 bullet points', 'Closing'],
      quickFormula: 'Greeting → Purpose → Point 1 / 2 / 3 → Closing',
      lines: [
        [
          { type: 'text', value: 'Dear ' },
          { type: 'blank', key: 'recipient_title', label: 'Sir / Madam / Name' },
          { type: 'text', value: ',' },
        ],
        [
          { type: 'text', value: 'I am writing to ' },
          { type: 'blank', key: 'email_purpose', label: 'purpose of the email' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'First, I would like to mention ' },
          { type: 'blank', key: 'bullet_one', label: 'bullet point 1' },
          { type: 'text', value: '. Second, ' },
          { type: 'blank', key: 'bullet_two', label: 'bullet point 2' },
          { type: 'text', value: '. Finally, ' },
          { type: 'blank', key: 'bullet_three', label: 'bullet point 3' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'I would appreciate your ' },
          { type: 'blank', key: 'closing_request', label: 'help / response / confirmation' },
          { type: 'text', value: '. Kind regards,' },
        ],
      ],
      tips: [
        'Make sure all 3 bullet points are explicitly covered.',
        'For PTE Core, keep the tone appropriately formal unless the prompt clearly sounds casual.',
      ],
    },
    {
      id: 'we-request-action',
      priority: 2,
      label: 'High',
      buttonBadge: 'Common',
      buttonLabel: 'Request / Action Template',
      buttonHint: 'ask · arrange · confirm',
      title: 'Write Email — Request / Action',
      useCase: 'Use when you need approval, support, information, or a change.',
      memoryFlow: ['Reason', 'Request', 'Details', 'Deadline / thanks'],
      quickFormula: 'Reason → Request → Helpful details → Thanks / action',
      lines: [
        [
          { type: 'text', value: 'Dear ' },
          { type: 'blank', key: 'request_recipient', label: 'recipient' },
          { type: 'text', value: ',' },
        ],
        [
          { type: 'text', value: 'I am writing regarding ' },
          { type: 'blank', key: 'request_topic', label: 'topic / issue' },
          { type: 'text', value: ' and would like to request ' },
          { type: 'blank', key: 'request_need', label: 'what you need' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'To explain further, ' },
          { type: 'blank', key: 'request_detail', label: 'supporting detail' },
          { type: 'text', value: ', and it would help if ' },
          { type: 'blank', key: 'request_action', label: 'requested action' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Thank you for your time, and I look forward to your ' },
          { type: 'blank', key: 'request_reply', label: 'response / confirmation' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Strong when the prompt asks you to request or arrange something.',
      ],
    },
    {
      id: 'we-apology-followup',
      priority: 3,
      label: 'Useful',
      buttonBadge: 'Situational',
      buttonLabel: 'Apology / Follow-up Template',
      buttonHint: 'delay · mistake · service issue',
      title: 'Write Email — Apology / Follow-up',
      useCase: 'Use for delays, mistakes, cancellations, or customer-service follow-up.',
      memoryFlow: ['Apology', 'Reason', 'Fix', 'Polite close'],
      quickFormula: 'Apology → Reason → Solution → Thank you',
      lines: [
        [
          { type: 'text', value: 'Dear ' },
          { type: 'blank', key: 'apology_recipient', label: 'recipient' },
          { type: 'text', value: ',' },
        ],
        [
          { type: 'text', value: 'I would like to apologize for ' },
          { type: 'blank', key: 'apology_issue', label: 'problem / inconvenience' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'This happened because ' },
          { type: 'blank', key: 'apology_reason', label: 'reason' },
          { type: 'text', value: ', but I would now like to ' },
          { type: 'blank', key: 'apology_solution', label: 'offer a solution' },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Thank you for your patience, and please let me know if ' },
          { type: 'blank', key: 'apology_followup', label: 'further help is needed' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'This keeps your tone responsible and solution-focused.',
      ],
    },
  ],
  SST: [
    {
      id: 'sst-core',
      priority: 1,
      label: 'Most Useful',
      buttonBadge: 'Core',
      buttonLabel: 'Lecture Summary Template',
      buttonHint: 'topic · points · conclusion',
      title: 'Summarize Spoken Text — Core',
      useCase: 'Best for lectures, talks, presentations, and informational audio.',
      memoryFlow: ['Topic', 'Point 1', 'Point 2', 'Conclusion'],
      quickFormula: 'The speaker discusses X, explains Y and Z, and concludes that A.',
      lines: [
        [
          { type: 'text', value: 'The speaker discusses ' },
          { type: 'blank', key: 'speaker_topic', label: 'main topic' },
          { type: 'text', value: ', explains ' },
          { type: 'blank', key: 'speaker_point_one', label: 'key point 1' },
          { type: 'text', value: ' and ' },
          { type: 'blank', key: 'speaker_point_two', label: 'key point 2' },
          { type: 'text', value: ', and concludes that ' },
          { type: 'blank', key: 'speaker_conclusion', label: 'conclusion' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Aim for 20–30 words. Keep it short and information-dense.',
      ],
    },
    {
      id: 'sst-problem-solution',
      priority: 2,
      label: 'High',
      buttonBadge: 'Flexible',
      buttonLabel: 'Problem / Solution Template',
      buttonHint: 'issue · cause · solution',
      title: 'Summarize Spoken Text — Problem / Solution',
      useCase: 'Useful when the lecture describes an issue and suggested response.',
      memoryFlow: ['Issue', 'Cause', 'Solution', 'Result'],
      quickFormula: 'The speaker describes X, links it to Y, suggests Z, and predicts A.',
      lines: [
        [
          { type: 'text', value: 'The speaker describes ' },
          { type: 'blank', key: 'issue_topic', label: 'issue / topic' },
          { type: 'text', value: ', links it to ' },
          { type: 'blank', key: 'issue_cause', label: 'cause / reason' },
          { type: 'text', value: ', suggests ' },
          { type: 'blank', key: 'issue_solution', label: 'solution' },
          { type: 'text', value: ', and predicts ' },
          { type: 'blank', key: 'issue_outcome', label: 'result / outcome' },
          { type: 'text', value: '.' },
        ],
      ],
      tips: [
        'Very useful for academic lectures and social issue topics.',
      ],
    },
  ],
}

function getTemplatesForQuestion(abbr) {
  return (TEMPLATE_LIBRARY[abbr] || []).slice().sort((a, b) => a.priority - b.priority)
}

/* ─── Impact Stars ─── */
function ImpactStars({ level }) {
  return (
    <span className="pte-impact" title={`Impact: ${level}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`pte-impact__star ${i < level ? 'pte-impact__star--filled' : ''}`}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function TemplatePracticeModal({ isOpen, item, color, initialTemplateId, onClose }) {
  const templates = useMemo(() => getTemplatesForQuestion(item?.abbr), [item?.abbr])
  const [activeTemplateId, setActiveTemplateId] = useState(initialTemplateId || templates[0]?.id || null)
  const [values, setValues] = useState({})
  const [showHints, setShowHints] = useState(true)

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  useEffect(() => {
    setActiveTemplateId(initialTemplateId || templates[0]?.id || null)
    setValues({})
  }, [item?.abbr, isOpen, initialTemplateId])

  if (!isOpen || !item || templates.length === 0) return null

  const activeTemplate = templates.find((template) => template.id === activeTemplateId) || templates[0]

  const handleChange = (key, value) => {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const handleReset = () => setValues({})

  const renderTemplateLine = (parts, lineIndex) => (
    <div key={`${activeTemplate.id}-${lineIndex}`} className="pte-template-modal__line">
      {parts.map((part, partIndex) => {
        if (part.type === 'blank') {
          return (
            <input
              key={`${part.key}-${partIndex}`}
              className="pte-template-modal__blank"
              value={values[part.key] || ''}
              onChange={(event) => handleChange(part.key, event.target.value)}
              placeholder={showHints ? part.label : ''}
              style={{ width: `${Math.max(120, part.label.length * 10)}px` }}
            />
          )
        }

        return (
          <span key={`${lineIndex}-${partIndex}`} className="pte-template-modal__text">
            {part.value}
          </span>
        )
      })}
    </div>
  )

  return (
    <div className="pte-word-popup-overlay" onClick={onClose}>
      <div className="pte-template-modal" onClick={(event) => event.stopPropagation()}>
        <button className="pte-word-popup__close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="pte-template-modal__header">
          <span className="pte-card__abbr pte-template-modal__abbr" style={{ background: color }}>{item.abbr}</span>
          <div>
            <h3 className="pte-template-modal__title">{item.name} Template Practice</h3>
            <p className="pte-template-modal__subtitle">
              Fill the blanks, rehearse the structure, and memorize the core flow.
            </p>
          </div>
        </div>

        <div className="pte-template-modal__body">
          <div className="pte-template-modal__card">
            <div className="pte-template-modal__card-top">
              <div>
                <div className="pte-template-modal__badge">{activeTemplate.label}</div>
                <h4 className="pte-template-modal__card-title">{activeTemplate.title}</h4>
                <p className="pte-template-modal__usecase">{activeTemplate.useCase}</p>
              </div>
              <div className="pte-template-modal__controls">
                <button
                  className="pte-template-modal__control-btn"
                  onClick={() => setShowHints((previous) => !previous)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>visibility</span>
                  {showHints ? 'Hide hints' : 'Show hints'}
                </button>
                <button className="pte-template-modal__control-btn" onClick={handleReset}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>restart_alt</span>
                  Reset blanks
                </button>
              </div>
            </div>

            <div className="pte-template-modal__practice">
              {activeTemplate.lines.map((line, index) => renderTemplateLine(line, index))}
            </div>
          </div>

          <div className="pte-template-modal__summary">
            <div className="pte-template-modal__summary-card">
              <div className="pte-template-modal__summary-title">Quick memory formula</div>
              <div className="pte-template-modal__formula">{activeTemplate.quickFormula}</div>
            </div>

            <div className="pte-template-modal__summary-card">
              <div className="pte-template-modal__summary-title">Memorize this order</div>
              <div className="pte-template-modal__flow">
                {activeTemplate.memoryFlow.map((step, index) => (
                  <span key={`${activeTemplate.id}-flow-${index}`} className="pte-template-modal__flow-step">
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="pte-template-modal__summary-card">
              <div className="pte-template-modal__summary-title">Exam reminders</div>
              <ul className="pte-template-modal__tips">
                {activeTemplate.tips.map((tip, index) => (
                  <li key={`${activeTemplate.id}-tip-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Score Gauge Component ─── */
function ScoreGauge({ label, score, icon, color }) {
  const percentage = Math.round((score / 90) * 100)
  const gradientStyle = {
    background: `conic-gradient(${color} ${percentage * 3.6}deg, var(--border-color) ${percentage * 3.6}deg)`,
  }

  return (
    <div className="pte-ra-score-gauge">
      <div className="pte-ra-score-gauge__ring" style={gradientStyle}>
        <div className="pte-ra-score-gauge__inner">
          <span className="pte-ra-score-gauge__value">{score}</span>
          <span className="pte-ra-score-gauge__max">/90</span>
        </div>
      </div>
      <div className="pte-ra-score-gauge__label">
        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color }}>{icon}</span>
        {label}
      </div>
    </div>
  )
}

/* ─── Word Detail Popup ─── */
const LANG_OPTIONS = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'ko', label: 'KO', flag: '🇰🇷' },
  { code: 'zh-CN', label: 'ZH', flag: '🇨🇳' },
]

function WordDetailPopup({ wordInfo, recording, onClose, onNotFound }) {
  const normalizedWordInfo = typeof wordInfo === 'string'
    ? { word: wordInfo, dictionaryAvailable: isDictionaryLookupCandidate(wordInfo) }
    : (wordInfo || {})
  const word = normalizedWordInfo.word || ''
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [savingLogId, setSavingLogId] = useState(null)
  const [isFav, setIsFav] = useState(false)
  const [defLang, setDefLang] = useState('en')
  const [translatedDefs, setTranslatedDefs] = useState({})
  const [translating, setTranslating] = useState(false)
  const [translatedWord, setTranslatedWord] = useState(null)
  const [userClipUrl, setUserClipUrl] = useState(null)
  const [userClipState, setUserClipState] = useState('idle')
  const audioRef = useRef(null)
  const userAudioRef = useRef(null)

  const { tokens, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (!word) return
    setLoading(true)
    setDetail(null)
    setSaved(false)
    setIsFav(false)
    setSavingLogId(null)
    setDefLang('en')
    setTranslatedDefs({})
    setTranslatedWord(null)

    if (normalizedWordInfo.dictionaryAvailable === false || !isDictionaryLookupCandidate(word)) {
      setDetail({
        word,
        originalWord: word,
        phonetic: '',
        audioUrl: null,
        meanings: [],
        dictionaryUnavailable: true,
      })
      setLoading(false)
      return
    }

    fetchWordDetail(word).then(d => {
      setDetail(d || {
        word,
        originalWord: word,
        phonetic: '',
        audioUrl: null,
        meanings: [],
        dictionaryUnavailable: true,
      })
      setLoading(false)
      if (!d) onNotFound?.(word)
    })
  }, [word, normalizedWordInfo.dictionaryAvailable, onNotFound])

  useEffect(() => {
    let revokedUrl = null
    let cancelled = false

    const buildUserClip = async () => {
      setUserClipUrl(null)

      setUserClipState('loading')

      try {
        if (!recording?.blob) {
          setUserClipState('unavailable')
          return
        }

        const pcm = await decodeBlobToPCM(recording.blob)
        const duration = pcm.length / 16000
        let start = normalizedWordInfo.spokenStart
        let end = normalizedWordInfo.spokenEnd

        const hasRealTiming = Number.isFinite(start)
          && Number.isFinite(end)
          && end > start
          && normalizedWordInfo.timingEstimated !== true

        if (!hasRealTiming) {
          setUserClipState('unavailable')
          return
        }

        start = Math.max(0, start - 0.06)
        end = Math.min(duration, Math.max(end + 0.1, start + 0.18))
        const startIndex = Math.max(0, Math.floor(start * 16000))
        const endIndex = Math.min(pcm.length, Math.ceil(end * 16000))
        const clipSamples = pcm.slice(startIndex, endIndex)

        if (!clipSamples.length) {
          setUserClipState('unavailable')
          return
        }

        const clipBlob = encodeWAV(clipSamples)
        const clipUrl = URL.createObjectURL(clipBlob)
        if (cancelled) {
          URL.revokeObjectURL(clipUrl)
          return
        }

        revokedUrl = clipUrl
        setUserClipUrl(clipUrl)
        setUserClipState('ready')
      } catch (error) {
        console.warn('[PTE] Failed to build per-word user audio clip:', error)
        if (!cancelled) setUserClipState('error')
      }
    }

    if (!normalizedWordInfo.word) return undefined
    buildUserClip()

    return () => {
      cancelled = true
      if (revokedUrl) URL.revokeObjectURL(revokedUrl)
    }
  }, [recording, normalizedWordInfo.word, normalizedWordInfo.spokenStart, normalizedWordInfo.spokenEnd, normalizedWordInfo.timingEstimated])

  // Translate definitions when language changes
  useEffect(() => {
    if (defLang === 'en' || !detail) return

    const cacheKey = `${detail.word}_${defLang}`
    if (translatedDefs[cacheKey]) return

    setTranslating(true)

    const allDefs = detail.meanings.flatMap(m =>
      m.definitions.map(d => d.definition)
    )
    const wordToTranslate = detail.originalWord || detail.word

    Promise.all([
      translateWord(wordToTranslate, defLang),
      ...allDefs.map(def => translateWord(def, defLang))
    ]).then(([wordTrans, ...defTranslations]) => {
      setTranslatedWord(wordTrans)
      const translatedMap = {}
      let idx = 0
      detail.meanings.forEach((m) => {
        m.definitions.forEach((d) => {
          translatedMap[d.definition] = defTranslations[idx] || d.definition
          idx++
        })
      })
      setTranslatedDefs(prev => ({ ...prev, [cacheKey]: translatedMap }))
      setTranslating(false)
    }).catch(() => setTranslating(false))
  }, [defLang, detail])

  const speakWordTTS = (txt) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      primeAudioOutput()
      const utterance = createEnglishUtterance(txt)
      setTimeout(() => window.speechSynthesis.speak(utterance), 80)
    }
  }

  const handlePlayAudio = () => {
    if (detail?.audioUrl && audioRef.current) {
      primeAudioOutput()
      audioRef.current.src = detail.audioUrl
      audioRef.current.currentTime = 0
      setTimeout(() => {
        audioRef.current?.play().catch(err => {
          console.warn('Audio play failed, falling back to TTS:', err)
          speakWordTTS(detail.word)
        })
      }, 80)
    } else if (detail?.word) {
      speakWordTTS(detail.word)
    }
  }

  const handlePlayUserClip = () => {
    if (!userClipUrl || !userAudioRef.current) return
    primeAudioOutput()
    userAudioRef.current.currentTime = 0
    setTimeout(() => {
      userAudioRef.current?.play().catch((error) => {
        console.warn('[PTE] User clip playback failed:', error)
      })
    }, 40)
  }

  const handleSave = async () => {
    if (!isAuthenticated || !tokens?.access_token || !detail) return
    const definition = detail.meanings?.[0]?.definitions?.[0]?.definition || ''
    const log = await saveWordToPTE(detail.word, definition, detail.phonetic, tokens.access_token)
    if (log) {
      setSavingLogId(log.id)
      setSaved(true)
    }
  }

  const handleToggleFav = async () => {
    if (!savingLogId || !tokens?.access_token) return
    const result = await toggleWordFavorite(savingLogId, tokens.access_token)
    if (result) setIsFav(result.is_favorite)
  }

  const getTranslatedDef = (originalDef) => {
    if (defLang === 'en') return originalDef
    const cacheKey = `${detail.word}_${defLang}`
    return translatedDefs[cacheKey]?.[originalDef] || originalDef
  }

  if (!word) return null

  return (
    <div className="pte-word-popup-overlay" onClick={onClose}>
      <div className="pte-word-popup" onClick={e => e.stopPropagation()}>
        <button className="pte-word-popup__close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        {loading ? (
          <div className="pte-word-popup__loading">
            <div className="pte-ra-spinner" />
            <span>Looking up "{word}"...</span>
          </div>
        ) : detail ? (
          <>
            <div className="pte-word-popup__header">
              <h3 className="pte-word-popup__word">{detail.originalWord || detail.word}</h3>
              {detail.phonetic && (
                <span className="pte-word-popup__phonetic">{detail.phonetic}</span>
              )}
              <button className="pte-word-popup__audio-btn" onClick={handlePlayAudio} title="Play pronunciation">
                <span className="material-symbols-outlined">volume_up</span>
              </button>
              <audio ref={audioRef} />
            </div>

            {detail.partialMatch && (
              <div className="pte-word-popup__partial-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>info</span>
                Showing definition for "{detail.word}" (part of "{detail.originalWord}")
              </div>
            )}

            <div className="pte-word-popup__compare">
              <div className="pte-word-popup__compare-card">
                <div className="pte-word-popup__compare-label">Your recording</div>
                <div className="pte-word-popup__compare-word">
                  {normalizedWordInfo.matchedAs || (normalizedWordInfo.status === 'missed' ? 'Not clearly detected' : detail.originalWord || detail.word)}
                </div>
                {normalizedWordInfo.matchedAs && normalizedWordInfo.matchedAs !== normalizedWordInfo.word && (
                  <div className="pte-word-popup__compare-note">
                    Heard this as “{normalizedWordInfo.matchedAs}”
                  </div>
                )}
                {!normalizedWordInfo.timingEstimated && normalizedWordInfo.timingSourceEngine && normalizedWordInfo.timingSourceEngine !== 'browser' && (
                  <div className="pte-word-popup__compare-note">
                    Word timing matched using {normalizedWordInfo.timingSourceEngine === 'server' ? 'Server' : 'Local AI'} alignment.
                  </div>
                )}
                {normalizedWordInfo.timingEstimated && (
                  <div className="pte-word-popup__compare-note">
                    A reliable per-word clip was not available for this engine, so nearby audio is not used as “your word”.
                  </div>
                )}
                {userClipState === 'ready' ? (
                  <button className="pte-word-popup__compare-btn" onClick={handlePlayUserClip}>
                    <span className="material-symbols-outlined">graphic_eq</span>
                    Play my word
                  </button>
                ) : (
                  <div className="pte-word-popup__compare-empty">
                    {userClipState === 'loading'
                      ? 'Preparing your spoken word...'
                      : normalizedWordInfo.timingEstimated
                        ? 'This result does not have precise word timing. Use Local AI or Server for tighter word-level matching.'
                        : 'Your per-word clip is unavailable for this result.'}
                  </div>
                )}
                <audio ref={userAudioRef} src={userClipUrl || undefined} />
              </div>

              <div className="pte-word-popup__compare-card">
                <div className="pte-word-popup__compare-label">Correct pronunciation</div>
                <div className="pte-word-popup__compare-word">{detail.originalWord || detail.word}</div>
                <div className="pte-word-popup__compare-note">
                  {detail.phonetic || 'Use the target pronunciation as your model.'}
                </div>
                <button className="pte-word-popup__compare-btn pte-word-popup__compare-btn--target" onClick={handlePlayAudio}>
                  <span className="material-symbols-outlined">volume_up</span>
                  Play correct word
                </button>
              </div>
            </div>

            {/* Translation word display */}
            {defLang !== 'en' && translatedWord && (
              <div className="pte-word-popup__translation-word">
                {translatedWord}
              </div>
            )}

            {detail.meanings?.length > 0 ? (
              <>
                {/* Language toggle */}
                <div className="pte-word-popup__lang-toggle">
                  {LANG_OPTIONS.map(lang => (
                    <button
                      key={lang.code}
                      className={`pte-word-popup__lang-btn ${defLang === lang.code ? 'pte-word-popup__lang-btn--active' : ''}`}
                      onClick={() => setDefLang(lang.code)}
                    >
                      <span className="pte-word-popup__lang-flag">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                  {translating && <div className="pte-ra-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
                </div>

                <div className="pte-word-popup__meanings">
                  {detail.meanings.map((m, i) => (
                    <div key={i} className="pte-word-popup__meaning">
                      <span className="pte-word-popup__pos">{m.partOfSpeech}</span>
                      {m.definitions.map((d, j) => (
                        <div key={j} className="pte-word-popup__def">
                          <p>{getTranslatedDef(d.definition)}</p>
                          {d.example && <p className="pte-word-popup__example">"{d.example}"</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="pte-word-popup__actions">
                  <span className="pte-word-popup__provider">
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>dictionary</span>
                    Google Dictionary
                  </span>
                  {isAuthenticated && (
                    <>
                      {!saved ? (
                        <button className="pte-word-popup__save-btn" onClick={handleSave} title="Save to my words (PTE)">
                          <span className="material-symbols-outlined">bookmark_add</span>
                          Save
                        </button>
                      ) : (
                        <button
                          className={`pte-word-popup__fav-btn ${isFav ? 'pte-word-popup__fav-btn--active' : ''}`}
                          onClick={handleToggleFav}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <span className="material-symbols-outlined">{isFav ? 'star' : 'star_outline'}</span>
                          {isFav ? 'Favorited' : 'Favorite'}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {saved && <div className="pte-word-popup__saved-tag">✅ Saved as PTE word</div>}
              </>
            ) : (
              <div className="pte-word-popup__compare-empty pte-word-popup__compare-empty--dictionary">
                Dictionary meaning is unavailable for this word, but you can still compare your pronunciation with the target audio above.
              </div>
            )}
          </>
        ) : (
          <div className="pte-word-popup__not-found">
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>search_off</span>
            <p>No dictionary entry found for "{word}"</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Analysis Result Component (per-engine, stackable) ─── */
function AnalysisResult({
  analysis,
  engineLabel,
  onWordClick,
  unavailableDictionaryWords,
  dictionaryAvailability,
}) {
  const [tipsLang, setTipsLang] = useState('en')
  const [translatedTips, setTranslatedTips] = useState({})
  const [tipsTranslating, setTipsTranslating] = useState(false)
  const [diagnosticsLang, setDiagnosticsLang] = useState('en')
  const [translatedDiagnostics, setTranslatedDiagnostics] = useState({})
  const [diagnosticsTranslating, setDiagnosticsTranslating] = useState(false)

  // Translate tips when language changes
  useEffect(() => {
    if (tipsLang === 'en' || !analysis?.tips?.length) return
    const cacheKey = `${engineLabel}_${tipsLang}`
    if (translatedTips[cacheKey]) return

    setTipsTranslating(true)
    Promise.all(
      analysis.tips.map(tip => translateWord(tip, tipsLang))
    ).then(results => {
      const map = {}
      analysis.tips.forEach((tip, i) => { map[tip] = results[i] || tip })
      setTranslatedTips(prev => ({ ...prev, [cacheKey]: map }))
      setTipsTranslating(false)
    }).catch(() => setTipsTranslating(false))
  }, [tipsLang, analysis, engineLabel])

  const getTranslatedTip = (tip) => {
    if (tipsLang === 'en') return tip
    const cacheKey = `${engineLabel}_${tipsLang}`
    return translatedTips[cacheKey]?.[tip] || tip
  }

  const diagnosticCards = useMemo(() => {
    if (!analysis?.diagnostics) return []
    return [
      { key: 'speed', label: 'Speed', icon: 'speed' },
      { key: 'pauseControl', label: 'Pause Control', icon: 'pause_circle' },
      { key: 'stress', label: 'Stress', icon: 'graphic_eq' },
      { key: 'intonation', label: 'Intonation', icon: 'show_chart' },
      { key: 'rhythm', label: 'Rhythm', icon: 'timeline' },
      { key: 'completeness', label: 'Delivery', icon: 'mic' },
    ].map((item) => {
      const score = analysis.diagnostics.scores?.[item.key] || 0
      return {
        ...item,
        score,
        level: getDiagnosticLevel(score),
        hint: getDiagnosticHint(item.key, analysis.diagnostics),
        explanation: getDiagnosticExplanation(item.key, score, analysis.diagnostics),
      }
    })
  }, [analysis])

  useEffect(() => {
    if (diagnosticsLang === 'en' || !analysis?.diagnostics) return

    const cacheKey = `${engineLabel}_${diagnosticsLang}_${analysis.overall}`
    if (translatedDiagnostics[cacheKey]) return

    const summaryText = 'Practice-oriented feedback for Speed, Pause Control, Rhythm, Stress, and Intonation.'
    const metrics = [
      summaryText,
      ...diagnosticCards.flatMap((card) => [card.hint, card.explanation]),
    ].filter(Boolean)

    const uniqueTexts = [...new Set(metrics)]
    setDiagnosticsTranslating(true)
    Promise.all(uniqueTexts.map((text) => translateWord(text, diagnosticsLang)))
      .then((results) => {
        const mapped = {}
        uniqueTexts.forEach((text, index) => {
          mapped[text] = results[index] || text
        })
        setTranslatedDiagnostics((previous) => ({ ...previous, [cacheKey]: mapped }))
        setDiagnosticsTranslating(false)
      })
      .catch(() => setDiagnosticsTranslating(false))
  }, [analysis, diagnosticCards, diagnosticsLang, engineLabel, translatedDiagnostics])

  const getTranslatedDiagnostic = (text) => {
    if (diagnosticsLang === 'en') return text
    const cacheKey = `${engineLabel}_${diagnosticsLang}_${analysis?.overall}`
    return translatedDiagnostics[cacheKey]?.[text] || text
  }

  const getDiagnosticsSubtitle = () => {
    if (diagnosticsLang === 'ko') {
      return 'Speed, Pause Control, Rhythm, Stress, Intonation에 대한 실전 중심 피드백입니다.'
    }
    if (diagnosticsLang === 'zh') {
      return '这是针对 Speed、Pause Control、Rhythm、Stress、Intonation 的实战型反馈。'
    }
    return 'Practice-oriented feedback for Speed, Pause Control, Rhythm, Stress, and Intonation.'
  }

  if (!analysis) return null

  return (
    <div className="pte-ra-analysis">
      {/* Engine tag + overall score inline */}
      <div className="pte-ra-analysis__header-row">
        <div className="pte-ra-analysis__engine-tag">
          {engineLabel}
        </div>
        <div className="pte-ra-analysis__overall">
          <span className="pte-ra-analysis__overall-label">Overall</span>
          <span className="pte-ra-analysis__overall-score">{analysis.overall}</span>
          <span className="pte-ra-analysis__overall-max">/ 90</span>
        </div>
      </div>

      {/* Score gauges */}
      <div className="pte-ra-scores">
        <ScoreGauge label="Content" score={analysis.content} icon="fact_check" color="#22c55e" />
        <ScoreGauge label="Fluency" score={analysis.fluency} icon="waves" color="#3b82f6" />
        <ScoreGauge label="Pronunciation" score={analysis.pronunciation} icon="record_voice_over" color="#f59e0b" />
      </div>

      {/* Stats row */}
      {analysis.stats && (
        <div className="pte-ra-analysis__stats">
          <span>✅ {analysis.stats.exactMatches} exact</span>
          <span>🟡 {analysis.stats.closeMatches} close</span>
          <span>❌ {analysis.stats.missed} missed</span>
          <span>📝 {analysis.stats.recognized} recognized / {analysis.stats.totalWords} original</span>
        </div>
      )}

      {analysis.diagnostics && (
        <div className="pte-ra-diagnostics">
          <div className="pte-ra-diagnostics__header">
            <div>
              <h5 className="pte-ra-diagnostics__title">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>equalizer</span>
                Speech Skill Analysis
              </h5>
              <p className="pte-ra-diagnostics__subtitle">
                {getDiagnosticsSubtitle()}
              </p>
            </div>
            <div className="pte-ra-diagnostics__header-controls">
              <div className="pte-ra-tips__lang-toggle">
                {LANG_OPTIONS.map(lang => (
                  <button
                    key={`diag-${lang.code}`}
                    className={`pte-word-popup__lang-btn ${diagnosticsLang === lang.code ? 'pte-word-popup__lang-btn--active' : ''}`}
                    onClick={() => setDiagnosticsLang(lang.code)}
                  >
                    <span className="pte-word-popup__lang-flag">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
                {diagnosticsTranslating && <div className="pte-ra-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
              </div>
              <div className="pte-ra-diagnostics__summary">
                <span>{analysis.diagnostics.durationSec}s audio</span>
                <span>{analysis.diagnostics.speechRatio}% voiced</span>
              </div>
            </div>
          </div>

          <div className="pte-ra-diagnostics__grid">
            {diagnosticCards.map((item) => {
              return (
                <div key={item.key} className={`pte-ra-diagnostic-card pte-ra-diagnostic-card--${item.level}`}>
                  <div className="pte-ra-diagnostic-card__top">
                    <div className="pte-ra-diagnostic-card__label">
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{item.icon}</span>
                      {item.label}
                    </div>
                    <strong>{item.score}/90</strong>
                  </div>
                  <div className="pte-ra-diagnostic-card__bar">
                    <div
                      className="pte-ra-diagnostic-card__fill"
                      style={{ width: `${Math.max(4, (item.score / 90) * 100)}%` }}
                    />
                  </div>
                  <div className="pte-ra-diagnostic-card__hint">
                    {getTranslatedDiagnostic(item.hint)}
                  </div>
                  <div className="pte-ra-diagnostic-card__explanation">
                    {getTranslatedDiagnostic(item.explanation)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pte-ra-diagnostics__metrics">
            <span>Speech pace: <strong>{analysis.diagnostics.speechWpm} WPM</strong></span>
            <span>Pauses: <strong>{analysis.diagnostics.pauseCount}</strong></span>
            <span>Average pause: <strong>{analysis.diagnostics.averagePauseMs} ms</strong></span>
            <span>Longest pause: <strong>{analysis.diagnostics.longestPauseMs} ms</strong></span>
          </div>
        </div>
      )}

      {Array.isArray(analysis.diagnostics?.perWordProsody) && analysis.diagnostics.perWordProsody.length > 0 && (
        <div className="pte-ra-prosody-map">
          <div className="pte-ra-prosody-map__header">
            <div>
              <h5 className="pte-ra-prosody-map__title">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>tune</span>
                Word-level prosody map
              </h5>
              <p className="pte-ra-prosody-map__subtitle">
                {getTranslatedDiagnostic('Each word is shaded by estimated stress and pitch movement from your recording.')}
              </p>
            </div>
          </div>

          <div className="pte-ra-prosody-map__section">
            <div className="pte-ra-prosody-map__label">Stress</div>
            <div className="pte-ra-prosody-map__words">
              {analysis.diagnostics.perWordProsody.map((item, index) => (
                <span
                  key={`stress-${index}-${item.word}`}
                  className={`pte-ra-prosody-word pte-ra-prosody-word--stress pte-ra-prosody-word--${item.stressLevel}`}
                  title={`${item.word} · stress ${item.stressLevel}${item.estimated ? ' · estimated timing' : ''}`}
                >
                  {item.word}
                </span>
              ))}
            </div>
          </div>

          <div className="pte-ra-prosody-map__section">
            <div className="pte-ra-prosody-map__label">Intonation</div>
            <div className="pte-ra-prosody-map__words">
              {analysis.diagnostics.perWordProsody.map((item, index) => (
                <span
                  key={`pitch-${index}-${item.word}`}
                  className={`pte-ra-prosody-word pte-ra-prosody-word--pitch pte-ra-prosody-word--${item.intonationLevel}`}
                  title={`${item.word} · pitch ${item.intonationLevel}${item.estimated ? ' · estimated timing' : ''}`}
                >
                  {item.word}
                </span>
              ))}
            </div>
          </div>

          <div className="pte-ra-prosody-map__legend">
            <span><span className="pte-ra-prosody-dot pte-ra-prosody-dot--light" />lighter</span>
            <span><span className="pte-ra-prosody-dot pte-ra-prosody-dot--medium" />medium</span>
            <span><span className="pte-ra-prosody-dot pte-ra-prosody-dot--high" />strong</span>
            <span><span className="pte-ra-prosody-dot pte-ra-prosody-dot--rise" />rise</span>
            <span><span className="pte-ra-prosody-dot pte-ra-prosody-dot--fall" />fall</span>
          </div>
        </div>
      )}

      {/* Word-level diff — clickable */}
      <div className="pte-ra-word-diff">
        <h5 className="pte-ra-word-diff__title">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>text_compare</span>
          Word-by-Word Breakdown
          <span className="pte-ra-word-diff__hint">click a word to compare your audio vs target</span>
        </h5>
        <div className="pte-ra-word-diff__legend">
          <span><span className="pte-ra-word pte-ra-word--correct">correct</span> Spoken correctly</span>
          <span><span className="pte-ra-word pte-ra-word--close">close</span> Close match</span>
          <span><span className="pte-ra-word pte-ra-word--missed">missed</span> Not detected</span>
        </div>
        <div className="pte-ra-word-diff__text">
          {analysis.wordDiff.map((w, i) => (
            (() => {
              const lookupKey = getDictionaryLookupKey(w.word)
              const candidate = isDictionaryLookupCandidate(w.word)
              const availability = dictionaryAvailability?.[lookupKey]
              const dictionaryAvailable = candidate
                && availability !== 'unavailable'
                && !unavailableDictionaryWords?.has(lookupKey)

              const title = dictionaryAvailable
                ? w.status === 'close' ? `Heard as: "${w.matchedAs}"` : w.status === 'missed' ? 'Not detected' : 'Correct'
                : availability === 'checking'
                  ? 'Checking dictionary entry'
                  : w.status === 'close'
                    ? `Heard as: "${w.matchedAs}". Dictionary unavailable.`
                    : w.status === 'missed'
                      ? 'Not detected. Dictionary unavailable.'
                      : 'Dictionary unavailable. Open pronunciation compare.'

              return (
                <span
                  key={i}
                  className={`pte-ra-word pte-ra-word--${w.status} ${onWordClick ? 'pte-ra-word--clickable' : ''}`}
                  title={title}
                  onClick={onWordClick ? () => onWordClick({
                    ...w,
                    dictionaryAvailable,
                    lookupKey,
                    wordIndex: i,
                    totalWords: analysis.wordDiff.length,
                  }) : undefined}
                >
                  {w.word}
                </span>
              )
            })()
          ))}
        </div>
      </div>

      {/* Improvement tips */}
      {analysis.tips.length > 0 && (
        <div className="pte-ra-tips">
          <div className="pte-ra-tips__header">
            <h5 className="pte-ra-tips__title">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>lightbulb</span>
              Improvement Tips
            </h5>
            <div className="pte-ra-tips__lang-toggle">
              {LANG_OPTIONS.map(lang => (
                <button
                  key={lang.code}
                  className={`pte-word-popup__lang-btn ${tipsLang === lang.code ? 'pte-word-popup__lang-btn--active' : ''}`}
                  onClick={() => setTipsLang(lang.code)}
                >
                  <span className="pte-word-popup__lang-flag">{lang.flag}</span>
                  {lang.label}
                </button>
              ))}
              {tipsTranslating && <div className="pte-ra-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
            </div>
          </div>
          <ul>
            {analysis.tips.map((tip, i) => (
              <li key={i}>{getTranslatedTip(tip)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ─── Shuffle utility ─── */
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ─── Source Friendly Name utility ─── */
function getSourceFriendlyName(source) {
  if (!source) return 'PTE Practice'
  if (!source.startsWith('http')) return source // e.g. "AI-Generated Practice" or "PTE Practice"
  
  const lower = source.toLowerCase()
  if (lower.includes('canada.ca')) return 'Canada.ca (IRCC)'
  if (lower.includes('pearsonpte.com')) return 'Pearson PTE Core'
  if (lower.includes('apeuni.com')) return 'APEUni'
  if (lower.includes('alfapte.com')) return 'Alfa PTE'
  if (lower.includes('gurully.com')) return 'Gurully'
  if (lower.includes('ptesuccess.com')) return 'PTE Success'
  if (lower.includes('ptemagic.com')) return 'PTE Magic'
  if (lower.includes('e2language.com')) return 'E2 Language'
  if (lower.includes('onepte.com')) return 'OnePTE'
  if (lower.includes('easypte.com')) return 'EasyPTE'
  
  try {
    const url = new URL(source)
    return url.hostname.replace('www.', '')
  } catch (e) {
    return 'PTE Reference Source'
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

const NON_DICTIONARY_LOOKUP_WORDS = new Set([
  'ai',
  'api',
  'apeuni',
  'alfapte',
  'canada.ca',
  'e2',
  'easypte',
  'gurully',
  'ielts',
  'ircc',
  'onepte',
  'pte',
  'pte-a',
  'wasm',
])

function getDictionaryLookupKey(word = '') {
  return word
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[“”"()[\]{}.,!?;:]/g, '')
    .replace(/[’]/g, "'")
    .replace(/^'+|'+$/g, '')
}

function isDictionaryLookupCandidate(word = '') {
  const raw = word.toString().trim()
  const key = getDictionaryLookupKey(raw)

  if (!key || key.length < 2) return false
  if (NON_DICTIONARY_LOOKUP_WORDS.has(key)) return false
  if (/^[A-Z]{2,}$/.test(raw.replace(/[^A-Za-z]/g, ''))) return false
  if (!/^[a-z]+(?:'[a-z]+)?$/.test(key)) return false

  return true
}


/* ─── Read Aloud Practice ─── */
function ReadAloudPractice({
  color,
  onClose,
  initialMode = 'real',
  realQuestions = readAloudQuestions,
  similarPracticeQuestions = similarQuestions,
  taskLabel = 'Read Aloud',
  isRepeatSentence = false,
}) {
  // Question mode: 'real' (actual PTE-style) or 'similar' (AI-generated)
  const [questionMode, setQuestionMode] = useState(() => (
    initialMode === 'real' && realQuestions.length === 0 && similarPracticeQuestions.length > 0
      ? 'similar'
      : initialMode
  ))

  // Shuffle questions on mount per mode
  const shuffledReal = useMemo(() => shuffleArray(realQuestions), [realQuestions])
  const shuffledSimilar = useMemo(() => shuffleArray(similarPracticeQuestions), [similarPracticeQuestions])
  const shuffledQuestions = questionMode === 'real' ? shuffledReal : shuffledSimilar

  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState(isRepeatSentence ? 'listening' : 'preparing') // 'listening', 'preparing', 'recording', 'completed'
  const [timeLeft, setTimeLeft] = useState(isRepeatSentence ? 0 : 35) // RA prep: 35s, recording: 40s; RS records immediately after audio
  
  // Per-engine analysis state
  const [engineResults, setEngineResults] = useState({ browser: null, wasm: null, server: null })
  const [engineLoading, setEngineLoading] = useState({ browser: false, wasm: false, server: false })
  const [engineErrors, setEngineErrors] = useState({ browser: null, wasm: null, server: null })
  const [activeEngine, setActiveEngine] = useState(null) // which engine result is shown inline
  const [browserFallbackEngine, setBrowserFallbackEngine] = useState(null)
  const [repeatAudioError, setRepeatAudioError] = useState(null)
  const [repeatPreviewState, setRepeatPreviewState] = useState('idle') // 'idle' | 'playing' | 'paused'
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [activeChunkIdx, setActiveChunkIdx] = useState(-1)

  // Word detail popup
  const [selectedWord, setSelectedWord] = useState(null)
  const [unavailableDictionaryWords, setUnavailableDictionaryWords] = useState(() => new Set())
  const [dictionaryAvailability, setDictionaryAvailability] = useState({})

  const markDictionaryUnavailable = useCallback((word) => {
    const normalized = getDictionaryLookupKey(word)
    if (!normalized) return
    setUnavailableDictionaryWords((previous) => new Set(previous).add(normalized))
    setDictionaryAvailability((previous) => ({ ...previous, [normalized]: 'unavailable' }))
  }, [])

  // Track completed questions for cumulative download
  const completedRef = useRef([])
  const [completedCount, setCompletedCount] = useState(0)

  // Track weak words across all tests (missed + close)
  const weakWordsRef = useRef(new Map()) // Map<word, { word, status, matchedAs, count, engine }>
  const [weakWordsCount, setWeakWordsCount] = useState(0)
  const [showWeakWords, setShowWeakWords] = useState(false)

  const timerRef = useRef(null)
  const webSpeechTextRef = useRef('')
  const webSpeechInterimRef = useRef('')
  const isRecordingRef = useRef(false)
  const stopRecordingRef = useRef(null)
  const stopWebSpeechRef = useRef(null)
  const repeatPromptAudioRef = useRef(null)
  const pcmCacheRef = useRef(new Map())
  const autoAdvanceTimerRef = useRef(null)

  const clearPendingAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }, [])
  
  const { isRecording, recordings, startRecording, stopRecording, downloadRecording } = useRecording()
  
  // Web Speech API for concurrent recognition during recording
  const webSpeechResultHandler = useCallback((text, isFinal) => {
    if (!text) return

    if (isFinal) {
      webSpeechTextRef.current += text + ' '
      webSpeechInterimRef.current = ''
    } else {
      // Chromium can keep the final phrase as interim until recognition ends.
      // Keep it as a safe fallback instead of reporting an empty capture.
      webSpeechInterimRef.current = text
    }
  }, [])
  
  const webSpeech = useWebSpeechInput({
    language: 'en-US',
    onResult: webSpeechResultHandler,
    continuous: true,
  })

  useEffect(() => {
    isRecordingRef.current = isRecording
    stopRecordingRef.current = stopRecording
    stopWebSpeechRef.current = webSpeech.stop
  }, [isRecording, stopRecording, webSpeech.stop])
  
  const currentQuestion = shuffledQuestions[currentIdx]
  const chunkGuide = useMemo(
    () => buildChunkGuide(currentQuestion?.text || '', { isRepeatSentence }),
    [currentQuestion?.text, isRepeatSentence],
  )

  const getRecordingPCM = useCallback(async (recording) => {
    if (!recording?.blob) return { pcm: null, duration: 0 }
    const cached = pcmCacheRef.current.get(recording.id)
    if (cached) return cached

    const pcm = await decodeBlobToPCM(recording.blob)
    const value = { pcm, duration: pcm.length / 16000 }
    pcmCacheRef.current.set(recording.id, value)
    return value
  }, [])

  const estimateRecognizedWordTimings = useCallback(async (analysis, recording) => {
    if (!analysis?.recognizedWords?.length || !recording?.blob) return []

    const { duration } = await getRecordingPCM(recording)
    if (!duration) return []

    const words = analysis.recognizedWords
    const weights = words.map((word) => Math.max(1, (word || '').replace(/[^a-z]/gi, '').length))
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || words.length
    const leadIn = Math.min(0.16, duration * 0.08)
    const usableDuration = Math.max(0.2, duration - leadIn)

    let cursor = leadIn
    return words.map((word, index) => {
      const share = usableDuration * (weights[index] / totalWeight)
      const start = cursor
      const end = index === words.length - 1 ? duration : Math.min(duration, cursor + share)
      cursor = end
      return {
        word,
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
      }
    })
  }, [getRecordingPCM])

  const enrichAnalysisPlayback = useCallback(async (analysis, recording, sttResponse = null) => {
    if (!analysis) return analysis

    let timedWords = extractTimedWordsFromSTTResponse(sttResponse)
    if (!timedWords.length && Array.isArray(analysis.recognizedWordTimings) && analysis.recognizedWordTimings.length) {
      timedWords = analysis.recognizedWordTimings
    }
    if (!timedWords.length) {
      timedWords = await estimateRecognizedWordTimings(analysis, recording)
    }

    const { pcm, duration } = await getRecordingPCM(recording)
    const timingApplied = applyWordTimingsToAnalysis(analysis, timedWords, duration)
    const diagnostics = analyzeSpeechDiagnostics(
      currentQuestion?.text || '',
      timingApplied?.recognizedText || '',
      pcm,
      {
        sampleRate: 16000,
        wordTimings: timedWords,
        taskType: isRepeatSentence ? 'rs' : 'ra',
        alignedWords: timingApplied?.wordDiff || [],
      },
    )

    const diagnosticTips = Array.isArray(diagnostics?.tips) ? diagnostics.tips : []
    const mergedTips = [
      ...(Array.isArray(timingApplied?.tips) ? timingApplied.tips : []),
      ...diagnosticTips.filter((tip) => !(timingApplied?.tips || []).includes(tip)),
    ]

    return {
      ...timingApplied,
      diagnostics,
      tips: mergedTips,
    }
  }, [currentQuestion?.text, estimateRecognizedWordTimings, getRecordingPCM])

  // Shadowing TTS States
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [ttsMode, setTtsMode] = useState('continuous') // 'continuous' | 'shadowing'
  const [ttsActiveIdx, setTtsActiveIdx] = useState(-1)
  const [ttsState, setTtsState] = useState('idle') // 'idle' | 'speaking' | 'pausing'
  const [ttsPauseLeft, setTtsPauseLeft] = useState(0)
  const [ttsRate, setTtsRate] = useState(1.0)
  const ttsTimerRef = useRef(null)
  const utteranceRef = useRef(null)

  // Split question text into sentences
  const sentences = useMemo(() => {
    if (!currentQuestion?.text) return []
    const matches = currentQuestion.text.match(/[^.!?]+[.!?]+(\s+|$)/g)
    return matches ? matches.map(s => s.trim()) : [currentQuestion.text.trim()]
  }, [currentQuestion])

  const ttsPlayingRef = useRef(ttsPlaying)
  const ttsModeRef = useRef(ttsMode)
  const ttsActiveIdxRef = useRef(ttsActiveIdx)
  const ttsRateRef = useRef(ttsRate)
  const ttsStateRef = useRef(ttsState)
  const speechStartTimerRef = useRef(null)

  const queueSpeech = useCallback((utterance, shouldSpeak = () => true) => {
    if (!('speechSynthesis' in window) || !shouldSpeak()) return

    if (speechStartTimerRef.current) clearTimeout(speechStartTimerRef.current)
    const synth = window.speechSynthesis
    const needsReset = synth.speaking || synth.pending || synth.paused
    if (needsReset) synth.cancel()

    const englishVoice = synth.getVoices().find((voice) => /^en-US$/i.test(voice.lang))
      || synth.getVoices().find((voice) => /^en-/i.test(voice.lang))
    if (englishVoice) utterance.voice = englishVoice

    const startSpeech = () => {
      if (!shouldSpeak()) return
      primeAudioOutput()
      synth.resume()
      synth.speak(utterance)
    }

    // A delay is only needed when replacing an active utterance. Fresh playback
    // starts as a single utterance, avoiding both the initial pause and clipping.
    if (needsReset) {
      speechStartTimerRef.current = setTimeout(startSpeech, 180)
    } else {
      startSpeech()
    }
  }, [])

  const stopRepeatPromptAudio = useCallback(() => {
    const audio = repeatPromptAudioRef.current
    if (!audio) return

    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.currentTime = 0
    repeatPromptAudioRef.current = null
  }, [])

  const playRepeatPromptAudio = useCallback((onEnded, onError) => {
    if (!currentQuestion?.audioUrl) return false

    stopRepeatPromptAudio()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    primeAudioOutput()
    const audio = new Audio(currentQuestion.audioUrl)
    audio.preload = 'auto'
    repeatPromptAudioRef.current = audio

    audio.onended = () => {
      repeatPromptAudioRef.current = null
      onEnded?.()
    }
    audio.onerror = () => {
      repeatPromptAudioRef.current = null
      onError?.()
    }
    audio.play().catch(() => {
      repeatPromptAudioRef.current = null
      onError?.()
    })

    return true
  }, [currentQuestion?.audioUrl, stopRepeatPromptAudio])
  
  useEffect(() => {
    ttsPlayingRef.current = ttsPlaying
  }, [ttsPlaying])
  
  useEffect(() => {
    ttsModeRef.current = ttsMode
  }, [ttsMode])
  
  useEffect(() => {
    ttsActiveIdxRef.current = ttsActiveIdx
  }, [ttsActiveIdx])

  useEffect(() => {
    ttsRateRef.current = ttsRate
  }, [ttsRate])

  useEffect(() => {
    ttsStateRef.current = ttsState
  }, [ttsState])

  const handleTtsStop = useCallback(() => {
    if (speechStartTimerRef.current) {
      clearTimeout(speechStartTimerRef.current)
      speechStartTimerRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    stopRepeatPromptAudio()
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    setTtsPlaying(false)
    setTtsActiveIdx(-1)
    setTtsState('idle')
    setTtsPauseLeft(0)
  }, [stopRepeatPromptAudio])

  const handleTtsPause = useCallback(() => {
    if (speechStartTimerRef.current) {
      clearTimeout(speechStartTimerRef.current)
      speechStartTimerRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    stopRepeatPromptAudio()
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    setTtsPlaying(false)
  }, [stopRepeatPromptAudio])

  const speakSentence = useCallback((idx) => {
    if (idx < 0 || idx >= sentences.length) return
    
    if ('speechSynthesis' in window) {
      const utterance = createEnglishUtterance(sentences[idx], { rate: ttsRateRef.current })

      utterance.onend = () => {
        if (!ttsPlayingRef.current) return
        
        if (ttsModeRef.current === 'continuous') {
          const nextIdx = ttsActiveIdxRef.current + 1
          if (nextIdx < sentences.length) {
            setTtsActiveIdx(nextIdx)
          } else {
            handleTtsStop()
          }
        } else {
          setTtsState('pausing')
          setTtsPauseLeft(10)
        }
      }

      utterance.onerror = (e) => {
        console.error('SpeechSynthesis error:', e)
        if (e.error !== 'interrupted') {
          handleTtsStop()
        }
      }

      queueSpeech(utterance, () => ttsPlayingRef.current)
    }
  }, [sentences, handleTtsStop, queueSpeech])

  const handleTtsPlay = useCallback(() => {
    if (sentences.length === 0) return
    
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    
    setTtsPlaying(true)
    
    if (ttsActiveIdx === -1) {
      setTtsActiveIdx(0)
    }
    
    setTtsState('speaking')
  }, [sentences, ttsActiveIdx])

  const handleTtsReplay = useCallback(() => {
    if (sentences.length === 0) return
    
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    
    const wasPlaying = ttsPlaying
    const wasSpeaking = ttsState === 'speaking'
    
    let targetIdx = ttsActiveIdx
    if (targetIdx === -1) {
      targetIdx = 0
      setTtsActiveIdx(0)
    }
    
    setTtsPlaying(true)
    setTtsState('speaking')
    setTtsPauseLeft(0)
    
    if (wasPlaying && wasSpeaking && targetIdx === ttsActiveIdx) {
      speakSentence(targetIdx)
    }
  }, [sentences, ttsActiveIdx, ttsPlaying, ttsState, speakSentence])

  const handleTtsPrev = useCallback(() => {
    if (sentences.length === 0) return
    
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    
    let targetIdx = ttsActiveIdx - 1
    if (ttsActiveIdx === -1 || targetIdx < 0) {
      targetIdx = 0
    }
    
    setTtsActiveIdx(targetIdx)
    setTtsPlaying(true)
    setTtsState('speaking')
    setTtsPauseLeft(0)
    
    if (ttsActiveIdx === targetIdx && ttsPlaying && ttsState === 'speaking') {
      speakSentence(targetIdx)
    }
  }, [sentences, ttsActiveIdx, ttsPlaying, ttsState, speakSentence])

  const handleTtsNext = useCallback(() => {
    if (sentences.length === 0) return
    
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    
    let targetIdx = ttsActiveIdx + 1
    if (ttsActiveIdx === -1) {
      targetIdx = 0
    }
    
    if (targetIdx < sentences.length) {
      setTtsActiveIdx(targetIdx)
      setTtsPlaying(true)
      setTtsState('speaking')
      setTtsPauseLeft(0)
    } else {
      handleTtsStop()
    }
  }, [sentences, ttsActiveIdx, handleTtsStop])

  const handleTtsSpeedChange = useCallback((delta) => {
    setTtsRate((prev) => {
      const nextRate = Math.min(1.8, Math.max(0.6, parseFloat((prev + delta).toFixed(1))))
      ttsRateRef.current = nextRate
      
      if (ttsPlayingRef.current && ttsActiveIdxRef.current !== -1 && ttsStateRef.current === 'speaking') {
        speakSentence(ttsActiveIdxRef.current)
      }
      
      return nextRate
    })
  }, [speakSentence])

  const handleChunkPlay = useCallback((chunkText, chunkIndex) => {
    if (!chunkText || !('speechSynthesis' in window)) return

    if (speechStartTimerRef.current) {
      clearTimeout(speechStartTimerRef.current)
      speechStartTimerRef.current = null
    }

    handleTtsStop()
    stopRepeatPromptAudio()
    setActiveChunkIdx(chunkIndex)

    const utterance = createEnglishUtterance(chunkText, { rate: 0.95 })
    utterance.onend = () => setActiveChunkIdx((current) => current === chunkIndex ? -1 : current)
    utterance.onerror = () => setActiveChunkIdx(-1)

    queueSpeech(utterance, () => true)
  }, [handleTtsStop, queueSpeech, stopRepeatPromptAudio])

  // Effect to speak next sentence when index changes
  useEffect(() => {
    if (!ttsPlaying || ttsActiveIdx === -1 || ttsState !== 'speaking') return
    speakSentence(ttsActiveIdx)
  }, [ttsActiveIdx, ttsPlaying, ttsState, speakSentence])

  // Effect to run pause timer
  useEffect(() => {
    if (ttsState !== 'pausing' || !ttsPlaying) {
      if (ttsTimerRef.current) {
        clearInterval(ttsTimerRef.current)
        ttsTimerRef.current = null
      }
      return
    }
    
    ttsTimerRef.current = setInterval(() => {
      setTtsPauseLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ttsTimerRef.current)
          ttsTimerRef.current = null
          
          const nextIdx = ttsActiveIdxRef.current + 1
          if (nextIdx < sentences.length) {
            setTtsActiveIdx(nextIdx)
            setTtsState('speaking')
          } else {
            handleTtsStop()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => {
      if (ttsTimerRef.current) {
        clearInterval(ttsTimerRef.current)
        ttsTimerRef.current = null
      }
    }
  }, [ttsState, ttsPlaying, sentences.length, handleTtsStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechStartTimerRef.current) {
        clearTimeout(speechStartTimerRef.current)
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      stopRepeatPromptAudio()
      if (ttsTimerRef.current) {
        clearInterval(ttsTimerRef.current)
      }
    }
  }, [stopRepeatPromptAudio])


  // Timer loop
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (isRepeatSentence && status === 'listening') {
      return undefined
    }

    if (status === 'preparing') {
      setTimeLeft(35)
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleStartRecordingInternal()
            return 40
          }
          return prev - 1
        })
      }, 1000)
    } else if (status === 'recording') {
      setTimeLeft(40)
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleStopRecordingInternal()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status, currentIdx, questionMode, isRepeatSentence])

  const handleStartRecordingInternal = () => {
    webSpeechTextRef.current = ''
    webSpeechInterimRef.current = ''
    // Set the recording clock before switching status so the red progress bar
    // starts at 0%, rather than briefly rendering with leftover prep time.
    setTimeLeft(40)
    startRecording()
    // Start Web Speech API concurrently
    webSpeech.start()
    setStatus('recording')
  }

  const playRepeatSentenceAudio = () => {
    setRepeatAudioError(null)

    if (playRepeatPromptAudio(
      () => handleStartRecordingInternal(),
      () => setRepeatAudioError('The sentence could not play automatically. Select Listen Again, then repeat after it finishes.')
    )) {
      return
    }

    if (!currentQuestion?.text || !('speechSynthesis' in window)) {
      setRepeatAudioError('Audio playback is unavailable in this browser. Please use a browser with text-to-speech enabled.')
      return
    }

    if (speechStartTimerRef.current) clearTimeout(speechStartTimerRef.current)
    const utterance = createEnglishUtterance(currentQuestion.text, { rate: 1 })
    utterance.onend = () => handleStartRecordingInternal()
    utterance.onerror = (event) => {
      if (event.error !== 'interrupted') {
        // Do not silently begin recording without the prompt audio. A click on
        // Listen Again is a user gesture and can recover from autoplay blocks.
        setRepeatAudioError('The sentence could not play automatically. Select Listen Again, then repeat after it finishes.')
      }
    }
    queueSpeech(utterance)
  }

  const playRepeatSentencePreview = () => {
    setRepeatPreviewState('playing')

    if (playRepeatPromptAudio(
      () => setRepeatPreviewState('idle'),
      () => setRepeatPreviewState('idle')
    )) {
      return
    }

    if (!currentQuestion?.text || !('speechSynthesis' in window)) return

    if (speechStartTimerRef.current) clearTimeout(speechStartTimerRef.current)
    const utterance = createEnglishUtterance(currentQuestion.text, { rate: 1 })
    utterance.onend = () => setRepeatPreviewState('idle')
    utterance.onerror = () => setRepeatPreviewState('idle')
    queueSpeech(utterance)
  }

  const pauseRepeatSentencePreview = () => {
    if (repeatPromptAudioRef.current) {
      repeatPromptAudioRef.current.pause()
      setRepeatPreviewState('paused')
      return
    }

    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.pause()
    setRepeatPreviewState('paused')
  }

  const resumeRepeatSentencePreview = () => {
    if (repeatPromptAudioRef.current) {
      repeatPromptAudioRef.current.play().catch(() => setRepeatPreviewState('idle'))
      setRepeatPreviewState('playing')
      return
    }

    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.resume()
    setRepeatPreviewState('playing')
  }

  const stopRepeatSentencePreview = () => {
    if (speechStartTimerRef.current) {
      clearTimeout(speechStartTimerRef.current)
      speechStartTimerRef.current = null
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopRepeatPromptAudio()
    setRepeatPreviewState('idle')
  }

  // Pearson's Repeat Sentence flow has no reading/preparation countdown: the
  // microphone opens as soon as the audio ends, then the test-taker has 40s.
  useEffect(() => {
    if (!isRepeatSentence || status !== 'listening') return undefined
    playRepeatSentenceAudio()

    return () => {
      window.speechSynthesis?.cancel()
      stopRepeatPromptAudio()
    }
  }, [isRepeatSentence, status, currentQuestion, stopRepeatPromptAudio])

  const handleStopRecordingInternal = () => {
    stopRecording()
    webSpeech.stop()
    setStatus('completed')
    // Track this question as completed
    if (currentQuestion && !completedRef.current.find(q => q.id === currentQuestion.id && q.mode === questionMode)) {
      completedRef.current.push({ ...currentQuestion, mode: questionMode, completedAt: new Date().toISOString() })
      setCompletedCount(completedRef.current.length)
    }
  }

  const handleStartRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    handleStartRecordingInternal()
  }

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    handleStopRecordingInternal()
  }

  const resetAnalysis = () => {
    setEngineResults({ browser: null, wasm: null, server: null })
    setEngineLoading({ browser: false, wasm: false, server: false })
    setEngineErrors({ browser: null, wasm: null, server: null })
    setActiveEngine(null)
    setBrowserFallbackEngine(null)
    setRepeatAudioError(null)
    setRepeatPreviewState('idle')
    setSelectedWord(null)
    setActiveChunkIdx(-1)
    handleTtsStop()
  }

  // Stop resources only when this practice component unmounts. This must not
  // depend on isRecording: React runs an effect cleanup before every dependency
  // change, which previously stopped Web Speech immediately after recording began.
  useEffect(() => {
    return () => {
      clearPendingAutoAdvance()
      if (isRecordingRef.current) {
        stopRecordingRef.current?.()
      }
      stopWebSpeechRef.current?.()
      stopRepeatPromptAudio()
    }
    // Refs deliberately provide the newest callbacks to this unmount-only cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPendingAutoAdvance, stopRepeatPromptAudio])

  useEffect(() => {
    const wordsToCheck = Object.values(engineResults)
      .flatMap(result => result?.wordDiff || [])
      .map(({ word }) => getDictionaryLookupKey(word))
      .filter(Boolean)

    const uniqueWords = [...new Set(wordsToCheck)]
    const pendingWords = uniqueWords.filter((word) => (
      isDictionaryLookupCandidate(word)
      && !unavailableDictionaryWords.has(word)
      && !dictionaryAvailability[word]
    ))

    if (pendingWords.length === 0) return

    let cancelled = false

    setDictionaryAvailability((previous) => {
      const next = { ...previous }
      pendingWords.forEach((word) => {
        if (!next[word]) next[word] = 'checking'
      })
      return next
    })

    Promise.all(
      pendingWords.map(async (word) => {
        try {
          const detail = await fetchWordDetail(word)
          return [word, detail ? 'available' : 'unavailable']
        } catch (error) {
          return [word, 'unavailable']
        }
      })
    ).then((entries) => {
      if (cancelled) return

      setDictionaryAvailability((previous) => {
        const next = { ...previous }
        entries.forEach(([word, status]) => {
          next[word] = status
        })
        return next
      })

      const unavailableWords = entries
        .filter(([, status]) => status === 'unavailable')
        .map(([word]) => word)

      if (unavailableWords.length > 0) {
        setUnavailableDictionaryWords((previous) => {
          const next = new Set(previous)
          unavailableWords.forEach((word) => next.add(word))
          return next
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [engineResults, dictionaryAvailability, unavailableDictionaryWords])

  const handleRetry = () => {
    clearPendingAutoAdvance()
    if (timerRef.current) clearInterval(timerRef.current)
    if (isRecording) stopRecording()
    webSpeech.stop()
    setStatus(isRepeatSentence ? 'listening' : 'preparing')
    setTimeLeft(isRepeatSentence ? 0 : 35)
    setRepeatAudioError(null)
    resetAnalysis()
    webSpeechTextRef.current = ''
    webSpeechInterimRef.current = ''
  }

  const handleNext = () => {
    if (currentIdx < shuffledQuestions.length - 1) {
      clearPendingAutoAdvance()
      if (timerRef.current) clearInterval(timerRef.current)
      setCurrentIdx((prev) => prev + 1)
      setStatus(isRepeatSentence ? 'listening' : 'preparing')
      setTimeLeft(isRepeatSentence ? 0 : 35)
      setRepeatAudioError(null)
      resetAnalysis()
      webSpeechTextRef.current = ''
      webSpeechInterimRef.current = ''
    }
  }

  // Manual Next is the default.  Auto-advance is an explicit opt-in for
  // continuous drills and never runs while the toggle is off.
  useEffect(() => {
    clearPendingAutoAdvance()
    if (!autoAdvance || status !== 'completed' || currentIdx >= shuffledQuestions.length - 1) return undefined

    autoAdvanceTimerRef.current = setTimeout(() => {
      handleNext()
    }, 3000)

    return () => clearPendingAutoAdvance()
  }, [autoAdvance, status, currentIdx, clearPendingAutoAdvance])

  // Switch to similar questions mode
  const handleSwitchToSimilar = () => {
    clearPendingAutoAdvance()
    if (timerRef.current) clearInterval(timerRef.current)
    setQuestionMode('similar')
    setCurrentIdx(0)
    setStatus(isRepeatSentence ? 'listening' : 'preparing')
    setTimeLeft(isRepeatSentence ? 0 : 35)
    setRepeatAudioError(null)
    resetAnalysis()
    webSpeechTextRef.current = ''
    webSpeechInterimRef.current = ''
  }

  const handleSwitchToReal = () => {
    if (realQuestions.length === 0) return
    clearPendingAutoAdvance()
    if (timerRef.current) clearInterval(timerRef.current)
    setQuestionMode('real')
    setCurrentIdx(0)
    setStatus(isRepeatSentence ? 'listening' : 'preparing')
    setTimeLeft(isRepeatSentence ? 0 : 35)
    setRepeatAudioError(null)
    resetAnalysis()
    webSpeechTextRef.current = ''
    webSpeechInterimRef.current = ''
  }

  // Download cumulative completed questions as text file
  const handleDownloadCompleted = () => {
    if (completedRef.current.length === 0) return
    const lines = completedRef.current.map((q, i) => {
      return [
        `--- Question ${i + 1} (${q.mode === 'real' ? 'Real' : 'Similar'}) ---`,
        `Title: ${q.title}`,
        `Text: ${q.text}`,
        `Source: ${q.source}`,
        `Completed: ${q.completedAt}`,
        '',
      ].join('\n')
    })
    const header = `PTE ${taskLabel} Practice Session\nDate: ${new Date().toLocaleString()}\nTotal Questions: ${completedRef.current.length}\n\n`
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${taskLabel.toLowerCase().replace(/\s+/g, '-')}-practice-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Helper: collect weak words from analysis result
  const collectWeakWords = useCallback((analysis, engineName) => {
    if (!analysis?.wordDiff) return
    analysis.wordDiff.forEach(w => {
      if (w.status === 'missed' || w.status === 'close') {
        const key = w.word.toLowerCase()
        const existing = weakWordsRef.current.get(key)
        if (existing) {
          existing.count += 1
          if (!existing.engines.includes(engineName)) existing.engines.push(engineName)
          if (w.status === 'missed' && existing.status !== 'missed') existing.status = 'missed'
          if (w.matchedAs) existing.matchedAs = w.matchedAs
        } else {
          weakWordsRef.current.set(key, {
            word: w.word,
            status: w.status,
            matchedAs: w.matchedAs || null,
            count: 1,
            engines: [engineName],
          })
        }
      }
    })
    setWeakWordsCount(weakWordsRef.current.size)
  }, [])

  // ─── Analysis Handlers (per-engine) ──────────────────────────

  const handleAnalyzeBrowser = () => {
    const text = (
      webSpeechTextRef.current
      || webSpeechInterimRef.current
      || webSpeech.transcript
      || webSpeech.interimTranscript
    ).trim()
    if (!text) {
      const detail = webSpeech.error?.message
      const isNetworkFailure = detail?.toLowerCase().includes('network')
      const fallbackEngine = engineResults.wasm ? 'Local AI' : engineResults.server ? 'Server' : null

      // Chrome's Web Speech recognition sends audio to an online service. When
      // that service is unavailable, keep the Browser action useful by showing
      // an already-computed offline/server analysis instead of a dead-end error.
      if (isNetworkFailure && fallbackEngine) {
        const fallbackResult = engineResults.wasm || engineResults.server
        setEngineResults(prev => ({ ...prev, browser: fallbackResult }))
        setBrowserFallbackEngine(fallbackEngine)
        setEngineErrors(prev => ({ ...prev, browser: null }))
        return
      }

      setEngineErrors(prev => ({
        ...prev,
        browser: detail
          ? isNetworkFailure
            ? 'Browser speech recognition needs Chrome’s online speech service, which is unavailable on this network. Run Local AI or Server once, then Browser will show that result as a fallback.'
            : `Browser speech recognition failed: ${detail}`
          : 'No speech was captured by the browser. Check browser microphone and speech-recognition permissions, then retry.',
      }))
      return
    }
    setEngineLoading(prev => ({ ...prev, browser: true }))
    setEngineErrors(prev => ({ ...prev, browser: null }))
    setBrowserFallbackEngine(null)
    const latestRec = recordings[recordings.length - 1]
    setTimeout(async () => {
      try {
        const result = analyzeReadAloud(currentQuestion.text, text)
        const enrichedResult = await enrichAnalysisPlayback(result, latestRec)
        setEngineResults(prev => ({ ...prev, browser: enrichedResult }))
        setEngineLoading(prev => ({ ...prev, browser: false }))
        collectWeakWords(enrichedResult, 'Browser')
      } catch (err) {
        console.error('[RA Analysis] Browser enrichment error:', err)
        setEngineErrors(prev => ({ ...prev, browser: `Browser analysis failed: ${err.message}` }))
        setEngineLoading(prev => ({ ...prev, browser: false }))
      }
    }, 100)
  }

  const handleAnalyzeWasm = async () => {
    const latestRec = recordings[recordings.length - 1]
    if (!latestRec?.blob) {
      setEngineErrors(prev => ({ ...prev, wasm: 'No recording available to analyze.' }))
      return
    }

    setEngineLoading(prev => ({ ...prev, wasm: true }))
    setEngineErrors(prev => ({ ...prev, wasm: null }))

    try {
      const pcmSamples = await decodeBlobToPCM(latestRec.blob)
      const worker = new Worker(
        new URL('../../../common/workers/sttWasmWorker.js', import.meta.url)
      )

      let fullText = ''

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate()
          reject(new Error('WASM analysis timed out after 30 seconds'))
        }, 30000)

        worker.onmessage = (event) => {
          const msg = event.data
          switch (msg.type) {
            case 'ready':
              worker.postMessage({ type: 'start', language: 'en-US' })
              const chunkSize = 4096
              for (let i = 0; i < pcmSamples.length; i += chunkSize) {
                const chunk = pcmSamples.slice(i, i + chunkSize)
                worker.postMessage({ type: 'audio', samples: chunk }, [chunk.buffer])
              }
              setTimeout(() => worker.postMessage({ type: 'stop' }), 500)
              break
            case 'final':
              if (msg.text?.trim()) fullText += msg.text.trim() + ' '
              break
            case 'end':
              clearTimeout(timeout)
              worker.terminate()
              resolve()
              break
            case 'error':
              clearTimeout(timeout)
              worker.terminate()
              reject(new Error(msg.message))
              break
          }
        }

        worker.onerror = (err) => {
          clearTimeout(timeout)
          worker.terminate()
          reject(new Error('WASM worker error: ' + err.message))
        }

        worker.postMessage({
          type: 'init',
          wasmBaseUrl: window.location.origin + '/',
          language: 'en-US',
        })
      })

      if (!fullText.trim()) {
        setEngineErrors(prev => ({ ...prev, wasm: 'WASM SenseVoice could not recognize any speech.' }))
        setEngineLoading(prev => ({ ...prev, wasm: false }))
        return
      }

      const result = analyzeReadAloud(currentQuestion.text, fullText.trim())
      const enrichedResult = await enrichAnalysisPlayback(result, latestRec)
      setEngineResults(prev => ({ ...prev, wasm: enrichedResult }))
      setEngineLoading(prev => ({ ...prev, wasm: false }))
      collectWeakWords(enrichedResult, 'Local AI')
    } catch (err) {
      console.error('[RA Analysis] WASM error:', err)
      setEngineErrors(prev => ({ ...prev, wasm: `Local AI failed: ${err.message}` }))
      setEngineLoading(prev => ({ ...prev, wasm: false }))
    }
  }

  const handleAnalyzeServer = async () => {
    const latestRec = recordings[recordings.length - 1]
    if (!latestRec?.blob) {
      setEngineErrors(prev => ({ ...prev, server: 'No recording available to analyze.' }))
      return
    }

    setEngineLoading(prev => ({ ...prev, server: true }))
    setEngineErrors(prev => ({ ...prev, server: null }))

    try {
      const wavBlob = await blobToWAV(latestRec.blob)
      const formData = new FormData()
      formData.append('audio', wavBlob, 'recording.wav')
      formData.append('language', 'en')

      const response = await fetch(`${WHISPER_SERVER_URL}/api/stt/transcribe`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) throw new Error(`Server returned ${response.status}`)

      const data = await response.json()
      const text = data.text?.trim()

      if (!text) {
        setEngineErrors(prev => ({ ...prev, server: 'Server could not recognize any speech.' }))
        setEngineLoading(prev => ({ ...prev, server: false }))
        return
      }

      const result = analyzeReadAloud(currentQuestion.text, text, {
        recognizedWordTimings: extractTimedWordsFromSTTResponse(data),
      })
      const enrichedResult = await enrichAnalysisPlayback(result, latestRec, data)
      setEngineResults(prev => ({ ...prev, server: enrichedResult }))
      setEngineLoading(prev => ({ ...prev, server: false }))
      collectWeakWords(enrichedResult, 'Server')
    } catch (err) {
      console.error('[RA Analysis] Server error:', err)
      setEngineErrors(prev => ({ ...prev, server: `Server failed: ${err.message}` }))
      setEngineLoading(prev => ({ ...prev, server: false }))
    }
  }

  const latestRecording = recordings[recordings.length - 1]

  // Progress percentage
  const maxTime = status === 'preparing' ? 35 : 40
  const progressPercent = ((maxTime - timeLeft) / maxTime) * 100
  const progressColor = status === 'preparing' ? '#f59e0b' : '#ef4444'

  return (
    <div className="pte-ra-container">
      {/* Mode toggle */}
      <div className="pte-ra-mode-toggle">
        <button
          className={`pte-ra-mode-btn ${questionMode === 'real' ? 'pte-ra-mode-btn--active' : ''}`}
          onClick={handleSwitchToReal}
          disabled={realQuestions.length === 0}
          title={realQuestions.length === 0 ? 'Verified real questions have not been added yet.' : undefined}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>quiz</span>
          Real Questions ({realQuestions.length})
        </button>
        {similarPracticeQuestions.length > 0 && (
          <button
            className={`pte-ra-mode-btn ${questionMode === 'similar' ? 'pte-ra-mode-btn--active' : ''}`}
            onClick={handleSwitchToSimilar}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>auto_awesome</span>
            Similar Practice ({similarPracticeQuestions.length})
          </button>
        )}
        {completedCount > 0 && (
          <button className="pte-ra-mode-btn pte-ra-mode-btn--download" onClick={handleDownloadCompleted}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>download</span>
            Download Practiced Texts ({completedCount})
          </button>
        )}
        {weakWordsCount > 0 && (
          <button className="pte-ra-mode-btn pte-ra-mode-btn--weak" onClick={() => setShowWeakWords(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>spellcheck</span>
            Weak Words ({weakWordsCount})
          </button>
        )}
      </div>

      <div className="pte-ra-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h4 className="pte-ra-title">
            {questionMode === 'similar' && <span className="pte-ra-similar-badge">AI Generated</span>}
            {currentQuestion?.title || `${taskLabel} Task`}
            {questionMode === 'real' && getQuestionDifficultyLabel(currentQuestion) && (
              <span className={`pte-ra-difficulty-badge pte-ra-difficulty-badge--${getQuestionDifficultyLabel(currentQuestion).toLowerCase()}`}>
                {getQuestionDifficultyLabel(currentQuestion)}
              </span>
            )}
          </h4>
          {currentQuestion?.source && (
            <div className="pte-ra-source-tag">
              <span className="material-symbols-outlined pte-ra-source-tag-icon">
                {currentQuestion.source.startsWith('http') ? 'public' : 'smart_toy'}
              </span>
              <span className="pte-ra-source-tag-label">Source:</span>
              <a
                href={currentQuestion.source.startsWith('http') ? currentQuestion.source : 'https://www.pearsonpte.com/pte-core'}
                target="_blank"
                rel="noopener noreferrer"
                className="pte-ra-source-tag-link"
              >
                {getSourceFriendlyName(currentQuestion.source)}
                <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', marginLeft: '2px' }}>open_in_new</span>
              </a>
            </div>
          )}
        </div>
        <span className="pte-ra-counter">Question {currentIdx + 1} of {shuffledQuestions.length}</span>
      </div>

      {/* Read Aloud shows the passage immediately.
          Repeat Sentence hides the sentence until recording has ended, because
          this task is listen-then-repeat rather than read-then-speak. */}
      <div className="pte-ra-text-box">
        {isRepeatSentence && status !== 'completed' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <strong style={{ fontSize: '1.05rem', color: '#23314d' }}>Listen first. The sentence will be revealed after recording for review.</strong>
            <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Focus on meaning, rhythm, and intonation while listening.
            </span>
          </div>
        ) : ttsActiveIdx === -1 ? (
          currentQuestion?.text
        ) : (
          sentences.map((sentence, idx) => (
            <span 
              key={idx} 
              className={`pte-ra-text-sentence ${idx === ttsActiveIdx ? 'pte-ra-text-sentence--active' : ''}`}
            >
              {sentence}{' '}
            </span>
          ))
        )}
      </div>

      {status === 'completed' && chunkGuide.length > 1 && (
        <div className="pte-ra-chunk-guide pte-ra-chunk-guide--overlay">
          <div className="pte-ra-chunk-guide__title">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>segment</span>
            Recommended chunking & phrasing
          </div>
          <div className="pte-ra-chunk-guide__text pte-ra-chunk-guide__text--overlay">
            {chunkGuide.map((chunk, index) => (
              <button
                key={`${chunk}-${index}`}
                type="button"
                className={`pte-ra-chunk-guide__chunk pte-ra-chunk-guide__chunk--overlay pte-ra-chunk-guide__chunk--${index % 2 === 0 ? 'primary' : 'secondary'} ${activeChunkIdx === index ? 'pte-ra-chunk-guide__chunk--active' : ''}`}
                onClick={() => handleChunkPlay(chunk, index)}
                title="Play this chunk"
              >
                {chunk}
                {index < chunkGuide.length - 1 && <span className="pte-ra-chunk-guide__divider"> / </span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status & Timer Card */}
      <div className="pte-ra-timer-wrap">
        <div className="pte-ra-status-row">
          <span className={`pte-ra-status-badge pte-ra-status-badge--${status}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              {status === 'listening' ? 'headphones' : status === 'preparing' ? 'hourglass_empty' : status === 'recording' ? 'mic' : 'check_circle'}
            </span>
            {status === 'listening' ? 'Listening' : status === 'preparing' ? 'Preparing' : status === 'recording' ? 'Recording' : 'Completed'}
          </span>
          <span className="pte-ra-timer-text">
            {status === 'listening' && 'Listen carefully. Recording starts immediately after the audio.'}
            {status === 'preparing' && `Beginning in ${timeLeft}s`}
            {status === 'recording' && `Recording: ${timeLeft}s remaining`}
            {status === 'completed' && 'Recording finished'}
          </span>
        </div>

        {status !== 'completed' && status !== 'listening' && (
          <div className="pte-ra-progress-bar-bg">
            <div 
              className="pte-ra-progress-bar-fill" 
              style={{ 
                width: `${progressPercent}%`, 
                backgroundColor: progressColor 
              }}
            />
          </div>
        )}

        {status === 'completed' && latestRecording && (
          <audio className="pte-ra-audio-player" src={latestRecording.url} controls />
        )}


        {/* Shadowing Practice TTS Panel — after recording only */}
        {status === 'completed' && !isRepeatSentence && (
        <div className="pte-ra-shadow-panel">
          <div className="pte-ra-shadow-header">
            <span className="material-symbols-outlined pte-ra-shadow-icon">spatial_audio</span>
            <div style={{ textAlign: 'left' }}>
              <h5 className="pte-ra-shadow-title">Listen & Shadowing</h5>
              <p className="pte-ra-shadow-subtitle">Listen to the correct pronunciation and practice repeating.</p>
            </div>
          </div>
              
          <div className="pte-ra-shadow-controls">
            {/* Mode Selection */}
            <div className="pte-ra-shadow-modes">
              <button 
                className={`pte-ra-shadow-mode-btn ${ttsMode === 'continuous' ? 'pte-ra-shadow-mode-btn--active' : ''}`}
                onClick={() => { handleTtsStop(); setTtsMode('continuous'); }}
                disabled={ttsPlaying}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>play_circle</span>
                Continuous Play
              </button>
              <button 
                className={`pte-ra-shadow-mode-btn ${ttsMode === 'shadowing' ? 'pte-ra-shadow-mode-btn--active' : ''}`}
                onClick={() => { handleTtsStop(); setTtsMode('shadowing'); }}
                disabled={ttsPlaying}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>pause_circle</span>
                Shadowing (10s Pause)
              </button>
            </div>

            {/* Speed Controls */}
            <div className="pte-ra-shadow-speed-control">
              <button 
                className="pte-ra-shadow-speed-btn" 
                onClick={() => handleTtsSpeedChange(-0.1)}
                title="Decrease speed"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>remove</span>
              </button>
              <span className="pte-ra-shadow-speed-val">{ttsRate.toFixed(1)}x</span>
              <button 
                className="pte-ra-shadow-speed-btn" 
                onClick={() => handleTtsSpeedChange(0.1)}
                title="Increase speed"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>add</span>
              </button>
            </div>

            {/* Playback Actions */}
            <div className="pte-ra-shadow-actions">
              {!ttsPlaying ? (
                <button className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--play" onClick={handleTtsPlay}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>play_arrow</span>
                  Play
                </button>
              ) : (
                <button className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--pause" onClick={handleTtsPause}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>pause</span>
                  Pause
                </button>
              )}

              <button 
                className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--prev" 
                onClick={handleTtsPrev}
                disabled={sentences.length === 0}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>skip_previous</span>
                Prev
              </button>
                  
              <button 
                className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--replay" 
                onClick={handleTtsReplay}
                disabled={ttsActiveIdx === -1}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>replay</span>
                Replay
              </button>

              <button 
                className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--next" 
                onClick={handleTtsNext}
                disabled={sentences.length === 0}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>skip_next</span>
                Next
              </button>

              <button 
                className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--stop" 
                onClick={handleTtsStop}
                disabled={ttsActiveIdx === -1}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>stop</span>
                Stop
              </button>
            </div>
          </div>

          {/* Visual feedback for Pause */}
          {ttsPlaying && ttsState === 'pausing' && (
            <div className="pte-ra-shadow-pause-timer">
              <div className="pte-ra-shadow-pause-text">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>record_voice_over</span>
                <span><strong>Your turn:</strong> Repeat the highlighted sentence! ({ttsPauseLeft}s left)</span>
              </div>
              <div className="pte-ra-shadow-pause-bar-bg">
                <div 
                  className="pte-ra-shadow-pause-bar-fill" 
                  style={{ width: `${(ttsPauseLeft / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        )}

        {status === 'completed' && isRepeatSentence && (
          <div className="pte-ra-shadow-panel">
            <div className="pte-ra-shadow-header">
              <span className="material-symbols-outlined pte-ra-shadow-icon">record_voice_over</span>
              <div style={{ textAlign: 'left' }}>
                <h5 className="pte-ra-shadow-title">Sentence Pronunciation</h5>
                <p className="pte-ra-shadow-subtitle">Replay the sentence you heard before checking your analysis.</p>
              </div>
            </div>
            <div className="pte-ra-shadow-controls">
              <div className="pte-ra-shadow-actions" style={{ marginLeft: 0 }}>
                {repeatPreviewState === 'idle' && (
                  <button className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--play" onClick={playRepeatSentencePreview}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>play_arrow</span>
                    Play
                  </button>
                )}
                {repeatPreviewState === 'playing' && (
                  <button className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--pause" onClick={pauseRepeatSentencePreview}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>pause</span>
                    Pause
                  </button>
                )}
                {repeatPreviewState === 'paused' && (
                  <button className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--play" onClick={resumeRepeatSentencePreview}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>play_arrow</span>
                    Resume
                  </button>
                )}
                <button
                  className="pte-ra-shadow-action-btn pte-ra-shadow-action-btn--stop"
                  onClick={stopRepeatSentencePreview}
                  disabled={repeatPreviewState === 'idle'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>stop</span>
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pte-ra-actions-row">
          {status === 'listening' && isRepeatSentence && (
            <>
              {repeatAudioError && (
                <span className="pte-ra-timer-text" style={{ color: '#dc2626', fontWeight: 600 }}>
                  {repeatAudioError}
                </span>
              )}
              <button
                className="pte-ra-btn pte-ra-btn--primary"
                style={{ '--btn-color': color }}
                onClick={playRepeatSentenceAudio}
              >
                <span className="material-symbols-outlined">volume_up</span>
                Listen Again
              </button>
            </>
          )}

          {status === 'preparing' && (
            <button 
              className="pte-ra-btn pte-ra-btn--primary" 
              style={{ '--btn-color': color }}
              onClick={handleStartRecording}
            >
              <span className="material-symbols-outlined">mic</span>
              Start Recording Now
            </button>
          )}

          {status === 'recording' && (
            <button 
              className="pte-ra-btn pte-ra-btn--primary" 
              style={{ '--btn-color': '#dc2626' }}
              onClick={handleStopRecording}
            >
              <span className="material-symbols-outlined">stop</span>
              Stop & Save
            </button>
          )}

          {status === 'completed' && (
            <>
              {latestRecording && (
                <button 
                  className="pte-ra-btn pte-ra-btn--primary" 
                  style={{ '--btn-color': '#16a34a' }}
                  onClick={() => downloadRecording(latestRecording)}
                >
                  <span className="material-symbols-outlined">download</span>
                  Download
                </button>
              )}
              <button className="pte-ra-btn pte-ra-btn--secondary" onClick={handleRetry}>
                <span className="material-symbols-outlined">refresh</span>
                Retry
              </button>
              <button
                className={`pte-ra-btn ${autoAdvance ? 'pte-ra-btn--primary' : 'pte-ra-btn--secondary'}`}
                style={autoAdvance ? { '--btn-color': '#0ea5e9' } : undefined}
                onClick={() => setAutoAdvance((enabled) => !enabled)}
                title="Automatically start the next question three seconds after completion"
              >
                <span className="material-symbols-outlined">{autoAdvance ? 'autoplay' : 'schedule'}</span>
                Auto-advance: {autoAdvance ? 'On' : 'Off'}
              </button>
              {currentIdx < shuffledQuestions.length - 1 ? (
                <button 
                  className="pte-ra-btn pte-ra-btn--primary" 
                  style={{ '--btn-color': color }}
                  onClick={handleNext}
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                  Next
                </button>
              ) : (
                <button className="pte-ra-btn pte-ra-btn--secondary" onClick={onClose}>
                  <span className="material-symbols-outlined">done_all</span>
                  Finish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Analysis Section (always visible when completed) ─── */}
      {status === 'completed' && (
        <div className="pte-ra-engine-picker">
          <h5 className="pte-ra-engine-picker__title">
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>analytics</span>
            Analyze My Speech
          </h5>
          <p className="pte-ra-engine-picker__subtitle">Click an engine to analyze. Result appears below.</p>

          <div className="pte-ra-engine-picker__buttons">
            <button 
              className={`pte-ra-engine-btn ${activeEngine === 'browser' ? 'pte-ra-engine-btn--active' : ''} ${engineResults.browser ? 'pte-ra-engine-btn--done' : ''}`}
              onClick={() => { handleAnalyzeBrowser(); setActiveEngine('browser'); }}
              disabled={engineLoading.browser}
            >
              <span className="pte-ra-engine-btn__icon">🌐</span>
              <div>
                <strong>Browser</strong>
                <span>{engineLoading.browser ? 'Analyzing...' : browserFallbackEngine ? `${browserFallbackEngine} fallback` : engineResults.browser ? `Score: ${engineResults.browser.overall}/90` : 'Web Speech API · Instant'}</span>
              </div>
            </button>

            <button 
              className={`pte-ra-engine-btn ${activeEngine === 'wasm' ? 'pte-ra-engine-btn--active' : ''} ${engineResults.wasm ? 'pte-ra-engine-btn--done' : ''}`}
              onClick={() => { handleAnalyzeWasm(); setActiveEngine('wasm'); }}
              disabled={engineLoading.wasm}
            >
              <span className="pte-ra-engine-btn__icon">🤖</span>
              <div>
                <strong>Local AI</strong>
                <span>{engineLoading.wasm ? 'Analyzing...' : engineResults.wasm ? `Score: ${engineResults.wasm.overall}/90` : 'SenseVoice WASM · 2–5s'}</span>
              </div>
            </button>

            <button 
              className={`pte-ra-engine-btn ${activeEngine === 'server' ? 'pte-ra-engine-btn--active' : ''} ${engineResults.server ? 'pte-ra-engine-btn--done' : ''}`}
              onClick={() => { handleAnalyzeServer(); setActiveEngine('server'); }}
              disabled={engineLoading.server}
            >
              <span className="pte-ra-engine-btn__icon">🖥️</span>
              <div>
                <strong>Server</strong>
                <span>{engineLoading.server ? 'Analyzing...' : engineResults.server ? `Score: ${engineResults.server.overall}/90` : 'Whisper large-v3 · 3–8s'}</span>
              </div>
            </button>
          </div>

          {/* Inline loading */}
          {activeEngine && engineLoading[activeEngine] && (
            <div className="pte-ra-engine-picker__loading">
              <div className="pte-ra-spinner" />
              <span>Analyzing your speech...</span>
            </div>
          )}

          {/* Inline error */}
          {activeEngine && engineErrors[activeEngine] && (
            <div className="pte-ra-engine-picker__error">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>
              <strong>{activeEngine === 'browser' ? 'Browser' : activeEngine === 'wasm' ? 'Local AI' : 'Server'}:</strong>&nbsp;{engineErrors[activeEngine]}
            </div>
          )}
        </div>
      )}

      {/* Inline Analysis Result — only for active engine */}
      {activeEngine && engineResults[activeEngine] && (
        <AnalysisResult
          analysis={engineResults[activeEngine]}
          engineLabel={
            activeEngine === 'browser' ? `🌐 Browser${browserFallbackEngine ? ` (${browserFallbackEngine} fallback)` : ' (Web Speech API)'}` :
            activeEngine === 'wasm' ? '🤖 Local AI (SenseVoice WASM)' :
            '🖥️ Server (Whisper large-v3)'
          }
          onWordClick={(word) => setSelectedWord(enrichWordSelectionWithBestTiming(word, engineResults))}
          unavailableDictionaryWords={unavailableDictionaryWords}
          dictionaryAvailability={dictionaryAvailability}
        />
      )}

      {/* Disclaimer — show once if any analysis done */}
      {(engineResults.browser || engineResults.wasm || engineResults.server) && (
        <div className="pte-ra-analysis__disclaimer">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
          <p>
            <strong>Disclaimer:</strong> This analysis is generated using automated speech-to-text comparison and is <strong>not equivalent to official PTE Core scoring</strong>.
            The extra pace, pause, stress, rhythm, and intonation indicators shown here are <strong>practice-oriented acoustic estimates</strong>, not Pearson’s official scoring engine.
            Use these results as a <strong>general reference for practice only</strong>.
          </p>
        </div>
      )}

      {/* Security/Local Storage disclaimer */}
      <div className="pte-ra-notice">
        <span className="material-symbols-outlined pte-ra-notice-icon">lock</span>
        <div>
          <strong>Secure Local Storage:</strong> Recorded audio files are temporarily stored in the browser's memory and are never uploaded to the server. When downloaded, files are automatically named with your ID and the current timestamp.
        </div>
      </div>

      {/* Word Detail Popup */}
      {selectedWord && (
        <WordDetailPopup
          wordInfo={selectedWord}
          recording={latestRecording}
          onClose={() => setSelectedWord(null)}
          onNotFound={markDictionaryUnavailable}
        />
      )}

      {/* Weak Words Panel */}
      {showWeakWords && (
        <WeakWordsPanel
          weakWords={Array.from(weakWordsRef.current.values())}
          onClose={() => setShowWeakWords(false)}
          onWordClick={(word) => { setShowWeakWords(false); setSelectedWord(enrichWordSelectionWithBestTiming(word, engineResults)); }}
          unavailableDictionaryWords={unavailableDictionaryWords}
          dictionaryAvailability={dictionaryAvailability}
        />
      )}
    </div>
  )
}



/* ─── Weak Words Panel ─── */
function WeakWordsPanel({
  weakWords,
  onClose,
  onWordClick,
  unavailableDictionaryWords,
  dictionaryAvailability,
}) {
  const [sortBy, setSortBy] = useState('count') // 'count' | 'alpha' | 'status'
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const sortedWords = useMemo(() => {
    const arr = [...weakWords]
    if (sortBy === 'count') arr.sort((a, b) => b.count - a.count)
    else if (sortBy === 'alpha') arr.sort((a, b) => a.word.localeCompare(b.word))
    else if (sortBy === 'status') arr.sort((a, b) => (a.status === 'missed' ? -1 : 1) - (b.status === 'missed' ? -1 : 1))
    return arr
  }, [weakWords, sortBy])

  const missedCount = weakWords.filter(w => w.status === 'missed').length
  const closeCount = weakWords.filter(w => w.status === 'close').length

  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      primeAudioOutput()
      const utterance = createEnglishUtterance(word, { rate: 0.85 })
      setTimeout(() => window.speechSynthesis.speak(utterance), 80)
    }
  }

  const handleDownloadWeakWords = async () => {
    setDownloading(true)
    try {
      // Fetch definitions for all words in parallel
      const results = await Promise.allSettled(
        sortedWords.map(w => fetchWordDetail(w.word))
      )

      const lines = sortedWords.map((w, i) => {
        const detail = results[i]?.status === 'fulfilled' ? results[i].value : null
        const phonetic = detail?.phonetic || ''
        const definition = detail?.meanings?.[0]?.definitions?.[0]?.definition || ''
        const pos = detail?.meanings?.[0]?.partOfSpeech || ''
        const statusLabel = w.status === 'missed' ? '❌ Missed' : '🟡 Close'
        const heardAs = w.matchedAs ? ` (heard as: "${w.matchedAs}")` : ''

        return [
          `${w.word}  ${phonetic}`,
          `  ${pos ? `[${pos}] ` : ''}${definition || 'No definition available'}`,
          `  Status: ${statusLabel}${heardAs} | Occurrences: ${w.count}`,
          '',
        ].join('\n')
      })

      const header = [
        `PTE Read Aloud — Weak Words Report`,
        `Date: ${new Date().toLocaleString()}`,
        `Total Weak Words: ${weakWords.length} (${missedCount} missed, ${closeCount} close match)`,
        `${'─'.repeat(60)}`,
        '',
      ].join('\n')

      const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `weak-words-${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download weak words error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="pte-word-popup-overlay" onClick={onClose}>
      <div className="pte-weak-panel" onClick={e => e.stopPropagation()}>
        <button className="pte-word-popup__close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="pte-weak-panel__header">
          <h3 className="pte-weak-panel__title">
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#ef4444' }}>spellcheck</span>
            Weak Words
          </h3>
          <div className="pte-weak-panel__stats">
            <span className="pte-weak-panel__stat pte-weak-panel__stat--missed">❌ {missedCount} missed</span>
            <span className="pte-weak-panel__stat pte-weak-panel__stat--close">🟡 {closeCount} close</span>
          </div>
        </div>

        {/* Sort + Download */}
        <div className="pte-weak-panel__toolbar">
          <div className="pte-weak-panel__sort">
            {[
              { id: 'count', label: 'Frequency', icon: 'sort' },
              { id: 'alpha', label: 'A-Z', icon: 'sort_by_alpha' },
              { id: 'status', label: 'Status', icon: 'filter_list' },
            ].map(s => (
              <button
                key={s.id}
                className={`pte-weak-panel__sort-btn ${sortBy === s.id ? 'pte-weak-panel__sort-btn--active' : ''}`}
                onClick={() => setSortBy(s.id)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
          <button
            className="pte-weak-panel__download-btn"
            onClick={handleDownloadWeakWords}
            disabled={downloading}
            title="Download weak words with phonetics and definitions"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              {downloading ? 'hourglass_top' : 'download'}
            </span>
            {downloading ? 'Fetching...' : 'Download .txt'}
          </button>
        </div>

        {/* Word list */}
        <div className="pte-weak-panel__list">
          {sortedWords.map((w, i) => {
            const lookupKey = getDictionaryLookupKey(w.word)
            const availability = dictionaryAvailability?.[lookupKey]
            const definitionAvailable = isDictionaryLookupCandidate(w.word)
              && availability !== 'unavailable'
              && !unavailableDictionaryWords?.has(lookupKey)

            return (
              <div key={i} className={`pte-weak-panel__item pte-weak-panel__item--${w.status}`}>
                <button
                  className="pte-weak-panel__speak-btn"
                  onClick={() => speakWord(w.word)}
                  title="Listen"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>volume_up</span>
                </button>
                <button
                  className={`pte-weak-panel__word-btn ${definitionAvailable ? '' : 'pte-weak-panel__word-btn--disabled'}`}
                  onClick={definitionAvailable ? () => onWordClick({
                    ...w,
                    dictionaryAvailable: definitionAvailable,
                    lookupKey,
                  }) : undefined}
                  disabled={!definitionAvailable}
                  title={definitionAvailable ? 'View definition' : availability === 'checking' ? 'Checking dictionary entry' : 'No dictionary entry available'}
                >
                  {w.word}
                </button>
                <span className={`pte-weak-panel__badge pte-weak-panel__badge--${w.status}`}>
                  {w.status === 'missed' ? 'missed' : 'close'}
                </span>
                {w.matchedAs && (
                  <span className="pte-weak-panel__heard">→ "{w.matchedAs}"</span>
                )}
                {w.count > 1 && (
                  <span className="pte-weak-panel__count">×{w.count}</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="pte-weak-panel__footer">
          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>info</span>
          Words with dictionary entries can be opened for definition, phonetic, and pronunciation audio.
        </div>
      </div>
    </div>
  )
}


function PracticeMockModal({ isOpen, onClose, item, color, initialMode }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  useEffect(() => {
    if (isOpen && item) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null

  const handleClose = () => {
    setIsFullscreen(false)
    onClose()
  }

  return (
    <div className={`pte-modal-overlay ${isFullscreen ? 'pte-modal-overlay--fullscreen' : ''}`}>
      <div className={`pte-practice-modal ${isFullscreen ? 'pte-practice-modal--fullscreen' : ''}`}>
        <div className="pte-modal__actions">
          <button
            className="pte-modal__action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <span className="material-symbols-outlined">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
          <button className="pte-modal__action-btn" onClick={handleClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Header */}
        <div className="pte-practice-modal__header" style={{ '--practice-color': color }}>
          <span className="pte-card__abbr pte-practice-modal__abbr" style={{ background: color }}>{item.abbr}</span>
          <div>
            <h2 className="pte-practice-modal__title">{item.name}</h2>
            <p className="pte-practice-modal__subtitle">{item.desc}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="pte-practice-modal__body">
          <div className="pte-practice-modal__instructions">
            <div 
              className="pte-practice-modal__instructions-header"
              onClick={() => setShowInstructions(!showInstructions)}
              title={showInstructions ? 'Hide exam info' : 'Show exam info'}
            >
              <div className="pte-practice-modal__instructions-title">
                <span className="material-symbols-outlined" style={{ color, fontSize: '1rem' }}>info</span>
                <span>Exam Info</span>
              </div>
              <button className="pte-practice-modal__instructions-toggle-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                  {showInstructions ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
            {showInstructions && (
              <div className="pte-practice-modal__instructions-content">
                <div className="pte-practice-modal__instruction-row">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color }}>timer</span>
                  <span><strong>Time:</strong> {item.time}</span>
                </div>
                <div className="pte-practice-modal__instruction-row">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color }}>target</span>
                  <span><strong>Skills Assessed:</strong> {item.skills.join(' + ')}</span>
                </div>
                <div className="pte-practice-modal__instruction-row">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#5568fe' }}>tag</span>
                  <span><strong>Exam Volume:</strong> {item.volume} questions in exam</span>
                </div>
                <div className="pte-practice-modal__instruction-row">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>lightbulb</span>
                  <span><strong>Tip:</strong> {item.tip}</span>
                </div>
              </div>
            )}
          </div>

          {/* Read Aloud and Repeat Sentence share the recording and scoring flow. */}
          {item.abbr === 'RA' || item.abbr === 'RS' ? (
            <ReadAloudPractice
              color={color}
              onClose={handleClose}
              initialMode={initialMode}
              realQuestions={item.abbr === 'RS' ? repeatSentenceQuestions : readAloudQuestions}
              similarPracticeQuestions={item.abbr === 'RS' ? similarRepeatSentenceQuestions : similarQuestions}
              taskLabel={item.name}
              isRepeatSentence={item.abbr === 'RS'}
            />
          ) : item.abbr === 'DI' ? (
            <DescribeImagePractice
              color={color}
              initialMode={initialMode}
              realQuestions={describeImageQuestions}
              similarPracticeQuestions={similarDescribeImageQuestions}
              taskLabel={item.name}
            />
          ) : item.abbr === 'RtS' ? (
            <RespondSituationPractice
              initialMode={initialMode}
              realQuestions={respondSituationQuestions}
              similarPracticeQuestions={similarRespondSituationQuestions}
              taskLabel={item.name}
            />
          ) : item.abbr === 'ASQ' ? (
            <AnswerShortQuestionPractice
              initialMode={initialMode}
              realQuestions={answerShortQuestionQuestions}
              similarPracticeQuestions={similarAnswerShortQuestionQuestions}
              taskLabel={item.name}
            />
          ) : item.abbr === 'SWT' ? (
            <WritingTaskPractice
              initialMode={initialMode}
              realQuestions={summarizeWrittenTextQuestions}
              similarPracticeQuestions={similarSummarizeWrittenTextQuestions}
              taskLabel={item.name}
              taskType="swt"
            />
          ) : item.abbr === 'WE' ? (
            <WritingTaskPractice
              initialMode={initialMode}
              realQuestions={writeEmailQuestions}
              similarPracticeQuestions={similarWriteEmailQuestions}
              taskLabel={item.name}
              taskType="we"
            />
          ) : (
            <div className="pte-practice-modal__placeholder">
              <span className="material-symbols-outlined pte-practice-modal__placeholder-icon" style={{ color }}>construction</span>
              <h3>Practice Questions Coming Soon</h3>
              <p>We are preparing real PTE Core practice questions for this section. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Question Type Card ─── */
function QuestionCard({ item, color, onPractice, onOpenTemplate }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const realCount = item.abbr === 'RA'
    ? readAloudQuestions.length
    : item.abbr === 'RS'
      ? repeatSentenceQuestions.length
      : item.abbr === 'DI'
        ? describeImageQuestions.length
        : item.abbr === 'RtS'
          ? respondSituationQuestions.length
          : item.abbr === 'ASQ'
            ? answerShortQuestionQuestions.length
            : item.abbr === 'SWT'
              ? summarizeWrittenTextQuestions.length
              : item.abbr === 'WE'
                ? writeEmailQuestions.length
      : 0
  const similarCount = item.abbr === 'RA'
    ? similarQuestions.length
    : item.abbr === 'DI'
      ? similarDescribeImageQuestions.length
      : item.abbr === 'RtS'
        ? similarRespondSituationQuestions.length
        : item.abbr === 'ASQ'
          ? similarAnswerShortQuestionQuestions.length
          : item.abbr === 'SWT'
            ? similarSummarizeWrittenTextQuestions.length
            : item.abbr === 'WE'
              ? similarWriteEmailQuestions.length
      : 0
  const repeatSimilarCount = item.abbr === 'RS' ? similarRepeatSentenceQuestions.length : 0
  const hasPractice = item.abbr === 'RA' || item.abbr === 'RS' || item.abbr === 'DI' || item.abbr === 'RtS' || item.abbr === 'ASQ' || item.abbr === 'SWT' || item.abbr === 'WE'
  const templates = getTemplatesForQuestion(item.abbr)

  return (
    <div className={`pte-card ${isExpanded ? 'pte-card--expanded' : ''}`}>
      <div className="pte-card__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="pte-card__left">
          <span className="pte-card__abbr" style={{ background: color }}>{item.abbr}</span>
          <div className="pte-card__title-area">
            <span className="pte-card__name">
              {item.name}
              {item.core && <span className="pte-card__core-badge">Core Only</span>}
            </span>
            <span className="pte-card__desc">{item.desc}</span>
          </div>
        </div>
        <div className="pte-card__right">
          <ImpactStars level={item.impact} />
          <span className={`pte-card__expand material-symbols-outlined`}>
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="pte-card__detail">
          <div className="pte-card__meta">
            <div className="pte-card__meta-item">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>timer</span>
              <span>{item.time}</span>
            </div>
            <div className="pte-card__meta-item">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>target</span>
              <span>{item.skills.join(' + ')}</span>
            </div>
            <div className="pte-card__meta-item">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>tag</span>
              <span>{item.volume} questions in exam</span>
            </div>
          </div>
          <div className="pte-card__tip">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>lightbulb</span>
            <span>{item.tip}</span>
          </div>
          <div className="pte-card__actions-row">
            {hasPractice && (
              <button
                className="pte-card__practice-btn pte-card__practice-btn--real"
                onClick={(e) => {
                  e.stopPropagation()
                  if (realCount > 0) onPractice(item, 'real')
                }}
                disabled={realCount === 0}
                title={realCount === 0 ? 'Verified real questions have not been added yet.' : undefined}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>quiz</span>
                Real Questions ({realCount})
              </button>
            )}
            {(item.abbr === 'RA' || item.abbr === 'RS' || item.abbr === 'DI' || item.abbr === 'RtS' || item.abbr === 'ASQ' || item.abbr === 'SWT' || item.abbr === 'WE') && (
              <button
                className="pte-card__practice-btn pte-card__practice-btn--similar"
                onClick={(e) => {
                  e.stopPropagation()
                  onPractice(item, 'similar')
                }}
                disabled={(item.abbr === 'RS' ? repeatSimilarCount : similarCount) === 0}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>auto_awesome</span>
                Similar Practice ({item.abbr === 'RS' ? repeatSimilarCount : similarCount})
              </button>
            )}
          </div>
          {templates.length > 0 && (
            <div className="pte-card__template-row">
              {(item.abbr === 'DI' ? templates : templates.slice(0, 3)).map((template, index) => (
                <button
                  key={template.id}
                  className={`pte-card__practice-btn pte-card__practice-btn--template pte-card__practice-btn--template-${index + 1}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenTemplate(item, template.id)
                  }}
                  title={template.title}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit_square</span>
                  <span className="pte-card__template-btn-copy">
                    <span className="pte-card__template-btn-title">
                      {template.buttonLabel || template.title}
                      {template.buttonBadge && (
                        <span className="pte-card__template-btn-badge">{template.buttonBadge}</span>
                      )}
                    </span>
                    {template.buttonHint && (
                      <span className="pte-card__template-btn-hint">{template.buttonHint}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


/* ─── Main View ─── */
export function PtePrepView() {
  const [activeTab, setActiveTab] = useState('speaking-writing')
  const [showInfo, setShowInfo] = useState(false)
  const [practiceItem, setPracticeItem] = useState(null)
  const [templateItem, setTemplateItem] = useState(null)
  const [initialMode, setInitialMode] = useState('real')

  const handlePractice = (item, mode = 'real') => {
    setInitialMode(mode)
    setPracticeItem(item)
  }

  const handleOpenTemplate = (item, templateId) => {
    setTemplateItem({ item, templateId })
  }

  const activeTabData = TABS.find(t => t.id === activeTab)
  const questions = QUESTION_TYPES[activeTab] || []

  return (
    <PageLayout title="PTE Core Prep">
      {/* Info help button */}
      <button
        className="pte-help-btn"
        onClick={() => setShowInfo(true)}
        title="What is PTE Core?"
      >
        <span className="material-symbols-outlined">help</span>
      </button>

      {/* Info modal */}
      <PteInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Practice modal */}
      {!!practiceItem && (
        <PracticeMockModal
          isOpen={true}
          onClose={() => setPracticeItem(null)}
          item={practiceItem}
          color={activeTabData?.color}
          initialMode={initialMode}
        />
      )}

      {!!templateItem && (
        <TemplatePracticeModal
          isOpen={true}
          onClose={() => setTemplateItem(null)}
          item={templateItem.item}
          color={activeTabData?.color}
          initialTemplateId={templateItem.templateId}
        />
      )}

      {/* Tabs */}
      <div className="pte-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`pte-tab ${activeTab === tab.id ? 'pte-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              '--tab-color': tab.color,
            }}
          >
            <span className="material-symbols-outlined pte-tab__icon">{tab.icon}</span>
            <span className="pte-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <PageBox noPadding>
        <div className="pte-content">
          {/* Section header */}
          <div className="pte-section-header" style={{ '--section-color': activeTabData?.color }}>
            <span className="material-symbols-outlined pte-section-header__icon">{activeTabData?.icon}</span>
            <div>
              <h2 className="pte-section-header__title">{activeTabData?.label}</h2>
              <p className="pte-section-header__count">{questions.length} question types</p>
            </div>
          </div>

          {/* Cards */}
          <div className="pte-card-list">
            {questions.map((item) => (
              <QuestionCard
                key={item.abbr}
                item={item}
                color={activeTabData?.color}
                onPractice={handlePractice}
                onOpenTemplate={handleOpenTemplate}
              />
            ))}
          </div>
        </div>
      </PageBox>

      {/* Reference Sources footer */}
      <div className="pte-sources-footer">
        <span className="pte-sources-footer__title">Practice Material Sources</span>
        <div className="pte-sources-footer__links">
          <a href="https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            Canada.ca (IRCC)
          </a>
          <a href="https://www.pearsonpte.com/pte-core" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            Pearson PTE Core
          </a>
          <a href="https://www.apeuni.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            APEUni
          </a>
          <a href="https://alfapte.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            Alfa PTE
          </a>
          <a href="https://www.gurully.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            Gurully
          </a>
          <a href="https://ptesuccess.com.au/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            PTE Success
          </a>
          <a href="https://ptemagic.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            PTE Magic
          </a>
          <a href="https://e2language.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            E2 Language
          </a>
          <a href="https://onepte.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            OnePTE
          </a>
          <a href="https://www.easypte.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            EasyPTE
          </a>
        </div>
      </div>
    </PageLayout>
  )
}

export default PtePrepView
