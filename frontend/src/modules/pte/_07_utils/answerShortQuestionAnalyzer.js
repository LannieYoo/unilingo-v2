function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeToken(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function normalizeAnswer(value = '') {
  return value
    .toLowerCase()
    .replace(/[.,!?;:/\\()[\]{}"'`]/g, ' ')
    .replace(/\b(a|an|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value = '') {
  return normalizeAnswer(value).split(/\s+/).filter(Boolean)
}

function editDistance(a = '', b = '') {
  const left = a || ''
  const right = b || ''
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0))

  for (let i = 0; i <= left.length; i += 1) dp[i][0] = i
  for (let j = 0; j <= right.length; j += 1) dp[0][j] = j

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[left.length][right.length]
}

function similarityScore(left = '', right = '') {
  if (!left && !right) return 1
  const maxLen = Math.max(left.length, right.length, 1)
  return 1 - (editDistance(left, right) / maxLen)
}

function getContentReason(matchType, bestAnswer, recognizedText) {
  if (matchType === 'exact') {
    return 'Your spoken answer matched an accepted target answer exactly.'
  }
  if (matchType === 'close') {
    return `Your answer was close to "${bestAnswer}", but it was not recognized as a clean exact match.`
  }
  return `Your spoken answer did not match the expected answer "${bestAnswer}".`
}

function buildAcceptedAnswers(question) {
  return [...new Set([
    question?.answer,
    ...(Array.isArray(question?.acceptedAnswers) ? question.acceptedAnswers : []),
  ].map((value) => value?.trim()).filter(Boolean))]
}

function getAnswerMatch(recognizedText, acceptedAnswers) {
  const normalizedRecognized = normalizeAnswer(recognizedText)
  const recognizedTokens = tokenize(recognizedText)
  const recognizedTokenFlat = recognizedTokens.map(normalizeToken).join('')

  let best = { answer: '', similarity: 0, type: 'missed' }

  for (const candidate of acceptedAnswers) {
    const normalizedCandidate = normalizeAnswer(candidate)
    const candidateTokens = tokenize(candidate)
    const candidateTokenFlat = candidateTokens.map(normalizeToken).join('')

    if (!normalizedCandidate) continue

    if (normalizedRecognized === normalizedCandidate) {
      return { answer: candidate, similarity: 1, type: 'exact' }
    }

    if (
      recognizedTokens.length <= 3
      && candidateTokens.length <= 3
      && recognizedTokens.every((token) => candidateTokens.includes(token))
    ) {
      best = { answer: candidate, similarity: 0.9, type: 'close' }
      continue
    }

    const sim = similarityScore(recognizedTokenFlat, candidateTokenFlat)
    if (sim > best.similarity) {
      best = {
        answer: candidate,
        similarity: sim,
        type: sim >= 0.78 ? 'close' : 'missed',
      }
    }
  }

  return best
}

export function analyzeAnswerShortQuestion({
  question,
  recognizedText = '',
  browserText = '',
  diagnostics = null,
}) {
  const spokenText = (recognizedText || browserText || '').trim()
  const acceptedAnswers = buildAcceptedAnswers(question)
  const match = getAnswerMatch(spokenText, acceptedAnswers)
  const answerTokens = tokenize(spokenText)
  const diagnosticsScores = diagnostics?.scores || {}

  if (!spokenText) {
    return {
      overall: 0,
      content: 0,
      oralFluency: 0,
      pronunciation: 0,
      delivery: 0,
      answerStatus: 'missed',
      bestAnswer: question?.answer || acceptedAnswers[0] || '',
      acceptedAnswers,
      recognizedAnswer: '',
      matchedAnswer: '',
      matchConfidence: 0,
      contentReason: 'No usable spoken answer was captured.',
      brevityStatus: 'missing',
      brevityReason: 'ASQ is scored from a very short spoken reply, ideally one word.',
      timingStatus: 'missing',
      timingReason: 'No spoken answer was available to measure timing and delivery.',
      tips: [
        'No spoken answer was detected. Give one short answer immediately after the question ends.',
        'ASQ rewards a fast, direct answer. Do not explain the reason unless the question specifically needs it.',
      ],
      scorePolicy: [
        { label: 'Content', detail: 'Rewards whether your short answer matches the expected answer.' },
        { label: 'Oral Fluency', detail: 'Checks whether the answer was spoken smoothly without long hesitation.' },
        { label: 'Pronunciation', detail: 'Uses speech clarity signals to estimate how clearly the answer was spoken.' },
        { label: 'Delivery', detail: 'Rewards short, direct responses within the exam-style answer window.' },
      ],
    }
  }

  const contentScore = match.type === 'exact'
    ? 90
    : match.type === 'close'
      ? Math.round(clamp(56 + (match.similarity * 24), 56, 79))
      : Math.round(clamp(match.similarity * 48, 0, 55))

  const oralFluency = Math.round(clamp(
    ((diagnosticsScores.speed || 0) * 0.35)
    + ((diagnosticsScores.pauseControl || 0) * 0.3)
    + ((diagnosticsScores.rhythm || 0) * 0.15)
    + ((diagnosticsScores.completeness || 0) * 0.2),
    0,
    90,
  ))

  const pronunciation = Math.round(clamp(
    ((diagnosticsScores.stress || 0) * 0.2)
    + ((diagnosticsScores.intonation || 0) * 0.1)
    + ((diagnosticsScores.rhythm || 0) * 0.2)
    + ((diagnosticsScores.completeness || 0) * 0.2)
    + (match.similarity * 90 * 0.3),
    0,
    90,
  ))

  const brevityPenalty = answerTokens.length <= 2 ? 0 : Math.min(35, (answerTokens.length - 2) * 12)
  const delivery = Math.round(clamp(
    ((diagnosticsScores.completeness || 0) * 0.3)
    + ((diagnosticsScores.pauseControl || 0) * 0.25)
    + ((diagnosticsScores.speed || 0) * 0.25)
    + (90 - brevityPenalty) * 0.2,
    0,
    90,
  ))

  const matchConfidence = Math.round(match.similarity * 100)
  const brevityStatus = answerTokens.length <= 2 ? 'ideal' : answerTokens.length <= 4 ? 'long' : 'too_long'
  const brevityReason = answerTokens.length <= 2
    ? 'Your answer length stayed exam-appropriate for ASQ.'
    : answerTokens.length <= 4
      ? 'Your answer was longer than ideal. ASQ usually works best with one short answer phrase.'
      : 'Your answer was much longer than ideal for ASQ. A short direct answer is safer.'
  const pauseScore = diagnosticsScores.pauseControl || 0
  const speedScore = diagnosticsScores.speed || 0
  const timingStatus = pauseScore >= 65 && speedScore >= 55
    ? 'good'
    : pauseScore >= 45
      ? 'fair'
      : 'slow'
  const timingReason = timingStatus === 'good'
    ? 'You responded with reasonable timing for a short-answer task.'
    : timingStatus === 'fair'
      ? 'The answer was understandable, but there was still some hesitation before or during the response.'
      : 'The response showed too much hesitation for a fast ASQ task.'

  const overall = Math.round(clamp(
    (contentScore * 0.55)
    + (oralFluency * 0.18)
    + (pronunciation * 0.17)
    + (delivery * 0.1),
    0,
    90,
  ))

  const tips = []
  if (match.type === 'missed') {
    tips.push(`Target answer: "${question?.answer || acceptedAnswers[0] || ''}". Keep your answer short and exact.`)
  } else if (match.type === 'close') {
    tips.push(`You were close to the target answer "${match.answer}". Try to make the key word cleaner and more direct.`)
  } else {
    tips.push('Good answer match. Keep the response this short in the real exam.')
  }

  if (answerTokens.length > 2) {
    tips.push('ASQ usually scores best with one word, or at most two very short words.')
  }
  if ((diagnosticsScores.pauseControl || 0) < 55) {
    tips.push('Answer faster after the question ends. Long hesitation can reduce the usable delivery score.')
  }
  if ((diagnosticsScores.pronunciation || diagnosticsScores.stress || 0) < 45) {
    tips.push('Say the answer more clearly and give the main word a cleaner ending sound.')
  }
  if (!tips.length) {
    tips.push('Your answer was short and clear. Keep the same direct style for other ASQ items.')
  }

  return {
    overall,
    content: contentScore,
    oralFluency,
    pronunciation,
    delivery,
    answerStatus: match.type,
    bestAnswer: question?.answer || acceptedAnswers[0] || '',
    acceptedAnswers,
    recognizedAnswer: spokenText,
    matchedAnswer: match.answer || '',
    matchConfidence,
    contentReason: getContentReason(match.type, match.answer || question?.answer || acceptedAnswers[0] || '', spokenText),
    brevityStatus,
    brevityReason,
    timingStatus,
    timingReason,
    tips,
    scorePolicy: [
      { label: 'Content', detail: 'Rewards whether your short answer matches the expected answer or an accepted equivalent.' },
      { label: 'Oral Fluency', detail: 'Checks whether the answer was spoken smoothly without long hesitation.' },
      { label: 'Pronunciation', detail: 'Uses speech clarity signals plus answer matching to estimate pronunciation quality.' },
      { label: 'Delivery', detail: 'Rewards short, direct responses that stay concise under the time limit.' },
    ],
  }
}
