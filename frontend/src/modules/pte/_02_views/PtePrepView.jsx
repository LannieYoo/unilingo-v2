/**
 * PtePrepView
 * PTE Core 시험 준비 메인 뷰
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useRecording } from '../../recording'
import { useWebSpeechInput } from '../../../common/hooks/useWebSpeechInput'
import { analyzeReadAloud } from '../_07_utils/readAloudAnalyzer'
import { decodeBlobToPCM, blobToWAV } from '../_07_utils/audioDecoder'
import { fetchWordDetail, saveWordToPTE, toggleWordFavorite, translateWord } from '../_06_services/pteWordService'
import readAloudQuestions from '../_01_data/read_aloud_questions.json'
import similarQuestions from '../_01_data/similar_read_aloud_questions.json'
import useAuthStore from '../../auth/_05_stores/authStore'
import '../_10_styles/pte.css'

/* Whisper server URL — uses ngrok proxy in production */
const WHISPER_SERVER_URL = import.meta.env.VITE_WHISPER_SERVER_URL || 'http://192.168.1.150:8200'

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
    { name: 'Repeat Sentence', abbr: 'RS', impact: 5, skills: ['Speaking', 'Listening'], desc: 'Listen to a sentence and repeat it immediately.', time: 'Immediate', tip: 'Understand meaning first. Mimic rhythm and intonation.', volume: '10–12' },
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

