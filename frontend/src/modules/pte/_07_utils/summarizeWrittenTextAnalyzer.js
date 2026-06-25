import { buildGrammarNotes } from './describeImageAnalyzer'

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and',
  'any', 'are', 'around', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he',
  'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'just', 'like', 'many', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves',
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

function stemToken(token = '') {
  return token
    .replace(/(ing|edly|edly|ed|es|s)$/i, '')
    .replace(/(ation|ations|ment|ments)$/i, '')
}

function sentenceCount(text = '') {
  return (text.match(/[^.!?]+[.!?]?/g) || []).map((item) => item.trim()).filter(Boolean).length
}

function getMeaningfulTokens(text = '') {
  return tokenize(text).filter((token) => token.length >= 4 && !STOPWORDS.has(token))
}

function extractKeywords(question) {
  const combined = `${question?.promptTitle || ''} ${question?.text || ''} ${question?.answer || ''}`
  const tokens = getMeaningfulTokens(combined)
  const counts = new Map()
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 14)
}

function buildStemSet(tokens = []) {
  return new Set(tokens.map(stemToken).filter(Boolean))
}

function getVocabularyScore(tokens = [], matchedKeywords = 0) {
  if (!tokens.length) return 0
  const uniqueRatio = unique(tokens).length / tokens.length
  const longWords = tokens.filter((token) => token.length >= 7).length
  return Math.round(clamp((uniqueRatio * 52) + Math.min(18, longWords * 2) + Math.min(20, matchedKeywords * 2.5), 0, 90))
}

function getStructureSignals(text = '') {
  const lower = text.toLowerCase()
  return {
    hasConnector: /\b(which|while|whereas|although|because|therefore|thus|however|highlighting|showing|revealing)\b/.test(lower),
    hasSummaryVerb: /\b(discusses|describes|explains|highlights|shows|presents|reveals|outlines|examines)\b/.test(lower),
    hasCompression: sentenceCount(text) <= 2,
  }
}

