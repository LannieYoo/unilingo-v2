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
 * @param {Object} [options]
 * @param {Array<{word?: string, start?: number, end?: number}>} [options.recognizedWordTimings]
 * @returns {Object} Analysis result with scores, word diff, and tips
 */
export function analyzeReadAloud(originalText, recognizedText, options = {}) {
  const recognizedWordTimings = Array.isArray(options.recognizedWordTimings)
    ? options.recognizedWordTimings
    : []

  if (!originalText || !recognizedText) {
    return {
      content: 0,
      fluency: 0,
      pronunciation: 0,
      overall: 0,
      wordDiff: [],
      recognizedText: '',
      recognizedWords: [],
      recognizedWordTimings,
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
      wordDiff: [], recognizedText, recognizedWords: recWords, recognizedWordTimings, tips: [],
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
        const timing = recognizedWordTimings[j] || null
        return {
          word: origWord,
          status: 'correct',
          norm,
          matchedAs: recWords[j],
          recognizedIndex: j,
          spokenStart: timing?.start ?? null,
          spokenEnd: timing?.end ?? null,
        }
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
            const timing = recognizedWordTimings[j] || null
            return {
              word: origWord,
              status: 'close',
              norm,
              matchedAs: recWords[j],
              recognizedIndex: j,
              spokenStart: timing?.start ?? null,
              spokenEnd: timing?.end ?? null,
            }
          }
        }
      }
    }

    // 3. Missed
    return {
      word: origWord,
      status: 'missed',
      norm,
      matchedAs: null,
      recognizedIndex: null,
      spokenStart: null,
      spokenEnd: null,
    }
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
    recognizedWordTimings,
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mean(values = []) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values = []) {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = mean(values.map((value) => (value - avg) ** 2))
  return Math.sqrt(variance)
}

function percentile(values = [], ratio = 0.5) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = clamp(Math.floor((sorted.length - 1) * ratio), 0, sorted.length - 1)
  return sorted[index]
}

function scoreFromRange(value, minIdeal, maxIdeal, minValue = 0, maxValue = 100) {
  if (!Number.isFinite(value)) return 0
  if (value >= minIdeal && value <= maxIdeal) return 90
  if (value < minIdeal) {
    const ratio = (value - minValue) / Math.max(0.0001, minIdeal - minValue)
    return Math.round(clamp(ratio, 0, 1) * 90)
  }
  const ratio = (maxValue - value) / Math.max(0.0001, maxValue - maxIdeal)
  return Math.round(clamp(ratio, 0, 1) * 90)
}

function estimatePitchHz(frame, sampleRate) {
  const minHz = 75
  const maxHz = 320
  const minLag = Math.floor(sampleRate / maxHz)
  const maxLag = Math.floor(sampleRate / minHz)

  let bestLag = -1
  let bestScore = 0

  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0
    for (let i = 0; i < frame.length - lag; i++) {
      correlation += frame[i] * frame[i + lag]
    }

    if (correlation > bestScore) {
      bestScore = correlation
      bestLag = lag
    }
  }

  if (bestLag <= 0 || bestScore <= 0) return null
  return sampleRate / bestLag
}

/**
 * Compute practice-oriented speech diagnostics from PCM audio + STT output.
 * These are not official PTE scores; they are acoustic proxies to help learners
 * see pacing, pause control, stress variation, and intonation range.
 */
