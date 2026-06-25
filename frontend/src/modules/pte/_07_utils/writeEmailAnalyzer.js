import { buildGrammarNotes } from './describeImageAnalyzer'

const STOPWORDS = new Set([
  'a', 'about', 'after', 'again', 'all', 'am', 'an', 'and', 'are', 'as', 'at', 'be', 'because',
  'been', 'but', 'by', 'can', 'could', 'dear', 'did', 'do', 'does', 'for', 'from', 'have', 'has',
  'had', 'hello', 'hi', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'let', 'lets', 'me', 'my',
  'of', 'on', 'or', 'our', 'please', 'regards', 'regarding', 'sincerely', 'so', 'that', 'the',
  'their', 'them', 'there', 'this', 'thanks', 'thank', 'to', 'we', 'will', 'with', 'would',
  'you', 'your',
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

function getMeaningfulTokens(text = '') {
  return tokenize(text).filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function sentenceCount(text = '') {
  return (text.match(/[^.!?]+[.!?]?/g) || []).map((item) => item.trim()).filter(Boolean).length
}

function extractBulletPointsFromText(text = '') {
  const source = String(text || '')
  const lineMatches = [...source.matchAll(/(?:^|\n)\s*[-•]\s*(.+?)(?=\n|$)/g)]
    .map((match) => (match[1] || '').trim())
    .filter(Boolean)

  if (lineMatches.length) return unique(lineMatches)

  const themeAnchor = source.match(/(?:the following(?:\s+\w+)?\s+(?:themes?|points?|ideas?|aspects?)|focus on the following|based on the following)([\s\S]*)/i)
  const candidate = themeAnchor ? themeAnchor[1] : source
  const stopAt = candidate.split(/(?:You should include|Provide supporting|Include all|Include both)/i)[0]

  return unique(
    [...stopAt.matchAll(/(?:^|\s)-\s*(.+?)(?=\s+-\s+[A-Z0-9]|\s*$)/g)]
      .map((match) => (match[1] || '').trim())
      .filter(Boolean)
      .filter((part) => part.length <= 180),
  ).slice(0, 6)
}

function extractThemeKeywords(question) {
  const bulletPoints = Array.isArray(question?.bulletPoints) && question.bulletPoints.length
    ? question.bulletPoints
    : extractBulletPointsFromText(question?.text || '')
  const combined = `${question?.promptTitle || ''} ${question?.text || ''} ${bulletPoints.join(' ')} ${question?.answer || ''}`
  const tokens = getMeaningfulTokens(combined)
  const counts = new Map()
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 18)
}

function buildStemSet(tokens = []) {
  return new Set(tokens.map(stemToken).filter(Boolean))
}

function getBulletCoverageDetail(bullet = '', responseTokens = [], responseText = '') {
  const bulletTokens = unique(getMeaningfulTokens(bullet))
  const bulletStems = buildStemSet(bulletTokens)
  if (!bulletTokens.length) {
    return { covered: false, ratio: 0 }
  }

  const exactMatches = bulletTokens.filter((token) => responseTokens.includes(token)).length
  const stemMatches = responseTokens.filter((token) => bulletStems.has(stemToken(token))).length
  const tokenRatio = Math.max(exactMatches, stemMatches) / bulletTokens.length

  const phraseHint = bullet.toLowerCase().split(/[\\/,&()-]+/).map((part) => part.trim()).filter(Boolean)
  const phraseHit = phraseHint.some((part) => part.length >= 4 && responseText.toLowerCase().includes(part))

  return {
    covered: tokenRatio >= 0.5 || phraseHit,
    ratio: Math.max(tokenRatio, phraseHit ? 0.75 : 0),
  }
}

function detectStructure(text = '') {
  const lower = text.toLowerCase()
  return {
    hasGreeting: /^(dear|hello|hi)\b/m.test(lower),
    hasOpening: /\b(i am writing|thank you for|i would like|i am contacting|i hope)\b/.test(lower),
    hasClosing: /\b(regards|kind regards|best regards|sincerely|thank you|looking forward)\b/.test(lower),
    hasRequest: /\b(please|could you|would you|let me know|confirm|arrange|schedule)\b/.test(lower),
    hasReason: /\b(because|as|since|so that)\b/.test(lower),
  }
}

function getVocabularyScore(tokens = [], matchedKeywords = 0) {
  if (!tokens.length) return 0
  const uniqueRatio = unique(tokens).length / tokens.length
  const longWords = tokens.filter((token) => token.length >= 7).length
  return Math.round(clamp((uniqueRatio * 48) + Math.min(20, longWords * 2) + Math.min(20, matchedKeywords * 2), 0, 90))
}

function getToneScore(text = '') {
  const lower = text.toLowerCase()
  let score = 48
  if (/\b(please|thank you|regards|sincerely|appreciate|would you|could you)\b/.test(lower)) score += 24
  if (/^(dear|hello|hi)\b/m.test(lower)) score += 6
  if (/\b(kind regards|best regards|sincerely|thank you)\b/.test(lower)) score += 6
  if (!/\b(gonna|wanna|yeah|ok|okay|btw|u)\b/.test(lower)) score += 10
  if (!/[!?]{2,}/.test(text)) score += 8
  return Math.round(clamp(score, 0, 90))
}

export function analyzeWriteEmail({
  question,
  responseText = '',
  correctedText = '',
}) {
  const email = (responseText || '').trim()
  const corrected = (correctedText || email).trim()
  const words = tokenize(email)
  const wordCount = words.length
  const minWords = Number(question?.minWords) || 80
  const maxWords = Number(question?.maxWords) || 120
  const emailSentences = sentenceCount(email)
  const bulletPoints = Array.isArray(question?.bulletPoints) && question.bulletPoints.length
    ? question.bulletPoints
    : extractBulletPointsFromText(question?.text || '')

  if (!email) {
    return {
      overall: 0,
      content: 0,
      form: 0,
      grammar: 0,
      structure: 0,
      tone: 0,
      vocabulary: 0,
      correctedText: '',
      grammarNotes: [],
      coveredBullets: [],
      missingBullets: bulletPoints,
      matchedKeywords: [],
      missingKeywords: extractThemeKeywords(question).slice(0, 8),
      wordCount,
      sentenceCount: emailSentences,
      wordStatus: 'missing',
      tips: [
        'Cover every bullet point explicitly in the body of the email.',
        `Stay within ${minWords}–${maxWords} words and keep the tone appropriate to the reader.`,
      ],
      scorePolicy: [
        { label: 'Content', detail: 'Checks whether your email addresses the required bullet points and purpose.' },
        { label: 'Form', detail: `Rewards staying within ${minWords}–${maxWords} words.` },
        { label: 'Grammar', detail: 'Penalizes grammar and sentence formation issues.' },
        { label: 'Structure', detail: 'Rewards a complete email flow: greeting, body, and closing.' },
        { label: 'Tone', detail: 'Rewards appropriate politeness and reader-aware phrasing.' },
        { label: 'Vocabulary', detail: 'Rewards relevant wording and precise support details.' },
      ],
    }
  }

  const themeKeywords = extractThemeKeywords(question)
  const keywordSet = new Set(themeKeywords)
  const keywordStems = buildStemSet(themeKeywords)
  const responseTokens = getMeaningfulTokens(email)
  const matchedKeywords = unique(responseTokens.filter((token) => keywordSet.has(token) || keywordStems.has(stemToken(token))))
  const missingKeywords = themeKeywords.filter((token) => !matchedKeywords.includes(token)).slice(0, 8)

  const bulletCoverageDetails = bulletPoints.map((bullet) => ({
    bullet,
    ...getBulletCoverageDetail(bullet, responseTokens, email),
  }))
  const coveredBullets = bulletCoverageDetails.filter((item) => item.covered).map((item) => item.bullet)
  const missingBullets = bulletPoints.filter((bullet) => !coveredBullets.includes(bullet))
  const bulletCoverageRatio = bulletCoverageDetails.length
    ? bulletCoverageDetails.reduce((sum, item) => sum + item.ratio, 0) / bulletCoverageDetails.length
    : 0.6

  const wordStatus = wordCount < minWords ? 'short' : wordCount > maxWords ? 'long' : 'ideal'
  let formScore = 90
  if (wordStatus === 'short') formScore -= 24
  if (wordStatus === 'long') formScore -= 20
  formScore = Math.round(clamp(formScore, 0, 90))

  const grammarNotes = corrected && corrected !== email
    ? buildGrammarNotes(email, corrected)
    : []
  const grammarScore = Math.round(clamp(90 - Math.min(50, grammarNotes.length * 8), 0, 90))

  const structure = detectStructure(email)
  const structureScore = Math.round(clamp(
    20
    + (structure.hasGreeting ? 18 : 0)
    + (structure.hasOpening ? 18 : 0)
    + (structure.hasRequest ? 16 : 0)
    + (structure.hasReason ? 8 : 0)
    + (structure.hasClosing ? 20 : 0)
    + (emailSentences >= 3 ? 10 : 0),
    0,
    90,
  ))

  const toneScore = getToneScore(email)
  const contentScore = Math.round(clamp(
    (bulletCoverageRatio * 60)
    + Math.min(20, matchedKeywords.length * 1.7)
    + (structure.hasRequest ? 5 : 0)
    + (structure.hasReason ? 5 : 0),
    0,
    90,
  ))
  const vocabularyScore = getVocabularyScore(responseTokens, matchedKeywords.length)

  const overall = Math.round(clamp(
    (contentScore * 0.32)
    + (formScore * 0.16)
    + (grammarScore * 0.18)
    + (structureScore * 0.14)
    + (toneScore * 0.1)
    + (vocabularyScore * 0.1),
    0,
    90,
  ))

  const tips = []
  if (missingBullets.length) {
    tips.push(`Make sure every required theme is covered explicitly: ${missingBullets.join(', ')}.`)
  }
  if (wordStatus !== 'ideal') {
    tips.push(`Adjust your length. Write Email should stay within ${minWords}–${maxWords} words.`)
  }
  if (!structure.hasGreeting || !structure.hasClosing) {
    tips.push('Use a complete email frame: greeting, clear body, and a natural closing line.')
  }
  if (grammarNotes.length >= 2) {
    tips.push('Several grammar corrections were needed. Keep each sentence simpler and more controlled.')
  }
  if (toneScore < 60) {
    tips.push('Use a more professional tone with polite request language such as “please”, “could you”, or “I would appreciate”.')
  }
  if (!tips.length) {
    tips.push('Good email overall. To score even higher, make each bullet point more specific and support it with one concise detail.')
  }

  return {
    overall,
    content: contentScore,
    form: formScore,
    grammar: grammarScore,
    structure: structureScore,
    tone: toneScore,
    vocabulary: vocabularyScore,
    correctedText: corrected,
    grammarNotes,
    coveredBullets,
    missingBullets,
    matchedKeywords,
    missingKeywords,
    wordCount,
    sentenceCount: emailSentences,
    wordStatus,
    tips,
    scorePolicy: [
      { label: 'Content', detail: 'Checks whether your email addresses the required bullet points and core purpose clearly.' },
      { label: 'Form', detail: `Rewards staying within ${minWords}–${maxWords} words.` },
      { label: 'Grammar', detail: 'Reflects how many grammar and sentence-level corrections were needed.' },
      { label: 'Structure', detail: 'Rewards a clear email flow: greeting, purpose, support, and closing.' },
      { label: 'Tone', detail: 'Rewards polite, reader-aware, and appropriately formal email language.' },
      { label: 'Vocabulary', detail: 'Rewards relevant wording, support details, and lexical control.' },
    ],
  }
}
