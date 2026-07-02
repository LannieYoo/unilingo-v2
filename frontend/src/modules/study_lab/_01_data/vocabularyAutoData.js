import { COMMON_WORDS_LIST } from '../../../pages/text-to-speech/commonWords.js'
import {
  ACADEMIC_GLOSSARY,
  BUSINESS_GLOSSARY,
  IT_GLOSSARY,
  LEGAL_GLOSSARY,
  MEDICAL_GLOSSARY,
} from '../../../shared/modules/glossary/_08_constants/glossaries.js'

const CELPIP_TARGET_SIZE = 1100
const PTE_TARGET_SIZE = 1100

const COMMON_WORD_STOPWORDS = new Set([
  'about', 'after', 'again', 'against', 'almost', 'always', 'among', 'another', 'around', 'because',
  'before', 'being', 'below', 'between', 'beyond', 'could', 'doing', 'during', 'every', 'first',
  'found', 'great', 'group', 'having', 'house', 'large', 'later', 'least', 'might', 'never',
  'often', 'other', 'place', 'point', 'right', 'since', 'small', 'something', 'their', 'there',
  'these', 'thing', 'those', 'under', 'until', 'where', 'which', 'while', 'would', 'years',
])

const CELPIP_TOPIC_META = {
  'housing-services': { label: 'Housing & Services', contextEn: 'housing, repairs, rent, and building services', contextKo: '주거, 수리, 임대, 건물 서비스', contextZh: '住房、维修、租赁与楼宇服务' },
  'work-school': { label: 'Work & School', contextEn: 'workplace, school, deadlines, and study routines', contextKo: '직장, 학교, 마감, 학습 루틴', contextZh: '职场、学校、截止时间与学习安排' },
  'travel-transit': { label: 'Travel & Transit', contextEn: 'travel plans, transit, booking, and directions', contextKo: '여행 계획, 교통, 예약, 길 안내', contextZh: '出行计划、交通、预订与路线说明' },
  'health-emergency': { label: 'Health & Emergency', contextEn: 'health concerns, clinics, and urgent situations', contextKo: '건강 문제, 진료, 긴급 상황', contextZh: '健康问题、诊所与紧急情况' },
  'shopping-banking': { label: 'Shopping & Banking', contextEn: 'shopping, refunds, fees, and payments', contextKo: '쇼핑, 환불, 수수료, 결제', contextZh: '购物、退款、费用与支付' },
  'technology-communication': { label: 'Technology & Communication', contextEn: 'devices, apps, internet access, and communication', contextKo: '기기, 앱, 인터넷, 의사소통', contextZh: '设备、应用、网络与沟通' },
  'community-civic': { label: 'Community & Civic Life', contextEn: 'public services, events, notices, and community rules', contextKo: '공공 서비스, 행사, 공지, 지역 규정', contextZh: '公共服务、活动、通知与社区规则' },
  'news-opinion': { label: 'News & Opinion', contextEn: 'reports, opinions, trends, and evidence', contextKo: '보도, 의견, 추세, 근거', contextZh: '报道、观点、趋势与依据' },
  'people-relationships': { label: 'People & Relationships', contextEn: 'support, conflict, social tone, and relationships', contextKo: '지원, 갈등, 말투, 인간관계', contextZh: '支持、冲突、语气与人际关系' },
  'problem-solving': { label: 'Problem Solving', contextEn: 'complaints, options, decisions, and solutions', contextKo: '불만, 선택지, 결정, 해결', contextZh: '投诉、选项、决定与解决方案' },
}