export function analyzeSpeechDiagnostics(originalText, recognizedText, pcmSamples, options = {}) {
  const sampleRate = Number.isFinite(options.sampleRate) ? options.sampleRate : 16000
  const wordTimings = Array.isArray(options.wordTimings) ? options.wordTimings : []
  const taskType = options.taskType === 'rs' ? 'rs' : 'ra'
  const alignedWords = Array.isArray(options.alignedWords) ? options.alignedWords : []

  if (!pcmSamples?.length || !sampleRate) {
    return null
  }

  const recognizedWords = (recognizedText || '').split(/\s+/).filter(Boolean)
  const originalWords = (originalText || '').split(/\s+/).filter(Boolean)
  const durationSec = pcmSamples.length / sampleRate

  if (!durationSec) {
    return null
  }

  const frameSize = Math.max(256, Math.round(sampleRate * 0.02))
  const hopSize = Math.max(128, Math.round(sampleRate * 0.01))
  const rmsValues = []
  const pitchValues = []
  const frameMetrics = []

  for (let start = 0; start + frameSize <= pcmSamples.length; start += hopSize) {
    const frame = pcmSamples.slice(start, start + frameSize)
    let sumSquares = 0
    for (let i = 0; i < frame.length; i++) sumSquares += frame[i] * frame[i]
    const rms = Math.sqrt(sumSquares / frame.length)
    rmsValues.push(rms)
    let pitch = null

    if (rms > 0.015) {
      pitch = estimatePitchHz(frame, sampleRate)
      if (pitch && pitch >= 75 && pitch <= 320) {
        pitchValues.push(pitch)
      }
    }

    frameMetrics.push({
      startSec: start / sampleRate,
      endSec: (start / sampleRate) + (frameSize / sampleRate),
      rms,
      pitch: pitch && pitch >= 75 && pitch <= 320 ? pitch : null,
    })
  }

  const rmsBaseline = percentile(rmsValues, 0.35)
  const voicedThreshold = Math.max(0.012, rmsBaseline * 1.25)
  const frameDuration = hopSize / sampleRate

  let voicedFrames = 0
  let currentSilence = 0
  const pauses = []

  rmsValues.forEach((rms) => {
    const isVoiced = rms >= voicedThreshold
    if (isVoiced) {
      voicedFrames += 1
      if (currentSilence >= 0.18) pauses.push(currentSilence)
      currentSilence = 0
      return
    }
    currentSilence += frameDuration
  })

  if (currentSilence >= 0.18) pauses.push(currentSilence)

  const speechDuration = voicedFrames * frameDuration
  const speechRatio = durationSec ? speechDuration / durationSec : 0
  const totalWpm = durationSec ? (recognizedWords.length / durationSec) * 60 : 0
  const speechWpm = speechDuration > 0.5 ? (recognizedWords.length / speechDuration) * 60 : totalWpm
  const avgPause = pauses.length ? mean(pauses) : 0
  const longestPause = pauses.length ? Math.max(...pauses) : 0

  const wordDurations = wordTimings
    .map((timing) => {
      const start = Number.isFinite(timing?.start) ? timing.start : null
      const end = Number.isFinite(timing?.end) ? timing.end : null
      if (start == null || end == null || end <= start) return null
      return end - start
    })
    .filter((value) => value != null)

  const timingMean = mean(wordDurations)
  const timingStd = standardDeviation(wordDurations)
  const paceConsistencyRatio = timingMean ? timingStd / timingMean : 0

  const voicedEnergy = rmsValues.filter((rms) => rms >= voicedThreshold)
  const energyMean = mean(voicedEnergy)
  const energyStd = standardDeviation(voicedEnergy)
  const stressVariationRatio = energyMean ? energyStd / energyMean : 0

  const pitchCenterHz = pitchValues.length ? percentile(pitchValues, 0.5) : 0
  const pitchSemitones = pitchValues.length && pitchCenterHz
    ? pitchValues.map((hz) => 12 * Math.log2(hz / pitchCenterHz))
    : []
  const rawPitchRange = pitchSemitones.length
    ? percentile(pitchSemitones, 0.9) - percentile(pitchSemitones, 0.1)
    : 0
  const pitchRange = pitchSemitones.length
    ? percentile(pitchSemitones, 0.8) - percentile(pitchSemitones, 0.2)
    : rawPitchRange

  const coverageRatio = originalWords.length ? recognizedWords.length / originalWords.length : 0
  const expectedDurationSec = originalWords.length
    ? taskType === 'rs'
      ? clamp(originalWords.length / 2.45, 1.8, 10)
      : clamp(originalWords.length / 2.7, 2.2, 26)
    : durationSec
  const durationFitRatio = expectedDurationSec ? durationSec / expectedDurationSec : 1
  const durationFitScore = scoreFromRange(durationFitRatio, 0.8, 1.35, 0.35, 2.4)
  const blendedWpm = (speechWpm * 0.55) + (totalWpm * 0.45)
  const speedIdealMin = taskType === 'rs' ? 125 : 115
  const speedIdealMax = taskType === 'rs' ? 195 : 175
  const speedMin = taskType === 'rs' ? 80 : 65
  const speedMax = taskType === 'rs' ? 245 : 230
  const speechRatioMin = taskType === 'rs' ? 0.68 : 0.62
  const speechRatioMax = taskType === 'rs' ? 0.95 : 0.92
  const pausePenaltyFactor = taskType === 'rs' ? 34 : 28

  const speedScore = Math.round(clamp(
    (scoreFromRange(blendedWpm, speedIdealMin, speedIdealMax, speedMin, speedMax) * 0.58)
    + (durationFitScore * 0.24)
    + (scoreFromRange(speechRatio, speechRatioMin, speechRatioMax, 0.2, 1) * 0.18)
    - Math.max(0, (avgPause - 0.5) * pausePenaltyFactor)
    - Math.max(0, Math.abs(coverageRatio - 1) * 18),
    0,
    90,
  ))
  const pauseScore = Math.round(clamp(
    scoreFromRange(speechRatio, taskType === 'rs' ? 0.7 : 0.55, taskType === 'rs' ? 0.96 : 0.9, 0.2, 1)
    - Math.max(0, (avgPause - (taskType === 'rs' ? 0.38 : 0.45)) * (taskType === 'rs' ? 72 : 65))
    - Math.max(0, (longestPause - (taskType === 'rs' ? 0.9 : 1.1)) * (taskType === 'rs' ? 46 : 40)),
    0,
    90,
  ))
  const stressScore = Math.round(clamp(
    scoreFromRange(stressVariationRatio, 0.18, 0.52, 0.03, 0.85),
    0,
    90,
  ))
  const intonationScore = Math.round(clamp(
    scoreFromRange(pitchRange, 1.4, 5.6, 0.2, 12),
    0,
    90,
  ))
  const rhythmScore = Math.round(clamp(
    scoreFromRange(1 - paceConsistencyRatio, 0.42, 0.82, 0, 1),
    0,
    90,
  ))
  const completenessScore = Math.round(clamp(
    scoreFromRange(coverageRatio, 0.92, 1.08, 0.3, 1.5),
    0,
    90,
  ))

  const diagnosticsTips = []

  if (speechWpm < (taskType === 'rs' ? 125 : 115)) {
    diagnosticsTips.push('Your speaking pace was slow. Aim for a steadier exam pace so the sentence keeps moving naturally.')
  } else if (speechWpm > (taskType === 'rs' ? 200 : 190)) {
    diagnosticsTips.push('Your speaking pace was fast. Slow down slightly so consonants and endings stay clear.')
  }

  if (avgPause > (taskType === 'rs' ? 0.45 : 0.55) || longestPause > (taskType === 'rs' ? 0.95 : 1.15)) {
    diagnosticsTips.push('Pauses were longer than ideal. Try chunking the sentence earlier so you do not stop too long mid-thought.')
  }

  if (stressVariationRatio < 0.14) {
    diagnosticsTips.push('Your stress pattern sounded flat. Emphasize key content words a little more to avoid monotone delivery.')
  } else if (stressVariationRatio > 0.58) {
    diagnosticsTips.push('Your stress pattern was a bit uneven. Keep emphasis controlled so important words stand out without sounding choppy.')
  }

  if (pitchRange < 1.2) {
    diagnosticsTips.push('Intonation range sounded narrow. Let your pitch rise and fall more naturally across the sentence.')
  } else if (rawPitchRange > 12) {
    diagnosticsTips.push('Pitch movement may have been over-detected in a few frames. Keep your voice steady across the sentence and avoid sudden spikes.')
  }

  if (paceConsistencyRatio > 0.55) {
    diagnosticsTips.push('Word timing varied a lot. Try keeping each phrase on a more even rhythm instead of stretching some words too much.')
  }

  const stressMean = energyMean || 0
  const pitchMean = pitchValues.length ? mean(pitchValues) : 0
  const pitchSemitoneValues = pitchValues.length ? pitchValues.map((hz) => 12 * Math.log2(hz / pitchMean)) : []
  const pitchSemitoneMean = pitchSemitoneValues.length ? mean(pitchSemitoneValues) : 0
  const pitchSemitoneStd = pitchSemitoneValues.length ? standardDeviation(pitchSemitoneValues) : 0

  const perWordProsody = alignedWords.map((word, index) => {
    const start = Number.isFinite(word?.spokenStart) ? word.spokenStart : null
    const end = Number.isFinite(word?.spokenEnd) ? word.spokenEnd : null

    if (start == null || end == null || end <= start) {
      return {
        word: word?.word || '',
        index,
        stressLevel: 'unknown',
        intonationLevel: 'unknown',
        stressDelta: 0,
        pitchDelta: 0,
      }
    }

    const frames = frameMetrics.filter((frame) => frame.endSec > start && frame.startSec < end)
    const wordRmsValues = frames.map((frame) => frame.rms).filter((value) => Number.isFinite(value))
    const wordPitchValues = frames.map((frame) => frame.pitch).filter((value) => Number.isFinite(value))
    const avgWordRms = wordRmsValues.length ? mean(wordRmsValues) : 0
    const avgWordPitchSemitone = wordPitchValues.length && pitchMean
      ? mean(wordPitchValues.map((hz) => 12 * Math.log2(hz / pitchMean)))
      : 0

    const stressDelta = stressMean ? (avgWordRms - stressMean) / stressMean : 0
    const pitchDelta = avgWordPitchSemitone - pitchSemitoneMean

    const stressLevel = stressDelta > 0.28
      ? 'high'
      : stressDelta > 0.08
        ? 'medium'
        : stressDelta < -0.12
          ? 'light'
          : 'neutral'

    const intonationLevel = pitchDelta > Math.max(0.45, pitchSemitoneStd * 0.55)
      ? 'rise'
      : pitchDelta < -Math.max(0.45, pitchSemitoneStd * 0.55)
        ? 'fall'
        : Math.abs(pitchDelta) < 0.22
          ? 'flat'
          : 'neutral'

    return {
      word: word?.word || '',
      index,
      stressLevel,
      intonationLevel,
      stressDelta: Number(stressDelta.toFixed(2)),
      pitchDelta: Number(pitchDelta.toFixed(2)),
      estimated: Boolean(word?.timingEstimated),
    }
  })

  return {
    durationSec: Number(durationSec.toFixed(2)),
    speechDurationSec: Number(speechDuration.toFixed(2)),
    speechRatio: Number((speechRatio * 100).toFixed(1)),
    totalWpm: Math.round(totalWpm),
    speechWpm: Math.round(speechWpm),
    expectedDurationSec: Number(expectedDurationSec.toFixed(2)),
    durationFitRatio: Number(durationFitRatio.toFixed(2)),
    pauseCount: pauses.length,
    averagePauseMs: Math.round(avgPause * 1000),
    longestPauseMs: Math.round(longestPause * 1000),
    pitchRange: Number(pitchRange.toFixed(2)),
    stressVariation: Number((stressVariationRatio * 100).toFixed(1)),
    rhythmVariation: Number((paceConsistencyRatio * 100).toFixed(1)),
    taskType,
    perWordProsody,
    scores: {
      speed: speedScore,
      pauseControl: pauseScore,
      stress: stressScore,
      intonation: intonationScore,
      rhythm: rhythmScore,
      completeness: completenessScore,
    },
    tips: diagnosticsTips,
  }
}
