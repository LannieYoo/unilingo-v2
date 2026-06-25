function splitSentences(text = '') {
  return (text || '')
    .replace(/\n+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) || []
}

function limitText(text = '', maxChars = 260) {
  if (text.length <= maxChars) return text
  const sliced = text.slice(0, maxChars).trim()
  return `${sliced.replace(/[,\s]+$/, '')}…`
}

export function buildModelAnswerVariants(text = '', kind = 'generic') {
  const sentences = splitSentences(text)
  if (!sentences.length) {
    return {
      examStyle: '',
      fullerVersion: text || '',
    }
  }

  let examSentences = sentences
  let maxChars = 260

  if (kind === 'rts') {
    examSentences = sentences.slice(0, 3)
    maxChars = 240
  } else if (kind === 'di') {
    if (sentences.length >= 4) {
      examSentences = [sentences[0], sentences[1], sentences[sentences.length - 1]]
    } else {
      examSentences = sentences.slice(0, 3)
    }
    maxChars = 280
  }

  const examStyle = limitText(examSentences.join(' '), maxChars)
  return {
    examStyle,
    fullerVersion: text,
  }
}
