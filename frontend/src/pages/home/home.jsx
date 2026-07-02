import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet } from '../../common/api'
import { useAuthStore, GoogleLoginButton } from '../../modules/auth'
import './home.css'

const API_BASE = '/api'

// Free-to-use imagery (Unsplash). Wide crop for the full-bleed hero banner.
// If Unsplash fails, fall back to a deterministic Picsum photo, then to the dark gradient.
const HERO_PHOTO = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=2000&q=80'
const HERO_PHOTO_FALLBACK = 'https://picsum.photos/seed/unilingo-hero/2000/900'

const LANGS = [
  { code: 'ko', name: 'Korean' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
]

const VALUE_CHIPS = [
  { icon: 'translate', label: 'KO · EN · ZH' },
  { icon: 'conversion_path', label: 'Phrasal verbs' },
  { icon: 'newspaper', label: 'Daily news' },
  { icon: 'workspace_premium', label: 'PTE & CELPIP' },
]

const FEATURES = [
  { to: '/translator', icon: 'translate', title: 'Translator', desc: 'Instant KO · EN · ZH translation with grammar hints.', accent: 'orange' },
  { to: '/dictionary', icon: 'menu_book', title: 'Dictionary', desc: 'Definitions, examples, synonyms, and AI-related words.', accent: 'blue' },
  { to: '/study-lab', icon: 'school', title: 'Study Lab', desc: 'Vocabulary, phrasal verbs, sentence practice & news.', accent: 'teal' },
  { to: '/text-to-speech', icon: 'record_voice_over', title: 'Text to Speech', desc: 'Natural voices to hear how words really sound.', accent: 'violet' },
  { to: '/stt-stream', icon: 'mic', title: 'Speech to Text', desc: 'Real-time transcription for speaking practice.', accent: 'rose' },
  { to: '/pte-core', icon: 'workspace_premium', title: 'PTE Core', desc: 'Task-by-task PTE Core preparation.', accent: 'amber' },
  { to: '/celpip', icon: 'verified', title: 'CELPIP', desc: 'Exam-realistic CELPIP practice sets.', accent: 'green' },
  { to: '/speech-to-recording', icon: 'graphic_eq', title: 'Recording', desc: 'Record, replay, and refine your pronunciation.', accent: 'slate' },
]

function formatNewsDate(value = '') {
  if (!value) return ''
  const raw = String(value)
  const parsed = new Date(raw.includes('T') ? raw : `${raw}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10)
  const diffDays = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86400000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  return raw.slice(0, 10)
}

function getLevelNumber(difficulty = '') {
  const match = String(difficulty).match(/\d+/)
  return match ? match[0] : 'M'
}

function Home() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // --- Quick translate ---
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [sourceLang, setSourceLang] = useState('ko')
  const [targetLang, setTargetLang] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const translateTimer = useRef(null)

  // --- Quick word lookup ---
  const [word, setWord] = useState('')

  // --- Hero image (with graceful fallbacks) ---
  const [heroImgSrc, setHeroImgSrc] = useState(HERO_PHOTO)
  const [heroPhotoOk, setHeroPhotoOk] = useState(true)

  // --- Latest news ---
  const [articles, setArticles] = useState([])
  const [newsState, setNewsState] = useState('loading') // loading | ready | empty | error
  const [activeArticle, setActiveArticle] = useState(null)
  const [articleDetail, setArticleDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const translate = async (text, from, to) => {
    if (!text?.trim() || from === to) return from === to ? text : ''
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), source_lang: from, target_lang: to }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.translated_text || ''
      }
    } catch {
      /* ignore */
    }
    return ''
  }

  const runTranslate = async () => {
    if (!inputText.trim()) {
      setOutputText('')
      return
    }
    setIsTranslating(true)
    const result = await translate(inputText, sourceLang, targetLang)
    setOutputText(result || 'Translation unavailable right now.')
    setIsTranslating(false)
  }

  // debounced auto-translate
  useEffect(() => {
    if (translateTimer.current) clearTimeout(translateTimer.current)
    if (!inputText.trim()) {
      setOutputText('')
      return
    }
    translateTimer.current = setTimeout(runTranslate, 550)
    return () => translateTimer.current && clearTimeout(translateTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, sourceLang, targetLang])

  const swapLangs = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setInputText(outputText)
    setOutputText(inputText)
  }

  const submitWord = (event) => {
    event.preventDefault()
    const term = word.trim()
    if (!term) return
    navigate('/dictionary', { state: { searchTerm: term } })
  }

  useEffect(() => {
    let cancelled = false
    async function loadNews() {
      try {
        const response = await apiGet('/api/study-lab/engoo-news', { summary: 1 })
        if (cancelled) return
        const list = Array.isArray(response.data?.articles) ? response.data.articles : []
        if (!list.length) {
          setNewsState('empty')
          return
        }
        setArticles(list)
        setNewsState('ready')
      } catch {
        if (!cancelled) setNewsState('error')
      }
    }
    loadNews()
    return () => {
      cancelled = true
    }
  }, [])

  // one most-recent article per section, filled up to 6 with the next most recent
  const featuredNews = useMemo(() => {
    if (!articles.length) return []
    const byDateDesc = [...articles].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    const picked = []
    const seenSection = new Set()
    for (const article of byDateDesc) {
      const section = article.section || 'General'
      if (seenSection.has(section)) continue
      seenSection.add(section)
      picked.push(article)
      if (picked.length >= 6) break
    }
    if (picked.length < 6) {
      const pickedIds = new Set(picked.map((a) => a.id))
      for (const article of byDateDesc) {
        if (picked.length >= 6) break
        if (pickedIds.has(article.id)) continue
        picked.push(article)
      }
    }
    return picked.slice(0, 6)
  }, [articles])

  const openNews = () => {
    navigate('/study-lab?tab=news-reading')
  }

  const openArticle = async (article) => {
    if (!isAuthenticated) {
      setActiveArticle(article)
      setArticleDetail(null)
      setDetailLoading(false)
      return
    }
    setActiveArticle(article)
    setArticleDetail(null)
    setDetailLoading(true)
    try {
      const res = await apiGet(`/api/study-lab/engoo-news/${encodeURIComponent(article.id)}`)
      setArticleDetail(res.data?.article || null)
    } catch {
      setArticleDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeArticle = () => {
    setActiveArticle(null)
    setArticleDetail(null)
    setIsFullscreen(false)
  }

  useEffect(() => {
    if (!activeArticle || typeof document === 'undefined') return undefined
    const onKey = (e) => { if (e.key === 'Escape') closeArticle() }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [activeArticle])

  const detailArticle = articleDetail || activeArticle

  return (
    <div className="home-landing">
      {/* Hero (full-bleed photo banner) */}
      <section className="home-hero">
        {heroPhotoOk ? (
          <img
            className="home-hero__bg"
            src={heroImgSrc}
            alt=""
            loading="eager"
            onError={() => {
              if (heroImgSrc === HERO_PHOTO) setHeroImgSrc(HERO_PHOTO_FALLBACK)
              else setHeroPhotoOk(false)
            }}
          />
        ) : null}
        <span className="home-hero__scrim" aria-hidden="true" />

        <div className="home-hero__inner">
          <div className="home-hero__copy">
            <span className="home-hero__eyebrow">Your all-in-one English workspace</span>
            <h1 className="home-hero__title">
              Learn, translate, and practice English <span>in one place.</span>
            </h1>
            <p className="home-hero__subtitle">
              Translate instantly, look up any word, and sharpen your skills with vocabulary,
              phrasal verbs, and real daily news — plus focused PTE Core and CELPIP prep.
            </p>
            <div className="home-hero__actions">
              <Link to="/study-lab" className="home-btn home-btn--primary">
                <span className="material-symbols-outlined">school</span>
                Explore Study Lab
              </Link>
              <Link to="/translator" className="home-btn home-btn--ghost">
                <span className="material-symbols-outlined">translate</span>
                Open full translator
              </Link>
            </div>
            <div className="home-hero__chips">
              {VALUE_CHIPS.map((chip) => (
                <span key={chip.label} className="home-chip">
                  <span className="material-symbols-outlined">{chip.icon}</span>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Floating UI cards over the photo */}
          <div className="home-hero__visual" aria-hidden="true">
            <div className="home-float home-float--translate">
              <div className="home-float__head">
                <span className="material-symbols-outlined">translate</span>
                Translate
              </div>
              <div className="home-float__ko">안녕하세요, 반갑습니다</div>
              <div className="home-float__en">Hello, nice to meet you</div>
            </div>
            <div className="home-float home-float--word">
              <div className="home-float__word">resilient</div>
              <div className="home-float__ipa">/rɪˈzɪliənt/</div>
              <div className="home-float__gloss">회복력 있는 · 잘 견디는</div>
            </div>
          </div>
        </div>
      </section>

      {/* Try it now */}
      <section className="home-section">
        <div className="home-section__head">
          <div>
            <h2>Try it right now</h2>
            <p>No sign-in needed — translate a line or look up a word.</p>
          </div>
        </div>
        <div className="home-quicktools">
          <div className="home-quick-card">
            <div className="home-quick-card__head">
              <span className="material-symbols-outlined">translate</span>
              Quick translate
            </div>
            <div className="home-quick-langs">
              <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} aria-label="Source language">
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <button type="button" className="home-swap" onClick={swapLangs} aria-label="Swap languages">
                <span className="material-symbols-outlined">swap_horiz</span>
              </button>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} aria-label="Target language">
                {LANGS.filter((l) => l.code !== sourceLang).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
            <textarea
              className="home-quick-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type text to translate..."
              rows={2}
            />
            <div className="home-quick-output">
              {isTranslating ? <span className="home-quick-muted">Translating…</span>
                : outputText ? outputText
                : <span className="home-quick-muted">Translation appears here.</span>}
            </div>
            <Link to="/translator" className="home-quick-link">Open full translator →</Link>
          </div>

          <form className="home-quick-card" onSubmit={submitWord}>
            <div className="home-quick-card__head">
              <span className="material-symbols-outlined">menu_book</span>
              Quick word lookup
            </div>
            <div className="home-word-row">
              <input
                className="home-word-input"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Enter a word (e.g. resilient)"
              />
              <button type="submit" className="home-btn home-btn--primary home-word-btn">
                <span className="material-symbols-outlined">search</span>
                Look up
              </button>
            </div>
            <p className="home-quick-hint">Opens the full dictionary with definitions, examples, and AI-related words.</p>
            <div className="home-word-samples">
              {['meticulous', 'inevitable', 'thrive'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="home-word-sample"
                  onClick={() => navigate('/dictionary', { state: { searchTerm: sample } })}
                >
                  {sample}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* Latest news */}
      <section className="home-section">
        <div className="home-section__head">
          <div>
            <h2>Latest daily news</h2>
            <p>Fresh Engoo articles across every topic — read and study new words.</p>
          </div>
          <button type="button" className="home-btn home-btn--ghost home-section__cta" onClick={openNews}>
            View all news
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        {newsState === 'loading' ? (
          <div className="home-news-grid">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="home-news-card home-news-card--skeleton" />)}
          </div>
        ) : newsState === 'ready' ? (
          <div className="home-news-grid">
            {featuredNews.map((article) => (
              <button type="button" key={article.id} className="home-news-card" onClick={() => openArticle(article)}>
                <div className="home-news-thumb">
                  {article.imageUrl
                    ? <img src={article.imageUrl} alt="" loading="lazy" />
                    : <span className="home-news-thumb__fallback">Engoo</span>}
                  {article.difficulty ? <span className="home-news-level">Lv {getLevelNumber(article.difficulty)}</span> : null}
                </div>
                <div className="home-news-body">
                  {article.section ? <span className="home-news-section">{article.section}</span> : null}
                  <strong className="home-news-title">{article.title}</strong>
                  <span className="home-news-date">{formatNewsDate(article.date)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="home-news-empty">
            <span className="material-symbols-outlined">newspaper</span>
            <p>{newsState === 'empty' ? 'No news articles yet — check back soon.' : 'Could not load news right now.'}</p>
            <button type="button" className="home-btn home-btn--ghost" onClick={openNews}>Go to News Reading</button>
          </div>
        )}
      </section>

      {/* Feature grid */}
      <section className="home-section">
        <div className="home-section__head">
          <div>
            <h2>Everything you need to study</h2>
            <p>Jump straight into any tool.</p>
          </div>
        </div>
        <div className="home-feature-grid">
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} className={`home-feature-card home-feature-card--${f.accent}`}>
              <span className="home-feature-icon material-symbols-outlined">{f.icon}</span>
              <span className="home-feature-title">{f.title}</span>
              <span className="home-feature-desc">{f.desc}</span>
              <span className="home-feature-go material-symbols-outlined">arrow_forward</span>
            </Link>
          ))}
        </div>
      </section>

      {/* News article modal */}
      {activeArticle && typeof document !== 'undefined'
        ? createPortal(
          <div className="home-news-modal" role="presentation" onClick={closeArticle}>
            <div
              className={`home-news-modal__card ${isFullscreen ? 'home-news-modal__card--full' : ''}`}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="home-news-modal__bar">
                <span className="home-news-modal__bar-title">{detailArticle?.title || 'Article'}</span>
                <div className="home-news-modal__bar-actions">
                  <button
                    type="button"
                    className="home-news-modal__icon"
                    onClick={() => setIsFullscreen((v) => !v)}
                    aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                    title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                  >
                    <span className="material-symbols-outlined">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                  </button>
                  <button type="button" className="home-news-modal__icon" onClick={closeArticle} aria-label="Close article">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="home-news-modal__scroll">
                {detailArticle?.imageUrl ? (
                  <div className="home-news-modal__hero">
                    <img src={detailArticle.imageUrl} alt="" />
                  </div>
                ) : null}

                <div className="home-news-modal__content">
                  <div className="home-news-modal__meta">
                    {detailArticle?.section ? <span className="home-news-section">{detailArticle.section}</span> : null}
                    {detailArticle?.difficulty ? <span className="home-news-modal__level">Lv {getLevelNumber(detailArticle.difficulty)}</span> : null}
                    {detailArticle?.date ? <span className="home-news-date">{formatNewsDate(detailArticle.date)}</span> : null}
                  </div>
                  <h2 className="home-news-modal__title">{detailArticle?.title}</h2>

                  {!isAuthenticated ? (
                    <div className="home-news-modal__lock">
                      <span className="material-symbols-outlined">lock</span>
                      <p>Log in to read the full article.</p>
                      <GoogleLoginButton />
                    </div>
                  ) : detailLoading ? (
                    <div className="home-news-modal__loading">
                      <span className="home-news-modal__spinner" />
                      Loading article…
                    </div>
                  ) : detailArticle?.body?.length ? (
                    <>
                      <div className="home-news-modal__body">
                        {detailArticle.body.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                      <div className="home-news-modal__actions">
                        <button type="button" className="home-btn home-btn--primary" onClick={openNews}>
                          <span className="material-symbols-outlined">open_in_new</span>
                          Study in News Reading
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="home-news-modal__empty">Full text is not available here. Open it in the News Reading page.</p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  )
}

export default Home