const PTE_TOPIC_META = {
  'speaking-listening': { label: 'Speaking & Listening', contextEn: 'oral fluency, pronunciation, and listening recall', contextKo: '말하기 유창성, 발음, 듣기 재구성', contextZh: '口语流利度、发音与听力复述' },
  'academic-reading': { label: 'Academic Reading', contextEn: 'research passages, structure, and inference', contextKo: '학술 지문, 구조, 추론', contextZh: '学术文章、结构与推断' },
  'writing-structure': { label: 'Writing & Structure', contextEn: 'summaries, essays, cohesion, and formal writing', contextKo: '요약, 에세이, 응집성, 형식적 글쓰기', contextZh: '摘要、作文、衔接与正式写作' },
  'campus-life': { label: 'Campus & Study Life', contextEn: 'lectures, assignments, tuition, and student services', contextKo: '강의, 과제, 학비, 학생 서비스', contextZh: '课程、作业、学费与学生服务' },
  'work-professional': { label: 'Work & Professional English', contextEn: 'projects, meetings, priorities, and workplace language', contextKo: '프로젝트, 회의, 우선순위, 직장 영어', contextZh: '项目、会议、优先级与职场英语' },
  'charts-data': { label: 'Charts & Data Language', contextEn: 'graphs, changes, comparisons, and numeric trends', contextKo: '그래프, 변화, 비교, 수치 추세', contextZh: '图表、变化、比较与数据趋势' },
  'technology-science': { label: 'Technology & Science', contextEn: 'innovation, experiments, devices, and science topics', contextKo: '혁신, 실험, 기기, 과학 주제', contextZh: '创新、实验、设备与科学主题' },
  'health-society': { label: 'Health & Society', contextEn: 'healthcare, behavior, resilience, and society', contextKo: '의료, 행동, 회복력, 사회', contextZh: '医疗、行为、复原力与社会' },
  'environment-policy': { label: 'Environment & Policy', contextEn: 'resources, sustainability, policy, and regulation', contextKo: '자원, 지속가능성, 정책, 규제', contextZh: '资源、可持续性、政策与监管' },
  'opinion-argument': { label: 'Opinion & Argument', contextEn: 'claims, support, evidence, and evaluation', contextKo: '주장, 뒷받침, 근거, 평가', contextZh: '论点、支持、证据与评估' },
}