export function analyzeSummarizeWrittenText({
  question,
  responseText = '',
  correctedText = '',
}) {
  const summary = (responseText || '').trim()
  const corrected = (correctedText || summary).trim()
  const words = tokenize(summary)
  const wordCount = words.length
  const summarySentences = sentenceCount(summary)
  const minWords = Number(question?.minWords) || 25
  const maxWords = Number(question?.maxWords) || 50
  const maxSentences = Number(question?.maxSentences) || 2

  if (!summary) {
    return {
      overall: 0,
      content: 0,
      form: 0,
      grammar: 0,
      coherence: 0,
      vocabulary: 0,
      correctedText: '',
      grammarNotes: [],
      matchedKeywords: [],
      missingKeywords: extractKeywords(question).slice(0, 6),
      wordCount,
      sentenceCount: summarySentences,
      wordStatus: 'missing',
      sentenceStatus: 'missing',
      tips: [
        'Write one compact summary that captures the main idea and one or two key supporting points.',
        `Stay inside the ${minWords}–${maxWords} word limit.`,
      ],
      scorePolicy: [
        { label: 'Content', detail: 'Checks whether your summary captures the main ideas from the passage.' },
        { label: 'Form', detail: `Rewards staying within ${minWords}–${maxWords} words and keeping the summary to ${maxSentences} sentence(s).` },
        { label: 'Grammar', detail: 'Penalizes grammar, agreement, and sentence formation problems.' },
        { label: 'Coherence', detail: 'Rewards logical linking and compact summary structure.' },
        { label: 'Vocabulary', detail: 'Rewards relevant academic words and concise phrasing.' },
      ],
    }
  }

  const keywords = extractKeywords(question)
  const keywordSet = new Set(keywords)
  const responseTokens = getMeaningfulTokens(summary)
  const keywordStems = buildStemSet(keywords)
  const matchedKeywords = unique(responseTokens.filter((token) => keywordSet.has(token) || keywordStems.has(stemToken(token))))
  const missingKeywords = keywords.filter((token) => !matchedKeywords.includes(token)).slice(0, 6)
  const keywordCoverage = keywords.length ? matchedKeywords.length / keywords.length : 0

  const wordStatus = wordCount < minWords ? 'short' : wordCount > maxWords ? 'long' : 'ideal'
  const sentenceStatus = summarySentences === 0 ? 'missing' : summarySentences <= maxSentences ? 'ideal' : 'too_many'

  let formScore = 90
  if (wordStatus === 'short') formScore -= 28
  if (wordStatus === 'long') formScore -= 24
  if (sentenceStatus === 'too_many') formScore -= 18
  formScore = Math.round(clamp(formScore, 0, 90))

  const grammarNotes = corrected && corrected !== summary
    ? buildGrammarNotes(summary, corrected)
    : []
  const grammarScore = Math.round(clamp(90 - Math.min(48, grammarNotes.length * 8), 0, 90))

  const signals = getStructureSignals(summary)
  const modelAnswerTokens = getMeaningfulTokens(question?.answer || '')
  const modelAnswerStemSet = buildStemSet(modelAnswerTokens)
  const semanticOverlap = modelAnswerTokens.length
    ? responseTokens.filter((token) => modelAnswerStemSet.has(stemToken(token))).length / modelAnswerTokens.length
    : keywordCoverage

  const contentScore = Math.round(clamp(
    (keywordCoverage * 42)
    + (semanticOverlap * 28)
    + (signals.hasSummaryVerb ? 8 : 0)
    + (signals.hasConnector ? 8 : 0),
    0,
    90,
  ))
  const coherenceScore = Math.round(clamp(30 + (signals.hasSummaryVerb ? 20 : 0) + (signals.hasConnector ? 20 : 0) + (signals.hasCompression ? 20 : 0), 0, 90))
  const vocabularyScore = getVocabularyScore(responseTokens, matchedKeywords.length)

  const overall = Math.round(clamp(
    (contentScore * 0.36)
    + (formScore * 0.22)
    + (grammarScore * 0.18)
    + (coherenceScore * 0.14)
    + (vocabularyScore * 0.1),
    0,
    90,
  ))

  const tips = []
  if (wordStatus !== 'ideal') {
    tips.push(`Adjust your length. SWT should stay within ${minWords}–${maxWords} words.`)
  }
  if (sentenceStatus === 'too_many') {
    tips.push(`Compress your ideas into ${maxSentences} sentence${maxSentences > 1 ? 's' : ''} or fewer.`)
  }
  if (contentScore < 55) {
    tips.push('Include the central topic first, then add one or two high-value supporting ideas from the passage.')
  }
  if (!signals.hasConnector) {
    tips.push('Use one clean connector such as “while,” “which,” or “because” to join ideas naturally.')
  }
  if (grammarNotes.length >= 2) {
    tips.push('Your summary needed several grammar corrections. Keep the structure shorter and more controlled.')
  }
  if (!tips.length) {
    tips.push('Good summary overall. To score even higher, sharpen the main idea and keep supporting details tightly packed.')
  }

  return {
    overall,
    content: contentScore,
    form: formScore,
    grammar: grammarScore,
    coherence: coherenceScore,
    vocabulary: vocabularyScore,
    correctedText: corrected,
    grammarNotes,
    matchedKeywords,
    missingKeywords,
    wordCount,
    sentenceCount: summarySentences,
    wordStatus,
    sentenceStatus,
    tips,
    scorePolicy: [
      { label: 'Content', detail: 'Checks whether your summary captures the main ideas and most relevant support from the passage.' },
      { label: 'Form', detail: `Rewards staying within ${minWords}–${maxWords} words and keeping the response to ${maxSentences} sentence(s).` },
      { label: 'Grammar', detail: 'Reflects how many grammar and sentence-level corrections were needed.' },
      { label: 'Coherence', detail: 'Rewards logical linking and one compact summary flow instead of separate loose notes.' },
      { label: 'Vocabulary', detail: 'Rewards relevant topic vocabulary and concise academic phrasing.' },
    ],
  }
}
