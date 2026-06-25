const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and',
  'any', 'are', 'around', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'given', 'graph', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
  'if', 'image', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'like', 'many', 'map',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'overall', 'over', 'own',
  'picture', 'provided', 'same', 'she', 'should', 'shows', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves',
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeToken(value = '') {
  return value
    .toLowerCase()
    .replace(/[“”‘’"()[\]{}.,!?;:/\\%$#@^&*_+=<>|-]/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();
}

function tokenize(text = '') {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function getMeaningfulTokens(text = '') {
  return tokenize(text).filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function unique(arr = []) {
  return [...new Set(arr)];
}

function countMatches(source = [], targetSet = new Set()) {
  return source.filter((item) => targetSet.has(item)).length;
}

function extractQuestionKeywords(question) {
  const explicit = Array.isArray(question?.keyPoints) ? question.keyPoints.join(' ') : '';
  const answer = question?.answer || '';
  const title = question?.promptTitle || question?.title || '';
  const combined = `${title} ${explicit} ${answer}`;
  const tokens = getMeaningfulTokens(combined);
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 12);
}

function sentenceCount(text = '') {
  const matches = text.match(/[^.!?]+[.!?]?/g) || [];
  return matches.map((item) => item.trim()).filter(Boolean).length;
}

function getStructureSignals(text = '') {
  const lower = text.toLowerCase();
  return {
    hasIntro: /(the (graph|chart|image|picture|diagram|map|table)|this (graph|chart|image|picture|diagram|map|table))/.test(lower),
    hasComparison: /(highest|lowest|higher|lower|more than|less than|compared|while|whereas|trend|increase|decrease|decline|rise)/.test(lower),
    hasConclusion: /(overall|in conclusion|to sum up|in summary|to conclude)/.test(lower),
    hasSequence: /(first|then|next|finally|begins|moves|stage)/.test(lower),
  };
}

function getVocabularyScore(tokens = [], keywordMatches = 0) {
  if (!tokens.length) return 0;
  const uniqueRatio = unique(tokens).length / tokens.length;
  const longWordCount = tokens.filter((token) => token.length >= 6).length;
  const lexicalBoost = clamp((uniqueRatio * 50) + Math.min(20, longWordCount * 2), 0, 70);
  return Math.round(clamp(lexicalBoost + Math.min(20, keywordMatches * 2.5), 0, 90));
}

function getStructureScore(signals, question) {
  let score = 20;
  if (signals.hasIntro) score += 25;
  if (signals.hasComparison || signals.hasSequence) score += 25;
  if (signals.hasConclusion) score += 20;

  if (question?.visualCategory === 'process' || question?.visualCategory === 'map') {
    if (signals.hasSequence) score += 10;
  }

  return Math.round(clamp(score, 0, 90));
}

function inferGrammarChangeMeta(originalToken = '', correctedToken = '') {
  const orig = normalizeToken(originalToken);
  const next = normalizeToken(correctedToken);
  if (!orig && next) {
    return {
      category: 'Missing word',
      reason: 'A missing word was added to make the sentence grammatically complete.',
      tip: 'When speaking, finish short sentence frames clearly so helper words are not dropped.',
    };
  }
  if (orig && !next) {
    return {
      category: 'Extra word',
      reason: 'An unnecessary word was removed to make the sentence more natural.',
      tip: 'Avoid restarting mid-sentence, because repeated filler words often appear as extra words.',
    };
  }
  if (/^[A-Z]/.test(correctedToken) && orig === next) {
    return {
      category: 'Capitalization',
      reason: 'Capitalization was adjusted for standard written English.',
      tip: 'This is a writing-side cleanup only. Your spoken content was likely understood.',
    };
  }
  if (/[.,!?]$/.test(correctedToken) || /[.,!?]$/.test(originalToken)) {
    return {
      category: 'Punctuation',
      reason: 'Punctuation was adjusted to improve sentence clarity.',
      tip: 'A steadier pause pattern helps the system place sentence boundaries more accurately.',
    };
  }
  if (orig === next.replace(/s$/, '')) {
    return {
      category: 'Word form',
      reason: 'The word form was adjusted for number or subject-verb agreement.',
      tip: 'Watch singular/plural endings and final -s sounds, because they affect meaning and grammar.',
    };
  }
  if (/^(is|are|was|were|has|have|do|does|did|go|goes|went)$/.test(orig) || /^(is|are|was|were|has|have|do|does|did|go|goes|went)$/.test(next)) {
    return {
      category: 'Verb form',
      reason: 'The verb form was adjusted for tense or subject-verb agreement.',
      tip: 'Keep the sentence structure simple so the main verb stays clear and consistent.',
    };
  }
  if (/^(a|an|the)$/.test(orig) || /^(a|an|the)$/.test(next)) {
    return {
      category: 'Article',
      reason: 'The article was adjusted to make the noun phrase more natural.',
      tip: 'Small function words like a, an, and the are easy to swallow when speaking too fast.',
    };
  }
  if (/^(in|on|at|for|to|with|by|from|of)$/.test(orig) || /^(in|on|at|for|to|with|by|from|of)$/.test(next)) {
    return {
      category: 'Preposition',
      reason: 'The preposition was adjusted to fit standard English usage.',
      tip: 'Memorize common phrase patterns, because prepositions are often fixed by usage.',
    };
  }
  return {
    category: 'Wording',
    reason: 'The wording was adjusted to improve grammar and natural expression.',
    tip: 'Use shorter, more direct phrasing when you are under time pressure.',
  };
}

export function buildGrammarNotes(originalText = '', correctedText = '') {
  const originalTokens = originalText.trim().split(/\s+/).filter(Boolean);
  const correctedTokens = correctedText.trim().split(/\s+/).filter(Boolean);

  const maxLength = Math.max(originalTokens.length, correctedTokens.length);
  const notes = [];

  for (let i = 0; i < maxLength; i++) {
    const before = originalTokens[i] || '';
    const after = correctedTokens[i] || '';
    if (before === after) continue;
    const meta = inferGrammarChangeMeta(before, after);
    notes.push({
      before,
      after,
      category: meta.category,
      reason: meta.reason,
      tip: meta.tip,
    });
  }

  return notes.slice(0, 8);
}

export function analyzeDescribeImage({
  question,
  recognizedText = '',
  browserText = '',
  correctedText = '',
  diagnostics = null,
}) {
  const responseText = (recognizedText || '').trim();
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
      tips: ['No speech was detected. Try describing the image with one intro sentence, two main details, and one overall conclusion.'],
      scorePolicy: [
        { label: 'Content', detail: 'Covers main features, comparisons, or steps visible in the image.' },
        { label: 'Oral Fluency', detail: 'Rewards smooth pacing, controlled pauses, and continuous delivery.' },
        { label: 'Pronunciation', detail: 'Uses speech clarity signals such as STT agreement and delivery quality.' },
        { label: 'Grammar', detail: 'Penalizes repeated grammar or sentence formation issues in the response.' },
        { label: 'Structure', detail: 'Rewards a clear DI flow: intro, key detail(s), and an overall takeaway.' },
      ],
    };
  }

  const responseTokens = getMeaningfulTokens(responseText);
  const questionKeywords = extractQuestionKeywords(question);
  const keywordSet = new Set(questionKeywords);
  const matchedKeywords = unique(responseTokens.filter((token) => keywordSet.has(token)));
  const missingKeywords = questionKeywords.filter((token) => !matchedKeywords.includes(token)).slice(0, 6);
  const keywordCoverage = questionKeywords.length ? matchedKeywords.length / questionKeywords.length : 0;

  const contentBase = clamp(keywordCoverage * 90, 0, 90);
  const structureSignals = getStructureSignals(responseText);
  const sentenceBonus = sentenceCount(responseText) >= 2 ? 8 : 0;
  const contentScore = Math.round(clamp(contentBase + sentenceBonus + (structureSignals.hasComparison || structureSignals.hasSequence ? 6 : 0), 0, 90));

  const diagnosticsScores = diagnostics?.scores || {};
  const oralFluencyScore = Math.round(clamp(
    ((diagnosticsScores.speed || 0) * 0.3)
    + ((diagnosticsScores.pauseControl || 0) * 0.25)
    + ((diagnosticsScores.rhythm || 0) * 0.2)
    + ((diagnosticsScores.completeness || 0) * 0.25),
    0,
    90,
  ));

  const browserTokens = tokenize(browserText);
  const serverTokens = tokenize(recognizedText);
  const browserAgreement = browserTokens.length && serverTokens.length
    ? countMatches(serverTokens, new Set(browserTokens)) / Math.max(serverTokens.length, 1)
    : 0.6;
  const pronunciationScore = Math.round(clamp(
    ((diagnosticsScores.stress || 0) * 0.18)
    + ((diagnosticsScores.intonation || 0) * 0.14)
    + ((diagnosticsScores.completeness || 0) * 0.28)
    + ((diagnosticsScores.rhythm || 0) * 0.1)
    + (browserAgreement * 90 * 0.3),
    0,
    90,
  ));

  const grammarNotes = correctedText && correctedText !== responseText
    ? buildGrammarNotes(responseText, correctedText)
    : [];
  const grammarPenalty = Math.min(45, grammarNotes.length * 8);
  const grammarScore = Math.round(clamp(90 - grammarPenalty, 0, 90));

  const structureScore = getStructureScore(structureSignals, question);
  const vocabularyScore = getVocabularyScore(responseTokens, matchedKeywords.length);

  const overall = Math.round(clamp(
    (contentScore * 0.34)
    + (oralFluencyScore * 0.23)
    + (pronunciationScore * 0.23)
    + (grammarScore * 0.1)
    + (structureScore * 0.06)
    + (vocabularyScore * 0.04),
    0,
    90,
  ));

  const tips = [];
  if (contentScore < 55) {
    tips.push('Mention the main visual type first, then identify one highest/lowest point or one major stage.');
  }
  if (!structureSignals.hasConclusion) {
    tips.push('Add an overall sentence such as “Overall, the image shows …” to make the response sound complete.');
  }
  if (grammarNotes.length >= 2) {
    tips.push('Some grammar issues were corrected. Keep your sentence structure shorter and more direct under time pressure.');
  }
  if ((diagnosticsScores.pauseControl || 0) < 55) {
    tips.push('Your pauses were longer than ideal. Use shorter chunks and keep moving instead of stopping mid-sentence.');
  }
  if ((diagnosticsScores.speed || 0) < 55) {
    tips.push('Your pace sounded a bit slow for DI. Aim for a steady exam-style rate while keeping key words clear.');
  }
  if ((diagnosticsScores.intonation || 0) < 40) {
    tips.push('Pitch movement was limited. Let your voice rise and fall slightly on key information so the answer sounds less flat.');
  }
  if (!tips.length) {
    tips.push('Good balance overall. To score higher, make the overview sentence sharper and use one strong comparison phrase.');
  }

  return {
    overall,
    content: contentScore,
    oralFluency: oralFluencyScore,
    pronunciation: pronunciationScore,
    grammar: grammarScore,
    structure: structureScore,
    vocabulary: vocabularyScore,
    keywords: questionKeywords,
    matchedKeywords,
    missingKeywords,
    grammarNotes,
    correctedText: correctedText || responseText,
    tips,
    scorePolicy: [
      { label: 'Content', detail: 'Covers the image type, key features, comparisons, or main stages.' },
      { label: 'Oral Fluency', detail: 'Rewards steady pacing, fewer long pauses, and continuous spoken delivery.' },
      { label: 'Pronunciation', detail: 'Uses speech clarity signals, rhythm, and Browser/Server transcript agreement.' },
      { label: 'Grammar', detail: 'Reflects how many grammar corrections were needed in your spoken response.' },
      { label: 'Structure', detail: 'Rewards DI organization: intro, key detail(s), and an overall takeaway.' },
      { label: 'Vocabulary', detail: 'Rewards relevant topic words and lexical variety without overloading the answer.' },
    ],
  };
}