const CELPIP_TOPIC_BANKS = {
  'housing-services': ['apartment', 'landlord', 'tenant', 'lease', 'deposit', 'vacancy', 'inspection', 'maintenance', 'repair', 'plumbing', 'utility', 'rent', 'renewal', 'balcony', 'elevator', 'hallway', 'laundry', 'mailbox', 'parking', 'resident', 'schedule', 'service', 'appliance', 'cleaning', 'booking', 'notice', 'invoice', 'receipt', 'warranty', 'move', 'relocate', 'address', 'contract', 'renovation', 'noise', 'storage', 'furniture', 'deliver', 'courier', 'keys', 'permit', 'approval', 'heater', 'airfare'],
  'work-school': ['agenda', 'allocate', 'amend', 'assignment', 'briefing', 'certificate', 'deadline', 'department', 'draft', 'enroll', 'evaluate', 'feedback', 'guideline', 'internship', 'lecture', 'mentor', 'outline', 'participate', 'presentation', 'proposal', 'register', 'research', 'resume', 'rubric', 'schedule', 'seminar', 'session', 'submit', 'supervisor', 'syllabus', 'tuition', 'update', 'withdraw', 'workshop', 'criteria', 'project', 'training', 'orientation', 'attendance', 'deadline', 'portfolio', 'revision', 'transcript'],
  'travel-transit': ['arrival', 'boarding', 'cancel', 'commute', 'connection', 'customs', 'delay', 'departure', 'destination', 'detour', 'fare', 'gate', 'itinerary', 'journey', 'luggage', 'map', 'missed', 'navigation', 'platform', 'refund', 'reserve', 'route', 'station', 'stopover', 'ticket', 'traffic', 'transfer', 'transit', 'travel', 'trip', 'vehicle', 'voucher', 'waitlist', 'waypoint', 'passport', 'baggage', 'airline', 'shuttle', 'subway', 'rail', 'intersection'],
  'health-emergency': ['allergy', 'ambulance', 'appointment', 'bandage', 'clinic', 'condition', 'consultation', 'diagnosis', 'emergency', 'fever', 'headache', 'injury', 'insurance', 'medical', 'medication', 'nurse', 'patient', 'pharmacy', 'prescription', 'recovery', 'referral', 'relief', 'screening', 'symptom', 'treatment', 'vaccine', 'ward', 'wellness', 'wheelchair', 'urgent', 'surgery', 'specialist', 'monitor', 'counseling', 'mental', 'stress', 'support', 'assist', 'first aid', 'checkup'],
  'shopping-banking': ['account', 'balance', 'budget', 'charge', 'checkout', 'coupon', 'credit', 'currency', 'debit', 'discount', 'exchange', 'expense', 'fee', 'finance', 'fund', 'installment', 'interest', 'invoice', 'membership', 'merchant', 'overdraft', 'payment', 'purchase', 'receipt', 'refund', 'return', 'savings', 'statement', 'subscription', 'transfer', 'transaction', 'withdrawal', 'barcode', 'bill', 'cashier', 'deposit', 'loyalty', 'monthly', 'purchase', 'rebate'],
  'technology-communication': ['attachment', 'battery', 'browser', 'camera', 'charge', 'cloud', 'connection', 'contact', 'download', 'email', 'filter', 'headset', 'hotspot', 'inbox', 'install', 'keyboard', 'link', 'login', 'message', 'microphone', 'notification', 'password', 'platform', 'printer', 'profile', 'recording', 'reply', 'router', 'signal', 'software', 'storage', 'stream', 'update', 'upload', 'username', 'verification', 'video', 'voicemail', 'website', 'wireless'],
  'community-civic': ['announcement', 'ballot', 'bylaw', 'campaign', 'census', 'charity', 'council', 'district', 'document', 'election', 'facility', 'festival', 'guideline', 'library', 'license', 'meeting', 'museum', 'neighbourhood', 'permit', 'petition', 'policy', 'program', 'public', 'recycle', 'regulation', 'renew', 'service', 'shelter', 'tax', 'volunteer', 'workshop', 'border', 'committee', 'citizen', 'governor', 'resident', 'registration'],
  'news-opinion': ['analysis', 'argument', 'broadcast', 'campaign', 'commentary', 'coverage', 'debate', 'editorial', 'evidence', 'headline', 'impact', 'incident', 'journalist', 'opinion', 'perspective', 'poll', 'priority', 'protest', 'reaction', 'report', 'respond', 'survey', 'trend', 'update', 'viewpoint', 'witness', 'source', 'policy', 'claim', 'context', 'factor', 'outcome', 'issue', 'feature', 'insight'],
  'people-relationships': ['apologize', 'attitude', 'boundary', 'caregiver', 'classmate', 'colleague', 'compromise', 'conflict', 'courtesy', 'coworker', 'encourage', 'friendship', 'frustration', 'guest', 'honest', 'household', 'impression', 'neighbor', 'patient', 'polite', 'relationship', 'relative', 'respect', 'support', 'teammate', 'tone', 'trust', 'upset', 'visitor', 'warmth', 'mentor', 'partner', 'family', 'community'],
  'problem-solving': ['alternative', 'arrange', 'barrier', 'clarify', 'complaint', 'confirm', 'consequence', 'decision', 'difficulty', 'dispute', 'error', 'fix', 'improve', 'issue', 'option', 'priority', 'resolve', 'response', 'solution', 'suggestion', 'troubleshoot', 'urgent', 'verify', 'workaround', 'follow-up', 'replace', 'adjust', 'explain', 'repair', 'request', 'mismatch', 'reject', 'approve', 'negotiate', 'respond'],
}

