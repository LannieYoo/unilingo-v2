/**
 * PtePrepView
 * PTE Core 시험 준비 메인 뷰
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useRecording } from '../../recording'
import { useWebSpeechInput } from '../../../common/hooks/useWebSpeechInput'
import { analyzeReadAloud } from '../_07_utils/readAloudAnalyzer'
import { decodeBlobToPCM, blobToWAV } from '../_07_utils/audioDecoder'
import readAloudQuestions from '../_01_data/read_aloud_questions.json'
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
    { name: 'Read Aloud', abbr: 'RA', impact: 5, skills: ['Speaking', 'Reading'], desc: 'Read a text aloud with natural fluency and pronunciation.', time: '30–40s prep + 40s', tip: 'Focus on chunking and stress patterns. Never self-correct.' },
    { name: 'Repeat Sentence', abbr: 'RS', impact: 5, skills: ['Speaking', 'Listening'], desc: 'Listen to a sentence and repeat it immediately.', time: 'Immediate', tip: 'Understand meaning first. Mimic rhythm and intonation.' },
    { name: 'Describe Image', abbr: 'DI', impact: 3, skills: ['Speaking'], desc: 'Describe a graph, chart, map, or image.', time: '25s prep + 40s', tip: 'Use a template: intro → highest/lowest → trend → conclusion.' },
    { name: 'Respond to a Situation', abbr: 'RtS', impact: 3, skills: ['Speaking'], desc: 'Read a situation and give an appropriate spoken response.', time: '20s prep + 40s', tip: 'Use 3-sentence structure: acknowledge → main point → closing.', core: true },
    { name: 'Answer Short Question', abbr: 'ASQ', impact: 2, skills: ['Speaking', 'Listening'], desc: 'Answer a short question with one or two words.', time: '10s', tip: 'Answer with a single word. Guess if unsure — silence scores zero.' },
    { name: 'Summarize Written Text', abbr: 'SWT', impact: 4, skills: ['Writing', 'Reading'], desc: 'Read a passage and write a 25–50 word summary in 1–2 sentences.', time: '10 min', tip: 'Must be 25–50 words. Use template: "The passage discusses X, highlighting Y, while Z."' },
    { name: 'Write Email', abbr: 'WE', impact: 3, skills: ['Writing'], desc: 'Write a 100–120 word email addressing 3 bullet points.', time: '9 min', tip: 'Address ALL 3 bullet points. Match formality to the recipient.', core: true },
  ],
  reading: [
    { name: 'R&W Fill in the Blanks', abbr: 'RWFIB', impact: 4, skills: ['Reading', 'Writing'], desc: 'Select appropriate words from dropdown menus to fill blanks.', time: '~2 min each', tip: 'Determine the part of speech first, then check collocations.' },
    { name: 'Multiple Choice (Multiple)', abbr: 'MCM', impact: 2, skills: ['Reading'], desc: 'Read a passage and select multiple correct answers.', time: '~2 min', tip: 'Only select answers you are confident about — wrong picks lose points.' },
    { name: 'Reorder Paragraphs', abbr: 'RO', impact: 4, skills: ['Reading'], desc: 'Drag sentences into the correct logical order.', time: '~2–3 min', tip: 'Find the topic sentence (no pronouns/connectors). Track pronoun references.' },
    { name: 'Fill in the Blanks (Drag)', abbr: 'FIB', impact: 3, skills: ['Reading'], desc: 'Drag words from a list into the correct blanks.', time: '~2 min each', tip: 'Use elimination: fill confident blanks first, then narrow remaining words.' },
    { name: 'Multiple Choice (Single)', abbr: 'MCS', impact: 2, skills: ['Reading'], desc: 'Read a passage and select one correct answer.', time: '~1.5 min', tip: 'No negative marking — always pick an answer. Look for paraphrasing.' },
  ],
  listening: [
    { name: 'Summarize Spoken Text', abbr: 'SST', impact: 4, skills: ['Listening', 'Writing'], desc: 'Listen to a lecture and write a 20–30 word summary.', time: '10 min', tip: 'Note the topic (first 10s), 2–3 key points, and the conclusion.' },
    { name: 'MC Multiple (Listening)', abbr: 'MCML', impact: 2, skills: ['Listening'], desc: 'Listen and select multiple correct answers.', time: 'Varies', tip: 'Read options before audio plays. Only select confident answers.' },
    { name: 'Fill in the Blanks (Listening)', abbr: 'LFIB', impact: 3, skills: ['Listening', 'Writing'], desc: 'Type the missing words while listening.', time: 'Varies', tip: 'Spelling is critical. If you miss one blank, move on to the next.' },
    { name: 'Highlight Incorrect Words', abbr: 'HIW', impact: 3, skills: ['Listening', 'Reading'], desc: 'Click words in the transcript that differ from the audio.', time: 'Varies', tip: 'Follow along at audio speed. Don\'t click if unsure — wrong clicks lose points.' },
    { name: 'Select Missing Word', abbr: 'SMW', impact: 2, skills: ['Listening'], desc: 'Listen and choose the word that completes the audio.', time: 'Varies', tip: 'Focus on the conclusion. The missing word fits the overall context.' },
    { name: 'Write from Dictation', abbr: 'WFD', impact: 5, skills: ['Listening', 'Writing'], desc: 'Listen to a sentence and type it exactly.', time: 'Varies', tip: 'The HIGHEST impact item! Note keywords on the erasable noteboard, then reconstruct.' },
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

/* ─── Analysis Result Component ─── */
function AnalysisResult({ analysis, engineLabel, onClose }) {
  if (!analysis) return null

  return (
    <div className="pte-ra-analysis">
      {/* Engine tag */}
      <div className="pte-ra-analysis__engine-tag">
        Analyzed with: {engineLabel}
      </div>

      {/* Overall score */}
      <div className="pte-ra-analysis__overall">
        <span className="pte-ra-analysis__overall-label">Overall</span>
        <span className="pte-ra-analysis__overall-score">{analysis.overall}</span>
        <span className="pte-ra-analysis__overall-max">/ 90</span>
      </div>

      {/* Score gauges */}
      <div className="pte-ra-scores">
        <ScoreGauge label="Content" score={analysis.content} icon="fact_check" color="#22c55e" />
        <ScoreGauge label="Fluency" score={analysis.fluency} icon="waves" color="#3b82f6" />
        <ScoreGauge label="Pronunciation" score={analysis.pronunciation} icon="record_voice_over" color="#f59e0b" />
      </div>

      {/* Word-level diff */}
      <div className="pte-ra-word-diff">
        <h5 className="pte-ra-word-diff__title">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>text_compare</span>
          Word-by-Word Breakdown
        </h5>
        <div className="pte-ra-word-diff__legend">
          <span><span className="pte-ra-word pte-ra-word--correct">correct</span> Spoken correctly</span>
          <span><span className="pte-ra-word pte-ra-word--close">close</span> Close match</span>
          <span><span className="pte-ra-word pte-ra-word--missed">missed</span> Not detected</span>
        </div>
        <div className="pte-ra-word-diff__text">
          {analysis.wordDiff.map((w, i) => (
            <span key={i} className={`pte-ra-word pte-ra-word--${w.status}`} title={
              w.status === 'close' ? `Heard as: "${w.matchedAs}"` :
              w.status === 'missed' ? 'This word was not detected in your speech' :
              'Correctly spoken'
            }>
              {w.word}
            </span>
          ))}
        </div>
      </div>

      {/* Improvement tips */}
      {analysis.tips.length > 0 && (
        <div className="pte-ra-tips">
          <h5 className="pte-ra-tips__title">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>lightbulb</span>
            Improvement Tips
          </h5>
          <ul>
            {analysis.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="pte-ra-analysis__disclaimer">
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
        <p>
          <strong>Disclaimer:</strong> This analysis is generated using automated speech-to-text comparison and is <strong>not equivalent to official PTE Core scoring</strong>.
          Actual PTE scores assess oral fluency, pronunciation, intonation, and stress at an acoustic level, which this tool does not replicate.
          Use these results as a <strong>general reference for practice only</strong>.
        </p>
      </div>

      <button className="pte-ra-btn pte-ra-btn--secondary" onClick={onClose} style={{ marginTop: '0.75rem', alignSelf: 'center' }}>
        <span className="material-symbols-outlined">close</span>
        Close Analysis
      </button>
    </div>
  )
}

/* ─── Read Aloud Practice ─── */
function ReadAloudPractice({ color, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState('preparing') // 'preparing', 'recording', 'completed'
  const [timeLeft, setTimeLeft] = useState(35) // prep: 35s, recording: 40s
  
  // Analysis state
  const [analysisState, setAnalysisState] = useState('idle') // 'idle', 'analyzing', 'done'
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisEngine, setAnalysisEngine] = useState('')
  const [analysisError, setAnalysisError] = useState(null)

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
  
  const currentQuestion = readAloudQuestions[currentIdx]

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
  }, [status, currentIdx])

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
  }

  const handleStartRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    handleStartRecordingInternal()
  }

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    handleStopRecordingInternal()
  }

  const handleRetry = () => {
    if (isRecording) stopRecording()
    webSpeech.stop()
    setStatus('preparing')
    setAnalysisState('idle')
    setAnalysisResult(null)
    setAnalysisError(null)
    webSpeechTextRef.current = ''
  }

  const handleNext = () => {
    if (currentIdx < readAloudQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1)
      setStatus('preparing')
      setAnalysisState('idle')
      setAnalysisResult(null)
      setAnalysisError(null)
      webSpeechTextRef.current = ''
    }
  }

  // ─── Analysis Handlers ───────────────────────────────────────

  const runAnalysis = (recognizedText, engineLabel) => {
    const result = analyzeReadAloud(currentQuestion.text, recognizedText)
    setAnalysisResult(result)
    setAnalysisEngine(engineLabel)
    setAnalysisState('done')
    setAnalysisError(null)
  }

  const handleAnalyzeBrowser = () => {
    const text = webSpeechTextRef.current.trim()
    if (!text) {
      setAnalysisError('No speech was captured by the browser. The Web Speech API may not have detected your speech. Try "Local AI" or "Server" instead.')
      return
    }
    setAnalysisState('analyzing')
    setAnalysisError(null)
    // Web Speech result is already available — instant analysis
    setTimeout(() => runAnalysis(text, '🌐 Browser (Web Speech API)'), 100)
  }

  const handleAnalyzeWasm = async () => {
    const latestRec = recordings[recordings.length - 1]
    if (!latestRec?.blob) {
      setAnalysisError('No recording available to analyze.')
      return
    }

    setAnalysisState('analyzing')
    setAnalysisError(null)

    try {
      // Decode blob to PCM
      const pcmSamples = await decodeBlobToPCM(latestRec.blob)
      
      // Create a temporary WASM worker for offline transcription
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
              // Feed audio and request transcription
              worker.postMessage({ type: 'start', language: 'en-US' })
              
              // Feed audio in chunks (simulate streaming)
              const chunkSize = 4096
              for (let i = 0; i < pcmSamples.length; i += chunkSize) {
                const chunk = pcmSamples.slice(i, i + chunkSize)
                worker.postMessage({ type: 'audio', samples: chunk }, [chunk.buffer])
              }
              
              // Signal end of audio
              setTimeout(() => {
                worker.postMessage({ type: 'stop' })
              }, 500)
              break
              
            case 'final':
              if (msg.text?.trim()) {
                fullText += msg.text.trim() + ' '
              }
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

        // Initialize WASM
        worker.postMessage({
          type: 'init',
          wasmBaseUrl: window.location.origin + '/',
          language: 'en-US',
        })
      })

      if (!fullText.trim()) {
        setAnalysisError('WASM SenseVoice could not recognize any speech in the recording. Try "Browser" or "Server" instead.')
        setAnalysisState('idle')
        return
      }

      runAnalysis(fullText.trim(), '🤖 Local AI (SenseVoice WASM)')
    } catch (err) {
      console.error('[RA Analysis] WASM error:', err)
      setAnalysisError(`Local AI analysis failed: ${err.message}`)
      setAnalysisState('idle')
    }
  }

  const handleAnalyzeServer = async () => {
    const latestRec = recordings[recordings.length - 1]
    if (!latestRec?.blob) {
      setAnalysisError('No recording available to analyze.')
      return
    }

    setAnalysisState('analyzing')
    setAnalysisError(null)

    try {
      // Convert blob to WAV for server upload
      const wavBlob = await blobToWAV(latestRec.blob)
      
      const formData = new FormData()
      formData.append('audio', wavBlob, 'recording.wav')
      formData.append('language', 'en')

      const response = await fetch(`${WHISPER_SERVER_URL}/api/stt/transcribe`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const text = result.text?.trim()

      if (!text) {
        setAnalysisError('Server Whisper could not recognize any speech. Try "Browser" or "Local AI" instead.')
        setAnalysisState('idle')
        return
      }

      runAnalysis(text, '🖥️ Server (Whisper large-v3)')
    } catch (err) {
      console.error('[RA Analysis] Server error:', err)
      setAnalysisError(`Server analysis failed: ${err.message}. Make sure the Whisper server is running.`)
      setAnalysisState('idle')
    }
  }

  const latestRecording = recordings[recordings.length - 1]

  // Progress percentage
  const maxTime = status === 'preparing' ? 35 : 40
  const progressPercent = ((maxTime - timeLeft) / maxTime) * 100
  const progressColor = status === 'preparing' ? '#f59e0b' : '#ef4444'

  return (
    <div className="pte-ra-container">
      <div className="pte-ra-header">
        <h4 className="pte-ra-title">{currentQuestion?.title || 'Read Aloud Task'}</h4>
        <span className="pte-ra-counter">Question {currentIdx + 1} of {readAloudQuestions.length}</span>
      </div>

      {/* Text Box to read */}
      <div className="pte-ra-text-box">
        {currentQuestion?.text}
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
              {currentIdx < readAloudQuestions.length - 1 ? (
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

      {/* ─── Analysis Section ─── */}
      {status === 'completed' && analysisState !== 'done' && (
        <div className="pte-ra-engine-picker">
          <h5 className="pte-ra-engine-picker__title">
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>analytics</span>
            Analyze My Speech
          </h5>
          <p className="pte-ra-engine-picker__subtitle">Choose an engine to transcribe and analyze your recording:</p>

          <div className="pte-ra-engine-picker__buttons">
            <button 
              className="pte-ra-engine-btn"
              onClick={handleAnalyzeBrowser}
              disabled={analysisState === 'analyzing'}
            >
              <span className="pte-ra-engine-btn__icon">🌐</span>
              <div>
                <strong>Browser</strong>
                <span>Web Speech API · Instant</span>
              </div>
            </button>

            <button 
              className="pte-ra-engine-btn"
              onClick={handleAnalyzeWasm}
              disabled={analysisState === 'analyzing'}
            >
              <span className="pte-ra-engine-btn__icon">🤖</span>
              <div>
                <strong>Local AI</strong>
                <span>SenseVoice WASM · 2–5s</span>
              </div>
            </button>

            <button 
              className="pte-ra-engine-btn"
              onClick={handleAnalyzeServer}
              disabled={analysisState === 'analyzing'}
            >
              <span className="pte-ra-engine-btn__icon">🖥️</span>
              <div>
                <strong>Server</strong>
                <span>Whisper large-v3 · 3–8s</span>
              </div>
            </button>
          </div>

          {analysisState === 'analyzing' && (
            <div className="pte-ra-engine-picker__loading">
              <div className="pte-ra-spinner" />
              <span>Analyzing your speech...</span>
            </div>
          )}

          {analysisError && (
            <div className="pte-ra-engine-picker__error">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>
              {analysisError}
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {analysisState === 'done' && analysisResult && (
        <AnalysisResult
          analysis={analysisResult}
          engineLabel={analysisEngine}
          onClose={() => {
            setAnalysisState('idle')
            setAnalysisResult(null)
          }}
        />
      )}

      {/* Security/Local Storage disclaimer */}
      <div className="pte-ra-notice">
        <span className="material-symbols-outlined pte-ra-notice-icon">lock</span>
        <div>
          <strong>안전한 로컬 전용 저장:</strong> 녹음된 오디오 파일은 브라우저 메모리에 임시 보관되며 서버로 일체 전송되지 않습니다. 다운로드 시 파일명은 자동으로 아이디와 현재 시각초로 지정되어 저장됩니다.
        </div>
      </div>
    </div>
  )
}


/* ─── Practice Mock Modal ─── */
function PracticeMockModal({ isOpen, onClose, item, color }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
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
            <div className="pte-practice-modal__instruction-row">
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color }}>timer</span>
              <span><strong>Time:</strong> {item.time}</span>
            </div>
            <div className="pte-practice-modal__instruction-row">
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color }}>target</span>
              <span><strong>Skills Assessed:</strong> {item.skills.join(' + ')}</span>
            </div>
            <div className="pte-practice-modal__instruction-row">
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: '#f59e0b' }}>lightbulb</span>
              <span><strong>Tip:</strong> {item.tip}</span>
            </div>
          </div>

          {/* Conditional rendering for RA vs other types */}
          {item.abbr === 'RA' ? (
            <ReadAloudPractice color={color} onClose={handleClose} />
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
          </div>
          <div className="pte-card__tip">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#f59e0b' }}>lightbulb</span>
            <span>{item.tip}</span>
          </div>
          <button
            className="pte-card__practice-btn"
            style={{ '--btn-color': color }}
            onClick={(e) => {
              e.stopPropagation()
              onPractice(item)
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>play_circle</span>
            Start Practice
          </button>
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
                onPractice={setPracticeItem}
              />
            ))}
          </div>
        </div>
      </PageBox>
    </PageLayout>
  )
}

export default PtePrepView
