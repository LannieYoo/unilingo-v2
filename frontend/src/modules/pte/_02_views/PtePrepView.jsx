/**
 * PtePrepView
 * PTE Core 시험 준비 메인 뷰
 */

import { useState } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import '../_10_styles/pte.css'

/* ─── PTE Core Info Modal ─── */
function PteInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null

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
          <h2 className="pte-modal__title">What is PTE Core?</h2>
        </div>

        <div className="pte-modal__body">
          {/* Overview */}
          <section className="pte-modal__section">
            <h3>Overview</h3>
            <p>
              <strong>PTE Core (Pearson Test of English Core)</strong> is a computer-based English
              proficiency test developed by Pearson, designed specifically for
              <strong> Canadian immigration</strong> purposes. It is recognized by IRCC
              (Immigration, Refugees and Citizenship Canada) for PR, work permits (including PGWP),
              and citizenship applications.
            </p>
            <ul>
              <li><strong>Format:</strong> 100% computer-based, AI-scored</li>
              <li><strong>Duration:</strong> ~2 hours</li>
              <li><strong>Results:</strong> Typically within 2 business days</li>
              <li><strong>Validity:</strong> 2 years from the test date</li>
            </ul>
          </section>

          {/* When do you need it */}
          <section className="pte-modal__section">
            <h3>When Do You Need PTE Core?</h3>
            <div className="pte-modal__use-cases">
              <div className="pte-modal__use-case">
                <span className="pte-modal__use-badge pte-modal__use-badge--pgwp">PGWP</span>
                <span>Post-Graduation Work Permit — CLB 5 required for 1-year programs, CLB 7 for 3-year programs</span>
              </div>
              <div className="pte-modal__use-case">
                <span className="pte-modal__use-badge pte-modal__use-badge--pr">PR</span>
                <span>Permanent Residency (Express Entry) — CLB 7+ recommended</span>
              </div>
              <div className="pte-modal__use-case">
                <span className="pte-modal__use-badge pte-modal__use-badge--citizen">Citizenship</span>
                <span>Canadian Citizenship — CLB 4+ minimum</span>
              </div>
            </div>
          </section>

          {/* CLB Conversion */}
          <section className="pte-modal__section">
            <h3>CLB Score Conversion</h3>
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
              PGWP minimum: CLB 5 — L ≥ 39, R ≥ 42, W ≥ 51, S ≥ 51
            </p>
          </section>

          {/* Cost */}
          <section className="pte-modal__section">
            <h3>Cost & Registration</h3>
            <ul>
              <li><strong>Test Fee:</strong> CAD $350 (Canada, as of 2025)</li>
              <li><strong>Score Reports:</strong> Unlimited, free of charge</li>
              <li><strong>Reschedule:</strong> Free if done 48+ hours before the test</li>
              <li><strong>Retake Interval:</strong> Minimum 5 days between attempts</li>
            </ul>
            <p className="pte-modal__note">
              Register at <a href="https://www.pearsonpte.com" target="_blank" rel="noopener noreferrer">pearsonpte.com</a>.
              Make sure to select <strong>PTE Core</strong> (not PTE Academic).
            </p>
          </section>

          {/* Exam Structure */}
          <section className="pte-modal__section">
            <h3>Exam Structure</h3>
            <div className="pte-modal__structure">
              <div className="pte-modal__part">
                <span className="pte-modal__part-num">Part 1</span>
                <div>
                  <strong>Speaking & Writing</strong>
                  <span className="pte-modal__part-time">~50–67 min</span>
                  <div className="pte-modal__part-detail">Read Aloud, Repeat Sentence, Describe Image, Respond to a Situation, Answer Short Question, Summarize Written Text, Write Email</div>
                </div>
              </div>
              <div className="pte-modal__part">
                <span className="pte-modal__part-num">Part 2</span>
                <div>
                  <strong>Reading</strong>
                  <span className="pte-modal__part-time">~27–38 min</span>
                  <div className="pte-modal__part-detail">Fill in the Blanks, Multiple Choice, Reorder Paragraphs</div>
                </div>
              </div>
              <div className="pte-modal__part">
                <span className="pte-modal__part-num">Part 3</span>
                <div>
                  <strong>Listening</strong>
                  <span className="pte-modal__part-time">~30–37 min</span>
                  <div className="pte-modal__part-detail">Summarize Spoken Text, Fill in the Blanks, Highlight Incorrect Words, Write from Dictation</div>
                </div>
              </div>
            </div>
          </section>
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

/* ─── Question Type Card ─── */
function QuestionCard({ item, color }) {
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
        </div>
      )}
    </div>
  )
}


/* ─── Main View ─── */
export function PtePrepView() {
  const [activeTab, setActiveTab] = useState('speaking-writing')
  const [showInfo, setShowInfo] = useState(false)

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
              />
            ))}
          </div>
        </div>
      </PageBox>
    </PageLayout>
  )
}

export default PtePrepView
