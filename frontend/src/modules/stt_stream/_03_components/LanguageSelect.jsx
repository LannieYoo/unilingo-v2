/**
 * LanguageSelect Component
 * 언어 선택 드롭다운
 */

import { LANGUAGE_OPTIONS } from '../_08_constants'

export function LanguageSelect({ 
  value, 
  onChange, 
  disabled = false,
  id = 'lang-select',
  label = '언어:'
}) {
  return (
    <div className="stt-stream-select-group">
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {LANGUAGE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelect
