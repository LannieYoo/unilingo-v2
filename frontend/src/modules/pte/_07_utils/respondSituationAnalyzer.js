import { buildGrammarNotes } from './describeImageAnalyzer'

const STOPWORDS = new Set([
  'a', 'about', 'after', 'again', 'all', 'am', 'an', 'and', 'are', 'as', 'at', 'be', 'because',
  'been', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'for', 'from', 'have', 'has', 'had',
  'hello', 'hi', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'let', 'lets', 'me', 'my', 'of',
  'on', 'or', 'our', 'please', 'regarding', 'so', 'that', 'the', 'their', 'them', 'there',
  'this', 'thanks', 'thank', 'to', 'we', 'will', 'with', 'would', 'you', 'your',
])

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeToken(value = '') {
  return value
    .toLowerCase()
    .replace(/[“”‘’"'()[\]{}.,!?;:/\\%$#@^&*_+=<>|-]/g, '')
    .trim()
}

function tokenize(text = '') {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean)
}

function unique(values = []) {
  return [...new Set(values)]
}

function sentenceCount(text = '') {
  return (text.match(/[^.!?]+[.!?]?/g) || []).map((item) => item.trim()).filter(Boolean).length
}

function getMeaningfulTokens(text = '') {
  return tokenize(text).filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function extractKeywords(question) {
  const combined = `${question?.promptTitle || ''} ${question?.text || ''} ${question?.answer || ''} ${(question?.keyPoints || []).join(' ')}`
  const tokens = getMeaningfulTokens(combined)
  const counts = new Map()
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 12)
}

function detectSituationType(question) {
  const text = `${question?.promptTitle || ''} ${question?.text || ''} ${question?.answer || ''}`.toLowerCase()
  if (/(meeting|appointment|schedule|reschedule|time|available|availability|shift|interview|booking|reservation)/.test(text)) {
    return 'availability'
  }
  if (/(problem|issue|complaint|delay|broken|error|mistake|refund|wrong|missing|late|cancel|apolog)/.test(text)) {
    return 'problem'
  }
  return 'polite'
}

function getStructureSignals(text = '', type = 'polite') {
  const lower = text.toLowerCase()
  return {
    hasGreeting: /\b(hi|hello|dear)\b/.test(lower),
    hasThanks: /\b(thank|thanks)\b/.test(lower),
    hasPoliteness: /\b(please|sorry|appreciate|understanding)\b/.test(lower),
    hasAction: /\b(can|could|would|will|able|arrange|confirm|reschedule|provide|help|offer)\b/.test(lower),
    hasClose: /(thank you|please let me know|look forward|have a nice day|best regards|see you)/.test(lower),
    hasReason: /\b(because|since|as)\b/.test(lower),
    fitsType:
      type === 'availability'
        ? /\b(available|schedule|reschedule|time|meet|appointment|shift)\b/.test(lower)
        : type === 'problem'
          ? /\b(sorry|issue|problem|solution|fix|replace|refund|arrange)\b/.test(lower)
          : /\b(thank|please|would|could)\b/.test(lower),
  }
}

function getVocabularyScore(tokens = [], matchedKeywords = 0) {
  if (!tokens.length) return 0
  const uniqueRatio = unique(tokens).length / tokens.length
  const longWordCount = tokens.filter((token) => token.length >= 6).length
  const lexicalBoost = clamp((uniqueRatio * 48) + Math.min(18, longWordCount * 2), 0, 68)
  return Math.round(clamp(lexicalBoost + Math.min(22, matchedKeywords * 3), 0, 90))
}

function getStructureScore(signals, sentences) {
  let score = 20
  if (signals.hasGreeting || signals.hasThanks) score += 15
  if (signals.hasAction) score += 20
  if (signals.hasReason) score += 10
  if (signals.hasClose) score += 15
  if (signals.hasPoliteness) score += 10
  if (signals.fitsType) score += 10
  if (sentences >= 2 && sentences <= 4) score += 10
  return Math.round(clamp(score, 0, 90))
}

export function analyzeRespondSituation({
  question,
  recognizedText = '',
  browserText = '',
  correctedText = '',
  diagnostics = null,
}) {
  const responseText = (recognizedText || '').trim()
  const situationType = detectSituationType(question)

  if (!responseText) {
    return {
      overall: 0,
      content: 0,
      oralFluency: 0,
      pronunciation: 0,
      grammar: 0,
      structure: 0,
      vocabulary: 0,
      keywords: [],
      matchedKeywords: [],
      missingKeywords: [],
      grammarNotes: [],
      correctedText: '',
      tips: ['No speech was detected. Give one polite opening, one clear main response, and one closing sentence.'],
      scorePolicy: [
        { label: 'Content', detail: 'Checks whether your response addresses the situation clearly and appropriately.' },
        { label: 'Oral Fluency', detail: 'Rewards steady pacing, fewer long pauses, and continuous spoken delivery.' },
        { label: 'Pronunciation', detail: 'Uses speech clarity signals, rhythm, and Browser/Server transcript agreement.' },
        { label: 'Grammar', detail: 'Reflects how many grammar corrections were needed in your spoken response.' },
        { label: 'Structure', detail: 'Rewards a practical RtS flow: opening, main point, and closing.' },
        { label: 'Vocabulary', detail: 'Rewards relevant situation words and natural everyday phrasing.' },
      ],
    }
  }

  const responseTokens = getMeaningfulTokens(responseText)
  const keywords = extractKeywords(question)
  const keywordSet = new Set(keywords)
  const matchedKeywords = unique(responseTokens.filter((token) => keywordSet.has(token)))
  const missingKeywords = keywords.filter((token) => !matchedKeywords.includes(token)).slice(0, 6)
  const keywordCoverage = keywords.length ? matchedKeywords.length / keywords.length : 0

  const sentences = sentenceCount(responseText)
  const structureSignals = getStructureSignals(responseText, situationType)
  const contentScore = Math.round(clamp(
    (keywordCoverage * 58)
    + (structureSignals.fitsType ? 16 : 0)
    + (structureSignals.hasAction ? 8 : 0)
    + (structureSignals.hasPoliteness ? 8 : 0),
    0,
    90,
  ))

  const diagnosticsScores = diagnostics?.scores || {}
  const oralFluencyScore = Math.round(clamp(
    ((diagnosticsScores.speed || 0) * 0.28)
    + ((diagnosticsScores.pauseControl || 0) * 0.24)
    + ((diagnosticsScores.rhythm || 0) * 0.2)
    + ((diagnosticsScores.completeness || 0) * 0.28),
    0,
    90,
  ))

  const browserTokens = tokenize(browserText)
  const serverTokens = tokenize(recognizedText)
  const browserAgreement = browserTokens.length && serverTokens.length
    ? serverTokens.filter((token) => browserTokens.includes(token)).length / Math.max(serverTokens.length, 1)
    : 0.6
  const pronunciationScore = Math.round(clamp(
    ((diagnosticsScores.stress || 0) * 0.18)
    + ((diagnosticsScores.intonation || 0) * 0.14)
    + ((diagnosticsScores.completeness || 0) * 0.28)
    + ((diagnosticsScores.rhythm || 0) * 0.1)
    + (browserAgreement * 90 * 0.3),
    0,
    90,
  ))

  const grammarNotes = correctedText && correctedText !== responseText
    ? buildGrammarNotes(responseText, correctedText)
    : []
  const grammarPenalty = Math.min(45, grammarNotes.length * 8)
  const grammarScore = Math.round(clamp(90 - grammarPenalty, 0, 90))
  const structureScore = getStructureScore(structureSignals, sentences)
  const vocabularyScore = getVocabularyScore(responseTokens, matchedKeywords.length)

  const overall = Math.round(clamp(
    (contentScore * 0.32)
    + (oralFluencyScore * 0.22)
    + (pronunciationScore * 0.22)
    + (grammarScore * 0.1)
    + (structureScore * 0.08)
    + (vocabularyScore * 0.06),
    0,
    90,
  ))

  const tips = []
  if (!structureSignals.hasGreeting && !structureSignals.hasThanks) {
    tips.push('Start with a short natural opener such as “Hi …” or “Thanks for your message.”')
  }
  if (!structureSignals.hasAction) {
    tips.push('State your main response clearly with one action sentence such as “I can …”, “I would like to …”, or “Please …”.')
  }
  if (!structureSignals.hasClose) {
    tips.push('Finish with a polite closing such as “Please let me know if that works” or “Thank you for your understanding.”')
  }
  if (grammarNotes.length >= 2) {
    tips.push('Some grammar issues were corrected. Keep your answer shorter and more direct under time pressure.')
  }
  if ((diagnosticsScores.pauseControl || 0) < 55) {
    tips.push('Your pauses were longer than ideal. Keep each sentence short so you can respond more smoothly.')
  }
  if ((diagnosticsScores.intonation || 0) < 40) {
    tips.push('Let your voice rise and fall a little more on key information so the response sounds more natural.')
  }
  if (!tips.length) {
    tips.push('Good response overall. To score even higher, keep the tone polite and make the action step more specific.')
  }

  return {
    overall,
    content: contentScore,
    oralFluency: oralFluencyScore,
    pronunciation: pronunciationScore,
    grammar: grammarScore,
    structure: structureScore,
    vocabulary: vocabularyScore,
    keywords,
    matchedKeywords,
    missingKeywords,
    grammarNotes,
    correctedText: correctedText || responseText,
    tips,
    scorePolicy: [
      { label: 'Content', detail: 'Checks whether your response addresses the situation clearly, directly, and appropriately.' },
      { label: 'Oral Fluency', detail: 'Rewards steady pacing, fewer long pauses, and continuous spoken delivery.' },
      { label: 'Pronunciation', detail: 'Uses speech clarity signals, rhythm, and Browser/Server transcript agreement.' },
      { label: 'Grammar', detail: 'Reflects how many grammar corrections were needed in your spoken response.' },
      { label: 'Structure', detail: 'Rewards a strong RtS flow: opening, main response, and polite close.' },
      { label: 'Vocabulary', detail: 'Rewards relevant situation words and natural professional phrasing.' },
    ],
    situationType,
  }
}
