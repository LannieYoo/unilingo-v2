/**
 * readAloudAnalyzer.js
 * 
 * Text diff-based Read Aloud analysis utility.
 * Compares original text with STT-recognized text to produce:
 *   - Content Score (0–90): % of original words spoken
 *   - Fluency Score (0–90): order preservation + coverage
 *   - Pronunciation Score (0–90): exact match ratio, penalizing close matches
 *   - Word-level diff: each original word → correct | missed | close
 *   - Improvement tips: auto-generated based on weak areas
 * 
 * Scoring is intentionally strict to better reflect PTE-like standards.
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
 * Scoring philosophy (stricter than v1):
 *   - Content: Only exact matches count fully. Close matches count at 50%.
 *   - Fluency: LCS of ALL original words (not just matched) vs recognized, penalizing extra/missing words.
 *   - Pronunciation: Exact match ratio out of total original words (not just matched).
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
      recognizedText: '',
      recognizedWords: [],
      tips: ['No speech was detected. Please try recording again.'],
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
      wordDiff: [], recognizedText, recognizedWords: recWords, tips: [],
    }
  }

  // ─── Word-level matching ─────────────────────────────────────
  // For each original word, find: exact match, close match, or missed
  // Matching is order-aware: we search forward in recognized words to preserve sequence
  const recUsed = new Set()
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

    // 2. Try close match — STRICTER: Levenshtein ≤ 1 for short words, ≤ 2 for long words
    const maxDist = norm.length >= 6 ? 2 : 1
    if (norm.length >= 4) {
      for (let j = 0; j < recNorm.length; j++) {
        if (!recUsed.has(j) && recNorm[j].length >= 3) {
          const dist = levenshtein(norm, recNorm[j])
          if (dist <= maxDist) {
            recUsed.add(j)
            return { word: origWord, status: 'close', norm, matchedAs: recWords[j] }
          }
        }
      }
    }

    // 3. Missed
    return { word: origWord, status: 'missed', norm }
  })

  const exactCount = wordDiff.filter(w => w.status === 'correct').length
  const closeCount = wordDiff.filter(w => w.status === 'close').length
  const missedCount = wordDiff.filter(w => w.status === 'missed').length
  const totalOrig = origNorm.length

  // ─── Content Score (0–90) ────────────────────────────────────
  // Exact matches = full weight, close matches = half weight
  const contentWeighted = exactCount + (closeCount * 0.5)
  const contentRatio = contentWeighted / totalOrig
  // Apply curve: penalize more harshly below 80% coverage
  const contentCurved = contentRatio >= 0.8 
    ? contentRatio 
    : contentRatio * 0.85 // extra penalty for low coverage
  const contentScore = Math.min(90, Math.round(contentCurved * 90))

  // ─── Fluency Score (0–90) ────────────────────────────────────
  // Based on LCS of ALL original normalized words vs recognized normalized words
  // This checks: did you say the words in the right order with good coverage?
  const lcs = lcsLength(origNorm, recNorm)
  const fluencyRaw = lcs / totalOrig

  // Penalty for extra words (hesitations, self-corrections counted by STT)
  const extraWordPenalty = recNorm.length > totalOrig * 1.3
    ? Math.max(0.7, 1 - (recNorm.length - totalOrig) / (totalOrig * 2))
    : 1.0

  // Penalty for too few words (mumbling, incomplete reading)
  const tooFewPenalty = recNorm.length < totalOrig * 0.5
    ? recNorm.length / (totalOrig * 0.5)
    : 1.0

  const fluencyAdjusted = fluencyRaw * extraWordPenalty * tooFewPenalty
  const fluencyScore = Math.min(90, Math.round(fluencyAdjusted * 90))

  // ─── Pronunciation Score (0–90) ──────────────────────────────
  // Strict: exact matches / total original words. Close matches count at 30%.
  const pronWeighted = exactCount + (closeCount * 0.3)
  const pronRatio = pronWeighted / totalOrig
  // Apply harsher curve for pronunciation
  const pronCurved = pronRatio >= 0.85
    ? pronRatio
    : pronRatio * 0.8
  const pronunciationScore = Math.min(90, Math.round(pronCurved * 90))

  // ─── Overall Score ───────────────────────────────────────────
  // Weighted: Content 35%, Fluency 30%, Pronunciation 35% (PTE weighting)
  const overall = Math.round(
    contentScore * 0.35 + fluencyScore * 0.30 + pronunciationScore * 0.35
  )

  // ─── Improvement Tips ────────────────────────────────────────
  const tips = generateTips(wordDiff, contentScore, fluencyScore, pronunciationScore, totalOrig)

  return {
    content: contentScore,
    fluency: fluencyScore,
    pronunciation: pronunciationScore,
    overall,
    wordDiff,
    recognizedText: recognizedText.trim(),
    recognizedWords: recWords,
    tips,
    stats: {
      totalWords: totalOrig,
      exactMatches: exactCount,
      closeMatches: closeCount,
      missed: missedCount,
      recognized: recWords.length,
    },
  }
}

/**
 * Generate improvement tips based on analysis results
 * Includes connected speech (linking) awareness for PTE
 */