function WordDetailPopup({ word, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [savingLogId, setSavingLogId] = useState(null)
  const [isFav, setIsFav] = useState(false)
  const [defLang, setDefLang] = useState('en')
  const [translatedDefs, setTranslatedDefs] = useState({})
  const [translating, setTranslating] = useState(false)
  const [translatedWord, setTranslatedWord] = useState(null)
  const audioRef = useRef(null)

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
    fetchWordDetail(word).then(d => {
      setDetail(d)
      setLoading(false)
    })
  }, [word])

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
      const utterance = new SpeechSynthesisUtterance(txt)
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    }
  }

  const handlePlayAudio = () => {
    if (detail?.audioUrl && audioRef.current) {
      audioRef.current.src = detail.audioUrl
      audioRef.current.play().catch(err => {
        console.warn('Audio play failed, falling back to TTS:', err)
        speakWordTTS(detail.word)
      })
    } else if (detail?.word) {
      speakWordTTS(detail.word)
    }
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

            {/* Translation word display */}
            {defLang !== 'en' && translatedWord && (
              <div className="pte-word-popup__translation-word">
                {translatedWord}
              </div>
            )}

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
function AnalysisResult({ analysis, engineLabel, onWordClick }) {
  const [tipsLang, setTipsLang] = useState('en')
  const [translatedTips, setTranslatedTips] = useState({})
  const [tipsTranslating, setTipsTranslating] = useState(false)

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

      {/* Word-level diff — clickable */}
      <div className="pte-ra-word-diff">
        <h5 className="pte-ra-word-diff__title">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>text_compare</span>
          Word-by-Word Breakdown
          <span className="pte-ra-word-diff__hint">click a word for pronunciation</span>
        </h5>
        <div className="pte-ra-word-diff__legend">
          <span><span className="pte-ra-word pte-ra-word--correct">correct</span> Spoken correctly</span>
          <span><span className="pte-ra-word pte-ra-word--close">close</span> Close match</span>
          <span><span className="pte-ra-word pte-ra-word--missed">missed</span> Not detected</span>
        </div>
        <div className="pte-ra-word-diff__text">
          {analysis.wordDiff.map((w, i) => (
            <span
              key={i}
              className={`pte-ra-word pte-ra-word--${w.status} pte-ra-word--clickable`}
              title={w.status === 'close' ? `Heard as: "${w.matchedAs}"` : w.status === 'missed' ? 'Not detected' : 'Correct'}
              onClick={() => onWordClick && onWordClick(w.word)}
            >
              {w.word}
            </span>
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
  
  try {
    const url = new URL(source)
    return url.hostname.replace('www.', '')
  } catch (e) {
    return 'PTE Reference Source'
  }
}


/* ─── Read Aloud Practice ─── */
function ReadAloudPractice({ color, onClose, initialMode = 'real' }) {
  // Question mode: 'real' (actual PTE-style) or 'similar' (AI-generated)
  const [questionMode, setQuestionMode] = useState(initialMode)

  // Shuffle questions on mount per mode
  const shuffledReal = useMemo(() => shuffleArray(readAloudQuestions), [])
  const shuffledSimilar = useMemo(() => shuffleArray(similarQuestions), [])
  const shuffledQuestions = questionMode === 'real' ? shuffledReal : shuffledSimilar

  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState('preparing') // 'preparing', 'recording', 'completed'
  const [timeLeft, setTimeLeft] = useState(35) // prep: 35s, recording: 40s
  
  // Per-engine analysis state
  const [engineResults, setEngineResults] = useState({ browser: null, wasm: null, server: null })
  const [engineLoading, setEngineLoading] = useState({ browser: false, wasm: false, server: false })
  const [engineErrors, setEngineErrors] = useState({ browser: null, wasm: null, server: null })
  const [activeEngine, setActiveEngine] = useState(null) // which engine result is shown inline

  // Word detail popup
  const [selectedWord, setSelectedWord] = useState(null)

  // Track completed questions for cumulative download
  const completedRef = useRef([])
  const [completedCount, setCompletedCount] = useState(0)

  // Track weak words across all tests (missed + close)
  const weakWordsRef = useRef(new Map()) // Map<word, { word, status, matchedAs, count, engine }>
  const [weakWordsCount, setWeakWordsCount] = useState(0)
  const [showWeakWords, setShowWeakWords] = useState(false)

  const timerRef = useRef(null)
  const webSpeechTextRef = useRef('')
  
  const { isRecording, recordings, startRecording, stopRecording, downloadRecording } = useRecording()
  
  // Web Speech API for concurrent recognition during recording
  const webSpeechResultHandler = useCallback((text, isFinal) => {
    if (isFinal && text) {
      webSpeechTextRef.current += text + ' '
    }
  }, [])
  
  const webSpeech = useWebSpeechInput({
    language: 'en-US',
    onResult: webSpeechResultHandler,
    continuous: true,
  })
  
  const currentQuestion = shuffledQuestions[currentIdx]

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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    setTtsPlaying(false)
    setTtsActiveIdx(-1)
    setTtsState('idle')
    setTtsPauseLeft(0)
  }, [])

  const handleTtsPause = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (ttsTimerRef.current) {
      clearInterval(ttsTimerRef.current)
      ttsTimerRef.current = null
    }
    setTtsPlaying(false)
  }, [])

  const speakSentence = useCallback((idx) => {
    if (idx < 0 || idx >= sentences.length) return
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      setTimeout(() => {
        if (!ttsPlayingRef.current) return
        
        const utterance = new SpeechSynthesisUtterance(sentences[idx])
        utterance.lang = 'en-US'
        utterance.rate = ttsRateRef.current
        
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
        
        window.speechSynthesis.speak(utterance)
      }, 50)
    }
  }, [sentences, handleTtsStop])

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
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (ttsTimerRef.current) {
        clearInterval(ttsTimerRef.current)
      }
    }
  }, [])


  // Timer loop
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

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
  }, [status, currentIdx, questionMode])

  // Stop recording if the component unmounts while recording is active
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording()
      }
      webSpeech.stop()
    }
  }, [isRecording, stopRecording])

  const handleStartRecordingInternal = () => {
    webSpeechTextRef.current = ''
    startRecording()
    // Start Web Speech API concurrently
    webSpeech.start()
    setStatus('recording')
  }

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
    setSelectedWord(null)
    handleTtsStop()
  }

  const handleRetry = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (isRecording) stopRecording()
    webSpeech.stop()
    setStatus('preparing')
    setTimeLeft(35)
    resetAnalysis()
    webSpeechTextRef.current = ''
  }

  const handleNext = () => {
    if (currentIdx < shuffledQuestions.length - 1) {
      if (timerRef.current) clearInterval(timerRef.current)
      setCurrentIdx((prev) => prev + 1)
      setStatus('preparing')
      setTimeLeft(35)
      resetAnalysis()
      webSpeechTextRef.current = ''
    }
  }

  // Switch to similar questions mode
  const handleSwitchToSimilar = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setQuestionMode('similar')
    setCurrentIdx(0)
    setStatus('preparing')
    setTimeLeft(35)
    resetAnalysis()
    webSpeechTextRef.current = ''
  }

  const handleSwitchToReal = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setQuestionMode('real')
    setCurrentIdx(0)
    setStatus('preparing')
    setTimeLeft(35)
    resetAnalysis()
    webSpeechTextRef.current = ''
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
    const header = `PTE Read Aloud Practice Session\nDate: ${new Date().toLocaleString()}\nTotal Questions: ${completedRef.current.length}\n\n`
    const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `read-aloud-practice-${new Date().toISOString().slice(0, 10)}.txt`
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
    const text = webSpeechTextRef.current.trim()
    if (!text) {
      setEngineErrors(prev => ({ ...prev, browser: 'No speech was captured by the browser. Try "Local AI" or "Server" instead.' }))
      return
    }
    setEngineLoading(prev => ({ ...prev, browser: true }))
    setEngineErrors(prev => ({ ...prev, browser: null }))
    setTimeout(() => {
      const result = analyzeReadAloud(currentQuestion.text, text)
      setEngineResults(prev => ({ ...prev, browser: result }))
      setEngineLoading(prev => ({ ...prev, browser: false }))
      collectWeakWords(result, 'Browser')
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
      setEngineResults(prev => ({ ...prev, wasm: result }))
      setEngineLoading(prev => ({ ...prev, wasm: false }))
      collectWeakWords(result, 'Local AI')
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

      const result = analyzeReadAloud(currentQuestion.text, text)
      setEngineResults(prev => ({ ...prev, server: result }))
      setEngineLoading(prev => ({ ...prev, server: false }))
      collectWeakWords(result, 'Server')
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
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>quiz</span>
          Real Questions ({readAloudQuestions.length})
        </button>
        <button
          className={`pte-ra-mode-btn ${questionMode === 'similar' ? 'pte-ra-mode-btn--active' : ''}`}
          onClick={handleSwitchToSimilar}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>auto_awesome</span>
          Similar Practice ({similarQuestions.length})
        </button>
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
            {currentQuestion?.title || 'Read Aloud Task'}
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

      {/* Text Box to read */}
      <div className="pte-ra-text-box">
        {ttsActiveIdx === -1 ? (
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

      {/* Status & Timer Card */}
      <div className="pte-ra-timer-wrap">
        <div className="pte-ra-status-row">
          <span className={`pte-ra-status-badge pte-ra-status-badge--${status}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              {status === 'preparing' ? 'hourglass_empty' : status === 'recording' ? 'mic' : 'check_circle'}
            </span>
            {status === 'preparing' ? 'Preparing' : status === 'recording' ? 'Recording' : 'Completed'}
          </span>
          <span className="pte-ra-timer-text">
            {status === 'preparing' && `Beginning in ${timeLeft}s`}
            {status === 'recording' && `Recording: ${timeLeft}s remaining`}
            {status === 'completed' && 'Recording finished'}
          </span>
        </div>

        {status !== 'completed' && (
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
        {status === 'completed' && (
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

        {/* Action Controls */}
        <div className="pte-ra-actions-row">
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
                <span>{engineLoading.browser ? 'Analyzing...' : engineResults.browser ? `Score: ${engineResults.browser.overall}/90` : 'Web Speech API · Instant'}</span>
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
            activeEngine === 'browser' ? '🌐 Browser (Web Speech API)' :
            activeEngine === 'wasm' ? '🤖 Local AI (SenseVoice WASM)' :
            '🖥️ Server (Whisper large-v3)'
          }
          onWordClick={(word) => setSelectedWord(word)}
        />
      )}

      {/* Disclaimer — show once if any analysis done */}
      {(engineResults.browser || engineResults.wasm || engineResults.server) && (
        <div className="pte-ra-analysis__disclaimer">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
          <p>
            <strong>Disclaimer:</strong> This analysis is generated using automated speech-to-text comparison and is <strong>not equivalent to official PTE Core scoring</strong>.
            Actual PTE scores assess oral fluency, pronunciation, intonation, and stress at an acoustic level, which this tool does not replicate.
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
        <WordDetailPopup word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}

      {/* Weak Words Panel */}
      {showWeakWords && (
        <WeakWordsPanel
          weakWords={Array.from(weakWordsRef.current.values())}
          onClose={() => setShowWeakWords(false)}
          onWordClick={(word) => { setShowWeakWords(false); setSelectedWord(word); }}
        />
      )}
    </div>
  )
}



/* ─── Weak Words Panel ─── */
function WeakWordsPanel({ weakWords, onClose, onWordClick }) {
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
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.rate = 0.85
      window.speechSynthesis.speak(utterance)
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
          {sortedWords.map((w, i) => (
            <div key={i} className={`pte-weak-panel__item pte-weak-panel__item--${w.status}`}>
              <button
                className="pte-weak-panel__speak-btn"
                onClick={() => speakWord(w.word)}
                title="Listen"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>volume_up</span>
              </button>
              <button
                className="pte-weak-panel__word-btn"
                onClick={() => onWordClick(w.word)}
                title="View definition"
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
          ))}
        </div>

        <div className="pte-weak-panel__footer">
          <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>info</span>
          Click a word to see its definition, phonetic, and pronunciation audio.
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

          {/* Conditional rendering for RA vs other types */}
          {item.abbr === 'RA' ? (
            <ReadAloudPractice color={color} onClose={handleClose} initialMode={initialMode} />
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
function QuestionCard({ item, color, onPractice }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const realCount = item.abbr === 'RA' ? readAloudQuestions.length : 0
  const similarCount = item.abbr === 'RA' ? similarQuestions.length : 0

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
            <button
              className="pte-card__practice-btn pte-card__practice-btn--real"
              onClick={(e) => {
                e.stopPropagation()
                onPractice(item, 'real')
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>quiz</span>
              Real Questions ({realCount})
            </button>
            <button
              className="pte-card__practice-btn pte-card__practice-btn--similar"
              onClick={(e) => {
                e.stopPropagation()
                onPractice(item, 'similar')
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>auto_awesome</span>
              Similar Practice ({similarCount})
            </button>
          </div>
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
  const [initialMode, setInitialMode] = useState('real')

  const handlePractice = (item, mode = 'real') => {
    setInitialMode(mode)
    setPracticeItem(item)
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
            <span className="material-symbols-outlined">gavel</span>
            Canada.ca (IRCC)
          </a>
          <a href="https://www.pearsonpte.com/pte-core" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">verified</span>
            Pearson PTE Core
          </a>
          <a href="https://www.apeuni.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">language</span>
            APEUni
          </a>
          <a href="https://alfapte.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">language</span>
            Alfa PTE
          </a>
          <a href="https://www.gurully.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">language</span>
            Gurully
          </a>
          <a href="https://ptesuccess.com.au/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">language</span>
            PTE Success
          </a>
          <a href="https://ptemagic.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">language</span>
            PTE Magic
          </a>
          <a href="https://e2language.com/" target="_blank" rel="noopener noreferrer" className="pte-source-footer-link">
            <span className="material-symbols-outlined">language</span>
            E2 Language
          </a>
        </div>
      </div>
    </PageLayout>
  )
}

export default PtePrepView
