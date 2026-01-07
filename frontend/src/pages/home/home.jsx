import { useState, useEffect, useRef } from 'react'
import './home.css'

const API_BASE = '/api'

function Home() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [sourceLang, setSourceLang] = useState('ko')
  const [targetLang, setTargetLang] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const [grammarErrors, setGrammarErrors] = useState([])
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)
  const translateTimeoutRef = useRef(null)
  const grammarTimeoutRef = useRef(null)

  /**
   * 백엔드 번역 API 호출
   */
  const translateWithBackend = async (text, sourceCode, targetCode) => {
    if (!text?.trim() || sourceCode === targetCode) {
      return sourceCode === targetCode ? text : null
    }
    
    try {
      const response = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          source_lang: sourceCode,
          target_lang: targetCode
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.translated_text || null
      }
    } catch (err) {
      console.error('[Translation] Backend API error:', err)
    }
    return null
  }

  // 클립보드 복사 함수
  const copyToClipboard = async (text) => {
    if (!text || !text.trim()) {
      return
    }
    
    try {
      await navigator.clipboard.writeText(text)
      // 간단한 피드백 (선택사항: 토스트 메시지 추가 가능)
      console.log('Copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback: 구식 방법
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const languages = [
    { code: 'ko', name: 'Korean' },
    { code: 'en', name: 'English' },
    { code: 'zh', name: 'Chinese (Simplified)' },
  ]

  // 영어 문법/철자 검사 함수
  const checkGrammar = async (text) => {
    if (!text || !text.trim()) {
      setGrammarErrors([])
      return
    }
    
    // 영어가 아니면 검사하지 않음
    const englishMatches = text.match(/[A-Za-z]/g)
    if (!englishMatches || englishMatches.length < 3) {
      setGrammarErrors([])
      return
    }
    
    setIsCheckingGrammar(true)
    
    try {
      // LanguageTool API 사용
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: text,
          language: 'en-US',
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Grammar check response:', data)
        if (data.matches && data.matches.length > 0) {
          const errors = data.matches.map(match => ({
            message: match.message,
            context: match.context?.text || '',
            offset: match.offset,
            length: match.length,
            replacements: match.replacements ? match.replacements.slice(0, 3).map(r => r.value) : [],
            ruleId: match.rule?.id || '',
            category: match.rule?.category?.name || '',
          }))
          console.log('Grammar errors found:', errors)
          setGrammarErrors(errors)
        } else {
          console.log('No grammar errors found')
          setGrammarErrors([])
        }
      } else {
        console.log('Grammar API response not ok:', response.status)
      }
    } catch (error) {
      console.error('Grammar check error:', error)
      setGrammarErrors([])
    } finally {
      setIsCheckingGrammar(false)
    }
  }

  // 언어 탐지 함수
  const detectLanguage = (text) => {
    if (!text || !text.trim()) return null
    
    const trimmedText = text.trim()
    
    // 각 언어의 문자 개수 계산
    const koreanMatches = trimmedText.match(/[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/g)
    const chineseMatches = trimmedText.match(/[\u4E00-\u9FFF]/g)
    const englishMatches = trimmedText.match(/[A-Za-z]/g)
    
    const koreanCount = koreanMatches ? koreanMatches.length : 0
    const chineseCount = chineseMatches ? chineseMatches.length : 0
    const englishCount = englishMatches ? englishMatches.length : 0
    
    // 우선순위: 한글 > 중국어 > 영어
    if (koreanCount > 0) return 'ko'
    if (chineseCount > 0) return 'zh'
    if (englishCount > 0) return 'en'
    
    return null
  }

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      return
    }

    setIsTranslating(true)
    
    try {
      const sourceCode = sourceLang
      const targetCode = targetLang
      
      if (sourceLang === targetLang) {
        setOutputText(inputText)
        setIsTranslating(false)
        return
      }
      
      // 백엔드 API 사용
      const translatedText = await translateWithBackend(inputText, sourceCode, targetCode)
      
      if (translatedText) {
        setOutputText(translatedText)
      } else {
        setOutputText('Translation failed. Please try again.')
      }
    } catch (error) {
      console.error('Translation error:', error)
      setOutputText('Translation failed. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSwap = () => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setInputText(outputText)
    setOutputText(inputText)
  }

  // 이전 언어 값을 저장
  const prevSourceLangRef = useRef(sourceLang)
  const prevTargetLangRef = useRef(targetLang)

  // source와 target이 같아지면 target을 자동으로 변경
  useEffect(() => {
    if (sourceLang === targetLang) {
      const otherLang = languages.find(l => l.code !== sourceLang)
      if (otherLang) setTargetLang(otherLang.code)
    }
  }, [sourceLang, targetLang])

  // inputText 변경 시 자동 번역 및 문법 검사
  useEffect(() => {
    // 실시간 자동 번역 (debounce)
    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current)
    }
    if (inputText && inputText.trim()) {
      translateTimeoutRef.current = setTimeout(() => {
        handleTranslate()
      }, 500)
    } else {
      setOutputText('')
    }

    // 영어 입력 시 문법/철자 검사 (debounce)
    if (grammarTimeoutRef.current) {
      clearTimeout(grammarTimeoutRef.current)
    }
    const detectedLang = detectLanguage(inputText)
    if (detectedLang === 'en' && inputText && inputText.trim()) {
      grammarTimeoutRef.current = setTimeout(() => {
        checkGrammar(inputText)
      }, 800)
    } else {
      setGrammarErrors([])
    }

    return () => {
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current)
      if (grammarTimeoutRef.current) clearTimeout(grammarTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText])

  // 언어 변경 시 입력/출력 텍스트 자동 교체 및 번역
  useEffect(() => {
    // 초기 로드 시에는 실행하지 않음
    if (!inputText.trim() && !outputText.trim()) {
      prevSourceLangRef.current = sourceLang
      prevTargetLangRef.current = targetLang
      return
    }

    // 언어가 실제로 변경되었는지 확인
    const sourceLangChanged = prevSourceLangRef.current !== sourceLang
    const targetLangChanged = prevTargetLangRef.current !== targetLang

    if (!sourceLangChanged && !targetLangChanged) {
      return
    }

    // 언어가 변경되었을 때만 실행
    const timeoutId = setTimeout(async () => {
      if (isTranslating) return

      if (sourceLangChanged && inputText.trim()) {
        // 입력 언어가 변경된 경우: 
        // 1. 현재 입력 텍스트를 이전 입력 언어에서 새 입력 언어로 번역하여 입력 필드에 표시
        // 2. 그 결과를 새 출력 언어로 번역하여 출력 필드에 표시
        setIsTranslating(true)
        try {
          const prevSourceCode = prevSourceLangRef.current
          const newSourceCode = sourceLang
          const targetCode = targetLang
          
          // Step 1: 현재 입력 텍스트를 이전 입력 언어에서 새 입력 언어로 번역
          let translatedInput = inputText
          
          if (prevSourceCode !== newSourceCode) {
            const result = await translateWithBackend(inputText, prevSourceCode, newSourceCode)
            if (result) {
              translatedInput = result
            }
          }
          
          // Step 2: 번역된 입력을 입력 필드에 설정
          setInputText(translatedInput)
          
          // Step 3: 번역된 입력을 새 출력 언어로 번역
          if (newSourceCode === targetCode) {
            setOutputText(translatedInput)
          } else {
            const finalTranslated = await translateWithBackend(translatedInput, newSourceCode, targetCode)
            setOutputText(finalTranslated || '')
          }
        } catch (error) {
          console.error('Translation error:', error)
          setOutputText('')
        } finally {
          setIsTranslating(false)
        }
      } else if (targetLangChanged && inputText.trim()) {
        // 출력 언어만 변경된 경우: 현재 입력을 새 출력 언어로 번역
        handleTranslate()
      }

      // 이전 언어 값 업데이트
      prevSourceLangRef.current = sourceLang
      prevTargetLangRef.current = targetLang
    }, 100)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang, targetLang])

  return (
    <>
      <div className="flex flex-col items-center text-center gap-4 -mt-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter" style={{ color: '#3E424D' }}>Instant Translation</h1>
      </div>
      
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm relative mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left side - Input */}
          <div className="flex flex-col p-6 border-b md:border-b-0 md:border-r border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <select
                  value={sourceLang}
                  onChange={(e) => {
                    const newSourceLang = e.target.value
                    setSourceLang(newSourceLang)
                    if (newSourceLang === targetLang) {
                      const otherLang = languages.find(l => l.code !== newSourceLang)
                      if (otherLang) setTargetLang(otherLang.code)
                    }
                  }}
                  className="lang-select"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-text-muted-light dark:text-text-muted-dark">{inputText.length} / 5000</span>
            </div>
            
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => {
                  const newValue = e.target.value
                  setInputText(newValue)
                  
                  const detectedLang = detectLanguage(newValue)
                  if (newValue && newValue.trim()) {
                    if (detectedLang === 'ko') {
                      setSourceLang('ko')
                      setTargetLang('en')
                    } else if (detectedLang === 'en') {
                      setSourceLang('en')
                      setTargetLang('ko')
                    } else if (detectedLang === 'zh') {
                      setSourceLang('zh')
                      setTargetLang('en')
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault()
                  }
                }}
                placeholder="Enter text to translate..."
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-md bg-transparent text-lg placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-0 border-none p-0"
                rows={8}
              />
            </div>
            
            {/* Grammar errors */}
            {grammarErrors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Grammar & Spelling Issues ({grammarErrors.length})
                </div>
                <div className="space-y-2">
                  {grammarErrors.map((error, index) => (
                    <div key={index} className="text-sm">
                      <div className="text-yellow-900 dark:text-yellow-100">{error.message}</div>
                      {error.replacements.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {error.replacements.map((replacement, idx) => (
                            <button
                              key={idx}
                              className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90"
                              onClick={() => {
                                const before = inputText.substring(0, error.offset)
                                const after = inputText.substring(error.offset + error.length)
                                const newText = before + replacement + after
                                setInputText(newText)
                                setTimeout(() => checkGrammar(newText), 100)
                              }}
                            >
                              {replacement}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isCheckingGrammar && (
              <div className="mt-2 text-sm text-text-muted-light dark:text-text-muted-dark italic">Checking grammar...</div>
            )}
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-xl">volume_up</span>
                </button>
                <button 
                  onClick={() => copyToClipboard(inputText)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Copy input text"
                >
                  <span className="material-symbols-outlined text-xl">content_copy</span>
                </button>
              </div>
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !inputText.trim()}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">{isTranslating ? 'Translating...' : 'Translate'}</span>
              </button>
            </div>
          </div>
          
          {/* Right side - Output */}
          <div className="flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="lang-select"
                >
                  {languages.filter(lang => lang.code !== sourceLang).map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-xl">volume_up</span>
                </button>
                <button 
                  onClick={() => copyToClipboard(outputText)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Copy translation"
                >
                  <span className="material-symbols-outlined text-xl">content_copy</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <textarea
                value={outputText}
                readOnly
                placeholder="Translation will appear here."
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-md bg-transparent text-lg placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-0 border-none p-0 min-h-[192px]"
                rows={8}
              />
            </div>
          </div>
        </div>
        {/* Swap button in the middle - Desktop */}
        <button
          onClick={handleSwap}
          className="hidden md:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-card-dark border border-border-light dark:border-border-dark text-primary hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md transition-colors z-10"
          aria-label="Swap languages"
        >
          <span className="material-symbols-outlined text-xl">swap_horiz</span>
        </button>
        {/* Swap button in the middle - Mobile */}
        <button
          onClick={handleSwap}
          className="md:hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-card-dark border border-border-light dark:border-border-dark text-primary hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md transition-colors z-10 flex"
          aria-label="Swap languages"
        >
          <span className="material-symbols-outlined text-xl">swap_horiz</span>
        </button>
      </div>
    </>
  )
}

export default Home