const PTE_TOPIC_BANKS = {
  'speaking-listening': ['articulate', 'paraphrase', 'intonation', 'fluency', 'hesitate', 'summarize', 'retell', 'pronounce', 'delivery', 'persuade', 'respond', 'clarify', 'emphasize', 'elaborate', 'restate', 'sequence', 'express', 'explain', 'conclude', 'signal', 'transition', 'phrase', 'collocation', 'recall', 'overview', 'detail', 'listener', 'speaker', 'response', 'context', 'contrast', 'reference', 'tone', 'attitude', 'purpose', 'summation', 'narrate', 'describe'],
  'academic-reading': ['infer', 'analyze', 'argument', 'article', 'assumption', 'cite', 'cohesion', 'coherent', 'conclude', 'contrast', 'definition', 'emphasis', 'evidence', 'excerpt', 'framework', 'hypothesis', 'implication', 'interpret', 'justify', 'methodology', 'paragraph', 'passage', 'relevant', 'sequence', 'structure', 'summary', 'synthesize', 'thesis', 'topic', 'transition', 'validity', 'variable', 'assessment', 'derive', 'evaluate', 'rationale', 'overview', 'citation', 'abstract'],
  'writing-structure': ['cohesive', 'compose', 'concise', 'draft', 'edit', 'formal', 'grammar', 'headline', 'introduction', 'justify', 'linking', 'outline', 'paragraph', 'paraphrase', 'proofread', 'revise', 'sentence', 'statement', 'structure', 'summarize', 'support', 'synonym', 'thesis', 'transition', 'vocabulary', 'wording', 'clarity', 'coherence', 'conclusion', 'connective', 'register', 'punctuation', 'rewrite', 'organize', 'develop'],
  'campus-life': ['attendance', 'campus', 'coursework', 'curriculum', 'department', 'dissertation', 'enrollment', 'faculty', 'graduate', 'lecture', 'library', 'orientation', 'plagiarism', 'prerequisite', 'professor', 'research', 'scholarship', 'semester', 'seminar', 'student', 'study', 'submission', 'supervisor', 'syllabus', 'tuition', 'undergraduate', 'assignment', 'deadline', 'hostel', 'advisor', 'citation', 'workshop', 'laboratory', 'residence'],
  'work-professional': ['agenda', 'allocate', 'brief', 'budget', 'collaborate', 'coordinate', 'deadline', 'delegate', 'deliverable', 'efficiency', 'executive', 'feedback', 'initiative', 'leadership', 'meeting', 'milestone', 'negotiate', 'objective', 'outcome', 'performance', 'priority', 'proposal', 'resource', 'schedule', 'stakeholder', 'strategy', 'supervisor', 'target', 'teamwork', 'workflow', 'implementation', 'productivity', 'review', 'operate', 'process'],
  'charts-data': ['aggregate', 'average', 'chart', 'comparison', 'correlate', 'decline', 'distribution', 'estimate', 'fluctuate', 'forecast', 'graph', 'increase', 'index', 'median', 'percentage', 'proportion', 'ratio', 'rate', 'segment', 'significant', 'spike', 'stable', 'statistic', 'surge', 'trend', 'vary', 'volume', 'peak', 'range', 'double', 'triple', 'drop', 'climb', 'plunge'],
  'technology-science': ['algorithm', 'automation', 'battery', 'biotechnology', 'carbon', 'cellular', 'climate', 'device', 'digital', 'discovery', 'energy', 'engineer', 'experiment', 'innovation', 'laboratory', 'machine', 'material', 'measure', 'network', 'neural', 'platform', 'prototype', 'quantum', 'researcher', 'robotic', 'simulation', 'software', 'species', 'theory', 'virtual', 'wireless', 'genetic', 'compute', 'sensor', 'renewable'],
  'health-society': ['accessibility', 'behavior', 'community', 'consumption', 'counseling', 'dietary', 'disease', 'emotional', 'exercise', 'habit', 'healthcare', 'housing', 'income', 'inequality', 'lifestyle', 'mental', 'nutrition', 'outreach', 'poverty', 'prevention', 'public', 'recovery', 'resilience', 'screening', 'stress', 'support', 'therapy', 'urban', 'wellbeing', 'welfare', 'vaccination', 'elderly', 'demographic'],
  'environment-policy': ['conservation', 'consumption', 'emission', 'environmental', 'equity', 'governance', 'infrastructure', 'initiative', 'legislation', 'mitigate', 'policy', 'regulate', 'renewable', 'resource', 'restriction', 'sustainable', 'target', 'transit', 'waste', 'waterway', 'wildlife', 'compliance', 'efficiency', 'initiative', 'permit', 'carbon', 'recycle', 'subsidy', 'mandate', 'resilience', 'disposal', 'urbanization'],
  'opinion-argument': ['advocate', 'assess', 'claim', 'counterargument', 'debate', 'demonstrate', 'dispute', 'evaluate', 'factor', 'justify', 'logic', 'motivation', 'perspective', 'potential', 'predict', 'pressure', 'priority', 'reasoning', 'recommend', 'relevance', 'support', 'tendency', 'valid', 'viewpoint', 'weigh', 'convince', 'oppose', 'benefit', 'drawback', 'justify', 'persuasive', 'stance', 'interpretation'],
}

