/**
 * TranslatorView
 * 번역 페이지 뷰
 */

import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { useTranslator } from '../_04_hooks'
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../_08_constants'
import '../_10_styles/translator.css'

export function TranslatorView() {
  const {
    inputText,
    outputText,
    sourceLang,
    targetLang,
    isTranslating,
    setInputText,
    setSourceLang,
    setTargetLang,
    translate,
  } = useTranslator()

  return (
    <PageLayout 
      title="Translator" 
      subtitle="Translate between various English dialects, Chinese (Simplified), and Korean"
    >
      <PageBox>
        {/* 언어 선택 */}
        <div className="translator-lang-selectors">
          <div className="translator-lang-group">
            <label>Source Language</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="translator-lang-select"
            >
              {SOURCE_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          
          <div className="translator-arrow">→</div>
          
          <div className="translator-lang-group">
            <label>Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="translator-lang-select"
            >
              {TARGET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 입력 */}
        <div className="translator-section">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to translate... (Auto-translates as you type)"
            className="translator-textarea"
            rows={8}
          />
        </div>

        {/* 번역 버튼 */}
        <button
          onClick={() => translate()}
          disabled={isTranslating || !inputText?.trim()}
          className="translator-btn"
        >
          {isTranslating ? 'Translating...' : 'Translate'}
        </button>

        {/* 출력 */}
        <div className="translator-section">
          <textarea
            value={outputText}
            readOnly
            placeholder="Translation result will appear here..."
            className="translator-textarea translator-textarea--output"
            rows={8}
          />
        </div>
      </PageBox>
    </PageLayout>
  )
}

export default TranslatorView