function generateTips(wordDiff, content, fluency, pronunciation, totalWords) {
  const tips = []
  const missedWords = wordDiff.filter(w => w.status === 'missed')
  const closeWords = wordDiff.filter(w => w.status === 'close')

  // Content tips
  if (content < 30) {
    tips.push('You missed the majority of words. Try reading more slowly and carefully, focusing on pronouncing each word clearly.')
  } else if (content < 55) {
    tips.push(`You missed ${missedWords.length} out of ${totalWords} words. Focus on the highlighted red words — practice reading them aloud individually.`)
  } else if (content < 75) {
    tips.push(`${missedWords.length} words were not detected. Read each word distinctly without rushing, especially function words like "the," "and," "of."`)
  }

  // Fluency tips
  if (fluency < 30) {
    tips.push('Your reading flow needs significant improvement. Practice reading the text in natural chunks of 3–4 words without pausing between each word.')
  } else if (fluency < 55) {
    tips.push('Your reading flow was inconsistent. Avoid going back to re-read words — if you stumble, continue forward. Smooth, continuous reading is key.')
  } else if (fluency < 75) {
    tips.push('Good flow overall, but some hesitations were detected. Try to maintain a steady, natural pace throughout the entire passage.')
  }

  // Pronunciation tips
  if (closeWords.length > 0) {
    const examples = closeWords.slice(0, 3).map(w => `"${w.word}" (heard as "${w.matchedAs}")`).join(', ')
    tips.push(`Pronunciation was unclear for: ${examples}. Practice these words individually, focusing on consonant endings and vowel sounds.`)
  }

  if (pronunciation < 45 && closeWords.length === 0) {
    tips.push('Many words were not recognized clearly. Focus on enunciating consonant clusters (e.g., "str-", "-cts", "-nts") and stressed syllables.')
  }

  // ─── Connected Speech / Linking Tips (PTE-specific) ───
  // Detect linking opportunities in missed word pairs
  const linkingIssues = detectLinkingIssues(wordDiff)
  if (linkingIssues.length > 0 && (pronunciation < 80 || fluency < 80)) {
    const examples = linkingIssues.slice(0, 2).map(l => `"${l}"`).join(', ')
    tips.push(`🔗 Connected speech tip: Practice smooth linking between words like ${examples}. In PTE, natural linking (e.g., "an_example" → /ənɪɡˈzæmpəl/) significantly boosts fluency and oral fluency scores.`)
  }

  if (fluency >= 55 && fluency < 80) {
    tips.push('🔗 For higher fluency, practice connected speech: link final consonants to following vowels (e.g., "kind_of" → /kaɪndəv/), and reduce unstressed syllables naturally.')
  }

  // Location-based tips
  if (missedWords.length > 0) {
    const firstThird = wordDiff.slice(0, Math.floor(totalWords / 3))
    const lastThird = wordDiff.slice(Math.floor(totalWords * 2 / 3))
    const missedStart = firstThird.filter(w => w.status === 'missed').length
    const missedEnd = lastThird.filter(w => w.status === 'missed').length

    if (missedEnd > missedStart + 2 && missedEnd > 3) {
      tips.push('You dropped more words toward the end. Maintain your breath support and pace throughout — don\'t rush the final sentence.')
    }
    if (missedStart > missedEnd + 2 && missedStart > 3) {
      tips.push('You struggled at the beginning. Use the preparation time to pre-read the text and identify difficult words before starting.')
    }
  }

  // Good performance
  if (content >= 80 && fluency >= 75 && pronunciation >= 70) {
    tips.push('Strong performance! To push toward 90, focus on natural intonation — stress key content words and use falling tone at the end of sentences.')
  }

  if (tips.length === 0) {
    tips.push('Decent effort. Continue practicing with different texts to improve consistency across all scoring areas.')
  }

  return tips
}

/**
 * Detect potential linking/connected speech issues from word diff.
 * Returns pairs like "kind of", "an example" where linking would be expected.
 */
function detectLinkingIssues(wordDiff) {
  const linkPairs = []
  // Common linking patterns: consonant ending + vowel beginning
  const vowelStart = /^[aeiou]/i
  const consonantEnd = /[bcdfghjklmnpqrstvwxyz]$/i

  for (let i = 0; i < wordDiff.length - 1; i++) {
    const current = wordDiff[i]
    const next = wordDiff[i + 1]
    
    // If either word in the pair was missed, it might be a linking issue
    if (current.status === 'missed' || next.status === 'missed') {
      const w1 = current.word.replace(/[^a-zA-Z]/g, '')
      const w2 = next.word.replace(/[^a-zA-Z]/g, '')
      
      if (w1 && w2 && consonantEnd.test(w1) && vowelStart.test(w2)) {
        linkPairs.push(`${current.word} ${next.word}`)
      }
    }
  }
  
  return linkPairs
}