const GLOSSARY_GROUPS = [
  { source: IT_GLOSSARY, domain: 'it' },
  { source: MEDICAL_GLOSSARY, domain: 'medical' },
  { source: LEGAL_GLOSSARY, domain: 'legal' },
  { source: BUSINESS_GLOSSARY, domain: 'business' },
  { source: ACADEMIC_GLOSSARY, domain: 'academic' },
]

function normalizeSeedWord(word = '') {
  return String(word || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function slugifyWord(word = '') {
  return normalizeSeedWord(word)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dedupeWords(words = []) {
  const seen = new Set()
  const result = []
  for (const rawWord of words) {
    const word = normalizeSeedWord(rawWord)
    if (!word) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(word)
  }
  return result
}

function buildTopicIndex(topicBanks) {
  const index = new Map()
  Object.entries(topicBanks).forEach(([topicId, words]) => {
    dedupeWords(words).forEach((word) => {
      const key = word.toLowerCase()
      const existing = index.get(key) || []
      if (!existing.includes(topicId)) existing.push(topicId)
      index.set(key, existing)
    })
  })
  return index
}

function getGlossaryTopicIds(domain, examType) {
  if (examType === 'celpip') {
    if (domain === 'it') return ['technology-communication']
    if (domain === 'medical') return ['health-emergency']
    if (domain === 'legal') return ['community-civic', 'problem-solving']
    if (domain === 'business') return ['shopping-banking', 'work-school']
    return ['work-school', 'news-opinion']
  }
  if (domain === 'it') return ['technology-science']
  if (domain === 'medical') return ['health-society']
  if (domain === 'legal') return ['environment-policy', 'opinion-argument']
  if (domain === 'business') return ['work-professional', 'charts-data']
  return ['academic-reading', 'writing-structure']
}

function buildGlossarySeeds(examType) {
  const seeds = []
  GLOSSARY_GROUPS.forEach(({ source, domain }) => {
    const entries = Object.entries(source?.en_ko || {})
    entries.forEach(([word, ko]) => {
      const normalizedWord = normalizeSeedWord(word)
      if (!normalizedWord || normalizedWord.length < 4) return
      seeds.push({
        word: normalizedWord,
        ko,
        zh: '',
        topics: getGlossaryTopicIds(domain, examType),
        importance: domain === 'academic' || domain === 'business' ? 4 : 3,
      })
    })
  })
  return seeds
}

function buildCommonWordSeeds({ topicMeta, topicIndex, existingWordSet, limit }) {
  const topicIds = Object.keys(topicMeta)
  const generated = []
  let fallbackIndex = 0

  COMMON_WORDS_LIST.forEach((rawWord) => {
    if (generated.length >= limit) return
    const normalizedWord = normalizeSeedWord(rawWord)
    const lower = normalizedWord.toLowerCase()
    if (!/^[a-z][a-z'-]{3,}$/i.test(normalizedWord)) return
    if (COMMON_WORD_STOPWORDS.has(lower)) return
    if (existingWordSet.has(lower)) return
    existingWordSet.add(lower)

    const topics = topicIndex.get(lower) || [topicIds[fallbackIndex % topicIds.length]]
    fallbackIndex += 1
    generated.push({
      word: normalizedWord,
      ko: '',
      zh: '',
      topics,
      importance: topics.length > 1 ? 4 : 3,
    })
  })

  return generated
}

function makeGeneratedEntry(seed, examType, topicMeta, sequence) {
  const word = normalizeSeedWord(seed.word)
  const primaryTopicId = seed.topics?.[0]
  const topicInfo = topicMeta[primaryTopicId] || Object.values(topicMeta)[0]
  const examLabel = examType === 'celpip' ? 'CELPIP' : 'PTE Core'
  const id = `${examType}-auto-${slugifyWord(word)}-${sequence}`
  const englishDefinition = `high-frequency ${examLabel} vocabulary used for ${topicInfo.contextEn}`
  const noteEn = `Useful when ${examLabel} tasks mention ${topicInfo.contextEn}.`
  const noteKo = `${examLabel} 문제에서 ${topicInfo.contextKo} 맥락이 나오면 자주 보이는 단어입니다.`
  const noteZh = `${examLabel} 题目涉及 ${topicInfo.contextZh} 时，这个词经常出现。`
  const exampleEn = `The speaker used “${word}” while discussing ${topicInfo.label.toLowerCase()}.`
  const exampleKo = `화자는 ${topicInfo.label} 내용을 설명하면서 “${word}”라는 표현을 사용했습니다.`
  const exampleZh = `讲话者在讨论 ${topicInfo.label} 时使用了 “${word}” 这个词。`

  return {
    id,
    word,
    usIpa: '',
    ukIpa: '',
    importance: seed.importance || 3,
    topics: seed.topics,
    meaning: {
      en: englishDefinition,
      ko: seed.ko || '',
      zh: seed.zh || '',
    },
    note: {
      en: noteEn,
      ko: noteKo,
      zh: noteZh,
    },
    collocations: [],
    examples: [
      {
        en: exampleEn,
        ko: exampleKo,
        zh: exampleZh,
      },
    ],
  }
}

function buildAutoVocabulary({
  examType,
  topicMeta,
  topicBanks,
  existingEntries,
  targetSize,
}) {
  const existingWords = new Set((existingEntries || []).map((entry) => String(entry?.word || '').toLowerCase()))
  const topicIndex = buildTopicIndex(topicBanks)

  const manualSeeds = []
  Object.entries(topicBanks).forEach(([topicId, words]) => {
    dedupeWords(words).forEach((word) => {
      const lower = word.toLowerCase()
      if (existingWords.has(lower)) return
      existingWords.add(lower)
      manualSeeds.push({
        word,
        topics: topicIndex.get(lower) || [topicId],
        importance: 4,
      })
    })
  })

  const glossarySeeds = buildGlossarySeeds(examType)
    .filter((seed) => {
      const lower = seed.word.toLowerCase()
      if (existingWords.has(lower)) return false
      existingWords.add(lower)
      return true
    })

  const remaining = Math.max(0, targetSize - existingEntries.length - manualSeeds.length - glossarySeeds.length)
  const commonSeeds = buildCommonWordSeeds({
    topicMeta,
    topicIndex,
    existingWordSet: existingWords,
    limit: remaining,
  })

  return [...manualSeeds, ...glossarySeeds, ...commonSeeds]
    .map((seed, index) => makeGeneratedEntry(seed, examType, topicMeta, index + 1))
}

export function buildCelpipAutoVocabulary(existingEntries = []) {
  return buildAutoVocabulary({
    examType: 'celpip',
    topicMeta: CELPIP_TOPIC_META,
    topicBanks: CELPIP_TOPIC_BANKS,
    existingEntries,
    targetSize: CELPIP_TARGET_SIZE,
  })
}

export function buildPteAutoVocabulary(existingEntries = []) {
  return buildAutoVocabulary({
    examType: 'pte',
    topicMeta: PTE_TOPIC_META,
    topicBanks: PTE_TOPIC_BANKS,
    existingEntries,
    targetSize: PTE_TARGET_SIZE,
  })
}
