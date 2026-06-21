/**
 * readAloudAnalyzer.js
 * 
 * Text diff-based Read Aloud analysis utility.
 * Compares original text with STT-recognized text to produce:
 *   - Content Score (0–90): % of original words spoken
 *   - Fluency Score (0–90): order preservation (LCS-based)
 *   - Pronunciation Score (0–90): exact vs fuzzy match ratio
 *   - Word-level diff: each original word → correct | missed | close
 *   - Improvement tips: auto-generated based on weak areas
 */

/**
 * Normalize a word for comparison: lowercase, strip punctuation
 */
function normalize(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9'']/g, '')
    .replace(/^'+|'+$/g, '')
}

/**
 * Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Longest Common Subsequence length between two arrays
 */
function lcsLength(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Analyze Read Aloud performance by comparing original text with recognized text.
 * 
 * @param {string} originalText - The original text the user was supposed to read
 * @param {string} recognizedText - The STT-transcribed text of what the user actually said
 * @returns {Object} Analysis result with scores, word diff, and tips
 */
export function analyzeReadAloud(originalText, recognizedText) {
  if (!originalText || !recognizedText) {
    return {
      content: 0,
      fluency: 0,
      pronunciation: 0,
      overall: 0,
      wordDiff: [],
      recognizedWords: [],
      tips: ['No speech was detected. Please try recording again.'],
      engineNote: '',
    }
  }

  // Split into words and normalize
  const origWords = originalText.split(/\s+/).filter(w => w.length > 0)
  const recWords = recognizedText.split(/\s+/).filter(w => w.length > 0)
  const origNorm = origWords.map(normalize).filter(w => w.length > 0)
  const recNorm = recWords.map(normalize).filter(w => w.length > 0)

  if (origNorm.length === 0) {
    return {
      content: 0, fluency: 0, pronunciation: 0, overall: 0,
      wordDiff: [], recognizedWords: recWords, tips: [], engineNote: '',
    }
  }

  // ─── Word-level matching ─────────────────────────────────────
  // For each original word, find: exact match, close match (Levenshtein ≤ 2), or missed
  const recUsed = new Set() // Track which recognized words are already matched
  const wordDiff = origWords.map((origWord, idx) => {
    const norm = origNorm[idx] || normalize(origWord)
    if (!norm) return { word: origWord, status: 'correct', norm }

    // 1. Try exact match (prefer earliest unused)
    for (let j = 0; j < recNorm.length; j++) {
      if (!recUsed.has(j) && recNorm[j] === norm) {
        recUsed.add(j)
        return { word: origWord, status: 'correct', norm }
      }
    }

    // 2. Try close match (Levenshtein ≤ 2, min word length 3)
    if (norm.length >= 3) {
      for (let j = 0; j < recNorm.length; j++) {
        if (!recUsed.has(j) && recNorm[j].length >= 2) {
          const dist = levenshtein(norm, recNorm[j])
          if (dist <= 2) {
            recUsed.add(j)
            return { word: origWord, status: 'close', norm, matchedAs: recWords[j] }
          }
        }
      }
    }

    // 3. Missed
    return { word: origWord, status: 'missed', norm }
  })

  // ─── Content Score ───────────────────────────────────────────
  const matchedCount = wordDiff.filter(w => w.status === 'correct' || w.status === 'close').length
  const contentRatio = matchedCount / origNorm.length
  const contentScore = Math.round(contentRatio * 90)

  // ─── Fluency Score (LCS-based order preservation) ────────────
  // How well did the user maintain the original word order?
  const matchedOrigNorms = wordDiff
    .filter(w => w.status === 'correct')
    .map(w => w.norm)
  const lcs = lcsLength(matchedOrigNorms, recNorm)
  const fluencyRatio = matchedOrigNorms.length > 0 ? lcs / matchedOrigNorms.length : 0
  const fluencyScore = Math.round(fluencyRatio * 90)

  // ─── Pronunciation Score ─────────────────────────────────────
  // Ratio of exact matches vs total matched (exact + close)
  const exactCount = wordDiff.filter(w => w.status === 'correct').length
  const pronRatio = matchedCount > 0 ? exactCount / matchedCount : 0
  const pronunciationScore = Math.round(pronRatio * contentRatio * 90)

  // ─── Overall Score ───────────────────────────────────────────
  const overall = Math.round((contentScore + fluencyScore + pronunciationScore) / 3)

  // ─── Improvement Tips ────────────────────────────────────────
  const tips = generateTips(wordDiff, contentScore, fluencyScore, pronunciationScore)

  return {
    content: contentScore,
    fluency: fluencyScore,
    pronunciation: pronunciationScore,
    overall,
    wordDiff,
    recognizedWords: recWords,
    tips,
  }
}

/**
 * Generate improvement tips based on analysis results
 */
function generateTips(wordDiff, content, fluency, pronunciation) {
  const tips = []
  const missedWords = wordDiff.filter(w => w.status === 'missed')
  const closeWords = wordDiff.filter(w => w.status === 'close')
  const totalWords = wordDiff.length

  // Content tips
  if (content < 45) {
    tips.push('You missed more than half of the words. Try reading more slowly and carefully, focusing on each word.')
  } else if (content < 70) {
    tips.push(`You missed ${missedWords.length} out of ${totalWords} words. Practice reading the highlighted red words aloud several times.`)
  }

  // Fluency tips
  if (fluency < 45) {
    tips.push('Your word order was significantly different from the original. Practice reading in natural chunks of 3–4 words to improve flow.')
  } else if (fluency < 70) {
    tips.push('Some words were spoken out of order. Focus on maintaining the natural reading flow without going back to correct yourself.')
  }

  // Pronunciation tips
  if (closeWords.length > 2) {
    const examples = closeWords.slice(0, 3).map(w => `"${w.word}"`).join(', ')
    tips.push(`Some words were close but not quite right: ${examples}. Practice these words individually for clearer pronunciation.`)
  }

  // Location-based tips
  if (missedWords.length > 0) {
    const firstThird = wordDiff.slice(0, Math.floor(totalWords / 3))
    const lastThird = wordDiff.slice(Math.floor(totalWords * 2 / 3))
    const missedStart = firstThird.filter(w => w.status === 'missed').length
    const missedEnd = lastThird.filter(w => w.status === 'missed').length

    if (missedEnd > missedStart && missedEnd > 2) {
      tips.push('You missed more words toward the end. Try maintaining your pace throughout — don\'t rush the ending.')
    }
  }

  // Good performance
  if (content >= 80 && fluency >= 80 && pronunciation >= 70) {
    tips.push('Great job! Your reading is strong. Keep practicing to maintain consistency.')
  }

  if (tips.length === 0) {
    tips.push('Good effort! Continue practicing with different texts to improve further.')
  }

  return tips
}
