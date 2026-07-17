import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { apiGet, apiPost, apiPut } from '../../../common/api'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import useAuthStore from '../../auth/_05_stores/authStore'
import {
  CELPIP_VOCAB_IMPORTANCE_LABELS,
  CELPIP_VOCAB_TOPICS,
  CELPIP_VOCABULARY,
} from '../_01_data/celpipVocabularyData'
import {
  PTE_VOCAB_IMPORTANCE_LABELS,
  PTE_VOCAB_TOPICS,
  PTE_VOCABULARY,
} from '../_01_data/pteVocabularyData'
import { PHRASAL_VERB_SOURCES, PHRASAL_VERB_TOPICS, PHRASAL_VERBS } from '../_01_data/phrasalVerbData'
import { SENTENCE_DIFFICULTIES, SENTENCE_LISTENING_SENTENCES } from '../_01_data/sentenceListeningData'
import '../_10_styles/studyLab.css'

const HIGHLIGHT_STORAGE_KEY = 'unilingo.studyLab.sentenceHighlights'
const FAVORITES_STORAGE_KEY = 'unilingo.studyLab.favoriteSentences'
const STUDIED_SENTENCES_STORAGE_KEY = 'unilingo.studyLab.studiedSentences'
const SENTENCE_PREF_STORAGE_KEY = 'unilingo.studyLab.sentencePrefs'
const NEWS_FAVORITES_STORAGE_KEY = 'unilingo.studyLab.newsFavorites'
const NEWS_COMPLETED_STORAGE_KEY = 'unilingo.studyLab.newsCompleted'
const NEWS_CACHE_STORAGE_KEY = 'unilingo.studyLab.engooNews'
const NEWS_READER_PREF_STORAGE_KEY = 'unilingo.studyLab.newsReaderPrefs'
const NEWS_SYNC_STATUS_STORAGE_KEY = 'unilingo.studyLab.newsSyncStatus'
const PHRASAL_VERB_FAVORITES_STORAGE_KEY = 'unilingo.studyLab.phrasalVerbFavorites'
const PHRASAL_VERB_HIDDEN_STORAGE_KEY = 'unilingo.studyLab.phrasalVerbHidden'
const CELPIP_VOCAB_FAVORITES_STORAGE_KEY = 'unilingo.studyLab.celpipVocabularyFavorites'
const CELPIP_VOCAB_PREF_STORAGE_KEY = 'unilingo.studyLab.celpipVocabularyPrefs'
const CELPIP_VOCAB_HIDDEN_STORAGE_KEY = 'unilingo.studyLab.celpipVocabularyHidden'
const PTE_VOCAB_FAVORITES_STORAGE_KEY = 'unilingo.studyLab.pteVocabularyFavorites'
const PTE_VOCAB_PREF_STORAGE_KEY = 'unilingo.studyLab.pteVocabularyPrefs'
const PTE_VOCAB_HIDDEN_STORAGE_KEY = 'unilingo.studyLab.pteVocabularyHidden'
const STUDY_ACTIVE_TAB_STORAGE_KEY = 'unilingo.studyLab.activeTab'
const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
const PHRASAL_VERB_BATCH_SIZE = 24
const CELPIP_VOCAB_BATCH_SIZE = 24
const PTE_VOCAB_BATCH_SIZE = 24
const NEWS_SECTION_BATCH_SIZE = 12
const PHRASAL_VERB_PARTICLE_PRIORITY = [
  'up',
  'out',
  'off',
  'on',
  'in',
  'over',
  'away',
  'back',
  'down',
  'around',
  'through',
  'into',
  'with',
  'for',
  'to',
  'by',
  'about',
  'after',
  'across',
  'along',
  'apart',
  'aside',
  'forward',
  'together',
  'onto',
]

const PHRASAL_VERB_BASE_VERB_HINTS = {
  add: { verbs: ['include', 'increase', 'attach'], ko: '더하다, 포함하다, 붙이다', zh: '添加、包括、附加' },
  back: { verbs: ['support', 'reverse', 'return'], ko: '지지하다, 뒤로 가다, 되돌리다', zh: '支持、后退、返回' },
  blow: { verbs: ['burst', 'waste', 'inflate'], ko: '불다, 터뜨리다, 낭비하다', zh: '吹、爆裂、浪费' },
  break: { verbs: ['separate', 'stop', 'interrupt'], ko: '깨다, 중단하다, 분리하다', zh: '打破、中断、分开' },
  bring: { verbs: ['carry', 'cause', 'introduce'], ko: '가져오다, 일으키다, 소개하다', zh: '带来、引起、介绍' },
  call: { verbs: ['phone', 'name', 'request'], ko: '전화하다, 부르다, 요청하다', zh: '打电话、称呼、请求' },
  carry: { verbs: ['continue', 'hold', 'transport'], ko: '계속하다, 들다, 운반하다', zh: '继续、携带、运输' },
  check: { verbs: ['inspect', 'verify', 'control'], ko: '확인하다, 점검하다, 억제하다', zh: '检查、核实、控制' },
  clear: { verbs: ['remove', 'explain', 'empty'], ko: '치우다, 명확히 하다, 비우다', zh: '清除、说明、清空' },
  come: { verbs: ['arrive', 'happen', 'approach'], ko: '오다, 발생하다, 다가오다', zh: '来、发生、接近' },
  cut: { verbs: ['reduce', 'separate', 'stop'], ko: '자르다, 줄이다, 끊다', zh: '切、减少、停止' },
  drop: { verbs: ['fall', 'leave', 'reduce'], ko: '떨어지다, 내려놓다, 줄다', zh: '掉落、放下、减少' },
  fall: { verbs: ['drop', 'become', 'collapse'], ko: '떨어지다, ~하게 되다, 무너지다', zh: '落下、变成、倒塌' },
  figure: { verbs: ['calculate', 'understand', 'estimate'], ko: '계산하다, 이해하다, 추정하다', zh: '计算、理解、估计' },
  fill: { verbs: ['complete', 'supply', 'occupy'], ko: '채우다, 작성하다, 차지하다', zh: '填满、填写、占据' },
  find: { verbs: ['discover', 'notice', 'learn'], ko: '찾다, 발견하다, 알게 되다', zh: '发现、找到、了解到' },
  get: { verbs: ['receive', 'become', 'move'], ko: '얻다, 되다, 이동하다', zh: '得到、变得、移动' },
  give: { verbs: ['offer', 'provide', 'yield'], ko: '주다, 제공하다, 양보하다', zh: '给、提供、让步' },
  go: { verbs: ['move', 'choose', 'continue'], ko: '가다, 선택하다, 계속하다', zh: '去、选择、继续' },
  grow: { verbs: ['increase', 'develop', 'become'], ko: '자라다, 증가하다, 발전하다', zh: '成长、增加、发展' },
  hand: { verbs: ['give', 'pass', 'deliver'], ko: '건네다, 전달하다, 넘기다', zh: '递给、传递、交付' },
  hang: { verbs: ['stay', 'hold', 'suspend'], ko: '걸다, 매달리다, 머무르다', zh: '悬挂、停留、抓住' },
  hold: { verbs: ['keep', 'grip', 'contain'], ko: '잡다, 유지하다, 담다', zh: '握住、保持、容纳' },
  keep: { verbs: ['continue', 'store', 'maintain'], ko: '계속하다, 보관하다, 유지하다', zh: '继续、保留、维持' },
  knock: { verbs: ['hit', 'criticize', 'make'], ko: '치다, 두드리다, 비판하다', zh: '敲、撞、批评' },
  lay: { verbs: ['place', 'prepare', 'arrange'], ko: '놓다, 마련하다, 배열하다', zh: '放置、准备、安排' },
  let: { verbs: ['allow', 'release', 'rent'], ko: '허락하다, 놓아주다, 임대하다', zh: '允许、放开、出租' },
  look: { verbs: ['see', 'check', 'search'], ko: '보다, 확인하다, 찾다', zh: '看、检查、寻找' },
  make: { verbs: ['create', 'force', 'earn'], ko: '만들다, 시키다, 벌다', zh: '制作、使得、赚取' },
  move: { verbs: ['relocate', 'shift', 'affect'], ko: '움직이다, 이사하다, 감동시키다', zh: '移动、搬迁、影响' },
  pass: { verbs: ['give', 'move', 'approve'], ko: '넘기다, 지나가다, 통과하다', zh: '传递、经过、通过' },
  pick: { verbs: ['choose', 'collect', 'lift'], ko: '고르다, 줍다, 태우다', zh: '选择、拾起、接送' },
  pull: { verbs: ['draw', 'remove', 'attract'], ko: '당기다, 빼다, 끌어모으다', zh: '拉、移除、吸引' },
  push: { verbs: ['press', 'promote', 'force'], ko: '밀다, 밀어붙이다, 추진하다', zh: '推、推动、强迫' },
  put: { verbs: ['place', 'express', 'apply'], ko: '놓다, 표현하다, 적용하다', zh: '放置、表达、应用' },
  run: { verbs: ['operate', 'move fast', 'manage'], ko: '달리다, 운영하다, 관리하다', zh: '跑、运行、管理' },
  set: { verbs: ['place', 'arrange', 'decide'], ko: '놓다, 정하다, 설정하다', zh: '设置、安排、决定' },
  show: { verbs: ['display', 'explain', 'prove'], ko: '보여주다, 설명하다, 증명하다', zh: '展示、说明、证明' },
  sign: { verbs: ['write name', 'signal', 'approve'], ko: '서명하다, 신호하다, 승인하다', zh: '签名、示意、批准' },
  sort: { verbs: ['arrange', 'classify', 'solve'], ko: '분류하다, 정리하다, 해결하다', zh: '分类、整理、解决' },
  stand: { verbs: ['rise', 'remain', 'tolerate'], ko: '서다, 유지되다, 견디다', zh: '站立、保持、忍受' },
  take: { verbs: ['receive', 'move', 'remove'], ko: '받다, 가져가다, 제거하다', zh: '拿、接受、移除' },
  talk: { verbs: ['speak', 'discuss', 'persuade'], ko: '말하다, 논의하다, 설득하다', zh: '说话、讨论、说服' },
  throw: { verbs: ['toss', 'discard', 'confuse'], ko: '던지다, 버리다, 혼란스럽게 하다', zh: '扔、丢弃、使困惑' },
  turn: { verbs: ['rotate', 'change', 'become'], ko: '돌리다, 바꾸다, 변하다', zh: '转动、改变、变成' },
  wake: { verbs: ['stop sleeping', 'become alert'], ko: '깨다, 정신 차리다', zh: '醒来、警觉起来' },
  wear: { verbs: ['use on body', 'damage slowly'], ko: '입다, 닳게 하다', zh: '穿戴、磨损' },
  work: { verbs: ['function', 'labor', 'solve'], ko: '작동하다, 일하다, 해결하다', zh: '工作、运转、解决' },
}

const PHRASAL_VERB_SEARCH_ALIASES = [
  { label: 'solve / 해결하다', terms: ['solve', 'fix', 'resolve', 'solution', '해결', '풀다', '고치다'], keywords: ['figure out', 'sort out', 'work out', 'deal with', 'clear up', 'solve', 'fix', 'resolve'] },
  { label: 'wait / 기다리다', terms: ['wait', 'hold', 'pause', '기다', '기다리다', '잠깐', '멈추다'], keywords: ['hang on', 'hold on', 'wait up', 'hang around', 'hang about', 'stay'] },
  { label: 'continue / 계속하다', terms: ['continue', 'keep', 'carry', 'go on', '계속', '이어가다', '유지'], keywords: ['carry on', 'keep on', 'go on', 'hang in there', 'continue', 'maintain'] },
  { label: 'stop / 그만두다', terms: ['stop', 'quit', 'end', '그만', '멈추다', '중단', '포기'], keywords: ['give up', 'cut off', 'break off', 'turn off', 'stop', 'quit'] },
  { label: 'delay / 미루다', terms: ['delay', 'postpone', 'put later', '미루다', '연기', '나중'], keywords: ['put off', 'hold off', 'push back', 'delay', 'postpone'] },
  { label: 'recover / 회복하다', terms: ['recover', 'heal', 'overcome', '회복', '극복', '나아지다'], keywords: ['get over', 'bounce back', 'come around', 'recover', 'heal', 'overcome'] },
  { label: 'search / 찾다', terms: ['search', 'find', 'look', '찾다', '검색', '찾아보다'], keywords: ['look for', 'find out', 'look up', 'search', 'find'] },
  { label: 'check / 확인하다', terms: ['check', 'inspect', 'review', '확인', '검토', '살펴보다'], keywords: ['check out', 'look over', 'go over', 'look into', 'check', 'review'] },
  { label: 'meet / 만나다', terms: ['meet', 'join', 'gather', '만나다', '모이다', '합류'], keywords: ['meet up', 'get together', 'come over', 'drop by', 'join'] },
  { label: 'hang out / 어울리다', terms: ['hang out', 'spend time', 'socialize', '어울리다', '놀다', '시간 보내다'], keywords: ['hang out', 'hang out with', 'get together', 'come over', 'socialize'] },
  { label: 'call / 전화하다', terms: ['call', 'phone', 'telephone', '전화', '통화'], keywords: ['call back', 'call up', 'hang up', 'pick up', 'phone', 'call'] },
  { label: 'end call / 전화 끊다', terms: ['hang up', 'end call', '전화 끊', '통화 종료', '끊다'], keywords: ['hang up', 'hang up on', 'cut off', 'end call'] },
  { label: 'pick up / 데리러 가다', terms: ['pick up', 'collect', 'get someone', '데리러', '태우다', '픽업'], keywords: ['pick up', 'drop off', 'collect', 'lift'] },
  { label: 'leave / 떠나다', terms: ['leave', 'depart', 'go away', '떠나다', '나가다', '출발'], keywords: ['go away', 'head out', 'set off', 'move out', 'leave'] },
  { label: 'arrive / 도착하다', terms: ['arrive', 'come', 'show', '도착', '오다', '나타나다'], keywords: ['show up', 'turn up', 'come in', 'come over', 'arrive'] },
  { label: 'cancel / 취소하다', terms: ['cancel', 'call off', '취소', '무산', '없애다'], keywords: ['call off', 'cancel', 'cut out', 'drop'] },
  { label: 'remove / 제거하다', terms: ['remove', 'delete', 'take away', '제거', '삭제', '치우다', '빼다'], keywords: ['take off', 'take out', 'clear out', 'wipe out', 'remove', 'delete'] },
  { label: 'wear / 입다', terms: ['wear', 'dress', 'put clothes', '입다', '착용'], keywords: ['put on', 'try on', 'wear', 'dress'] },
  { label: 'practice / 연습하다', terms: ['practice', 'train', 'study', '연습', '훈련', '공부'], keywords: ['work on', 'go over', 'brush up on', 'practice', 'study'] },
  { label: 'learn / 배우다', terms: ['learn', 'study', 'understand', '배우다', '익히다', '알게 되다'], keywords: ['pick up', 'find out', 'learn', 'figure out', 'catch on'] },
  { label: 'understand / 이해하다', terms: ['understand', 'realize', 'grasp', '이해', '알아듣다', '깨닫다'], keywords: ['figure out', 'catch on', 'make out', 'find out', 'understand'] },
  { label: 'explain / 설명하다', terms: ['explain', 'clarify', 'describe', '설명', '분명히', '명확'], keywords: ['point out', 'clear up', 'go over', 'explain', 'clarify'] },
  { label: 'mention / 언급하다', terms: ['mention', 'raise', 'bring', '언급', '꺼내다', '말하다'], keywords: ['bring up', 'point out', 'talk about', 'mention', 'raise'] },
  { label: 'support / 도와주다', terms: ['support', 'help', 'assist', '도와', '지원', '응원'], keywords: ['help out', 'back up', 'stand by', 'support', 'assist'] },
  { label: 'avoid / 피하다', terms: ['avoid', 'escape', 'keep away', '피하다', '막다', '방지'], keywords: ['keep away', 'stay away from', 'avoid', 'cut down on'] },
  { label: 'reduce / 줄이다', terms: ['reduce', 'cut', 'lower', '줄이다', '감소', '덜다'], keywords: ['cut down', 'cut back', 'slow down', 'reduce', 'lower'] },
  { label: 'increase / 늘리다', terms: ['increase', 'raise', 'grow', '늘리다', '증가', '올리다'], keywords: ['build up', 'step up', 'go up', 'increase', 'raise'] },
  { label: 'start / 시작하다', terms: ['start', 'begin', 'launch', '시작', '착수'], keywords: ['start up', 'set up', 'kick off', 'begin', 'launch'] },
  { label: 'prepare / 준비하다', terms: ['prepare', 'arrange', 'set', '준비', '마련', '정리'], keywords: ['set up', 'lay out', 'get ready', 'prepare', 'arrange'] },
  { label: 'organize / 정리하다', terms: ['organize', 'arrange', 'tidy', '정리', '분류', '整理'], keywords: ['sort out', 'clean up', 'clear out', 'organize', 'arrange'] },
  { label: 'save / 저장하다', terms: ['save', 'keep', 'store', '저장', '보관', '간직'], keywords: ['save', 'keep', 'hang onto', 'hold on to', 'store'] },
  { label: 'throw away / 버리다', terms: ['throw away', 'discard', 'dump', '버리다', '폐기'], keywords: ['throw away', 'throw out', 'get rid of', 'discard'] },
  { label: 'pay / 지불하다', terms: ['pay', 'spend', 'cost', '지불', '계산', '돈'], keywords: ['pay for', 'pay off', 'shell out', 'spend', 'cost'] },
  { label: 'buy / 사다', terms: ['buy', 'purchase', 'shop', '사다', '구매', '쇼핑'], keywords: ['pick up', 'pay for', 'shop around', 'buy', 'purchase'] },
  { label: 'choose / 선택하다', terms: ['choose', 'select', 'decide', '선택', '고르다', '결정'], keywords: ['pick out', 'go for', 'decide on', 'choose', 'select'] },
  { label: 'reject / 거절하다', terms: ['reject', 'refuse', 'turn down', '거절', '거부'], keywords: ['turn down', 'pass up', 'reject', 'refuse'] },
  { label: 'tolerate / 참다', terms: ['tolerate', 'bear', 'stand', '참다', '견디다', '버티다'], keywords: ['put up with', 'stand for', 'hang in there', 'tolerate', 'bear'] },
  { label: 'relax / 쉬다', terms: ['relax', 'rest', 'calm', '쉬다', '휴식', '진정'], keywords: ['wind down', 'chill out', 'calm down', 'rest', 'relax'] },
  { label: 'exercise / 운동하다', terms: ['exercise', 'workout', 'train', '운동', '헬스'], keywords: ['work out', 'warm up', 'cool down', 'exercise', 'train'] },
  { label: 'log in / 로그인하다', terms: ['login', 'log in', 'sign in', '로그인', '접속'], keywords: ['log in', 'sign in', 'log on', 'access'] },
  { label: 'turn on / 켜다', terms: ['turn on', 'switch on', '켜다', '작동'], keywords: ['turn on', 'switch on', 'power up'] },
  { label: 'turn off / 끄다', terms: ['turn off', 'switch off', '끄다', '종료'], keywords: ['turn off', 'switch off', 'shut down', 'power down'] },
]

const STUDY_TABS = [
  { id: 'sentence-listening', label: 'Sentence Practice', icon: 'hearing' },
  { id: 'celpip-words', label: 'CELPIP Vocabulary', icon: 'spellcheck' },
  { id: 'pte-core-words', label: 'PTE Vocabulary', icon: 'school' },
  { id: 'phrasal-verbs', label: 'Phrasal Verbs', icon: 'conversion_path' },
  { id: 'news-reading', label: 'News Reading', icon: 'newspaper' },
  { id: 'describing-pictures', label: 'Describing Pictures', icon: 'image' },
]

const SPEED_OPTIONS = [0.5, 0.6, 0.75, 0.85, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8]
const ACCENT_OPTIONS = [
  { id: 'en-US', label: 'American', detail: 'US English' },
  { id: 'en-GB', label: 'British', detail: 'UK English' },
  { id: 'en-AU', label: 'Australian', detail: 'AU English' },
  { id: 'en-CA', label: 'Canadian', detail: 'CA English' },
  { id: 'en-IN', label: 'Indian', detail: 'IN English' },
]

const NEWS_SECTION_FALLBACKS = [
  'Business & Politics',
  'Culture & Society',
  'Health & Lifestyle',
  'Science & Technology',
  'Travel & Experiences',
]
const NEWS_DIFFICULTIES = ['Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Level 10']
const WORD_MEANING_CACHE = new Map()
const NEWS_TRANSLATION_CACHE = new Map()
const NEWS_AI_INSIGHT_CACHE = new Map()
let NEWS_AUTO_SYNC_TRIGGERED = false
const NEWS_SECTION_PREVIEW_LIMIT = 4
const DEFAULT_NEWS_SYNC_STATE = {
  progress: 0,
  status: 'Idle',
  isSyncing: false,
  fetchedCount: 0,
  latestDate: '',
  total: 0,
  startedAt: '',
  finishedAt: '',
  error: '',
}

let sharedNewsSyncAccountKey = null
let sharedNewsSyncState = { ...DEFAULT_NEWS_SYNC_STATE }
let activeNewsSyncPromise = null
const newsSyncSubscribers = new Set()

function getAccountStorageKey(baseKey, accountKey) {
  return `${baseKey}.${accountKey || 'guest'}`
}

function readJsonStorage(baseKey, accountKey, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(window.localStorage.getItem(getAccountStorageKey(baseKey, accountKey)) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function clearOversizedNewsCacheStorage() {
  if (typeof window === 'undefined') return
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(NEWS_CACHE_STORAGE_KEY))
      .forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Browsers can throw on storage access in private or quota-limited modes.
  }
}

function normalizeNewsSyncState(value = {}) {
  return {
    ...DEFAULT_NEWS_SYNC_STATE,
    ...(value && typeof value === 'object' ? value : {}),
    progress: Number.isFinite(Number(value?.progress)) ? Math.max(0, Math.min(100, Number(value.progress))) : 0,
    status: String(value?.status || DEFAULT_NEWS_SYNC_STATE.status),
    isSyncing: value?.isSyncing === true,
    fetchedCount: Number.isFinite(Number(value?.fetchedCount)) ? Math.max(0, Number(value.fetchedCount)) : 0,
    latestDate: String(value?.latestDate || ''),
    total: Number.isFinite(Number(value?.total)) ? Math.max(0, Number(value.total)) : 0,
    startedAt: String(value?.startedAt || ''),
    finishedAt: String(value?.finishedAt || ''),
    error: String(value?.error || ''),
  }
}

function getStoredNewsSyncState(accountKey) {
  return normalizeNewsSyncState(readJsonStorage(NEWS_SYNC_STATUS_STORAGE_KEY, accountKey, DEFAULT_NEWS_SYNC_STATE))
}

function persistNewsSyncState(accountKey, state) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getAccountStorageKey(NEWS_SYNC_STATUS_STORAGE_KEY, accountKey), JSON.stringify(state))
  } catch {
    // Ignore storage failures so sync UI still works in restricted browsers.
  }
}

function getSharedNewsSyncState(accountKey) {
  if (sharedNewsSyncAccountKey !== accountKey) {
    sharedNewsSyncAccountKey = accountKey
    sharedNewsSyncState = getStoredNewsSyncState(accountKey)
  }
  return sharedNewsSyncState
}

function publishNewsSyncState(accountKey, nextState) {
  const current = getSharedNewsSyncState(accountKey)
  const resolved = normalizeNewsSyncState(
    typeof nextState === 'function'
      ? nextState(current)
      : { ...current, ...nextState },
  )
  sharedNewsSyncAccountKey = accountKey
  sharedNewsSyncState = resolved
  persistNewsSyncState(accountKey, resolved)
  newsSyncSubscribers.forEach((listener) => listener(accountKey, resolved))
  return resolved
}

function subscribeNewsSyncState(listener) {
  newsSyncSubscribers.add(listener)
  return () => newsSyncSubscribers.delete(listener)
}

async function fetchNewsSummariesPayload() {
  const response = await apiGet('/api/study-lab/engoo-news', { summary: 1 })
  return {
    articles: response.data?.articles || [],
    meta: {
      total: response.data?.total || response.data?.articles?.length || 0,
      latestDate: response.data?.latest_date || '',
      storage: response.data?.storage || '',
    },
  }
}

async function startAdminNewsSync({ accountKey, accessToken, latestDate }) {
  if (activeNewsSyncPromise) return activeNewsSyncPromise

  publishNewsSyncState(accountKey, {
    isSyncing: true,
    progress: 5,
    status: 'Checking latest Engoo data...',
    fetchedCount: 0,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    error: '',
  })

  activeNewsSyncPromise = (async () => {
    try {
      publishNewsSyncState(accountKey, {
        isSyncing: true,
        progress: 30,
        status: 'Scanning all available Engoo Daily News sections...',
      })

      const response = await fetch(`${API_URL}/api/study-lab/engoo-news/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          latest_date: latestDate,
          count: 12,
          max_per_section: 6,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`)
      }

      const fetchedCount = data.new_count ?? data.articles?.length ?? 0
      const resolvedLatestDate = data.latest_date || latestDate || ''
      publishNewsSyncState(accountKey, {
        isSyncing: true,
        progress: 80,
        status: `Saving ${fetchedCount.toLocaleString()} new Engoo articles...`,
      })
      publishNewsSyncState(accountKey, {
        isSyncing: false,
        progress: 100,
        status: `Fetched ${fetchedCount.toLocaleString()} new Engoo articles. Latest saved date: ${resolvedLatestDate || 'unknown'}.`,
        fetchedCount,
        latestDate: resolvedLatestDate,
        total: data.total || data.saved_count || data.articles?.length || 0,
        finishedAt: new Date().toISOString(),
        error: '',
      })
      return data
    } catch (error) {
      publishNewsSyncState(accountKey, {
        isSyncing: false,
        progress: 0,
        status: `Engoo sync failed: ${error.message}`,
        finishedAt: new Date().toISOString(),
        error: error.message,
      })
      throw error
    } finally {
      activeNewsSyncPromise = null
    }
  })()

  return activeNewsSyncPromise
}

function tokenizeSentence(sentence) {
  return sentence.split(/(\s+|[.,!?;:])/).filter(Boolean)
}

function isHighlightableToken(token) {
  return /[A-Za-z0-9]/.test(token)
}

function getPhrasalVerbParticles(phrase) {
  return phrase
    .toLowerCase()
    .split(/\s+/)
    .slice(1)
    .map((word) => word.replace(/[^a-z]/g, ''))
    .filter(Boolean)
}

function getPhrasalVerbBaseVerb(phrase) {
  return phrase
    .toLowerCase()
    .split(/\s+/)[0]
    ?.replace(/[^a-z]/g, '') || ''
}

function getPhrasalVerbBaseHint(phrase) {
  const baseVerb = getPhrasalVerbBaseVerb(phrase)
  return PHRASAL_VERB_BASE_VERB_HINTS[baseVerb] || {
    verbs: [baseVerb].filter(Boolean),
    ko: `${baseVerb} 기본 동사 감각`,
    zh: `${baseVerb} 的基本动词感觉`,
  }
}

function getPhrasalVerbTopicIds(item = {}) {
  return item.topicIds?.length ? item.topicIds : [item.topic].filter(Boolean)
}

function mergeLocalizedPhrasalText(current = {}, incoming = {}) {
  return ['ko', 'zh'].reduce((next, lang) => {
    const parts = [current?.[lang], incoming?.[lang]]
      .flatMap((value) => String(value || '').split(';'))
      .map((value) => value.trim())
      .filter(Boolean)
    next[lang] = [...new Set(parts)].join('; ')
    return next
  }, {})
}

function mergePhrasalSourceRefs(current = [], incoming = []) {
  const merged = new Map()
  ;[...current, ...incoming].forEach((source) => {
    if (!source) return
    const key = source.url || source.label || source.shortLabel
    if (!key || merged.has(key)) return
    merged.set(key, source)
  })
  return [...merged.values()]
}

function mergePhrasalVerbEntries(entries = []) {
  const merged = new Map()
  entries.forEach((entry) => {
    if (!entry?.phrase) return
    const key = normalizePhrasalSearchText(entry.phrase)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        ...entry,
        id: entry.id,
        sourceIds: [entry.id].filter(Boolean),
        topicIds: [entry.topic].filter(Boolean),
        examples: [...(entry.examples || [])],
        sourceRefs: [...(entry.sourceRefs || [])],
        sourceBadges: [...new Set((entry.sourceBadges || []).filter(Boolean))],
      })
      return
    }

    existing.sourceIds = [...new Set([...existing.sourceIds, entry.id].filter(Boolean))]
    existing.topicIds = [...new Set([...existing.topicIds, entry.topic].filter(Boolean))]
    existing.sourceRefs = mergePhrasalSourceRefs(existing.sourceRefs, entry.sourceRefs || [])
    existing.sourceBadges = [...new Set([...(existing.sourceBadges || []), ...(entry.sourceBadges || [])].filter(Boolean))]
    existing.importance = Math.max(existing.importance || 0, entry.importance || 0)
    existing.meaning = mergeLocalizedPhrasalText(existing.meaning, entry.meaning)
    existing.when = mergeLocalizedPhrasalText(existing.when, entry.when)
    existing.nuance = mergeLocalizedPhrasalText(existing.nuance, entry.nuance)

    const seenExamples = new Set((existing.examples || []).map((example) => normalizePhrasalSearchText(example.en)))
    ;(entry.examples || []).forEach((example) => {
      const exampleKey = normalizePhrasalSearchText(example.en)
      if (!exampleKey || seenExamples.has(exampleKey)) return
      seenExamples.add(exampleKey)
      existing.examples.push(example)
    })
  })
  return [...merged.values()]
}

function normalizePhrasalSearchText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getPhrasalSearchTokens(value = '') {
  return normalizePhrasalSearchText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function getPhrasalSearchStem(token = '') {
  return token
    .replace(/(ing|ers|er|ed|es|s)$/i, '')
    .replace(/(하다|해요|했어요|했어|합니다|되는|되다|돼요|되어요|하기|한)$/u, '')
}

function doPhrasalTokensRelate(leftToken, rightToken) {
  if (!leftToken || !rightToken) return false
  if (leftToken === rightToken) return true
  if (leftToken.length >= 3 && rightToken.includes(leftToken)) return true
  if (rightToken.length >= 3 && leftToken.includes(rightToken)) return true
  const leftStem = getPhrasalSearchStem(leftToken)
  const rightStem = getPhrasalSearchStem(rightToken)
  if (leftStem && rightStem && leftStem.length >= 3 && rightStem.length >= 3) {
    return leftStem === rightStem || leftStem.includes(rightStem) || rightStem.includes(leftStem)
  }
  return false
}

function getPhrasalSemanticValueScore(query, value) {
  const normalizedQuery = normalizePhrasalSearchText(query)
  const normalizedValue = normalizePhrasalSearchText(value)
  if (!normalizedQuery || !normalizedValue) return 0
  if (normalizedValue === normalizedQuery) return 100
  if (normalizedValue.includes(normalizedQuery) || normalizedQuery.includes(normalizedValue)) return 82

  const queryTokens = getPhrasalSearchTokens(normalizedQuery)
  const valueTokens = getPhrasalSearchTokens(normalizedValue)
  if (!queryTokens.length || !valueTokens.length) return 0

  const matchedTokenCount = queryTokens.filter((queryToken) => (
    valueTokens.some((valueToken) => doPhrasalTokensRelate(queryToken, valueToken))
  )).length
  if (matchedTokenCount === queryTokens.length) return queryTokens.length > 1 ? 68 : 42
  if (matchedTokenCount) return 26
  return 0
}

function getPhrasalAliasScore(alias, query) {
  const aliasValues = [alias.label, ...(alias.terms || []), ...(alias.keywords || [])]
  return Math.max(0, ...aliasValues.map((value) => getPhrasalSemanticValueScore(query, value)))
}

function getExpandedPhrasalSearchTerms(query) {
  const normalizedQuery = normalizePhrasalSearchText(query)
  if (!normalizedQuery) return []
  const terms = new Set([normalizedQuery])
  PHRASAL_VERB_SEARCH_ALIASES.forEach((alias) => {
    if (!getPhrasalAliasScore(alias, normalizedQuery)) return
    ;[alias.label, ...(alias.terms || []), ...(alias.keywords || [])]
      .map(normalizePhrasalSearchText)
      .filter(Boolean)
      .forEach((value) => terms.add(value))
  })
  return [...terms]
}

function getPhrasalVerbSearchValues(item, topicMap) {
  const baseHint = getPhrasalVerbBaseHint(item.phrase)
  const topicIds = getPhrasalVerbTopicIds(item)
  return [
    item.phrase,
    item.meaning?.ko,
    item.meaning?.zh,
    item.when?.ko,
    item.when?.zh,
    item.nuance?.ko,
    item.nuance?.zh,
    ...topicIds.flatMap((topicId) => [topicMap[topicId]?.label, topicMap[topicId]?.tone]),
    getPhrasalVerbBaseVerb(item.phrase),
    ...(baseHint.verbs || []),
    baseHint.ko,
    baseHint.zh,
    ...getPhrasalVerbParticles(item.phrase),
  ].map(normalizePhrasalSearchText).filter(Boolean)
}

function getPhrasalVerbSearchScore(item, query, topicMap) {
  const normalizedQuery = normalizePhrasalSearchText(query)
  if (!normalizedQuery) return 1
  const searchValues = getPhrasalVerbSearchValues(item, topicMap)
  let score = Math.max(0, ...searchValues.map((value) => getPhrasalSemanticValueScore(normalizedQuery, value)))

  PHRASAL_VERB_SEARCH_ALIASES.forEach((alias) => {
    const aliasScore = getPhrasalAliasScore(alias, normalizedQuery)
    if (!aliasScore) return
    const relatedKeywords = (alias.keywords || []).map(normalizePhrasalSearchText).filter(Boolean)
    const keywordMatch = relatedKeywords.some((keyword) => (
      searchValues.some((value) => value.includes(keyword) || keyword.includes(value))
    ))
    if (keywordMatch) score = Math.max(score, aliasScore + 18)
  })

  return score
}

function getRandomIndex(length) {
  if (!length) return 0
  return Math.floor(Math.random() * length)
}

function splitIntoSentences(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function splitArticleIntoSentenceEntries(article) {
  return (article?.body || []).flatMap((paragraph, paragraphIndex) => (
    splitIntoSentences(paragraph).map((sentence, sentenceIndex) => ({
      id: `${paragraphIndex}-${sentenceIndex}`,
      paragraphIndex,
      sentenceIndex,
      text: sentence,
    }))
  ))
}

function cleanWord(word = '') {
  return word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').toLowerCase()
}

const IRREGULAR_VERB_FORMS = {
  be: ['was/were', 'been'], become: ['became', 'become'], begin: ['began', 'begun'],
  break: ['broke', 'broken'], bring: ['brought', 'brought'], build: ['built', 'built'],
  buy: ['bought', 'bought'], catch: ['caught', 'caught'], choose: ['chose', 'chosen'],
  come: ['came', 'come'], cost: ['cost', 'cost'], cut: ['cut', 'cut'],
  do: ['did', 'done'], draw: ['drew', 'drawn'], drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'], eat: ['ate', 'eaten'], fall: ['fell', 'fallen'],
  feel: ['felt', 'felt'], fight: ['fought', 'fought'], find: ['found', 'found'],
  fly: ['flew', 'flown'], forget: ['forgot', 'forgotten'], get: ['got', 'gotten'],
  give: ['gave', 'given'], go: ['went', 'gone'], grow: ['grew', 'grown'],
  have: ['had', 'had'], hear: ['heard', 'heard'], hide: ['hid', 'hidden'],
  hit: ['hit', 'hit'], hold: ['held', 'held'], keep: ['kept', 'kept'],
  know: ['knew', 'known'], lead: ['led', 'led'], leave: ['left', 'left'],
  lend: ['lent', 'lent'], let: ['let', 'let'], lose: ['lost', 'lost'],
  make: ['made', 'made'], mean: ['meant', 'meant'], meet: ['met', 'met'],
  pay: ['paid', 'paid'], put: ['put', 'put'], read: ['read', 'read'],
  ride: ['rode', 'ridden'], rise: ['rose', 'risen'], run: ['ran', 'run'],
  say: ['said', 'said'], see: ['saw', 'seen'], sell: ['sold', 'sold'],
  send: ['sent', 'sent'], set: ['set', 'set'], show: ['showed', 'shown'],
  sing: ['sang', 'sung'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'],
  speak: ['spoke', 'spoken'], spend: ['spent', 'spent'], stand: ['stood', 'stood'],
  steal: ['stole', 'stolen'], swim: ['swam', 'swum'], take: ['took', 'taken'],
  teach: ['taught', 'taught'], tell: ['told', 'told'], think: ['thought', 'thought'],
  throw: ['threw', 'thrown'], understand: ['understood', 'understood'],
  wake: ['woke', 'woken'], wear: ['wore', 'worn'], win: ['won', 'won'],
  write: ['wrote', 'written'],
}

const IRREGULAR_BASE_LOOKUP = (() => {
  const lookup = new Map()
  Object.entries(IRREGULAR_VERB_FORMS).forEach(([base, [past, participle]]) => {
    lookup.set(base, base)
    ;`${past}/${participle}`.split('/').forEach((form) => {
      if (!lookup.has(form)) lookup.set(form, base)
    })
  })
  return lookup
})()

const REGULAR_E_VERB_STEMS = new Set([
  'lov', 'liv', 'mov', 'us', 'creat', 'danc', 'hop', 'chang', 'clos', 'continu',
  'decid', 'describ', 'produc', 'provid', 'receiv', 'reduc', 'releas', 'requir',
  'shar', 'sav', 'serv', 'solv', 'notic', 'manag', 'measur', 'increas', 'decreas',
  'improv', 'includ', 'involv', 'arriv', 'achiev', 'believ', 'compar', 'complet',
  'celebrat', 'invit', 'excit', 'imagin', 'prepar', 'realiz', 'recogniz', 'remov',
  'replac', 'retir', 'settl', 'struggl', 'suppos', 'surviv', 'translat', 'updat',
  'vot', 'welcom', 'stor', 'scor', 'plac', 'fac', 'judg', 'damag', 'encourag',
  'experienc', 'forc', 'balanc', 'handl', 'doubl', 'rescu', 'argu', 'issu', 'valu',
  'stat', 'rat', 'dat', 'hat', 'nam', 'caus', 'sav', 'smil', 'rais', 'declin',
])

function deriveRegularVerbBase(word) {
  if (!word.endsWith('ed') || word.length < 4) return ''
  if (word.endsWith('ied') && word.length > 4) return `${word.slice(0, -3)}y`
  const stem = word.slice(0, -2)
  if (REGULAR_E_VERB_STEMS.has(stem)) return `${stem}e`
  const last = stem[stem.length - 1]
  const prev = stem[stem.length - 2]
  if (last === prev && !'aeioulsfz'.includes(last) && stem !== 'add') return stem.slice(0, -1)
  if ('vui'.includes(last)) return `${stem}e`
  return stem
}

function buildRegularPastForm(base) {
  if (base.endsWith('e')) return `${base}d`
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ied`
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(base) && base.length <= 4) return `${base}${base[base.length - 1]}ed`
  return `${base}ed`
}

function getVerbForms(word, detail) {
  const normalized = cleanWord(word)
  if (!normalized) return null
  const isDictionaryVerb = (detail?.meanings || []).some((item) => item.partOfSpeech === 'verb')

  const irregularBase = IRREGULAR_BASE_LOOKUP.get(normalized)
  if (irregularBase) {
    const [past, participle] = IRREGULAR_VERB_FORMS[irregularBase]
    return { base: irregularBase, past, participle, matchedForm: normalized }
  }

  if (normalized.endsWith('ed')) {
    const base = deriveRegularVerbBase(normalized)
    if (base && (isDictionaryVerb || base.length >= 3)) {
      return { base, past: normalized, participle: normalized, matchedForm: normalized }
    }
  }

  if (isDictionaryVerb) {
    const past = buildRegularPastForm(normalized)
    return { base: normalized, past, participle: past, matchedForm: normalized }
  }

  return null
}

function getOrdinaryVerbLookupWord(value = '') {
  const firstWord = String(value).split(/\s+/).find((word) => /[A-Za-z]/.test(word)) || value
  return cleanWord(firstWord)
}

function getUniqueOrdinaryVerbs(words = [], excludedWords = []) {
  const seen = new Set(
    excludedWords
      .map((word) => getOrdinaryVerbLookupWord(word))
      .filter(Boolean),
  )

  return (words || []).filter((word) => {
    const key = getOrdinaryVerbLookupWord(word)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isLikelyProperNoun(part = '') {
  const rawWord = part.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')
  return /^[A-Z][a-z]+/.test(rawWord) || /^[A-Z]{2,}$/.test(rawWord)
}

function getAccentPhonetic(detail, accent) {
  const phonetics = detail?.phonetics || []
  const accentNeedle = accent === 'uk' ? '-uk' : '-us'
  return phonetics.find((item) => item.audio?.toLowerCase().includes(accentNeedle))
    || phonetics.find((item) => item.text || item.audio)
    || {}
}

function playSpeech(text, { lang = 'en-US', rate = 1, onEnd } = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = 1
  utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

function mergeNewsArticles(baseArticles = [], incomingArticles = []) {
  const articleMap = new Map()
  for (const article of [...baseArticles, ...incomingArticles]) {
    if (article?.id) articleMap.set(article.id, article)
  }
  return [...articleMap.values()].sort((a, b) => (
    (b.date || '').localeCompare(a.date || '') || (a.section || '').localeCompare(b.section || '')
  ))
}

function getNewsLevelNumber(difficulty = '') {
  const match = String(difficulty).match(/\d+/)
  return match ? match[0] : 'M'
}

function getNewsLevelLabel(difficulty = '') {
  const level = Number(getNewsLevelNumber(difficulty))
  if (!Number.isFinite(level)) return 'Mixed'
  if (level <= 5) return 'Beginner'
  if (level <= 7) return 'Intermediate'
  return 'Advanced'
}

function formatNewsDateLabel(articleOrDate = '') {
  const dateValue = typeof articleOrDate === 'object' && articleOrDate !== null
    ? articleOrDate.publishedAt || articleOrDate.published_at || articleOrDate.date
    : articleOrDate
  if (!dateValue) return 'Recent'
  const parsedDate = new Date(String(dateValue).includes('T') ? dateValue : `${dateValue}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime())) return String(dateValue)
  const diffDays = Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / 86400000))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  return String(dateValue).slice(0, 10)
}

function isRecentNewsArticle(articleOrDate = '', recentDays = 3) {
  const dateValue = typeof articleOrDate === 'object' && articleOrDate !== null
    ? articleOrDate.publishedAt || articleOrDate.published_at || articleOrDate.date
    : articleOrDate
  if (!dateValue) return false
  const parsedDate = new Date(String(dateValue).includes('T') ? dateValue : `${dateValue}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime())) return false
  const diffDays = Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / 86400000))
  return diffDays < recentDays
}

function normalizeCelpipVocabSearch(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3131-\u318e\uac00-\ud7a3\u4e00-\u9fff\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getCelpipTopicMap() {
  return new Map(CELPIP_VOCAB_TOPICS.map((topic) => [topic.id, topic]))
}

function getPteTopicMap() {
  return new Map(PTE_VOCAB_TOPICS.map((topic) => [topic.id, topic]))
}

function getStudyTopicMeta(topicMap, topicId) {
  if (!topicId || !topicMap) return null
  if (topicMap instanceof Map) {
    return topicMap.get(topicId) || null
  }
  if (Array.isArray(topicMap)) {
    return topicMap.find((topic) => topic?.id === topicId) || null
  }
  if (typeof topicMap === 'object') {
    return topicMap[topicId] || null
  }
  return null
}

function getCelpipImportanceTone(importance = 3) {
  if (importance >= 5) return 'essential'
  if (importance >= 4) return 'high'
  return 'useful'
}

function getCelpipCardMeaning(entry, lang) {
  if (lang === 'en') return entry?.meaning?.en || ''
  return entry?.meaning?.[lang] || entry?.meaning?.ko || entry?.meaning?.en || ''
}

function playVocabularyWord(word, accent = 'us') {
  playSpeech(word, { lang: accent === 'uk' ? 'en-GB' : 'en-US', rate: 1 })
}

function formatStudyTopicLabel(topicId) {
  return String(topicId || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function CelpipVocabularyWordModal({
  entry,
  lang,
  onClose,
  onToggleFavorite,
  isFavorite,
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  if (!entry || typeof document === 'undefined') return null
  const detailMeaning = getCelpipCardMeaning(entry, lang)
  const importanceLabel = CELPIP_VOCAB_IMPORTANCE_LABELS[entry.importance] || 'Useful'

  return createPortal(
    <div className="study-celpip-modal" role="presentation" onClick={onClose}>
      <div className="study-celpip-modal__card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="study-celpip-modal__header">
          <div>
            <span className={`study-celpip-importance study-celpip-importance--${getCelpipImportanceTone(entry.importance)}`}>
              {importanceLabel}
            </span>
            <h2>{entry.word}</h2>
            <p>{detailMeaning}</p>
          </div>
          <div className="study-celpip-modal__actions">
            <button type="button" className={`study-celpip-fav ${isFavorite ? 'study-celpip-fav--active' : ''}`} onClick={() => onToggleFavorite(entry)} aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}>
              <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_outline'}</span>
            </button>
            <button type="button" className="study-celpip-fav" onClick={onClose} aria-label="Close vocabulary detail">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        <section className="study-celpip-modal__meta">
          <div>
            <strong>US</strong>
            <span>{entry.usIpa}</span>
            <button type="button" onClick={() => playVocabularyWord(entry.word, 'us')}>Play</button>
          </div>
          <div>
            <strong>UK</strong>
            <span>{entry.ukIpa}</span>
            <button type="button" onClick={() => playVocabularyWord(entry.word, 'uk')}>Play</button>
          </div>
        </section>

        <section className="study-celpip-modal__section">
          <h3>English definition</h3>
          <p>{entry.meaning.en}</p>
        </section>

        <section className="study-celpip-modal__section">
          <h3>CELPIP tip</h3>
          <p>{entry.note?.[lang] || entry.note?.ko || entry.note?.en}</p>
        </section>

        {entry.collocations?.length ? (
          <section className="study-celpip-modal__section">
            <h3>Common collocations</h3>
            <div className="study-celpip-collocations">
              {entry.collocations.map((item) => (
                <span key={`${entry.id}-${item}`}>{item}</span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="study-celpip-modal__section">
          <h3>Example</h3>
          {(entry.examples || []).map((example, index) => (
            <article key={`${entry.id}-example-${index}`} className="study-celpip-example">
              <strong>{example.en}</strong>
              {lang !== 'en' ? <small>{example?.[lang] || example?.ko || example.en}</small> : null}
            </article>
          ))}
        </section>
      </div>
    </div>,
    document.body,
  )
}

function CelpipVocabularyPanel() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const tokens = useAuthStore((state) => state.tokens)
  const accountKey = user?.id || user?.email || 'guest'
  const canSyncFavorites = Boolean(isAuthenticated && tokens?.access_token)
  const initialPrefs = readJsonStorage(CELPIP_VOCAB_PREF_STORAGE_KEY, accountKey, {
    translationLang: 'ko',
    selectedTopic: 'all',
    sortMode: 'importance',
    search: '',
    favoritesOnly: false,
  })
  const [translationLang, setTranslationLang] = useState(initialPrefs.translationLang || 'ko')
  const [selectedTopic, setSelectedTopic] = useState(initialPrefs.selectedTopic || 'all')
  const [sortMode, setSortMode] = useState(initialPrefs.sortMode || 'importance')
  const [search, setSearch] = useState(initialPrefs.search || '')
  const [favoritesOnly, setFavoritesOnly] = useState(initialPrefs.favoritesOnly === true)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [favoriteSyncReady, setFavoriteSyncReady] = useState(false)
  const [hiddenIds, setHiddenIds] = useState([])
  const [showHidden, setShowHidden] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [visibleCount, setVisibleCount] = useState(CELPIP_VOCAB_BATCH_SIZE)
  const loadMoreRef = useRef(null)

  useEffect(() => {
    setHiddenIds(readJsonStorage(CELPIP_VOCAB_HIDDEN_STORAGE_KEY, accountKey, []))
  }, [accountKey])

  useEffect(() => {
    let cancelled = false

    async function loadFavoriteIds() {
      if (!canSyncFavorites) {
        setFavoriteIds([])
        setFavoriteSyncReady(false)
        return
      }

      setFavoriteSyncReady(false)
      try {
        const response = await apiGet('/api/study-lab/state/celpipVocabularyFavorites', {}, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        if (cancelled) return
        const serverFavoriteIds = Array.isArray(response.data?.value) ? response.data.value : []
        setFavoriteIds(serverFavoriteIds)
        setFavoriteSyncReady(true)
      } catch {
        if (cancelled) return
        setFavoriteIds([])
        setFavoriteSyncReady(false)
      }
    }

    loadFavoriteIds()
    return () => {
      cancelled = true
    }
  }, [accountKey, canSyncFavorites, tokens?.access_token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(CELPIP_VOCAB_PREF_STORAGE_KEY, accountKey), JSON.stringify({
      translationLang,
      selectedTopic,
      sortMode,
      search,
      favoritesOnly,
    }))
  }, [accountKey, favoritesOnly, search, selectedTopic, sortMode, translationLang])

  useEffect(() => {
    if (typeof window === 'undefined' || !canSyncFavorites) return
    if (!favoriteSyncReady) return
    const syncTimeout = window.setTimeout(() => {
      apiPut('/api/study-lab/state/celpipVocabularyFavorites', { value: favoriteIds }, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).catch(() => {})
    }, 300)
    return () => window.clearTimeout(syncTimeout)
  }, [accountKey, canSyncFavorites, favoriteIds, favoriteSyncReady, tokens?.access_token])

  useEffect(() => {
    if (!canSyncFavorites && favoritesOnly) {
      setFavoritesOnly(false)
    }
  }, [canSyncFavorites, favoritesOnly])

  const topicMap = useMemo(() => getCelpipTopicMap(), [])

  const topicOptions = useMemo(() => {
    const discovered = new Map(getCelpipTopicMap())
    CELPIP_VOCABULARY.forEach((entry) => {
      ;(entry.topics || []).forEach((topicId) => {
        if (!topicId || discovered.has(topicId)) return
        discovered.set(topicId, {
            id: topicId,
            label: formatStudyTopicLabel(topicId),
            shortLabel: formatStudyTopicLabel(topicId),
            emoji: '📘',
            tone: 'CELPIP high-frequency theme',
        })
      })
    })
    return [
      { id: 'all', label: 'All topics', shortLabel: 'All', emoji: '✨', tone: 'Browse every theme' },
      ...Array.from(discovered.values()),
    ]
  }, [])

  const filteredEntries = useMemo(() => {
    const searchValue = normalizeCelpipVocabSearch(search)
    let items = [...CELPIP_VOCABULARY]

    if (selectedTopic !== 'all') {
      items = items.filter((entry) => (entry.topics || []).includes(selectedTopic))
    }

    if (favoritesOnly) {
      items = items.filter((entry) => favoriteIds.includes(entry.id))
    }

    if (!showHidden) {
      items = items.filter((entry) => !hiddenIds.includes(entry.id))
    }

    if (searchValue) {
      items = items.filter((entry) => {
        const topicText = (entry.topics || [])
          .map((topicId) => getStudyTopicMeta(topicMap, topicId)?.label || formatStudyTopicLabel(topicId))
          .join(' ')
        const haystack = normalizeCelpipVocabSearch([
          entry.word,
          entry.usIpa,
          entry.ukIpa,
          entry.meaning?.en,
          entry.meaning?.ko,
          entry.meaning?.zh,
          entry.note?.en,
          entry.note?.ko,
          entry.note?.zh,
          topicText,
          ...(entry.collocations || []),
          ...((entry.examples || []).flatMap((item) => [item.en, item.ko, item.zh])),
        ].join(' '))
        return haystack.includes(searchValue)
      })
    }

    if (sortMode === 'az') {
      items.sort((a, b) => a.word.localeCompare(b.word))
    } else if (sortMode === 'za') {
      items.sort((a, b) => b.word.localeCompare(a.word))
    } else if (sortMode === 'topic') {
      items.sort((a, b) => {
        const aTopic = getStudyTopicMeta(topicMap, a.topics?.[0])?.label || formatStudyTopicLabel(a.topics?.[0])
        const bTopic = getStudyTopicMeta(topicMap, b.topics?.[0])?.label || formatStudyTopicLabel(b.topics?.[0])
        if (aTopic === bTopic) return a.word.localeCompare(b.word)
        return aTopic.localeCompare(bTopic)
      })
    } else {
      items.sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance
        return a.word.localeCompare(b.word)
      })
    }

    return items
  }, [favoriteIds, favoritesOnly, hiddenIds, showHidden, search, selectedTopic, sortMode, topicMap])

  useEffect(() => {
    setVisibleCount(CELPIP_VOCAB_BATCH_SIZE)
  }, [favoritesOnly, showHidden, search, selectedTopic, sortMode])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    if (visibleCount >= filteredEntries.length) return undefined
    const node = loadMoreRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((current) => Math.min(current + CELPIP_VOCAB_BATCH_SIZE, filteredEntries.length))
      }
    }, { rootMargin: '220px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [filteredEntries.length, visibleCount])

  const visibleEntries = useMemo(() => filteredEntries.slice(0, visibleCount), [filteredEntries, visibleCount])
  const favoriteCount = favoriteIds.length
  const hiddenCount = hiddenIds.length

  function toggleFavorite(entry) {
    if (!canSyncFavorites) return
    setFavoriteIds((current) => (
      current.includes(entry.id)
        ? current.filter((id) => id !== entry.id)
        : [...current, entry.id]
    ))
  }

  function toggleHidden(entry) {
    setHiddenIds((current) => {
      const next = current.includes(entry.id)
        ? current.filter((id) => id !== entry.id)
        : [...current, entry.id]
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getAccountStorageKey(CELPIP_VOCAB_HIDDEN_STORAGE_KEY, accountKey), JSON.stringify(next))
      }
      return next
    })
  }

  return (
    <section className="study-celpip">
      <div className="study-celpip-hero">
        <div>
          <span className="study-news-source">Source: curated CELPIP high-frequency themes</span>
          <h2>Build the vocabulary that appears again and again in CELPIP tasks.</h2>
          <p>Focus by topic, mark favorites, and open each word for pronunciation, examples, and exam-use notes.</p>
        </div>
        <div className="study-celpip-hero__stats">
          <div>
            <strong>{CELPIP_VOCABULARY.length}</strong>
            <span>Total words</span>
          </div>
          <button
            type="button"
            className={`study-phrasal-stat-button ${favoritesOnly ? 'study-phrasal-stat-button--active' : ''}`}
            onClick={() => canSyncFavorites && setFavoritesOnly((current) => !current)}
            disabled={!canSyncFavorites}
            title={canSyncFavorites ? 'Show favorite words only' : 'Log in to save CELPIP favorites'}
          >
            <strong>{favoriteCount}</strong>
            <span>Saved</span>
          </button>
          <div>
            <strong>{filteredEntries.length}</strong>
            <span>Showing</span>
          </div>
        </div>
      </div>

      {!canSyncFavorites ? (
        <div className="study-news-state">
          <strong>Log in to save CELPIP favorite words.</strong>
          <span>You can browse the full vocabulary library now, and your favorites will unlock after sign-in.</span>
        </div>
      ) : null}

      <div className="study-celpip-controls">
        <label className="study-celpip-search-field">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Word, meaning, collocation, topic..."
          />
        </label>
        <label>
          Topic
          <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)}>
            {topicOptions.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.label}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="importance">Most important first</option>
            <option value="az">A to Z</option>
            <option value="za">Z to A</option>
            <option value="topic">Group by topic</option>
          </select>
        </label>
        <div className="study-phrasal-lang study-celpip-lang">
          <button type="button" className={`study-filter-chip ${translationLang === 'en' ? 'study-filter-chip--active' : ''}`} onClick={() => setTranslationLang('en')}>EN</button>
          <button type="button" className={`study-filter-chip ${translationLang === 'ko' ? 'study-filter-chip--active' : ''}`} onClick={() => setTranslationLang('ko')}>한국어</button>
          <button type="button" className={`study-filter-chip ${translationLang === 'zh' ? 'study-filter-chip--active' : ''}`} onClick={() => setTranslationLang('zh')}>中文</button>
        </div>
      </div>

      <div className="study-celpip-topic-strip">
        {topicOptions.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className={`study-celpip-topic ${selectedTopic === topic.id ? 'study-celpip-topic--active' : ''}`}
            onClick={() => setSelectedTopic(topic.id)}
          >
            <span>{topic.emoji}</span>
            {topic.shortLabel || topic.label}
          </button>
        ))}
      </div>

      <div className="study-celpip-section-title">
        <div className="study-celpip-section-heading">
          <span>{topicOptions.find((topic) => topic.id === selectedTopic)?.emoji || '📘'}</span>
          <div>
            <h3>{topicOptions.find((topic) => topic.id === selectedTopic)?.label || 'CELPIP Vocabulary'}</h3>
            <p>{favoritesOnly ? 'Favorites only' : 'High-frequency words grouped for practical CELPIP study'}</p>
          </div>
        </div>
        <div className="study-celpip-section-tools">
          <button
            type="button"
            className={`study-celpip-hidden-toggle ${showHidden ? 'study-celpip-hidden-toggle--active' : ''}`}
            onClick={() => setShowHidden((current) => !current)}
            disabled={!showHidden && hiddenCount === 0}
            title={showHidden ? 'Hide the words you marked as easy' : 'Include hidden words so they can be browsed and searched'}
          >
            <span className="material-symbols-outlined">{showHidden ? 'visibility_off' : 'visibility'}</span>
            {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}
          </button>
          <div className="study-celpip-result-count">{filteredEntries.length} results</div>
        </div>
      </div>

      {visibleEntries.length ? (
        <div className="study-celpip-grid">
          {visibleEntries.map((entry) => {
            const importanceLabel = CELPIP_VOCAB_IMPORTANCE_LABELS[entry.importance] || 'Useful'
            const importanceTone = getCelpipImportanceTone(entry.importance)
            const isFavorite = favoriteIds.includes(entry.id)
            const isHidden = hiddenIds.includes(entry.id)
            return (
              <article key={entry.id} className={`study-celpip-card ${isHidden ? 'study-celpip-card--hidden' : ''}`}>
                <header>
                  <div className="study-celpip-badges">
                    {(entry.topics || []).slice(0, 2).map((topicId) => {
                      const topic = getStudyTopicMeta(topicMap, topicId)
                      return (
                        <span key={`${entry.id}-${topicId}`} className="study-celpip-topic-badge">
                          {topic?.emoji || '📘'} {topic?.shortLabel || formatStudyTopicLabel(topicId)}
                        </span>
                      )
                    })}
                  </div>
                  <div className="study-celpip-card-actions">
                    <button
                      type="button"
                      className={`study-celpip-fav ${isFavorite ? 'study-celpip-fav--active' : ''}`}
                      onClick={() => toggleFavorite(entry)}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_outline'}</span>
                    </button>
                    <button
                      type="button"
                      className={`study-celpip-fav ${isHidden ? 'study-celpip-fav--hidden-active' : ''}`}
                      onClick={() => toggleHidden(entry)}
                      aria-label={isHidden ? 'Unhide this word' : 'Hide this word'}
                      title={isHidden ? 'Unhide this word' : 'Hide this word (too easy)'}
                    >
                      <span className="material-symbols-outlined">{isHidden ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </header>

                <div className="study-celpip-card__main">
                  <button type="button" className="study-celpip-title-button" onClick={() => setSelectedEntry(entry)}>
                    <h3>
                      {entry.word}
                      <span
                        className={`study-celpip-importance-dot study-celpip-importance-dot--${importanceTone}`}
                        title={importanceLabel}
                        aria-label={importanceLabel}
                      />
                    </h3>
                  </button>
                  <p className="study-celpip-meaning">{getCelpipCardMeaning(entry, translationLang)}</p>
                </div>

                <div className="study-celpip-pron">
                  <span className="study-celpip-pron-item">
                    <strong>US</strong> {entry.usIpa}
                    <button type="button" className="study-celpip-pron-sound" onClick={() => playVocabularyWord(entry.word, 'us')} aria-label={`Play ${entry.word} in American English`}>
                      <span className="material-symbols-outlined">volume_up</span>
                    </button>
                  </span>
                  <span className="study-celpip-pron-item">
                    <strong>UK</strong> {entry.ukIpa}
                    <button type="button" className="study-celpip-pron-sound" onClick={() => playVocabularyWord(entry.word, 'uk')} aria-label={`Play ${entry.word} in British English`}>
                      <span className="material-symbols-outlined">volume_up</span>
                    </button>
                  </span>
                </div>

                <div className="study-celpip-note">
                  <strong>Exam use</strong>
                  <p>{entry.note?.[translationLang] || entry.note?.ko || entry.note?.en}</p>
                </div>

                {entry.collocations?.length ? (
                  <div className="study-celpip-collocations">
                    {entry.collocations.slice(0, 3).map((item) => (
                      <span key={`${entry.id}-${item}`}>{item}</span>
                    ))}
                  </div>
                ) : null}

                {(entry.examples || []).slice(0, 1).map((example, index) => (
                  <article key={`${entry.id}-${index}`} className="study-celpip-example-preview">
                    <strong>{example.en}</strong>
                    {translationLang !== 'en' ? <small>{example?.[translationLang] || example?.ko || example.en}</small> : null}
                  </article>
                ))}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="study-news-state">
          <strong>No CELPIP vocabulary matched this filter yet.</strong>
          <span>Try another topic, remove favorites-only, or search with a broader word.</span>
        </div>
      )}

      {visibleCount < filteredEntries.length ? (
        <div ref={loadMoreRef} className="study-phrasal-load-more">
          <span>Loading more words...</span>
        </div>
      ) : null}

      {selectedEntry ? (
        <CelpipVocabularyWordModal
          entry={selectedEntry}
          lang={translationLang}
          onClose={() => setSelectedEntry(null)}
          onToggleFavorite={toggleFavorite}
          isFavorite={favoriteIds.includes(selectedEntry.id)}
        />
      ) : null}
    </section>
  )
}

function PteVocabularyWordModal({
  entry,
  lang,
  onClose,
  onToggleFavorite,
  isFavorite,
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  if (!entry || typeof document === 'undefined') return null
  const detailMeaning = getCelpipCardMeaning(entry, lang)
  const importanceLabel = PTE_VOCAB_IMPORTANCE_LABELS[entry.importance] || 'Useful'

  return createPortal(
    <div className="study-celpip-modal" role="presentation" onClick={onClose}>
      <div className="study-celpip-modal__card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="study-celpip-modal__header">
          <div>
            <span className={`study-celpip-importance study-celpip-importance--${getCelpipImportanceTone(entry.importance)}`}>
              {importanceLabel}
            </span>
            <h2>{entry.word}</h2>
            <p>{detailMeaning}</p>
          </div>
          <div className="study-celpip-modal__actions">
            <button type="button" className={`study-celpip-fav ${isFavorite ? 'study-celpip-fav--active' : ''}`} onClick={() => onToggleFavorite(entry)} aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}>
              <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_outline'}</span>
            </button>
            <button type="button" className="study-celpip-fav" onClick={onClose} aria-label="Close vocabulary detail">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        <section className="study-celpip-modal__meta">
          <div>
            <strong>US</strong>
            <span>{entry.usIpa}</span>
            <button type="button" onClick={() => playVocabularyWord(entry.word, 'us')}>Play</button>
          </div>
          <div>
            <strong>UK</strong>
            <span>{entry.ukIpa}</span>
            <button type="button" onClick={() => playVocabularyWord(entry.word, 'uk')}>Play</button>
          </div>
        </section>

        <section className="study-celpip-modal__section">
          <h3>English definition</h3>
          <p>{entry.meaning.en}</p>
        </section>

        <section className="study-celpip-modal__section">
          <h3>PTE tip</h3>
          <p>{entry.note?.[lang] || entry.note?.ko || entry.note?.en}</p>
        </section>

        {entry.collocations?.length ? (
          <section className="study-celpip-modal__section">
            <h3>Common collocations</h3>
            <div className="study-celpip-collocations">
              {entry.collocations.map((item) => (
                <span key={`${entry.id}-${item}`}>{item}</span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="study-celpip-modal__section">
          <h3>Example</h3>
          {(entry.examples || []).map((example, index) => (
            <article key={`${entry.id}-example-${index}`} className="study-celpip-example">
              <strong>{example.en}</strong>
              {lang !== 'en' ? <small>{example?.[lang] || example?.ko || example.en}</small> : null}
            </article>
          ))}
        </section>
      </div>
    </div>,
    document.body,
  )
}

function PteVocabularyPanel() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const tokens = useAuthStore((state) => state.tokens)
  const accountKey = user?.id || user?.email || 'guest'
  const canSyncFavorites = Boolean(isAuthenticated && tokens?.access_token)
  const initialPrefs = readJsonStorage(PTE_VOCAB_PREF_STORAGE_KEY, accountKey, {
    translationLang: 'ko',
    selectedTopic: 'all',
    sortMode: 'importance',
    search: '',
    favoritesOnly: false,
  })
  const [translationLang, setTranslationLang] = useState(initialPrefs.translationLang || 'ko')
  const [selectedTopic, setSelectedTopic] = useState(initialPrefs.selectedTopic || 'all')
  const [sortMode, setSortMode] = useState(initialPrefs.sortMode || 'importance')
  const [search, setSearch] = useState(initialPrefs.search || '')
  const [favoritesOnly, setFavoritesOnly] = useState(initialPrefs.favoritesOnly === true)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [favoriteSyncReady, setFavoriteSyncReady] = useState(false)
  const [hiddenIds, setHiddenIds] = useState([])
  const [showHidden, setShowHidden] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PTE_VOCAB_BATCH_SIZE)
  const loadMoreRef = useRef(null)

  useEffect(() => {
    setHiddenIds(readJsonStorage(PTE_VOCAB_HIDDEN_STORAGE_KEY, accountKey, []))
  }, [accountKey])

  useEffect(() => {
    let cancelled = false

    async function loadFavoriteIds() {
      if (!canSyncFavorites) {
        setFavoriteIds([])
        setFavoriteSyncReady(false)
        return
      }

      setFavoriteSyncReady(false)
      try {
        const response = await apiGet('/api/study-lab/state/pteVocabularyFavorites', {}, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        if (cancelled) return
        const serverFavoriteIds = Array.isArray(response.data?.value) ? response.data.value : []
        setFavoriteIds(serverFavoriteIds)
        setFavoriteSyncReady(true)
      } catch {
        if (cancelled) return
        setFavoriteIds([])
        setFavoriteSyncReady(false)
      }
    }

    loadFavoriteIds()
    return () => {
      cancelled = true
    }
  }, [canSyncFavorites, tokens?.access_token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(PTE_VOCAB_PREF_STORAGE_KEY, accountKey), JSON.stringify({
      translationLang,
      selectedTopic,
      sortMode,
      search,
      favoritesOnly,
    }))
  }, [accountKey, favoritesOnly, search, selectedTopic, sortMode, translationLang])

  useEffect(() => {
    if (typeof window === 'undefined' || !canSyncFavorites) return
    if (!favoriteSyncReady) return
    const syncTimeout = window.setTimeout(() => {
      apiPut('/api/study-lab/state/pteVocabularyFavorites', { value: favoriteIds }, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).catch(() => {})
    }, 300)
    return () => window.clearTimeout(syncTimeout)
  }, [canSyncFavorites, favoriteIds, favoriteSyncReady, tokens?.access_token])

  useEffect(() => {
    if (!canSyncFavorites && favoritesOnly) {
      setFavoritesOnly(false)
    }
  }, [canSyncFavorites, favoritesOnly])

  const topicMap = useMemo(() => getPteTopicMap(), [])

  const topicOptions = useMemo(() => {
    const discovered = new Map(getPteTopicMap())
    PTE_VOCABULARY.forEach((entry) => {
      ;(entry.topics || []).forEach((topicId) => {
        if (!topicId || discovered.has(topicId)) return
        discovered.set(topicId, {
            id: topicId,
            label: formatStudyTopicLabel(topicId),
            shortLabel: formatStudyTopicLabel(topicId),
            emoji: '📘',
            tone: 'PTE high-frequency theme',
        })
      })
    })
    return [
      { id: 'all', label: 'All topics', shortLabel: 'All', emoji: '✨', tone: 'Browse every theme' },
      ...Array.from(discovered.values()),
    ]
  }, [])

  const filteredEntries = useMemo(() => {
    const searchValue = normalizeCelpipVocabSearch(search)
    let items = [...PTE_VOCABULARY]

    if (selectedTopic !== 'all') {
      items = items.filter((entry) => (entry.topics || []).includes(selectedTopic))
    }

    if (favoritesOnly) {
      items = items.filter((entry) => favoriteIds.includes(entry.id))
    }

    if (!showHidden) {
      items = items.filter((entry) => !hiddenIds.includes(entry.id))
    }

    if (searchValue) {
      items = items.filter((entry) => {
        const topicText = (entry.topics || [])
          .map((topicId) => getStudyTopicMeta(topicMap, topicId)?.label || formatStudyTopicLabel(topicId))
          .join(' ')
        const haystack = normalizeCelpipVocabSearch([
          entry.word,
          entry.usIpa,
          entry.ukIpa,
          entry.meaning?.en,
          entry.meaning?.ko,
          entry.meaning?.zh,
          entry.note?.en,
          entry.note?.ko,
          entry.note?.zh,
          topicText,
          ...(entry.collocations || []),
          ...((entry.examples || []).flatMap((item) => [item.en, item.ko, item.zh])),
        ].join(' '))
        return haystack.includes(searchValue)
      })
    }

    if (sortMode === 'az') {
      items.sort((a, b) => a.word.localeCompare(b.word))
    } else if (sortMode === 'za') {
      items.sort((a, b) => b.word.localeCompare(a.word))
    } else if (sortMode === 'topic') {
      items.sort((a, b) => {
        const aTopic = getStudyTopicMeta(topicMap, a.topics?.[0])?.label || formatStudyTopicLabel(a.topics?.[0])
        const bTopic = getStudyTopicMeta(topicMap, b.topics?.[0])?.label || formatStudyTopicLabel(b.topics?.[0])
        if (aTopic === bTopic) return a.word.localeCompare(b.word)
        return aTopic.localeCompare(bTopic)
      })
    } else {
      items.sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance
        return a.word.localeCompare(b.word)
      })
    }

    return items
  }, [favoriteIds, favoritesOnly, hiddenIds, showHidden, search, selectedTopic, sortMode, topicMap])

  useEffect(() => {
    setVisibleCount(PTE_VOCAB_BATCH_SIZE)
  }, [favoritesOnly, showHidden, search, selectedTopic, sortMode])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    if (visibleCount >= filteredEntries.length) return undefined
    const node = loadMoreRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((current) => Math.min(current + PTE_VOCAB_BATCH_SIZE, filteredEntries.length))
      }
    }, { rootMargin: '220px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [filteredEntries.length, visibleCount])

  const visibleEntries = useMemo(() => filteredEntries.slice(0, visibleCount), [filteredEntries, visibleCount])
  const favoriteCount = favoriteIds.length
  const hiddenCount = hiddenIds.length

  function toggleFavorite(entry) {
    if (!canSyncFavorites) return
    setFavoriteIds((current) => (
      current.includes(entry.id)
        ? current.filter((id) => id !== entry.id)
        : [...current, entry.id]
    ))
  }

  function toggleHidden(entry) {
    setHiddenIds((current) => {
      const next = current.includes(entry.id)
        ? current.filter((id) => id !== entry.id)
        : [...current, entry.id]
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getAccountStorageKey(PTE_VOCAB_HIDDEN_STORAGE_KEY, accountKey), JSON.stringify(next))
      }
      return next
    })
  }

  return (
    <section className="study-celpip">
      <div className="study-celpip-hero">
        <div>
          <span className="study-news-source">Source: curated PTE high-frequency themes</span>
          <h2>Build the vocabulary that repeats across PTE speaking, reading, writing, and listening tasks.</h2>
          <p>Focus by exam situation, mark favorites after sign-in, and open each word for pronunciation, examples, and PTE-use notes.</p>
        </div>
        <div className="study-celpip-hero__stats">
          <div>
            <strong>{PTE_VOCABULARY.length}</strong>
            <span>Total words</span>
          </div>
          <button
            type="button"
            className={`study-phrasal-stat-button ${favoritesOnly ? 'study-phrasal-stat-button--active' : ''}`}
            onClick={() => canSyncFavorites && setFavoritesOnly((current) => !current)}
            disabled={!canSyncFavorites}
            title={canSyncFavorites ? 'Show favorite words only' : 'Log in to save PTE favorites'}
          >
            <strong>{favoriteCount}</strong>
            <span>Saved</span>
          </button>
          <div>
            <strong>{filteredEntries.length}</strong>
            <span>Showing</span>
          </div>
        </div>
      </div>

      {!canSyncFavorites ? (
        <div className="study-news-state">
          <strong>Log in to save PTE favorite words.</strong>
          <span>You can browse the full vocabulary library now, and your favorites will unlock after sign-in.</span>
        </div>
      ) : null}

      <div className="study-celpip-controls">
        <label className="study-celpip-search-field">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Word, meaning, collocation, topic..."
          />
        </label>
        <label>
          Topic
          <select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)}>
            {topicOptions.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.label}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="importance">Most important first</option>
            <option value="az">A to Z</option>
            <option value="za">Z to A</option>
            <option value="topic">Group by topic</option>
          </select>
        </label>
        <div className="study-phrasal-lang study-celpip-lang">
          <button type="button" className={`study-filter-chip ${translationLang === 'en' ? 'study-filter-chip--active' : ''}`} onClick={() => setTranslationLang('en')}>EN</button>
          <button type="button" className={`study-filter-chip ${translationLang === 'ko' ? 'study-filter-chip--active' : ''}`} onClick={() => setTranslationLang('ko')}>한국어</button>
          <button type="button" className={`study-filter-chip ${translationLang === 'zh' ? 'study-filter-chip--active' : ''}`} onClick={() => setTranslationLang('zh')}>中文</button>
        </div>
      </div>

      <div className="study-celpip-topic-strip">
        {topicOptions.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className={`study-celpip-topic ${selectedTopic === topic.id ? 'study-celpip-topic--active' : ''}`}
            onClick={() => setSelectedTopic(topic.id)}
          >
            <span>{topic.emoji}</span>
            {topic.shortLabel || topic.label}
          </button>
        ))}
      </div>

      <div className="study-celpip-section-title">
        <div className="study-celpip-section-heading">
          <span>{topicOptions.find((topic) => topic.id === selectedTopic)?.emoji || '📘'}</span>
          <div>
            <h3>{topicOptions.find((topic) => topic.id === selectedTopic)?.label || 'PTE Vocabulary'}</h3>
            <p>{favoritesOnly ? 'Favorites only' : 'High-frequency words grouped for practical PTE study'}</p>
          </div>
        </div>
        <div className="study-celpip-section-tools">
          <button
            type="button"
            className={`study-celpip-hidden-toggle ${showHidden ? 'study-celpip-hidden-toggle--active' : ''}`}
            onClick={() => setShowHidden((current) => !current)}
            disabled={!showHidden && hiddenCount === 0}
            title={showHidden ? 'Hide the words you marked as easy' : 'Include hidden words so they can be browsed and searched'}
          >
            <span className="material-symbols-outlined">{showHidden ? 'visibility_off' : 'visibility'}</span>
            {showHidden ? 'Hide hidden' : `Show hidden (${hiddenCount})`}
          </button>
          <div className="study-celpip-result-count">{filteredEntries.length} results</div>
        </div>
      </div>

      {visibleEntries.length ? (
        <div className="study-celpip-grid">
          {visibleEntries.map((entry) => {
            const importanceLabel = PTE_VOCAB_IMPORTANCE_LABELS[entry.importance] || 'Useful'
            const importanceTone = getCelpipImportanceTone(entry.importance)
            const isFavorite = favoriteIds.includes(entry.id)
            const isHidden = hiddenIds.includes(entry.id)
            return (
              <article key={entry.id} className={`study-celpip-card ${isHidden ? 'study-celpip-card--hidden' : ''}`}>
                <header>
                  <div className="study-celpip-badges">
                    {(entry.topics || []).slice(0, 2).map((topicId) => {
                      const topic = getStudyTopicMeta(topicMap, topicId)
                      return (
                        <span key={`${entry.id}-${topicId}`} className="study-celpip-topic-badge">
                          {topic?.emoji || '📘'} {topic?.shortLabel || formatStudyTopicLabel(topicId)}
                        </span>
                      )
                    })}
                  </div>
                  <div className="study-celpip-card-actions">
                    <button
                      type="button"
                      className={`study-celpip-fav ${isFavorite ? 'study-celpip-fav--active' : ''}`}
                      onClick={() => toggleFavorite(entry)}
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                      disabled={!canSyncFavorites}
                      title={canSyncFavorites ? (isFavorite ? 'Remove favorite' : 'Add favorite') : 'Log in to save PTE favorites'}
                    >
                      <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_outline'}</span>
                    </button>
                    <button
                      type="button"
                      className={`study-celpip-fav ${isHidden ? 'study-celpip-fav--hidden-active' : ''}`}
                      onClick={() => toggleHidden(entry)}
                      aria-label={isHidden ? 'Unhide this word' : 'Hide this word'}
                      title={isHidden ? 'Unhide this word' : 'Hide this word (too easy)'}
                    >
                      <span className="material-symbols-outlined">{isHidden ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </header>

                <div className="study-celpip-card__main">
                  <button type="button" className="study-celpip-title-button" onClick={() => setSelectedEntry(entry)}>
                    <h3>
                      {entry.word}
                      <span
                        className={`study-celpip-importance-dot study-celpip-importance-dot--${importanceTone}`}
                        title={importanceLabel}
                        aria-label={importanceLabel}
                      />
                    </h3>
                  </button>
                  <p className="study-celpip-meaning">{getCelpipCardMeaning(entry, translationLang)}</p>
                </div>

                <div className="study-celpip-pron">
                  <span className="study-celpip-pron-item">
                    <strong>US</strong> {entry.usIpa}
                    <button type="button" className="study-celpip-pron-sound" onClick={() => playVocabularyWord(entry.word, 'us')} aria-label={`Play ${entry.word} in American English`}>
                      <span className="material-symbols-outlined">volume_up</span>
                    </button>
                  </span>
                  <span className="study-celpip-pron-item">
                    <strong>UK</strong> {entry.ukIpa}
                    <button type="button" className="study-celpip-pron-sound" onClick={() => playVocabularyWord(entry.word, 'uk')} aria-label={`Play ${entry.word} in British English`}>
                      <span className="material-symbols-outlined">volume_up</span>
                    </button>
                  </span>
                </div>

                <div className="study-celpip-note">
                  <strong>Exam use</strong>
                  <p>{entry.note?.[translationLang] || entry.note?.ko || entry.note?.en}</p>
                </div>

                {entry.collocations?.length ? (
                  <div className="study-celpip-collocations">
                    {entry.collocations.slice(0, 3).map((item) => (
                      <span key={`${entry.id}-${item}`}>{item}</span>
                    ))}
                  </div>
                ) : null}

                {(entry.examples || []).slice(0, 1).map((example, index) => (
                  <article key={`${entry.id}-${index}`} className="study-celpip-example-preview">
                    <strong>{example.en}</strong>
                    {translationLang !== 'en' ? <small>{example?.[translationLang] || example?.ko || example.en}</small> : null}
                  </article>
                ))}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="study-news-state">
          <strong>No PTE vocabulary matched this filter yet.</strong>
          <span>Try another topic, remove favorites-only, or search with a broader word.</span>
        </div>
      )}

      {visibleCount < filteredEntries.length ? (
        <div ref={loadMoreRef} className="study-phrasal-load-more">
          <span>Loading more words...</span>
        </div>
      ) : null}

      {selectedEntry ? (
        <PteVocabularyWordModal
          entry={selectedEntry}
          lang={translationLang}
          onClose={() => setSelectedEntry(null)}
          onToggleFavorite={toggleFavorite}
          isFavorite={favoriteIds.includes(selectedEntry.id)}
        />
      ) : null}
    </section>
  )
}

function SentenceListeningPanel() {
  const user = useAuthStore((state) => state.user)
  const accountKey = user?.id || user?.email || 'guest'
  const initialPrefs = readJsonStorage(SENTENCE_PREF_STORAGE_KEY, accountKey, { translationLang: 'en' })
  const [difficulty, setDifficulty] = useState('mixed')
  const [activeIndex, setActiveIndex] = useState(() => getRandomIndex(SENTENCE_LISTENING_SENTENCES.length))
  const [speed, setSpeed] = useState(1)
  const [accent, setAccent] = useState('en-US')
  const [translationLang, setTranslationLang] = useState(initialPrefs.translationLang || 'en')
  const [isSentenceVisible, setIsSentenceVisible] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [highlightMap, setHighlightMap] = useState(() => readJsonStorage(HIGHLIGHT_STORAGE_KEY, accountKey, {}))
  const [favoriteIds, setFavoriteIds] = useState(() => readJsonStorage(FAVORITES_STORAGE_KEY, accountKey, []))
  const [studiedIds, setStudiedIds] = useState(() => readJsonStorage(STUDIED_SENTENCES_STORAGE_KEY, accountKey, []))
  const [wordPopup, setWordPopup] = useState(null)
  const [voices, setVoices] = useState([])
  const lastDifficultyRef = useRef(null)

  const filteredSentences = useMemo(() => {
    if (difficulty === 'mixed') return SENTENCE_LISTENING_SENTENCES
    if (difficulty === 'favorites') return SENTENCE_LISTENING_SENTENCES.filter((item) => favoriteIds.includes(item.id))
    if (difficulty === 'studied') return SENTENCE_LISTENING_SENTENCES.filter((item) => studiedIds.includes(item.id))
    return SENTENCE_LISTENING_SENTENCES.filter((item) => item.difficulty === difficulty)
  }, [difficulty, favoriteIds, studiedIds])

  const activeSentence = filteredSentences[activeIndex] || filteredSentences[0]
  const tokens = useMemo(() => tokenizeSentence(activeSentence?.text || ''), [activeSentence?.text])
  const activeHighlights = highlightMap[activeSentence?.id] || []
  const highlightedCount = Object.values(highlightMap).filter((items) => Array.isArray(items) && items.length > 0).length
  const isFavorite = Boolean(activeSentence && favoriteIds.includes(activeSentence.id))
  const accentVoice = useMemo(() => {
    const exactMatch = voices.find((voice) => voice.lang === accent)
    if (exactMatch) return exactMatch
    return voices.find((voice) => voice.lang?.toLowerCase().startsWith(accent.toLowerCase()))
  }, [accent, voices])

  useEffect(() => {
    if (!filteredSentences.length) return
    if (lastDifficultyRef.current === difficulty) return
    lastDifficultyRef.current = difficulty
    setActiveIndex(getRandomIndex(filteredSentences.length))
    setIsSentenceVisible(false)
    setHasPlayed(false)
  }, [difficulty, filteredSentences.length])

  useEffect(() => {
    if (!filteredSentences.length) return
    setActiveIndex((current) => Math.min(current, filteredSentences.length - 1))
  }, [filteredSentences.length])

  useEffect(() => {
    setIsSentenceVisible(false)
    setHasPlayed(false)
  }, [activeSentence?.id])

  useEffect(() => {
    setHighlightMap(readJsonStorage(HIGHLIGHT_STORAGE_KEY, accountKey, {}))
    setFavoriteIds(readJsonStorage(FAVORITES_STORAGE_KEY, accountKey, []))
    setStudiedIds(readJsonStorage(STUDIED_SENTENCES_STORAGE_KEY, accountKey, []))
    const prefs = readJsonStorage(SENTENCE_PREF_STORAGE_KEY, accountKey, { translationLang: 'en' })
    setTranslationLang(prefs.translationLang || 'en')
  }, [accountKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(HIGHLIGHT_STORAGE_KEY, accountKey), JSON.stringify(highlightMap))
  }, [accountKey, highlightMap])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(FAVORITES_STORAGE_KEY, accountKey), JSON.stringify(favoriteIds))
  }, [accountKey, favoriteIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(STUDIED_SENTENCES_STORAGE_KEY, accountKey), JSON.stringify(studiedIds))
  }, [accountKey, studiedIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(SENTENCE_PREF_STORAGE_KEY, accountKey), JSON.stringify({ translationLang }))
  }, [accountKey, translationLang])

  useEffect(() => {
    const updateVoices = () => setVoices(window.speechSynthesis?.getVoices?.() || [])
    updateVoices()
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const playSentence = () => {
    if (!activeSentence || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setHasPlayed(true)
    setStudiedIds((current) => (current.includes(activeSentence.id) ? current : [...current, activeSentence.id]))
    const utterance = new SpeechSynthesisUtterance(activeSentence.text)
    utterance.lang = accent
    if (accentVoice) utterance.voice = accentVoice
    utterance.rate = speed
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  }

  const goToSentence = (direction) => {
    window.speechSynthesis?.cancel()
    setIsSentenceVisible(false)
    setHasPlayed(false)
    setActiveIndex((current) => {
      const next = current + direction
      if (next < 0) return filteredSentences.length - 1
      if (next >= filteredSentences.length) return 0
      return next
    })
  }

  const toggleHighlight = (tokenIndex) => {
    if (!activeSentence) return
    setHighlightMap((current) => {
      const sentenceHighlights = new Set(current[activeSentence.id] || [])
      if (sentenceHighlights.has(tokenIndex)) {
        sentenceHighlights.delete(tokenIndex)
      } else {
        sentenceHighlights.add(tokenIndex)
      }
      return {
        ...current,
        [activeSentence.id]: [...sentenceHighlights].sort((a, b) => a - b),
      }
    })
  }

  const handleSentenceTokenClick = (event, token, tokenIndex) => {
    if (event.detail >= 2) {
      const word = cleanWord(token)
      if (word) {
        setWordPopup(word)
        playSpeech(word)
      }
      return
    }
    toggleHighlight(tokenIndex)
  }

  const clearSentenceHighlights = () => {
    if (!activeSentence) return
    setHighlightMap((current) => {
      const next = { ...current }
      delete next[activeSentence.id]
      return next
    })
  }

  const toggleFavorite = () => {
    if (!activeSentence) return
    setFavoriteIds((current) => {
      if (current.includes(activeSentence.id)) return current.filter((id) => id !== activeSentence.id)
      return [...current, activeSentence.id]
    })
  }

  const translation = translationLang === 'ko' ? activeSentence?.ko : translationLang === 'zh' ? activeSentence?.zh : ''
  if (!activeSentence) {
    return (
      <div className="study-sentence">
        <section className="study-control-card">
          <div className="study-filter-row">
            <div className="study-chip-group" aria-label="Sentence difficulty">
              {[
                ...SENTENCE_DIFFICULTIES,
                { id: 'studied', label: 'Studied', description: 'Sentences you have already played' },
                { id: 'favorites', label: 'Favorites', description: 'Your saved difficult sentences' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`study-filter-chip ${difficulty === item.id ? 'study-filter-chip--active' : ''}`}
                  onClick={() => setDifficulty(item.id)}
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="study-empty-state">
            <span className="material-symbols-outlined">star</span>
            <h3>No favorite sentences yet.</h3>
            <p>Save difficult sentences while practicing, then come back here for focused review.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="study-sentence">
      <section className="study-sentence-hero">
        <div>
          <span className={`study-difficulty-badge study-difficulty-badge--${activeSentence?.difficulty}`}>
            {activeSentence?.difficulty || 'mixed'}
          </span>
          <h2>Train your ear one sentence at a time.</h2>
          <p>
            Listen, replay, and highlight the words or chunks that are hard to catch.
            Highlights and favorites are saved separately for your account.
          </p>
        </div>
        <div className="study-sentence-hero__stats">
          <strong>{filteredSentences.length}</strong>
          <span title="Sentences available with the current filter">In set</span>
          <strong>{favoriteIds.length}</strong>
          <span title="Sentences you saved as difficult">Saved hard</span>
          <strong>{studiedIds.length}</strong>
          <span title="Sentences you have practiced already">Practiced</span>
          <strong>{highlightedCount}</strong>
          <span title="Sentences with highlighted weak spots">Marked parts</span>
        </div>
      </section>

      <section className="study-control-card">
        <div className="study-filter-row">
          <div className="study-chip-group" aria-label="Sentence difficulty">
            {[
              ...SENTENCE_DIFFICULTIES,
              { id: 'studied', label: 'Studied', description: 'Sentences you have already played' },
              { id: 'favorites', label: 'Favorites', description: 'Your saved difficult sentences' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`study-filter-chip ${difficulty === item.id ? 'study-filter-chip--active' : ''}`}
                onClick={() => setDifficulty(item.id)}
                title={item.description}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="study-speed-control">
            <span>Speed</span>
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              {SPEED_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}x</option>
              ))}
            </select>
          </label>

          <label className="study-speed-control">
            <span>Accent</span>
            <select value={accent} onChange={(event) => setAccent(event.target.value)}>
              {ACCENT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="study-accent-note">
          Current voice: {ACCENT_OPTIONS.find((option) => option.id === accent)?.detail}
          {accentVoice ? ` · ${accentVoice.name}` : ' · browser default voice'}
        </p>
      </section>

      <section className="study-listening-card">
        <div className="study-listening-card__header">
          <div>
            <strong>Sentence reveal</strong>
            <span>Listen first, then reveal only when you are ready.</span>
          </div>
          <button type="button" className={`study-favorite-btn ${isFavorite ? 'study-favorite-btn--active' : ''}`} onClick={toggleFavorite}>
            <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_outline'}</span>
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        </div>

        <div className="study-translation-tools">
          <div className="study-chip-group" aria-label="Translation language">
            <button
              type="button"
              className={`study-filter-chip ${translationLang === 'en' ? 'study-filter-chip--active' : ''}`}
              onClick={() => setTranslationLang('en')}
            >
              English only
            </button>
            <button
              type="button"
              className={`study-filter-chip ${translationLang === 'ko' ? 'study-filter-chip--active' : ''}`}
              onClick={() => setTranslationLang('ko')}
            >
              Korean
            </button>
            <button
              type="button"
              className={`study-filter-chip ${translationLang === 'zh' ? 'study-filter-chip--active' : ''}`}
              onClick={() => setTranslationLang('zh')}
            >
              Chinese
            </button>
          </div>
          {isSentenceVisible ? (
            <button type="button" className="study-clear-btn" onClick={clearSentenceHighlights}>
              <span className="material-symbols-outlined">ink_eraser</span>
              Clear highlights
            </button>
          ) : null}
        </div>

        <div className="study-sentence-inline-player">
          <button type="button" className="study-nav-btn" onClick={() => goToSentence(-1)} title="Previous sentence" aria-label="Previous sentence">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button type="button" className="study-play-btn" onClick={playSentence}>
            <span className="material-symbols-outlined">volume_up</span>
            {hasPlayed ? 'Replay' : 'Play'}
          </button>
          <button type="button" className="study-nav-btn" onClick={() => goToSentence(1)} title="Next sentence" aria-label="Next sentence">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {isSentenceVisible ? (
          <>
            <div className="study-sentence-text" aria-label="Click words to highlight hard-to-hear parts">
              {tokens.map((token, index) => {
                if (!isHighlightableToken(token)) return <span key={`${activeSentence.id}-${index}`}>{token}</span>
                const isHighlighted = activeHighlights.includes(index)
                return (
                  <button
                    key={`${activeSentence.id}-${index}`}
                    type="button"
                    className={`study-token study-token--lookup ${isHighlighted ? 'study-token--highlighted' : ''}`}
                    onClick={(event) => handleSentenceTokenClick(event, token, index)}
                    aria-pressed={isHighlighted}
                    title="Click to highlight. Double-click for meaning and pronunciation."
                  >
                    {token}
                  </button>
                )
              })}
            </div>
            {translationLang !== 'en' && translation ? (
              <div className="study-translation-box">
                <strong>{translationLang === 'ko' ? 'Korean meaning' : 'Chinese meaning'}</strong>
                <p>{translation}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="study-hidden-sentence">
            <span className="material-symbols-outlined">visibility_off</span>
            <h3>Sentence hidden for listening.</h3>
            <p>Play first, then reveal the sentence when you are ready.</p>
            <div className="study-hidden-sentence__cta">
              <button
                type="button"
                className="study-show-sentence-btn"
                onClick={() => setIsSentenceVisible(true)}
                disabled={!hasPlayed}
              >
                {hasPlayed ? <span className="material-symbols-outlined">visibility</span> : null}
                <span>{hasPlayed ? 'Reveal sentence' : 'Listen first'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="study-review-card">
        <h3>How to use this for listening</h3>
        <div>
          <p><strong>1.</strong> Listen first without reading if possible.</p>
          <p><strong>2.</strong> Replay and click only the parts your ear misses.</p>
          <p><strong>3.</strong> Check the meaning, then replay at a slower speed.</p>
          <p><strong>4.</strong> Later, filter Mixed and scan yellow highlights to review weak spots.</p>
        </div>
      </section>

      {wordPopup ? <NewsWordPopup word={wordPopup} initialLang={translationLang} onClose={() => setWordPopup(null)} /> : null}
    </div>
  )
}

function AiInsightProgress({ label, indeterminate = false }) {
  const [progress, setProgress] = useState(4)

  useEffect(() => {
    if (indeterminate) return undefined
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const remaining = 94 - current
        if (remaining <= 0) return current
        return current + Math.max(0.25, remaining * 0.05)
      })
    }, 420)
    return () => window.clearInterval(timer)
  }, [indeterminate])

  const boundedProgress = Math.min(progress, 94)

  return (
    <div className="study-news-ai-progress" role="status" aria-live="polite">
      <div className={`study-news-ai-progress__track ${indeterminate ? 'study-news-ai-progress__track--indeterminate' : ''}`}>
        <i style={indeterminate ? undefined : { width: `${boundedProgress}%` }} />
      </div>
      <div className="study-news-ai-progress__meta">
        <span>{label}</span>
        {!indeterminate ? <strong>{Math.round(boundedProgress)}%</strong> : null}
      </div>
    </div>
  )
}

function NewsWordPopup({ word, initialLang = 'en', sourceArticle = null, onClose }) {
  const tokens = useAuthStore((state) => state.tokens)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const autoPlayedWordRef = useRef('')
  const [lang, setLang] = useState(initialLang || 'en')
  const [meaning, setMeaning] = useState('')
  const [localizedTerm, setLocalizedTerm] = useState('')
  const [detail, setDetail] = useState(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const normalizedWord = cleanWord(word)

  useEffect(() => {
    let cancelled = false

    async function loadWord() {
      if (!normalizedWord) return
      const cacheKey = `${normalizedWord}.${lang}.detail`
      if (WORD_MEANING_CACHE.has(cacheKey)) {
        const cached = WORD_MEANING_CACHE.get(cacheKey)
        setDetail(cached.detail)
        setMeaning(cached.meaning)
        setLocalizedTerm(cached.localizedTerm)
        return
      }

      setIsLoadingDetail(true)
      setMeaning('Loading meaning...')
      setLocalizedTerm('')
      try {
        const [{ fetchWordDetail, translateWord }] = await Promise.all([
          import('../../pte/_06_services/pteWordService'),
        ])
        const nextDetail = await fetchWordDetail(normalizedWord)
        const firstDefinition = nextDetail?.meanings?.[0]?.definitions?.[0]?.definition || `Meaning and usage for "${normalizedWord}".`
        const translated = lang === 'en' ? firstDefinition : await translateWord(firstDefinition, lang)
        const translatedTerm = lang === 'en' ? normalizedWord : await translateWord(normalizedWord, lang)
        const nextMeaning = translated || firstDefinition
        const payload = { detail: nextDetail, meaning: nextMeaning, localizedTerm: translatedTerm || '' }
        WORD_MEANING_CACHE.set(cacheKey, payload)
        if (!cancelled) {
          setDetail(nextDetail)
          setMeaning(nextMeaning)
          setLocalizedTerm(translatedTerm || '')
        }
      } catch {
        if (!cancelled) {
          setDetail(null)
          setMeaning('Meaning could not be loaded right now.')
          setLocalizedTerm('')
        }
      } finally {
        if (!cancelled) setIsLoadingDetail(false)
      }
    }

    loadWord()
    return () => {
      cancelled = true
    }
  }, [lang, normalizedWord])

  useEffect(() => {
    setLang(initialLang || 'en')
    setIsSaved(false)
    setSaveStatus('')
  }, [initialLang, word])

  if (!normalizedWord) return null

  const verbForms = getVerbForms(normalizedWord, detail)
  const usPhonetic = getAccentPhonetic(detail, 'us')
  const ukPhonetic = getAccentPhonetic(detail, 'uk')
  const fallbackPhonetic = detail?.phonetic || usPhonetic.text || ukPhonetic.text || ''

  const playPronunciation = (accent = 'us') => {
    const accentPhonetic = getAccentPhonetic(detail, accent)
    const audioUrl = accentPhonetic.audio || detail?.audioUrl || detail?.phonetics?.find((item) => item.audio)?.audio
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play().catch(() => playSpeech(normalizedWord, { lang: accent === 'uk' ? 'en-GB' : 'en-US' }))
      return
    }
    playSpeech(normalizedWord, { lang: accent === 'uk' ? 'en-GB' : 'en-US' })
  }

  useEffect(() => {
    if (!normalizedWord || isLoadingDetail || autoPlayedWordRef.current === normalizedWord) return
    if (!detail && !meaning) return
    autoPlayedWordRef.current = normalizedWord
    const timer = window.setTimeout(() => playPronunciation('us'), 160)
    return () => window.clearTimeout(timer)
  }, [detail, isLoadingDetail, meaning, normalizedWord])

  const saveNewsWord = async () => {
    if (!isAuthenticated || !tokens?.access_token || isSaved) return
    setSaveStatus('Saving...')
    try {
      const definition = meaning || detail?.meanings?.[0]?.definitions?.[0]?.definition || ''
      await apiPost('/api/admin/dictionary-logs', {
        search_word: normalizedWord,
        source_lang: 'en',
        target_lang: lang,
        search_source: sourceArticle ? 'news' : 'study_lab',
        result_summary: definition,
        search_results: {
          phonetic: fallbackPhonetic,
          definition,
          localizedTerm,
          source: sourceArticle ? 'news' : 'study_lab',
          articleTitle: sourceArticle?.title || '',
          sourceUrl: sourceArticle?.sourceUrl || '',
          articleId: sourceArticle?.id || '',
        },
      }, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      setIsSaved(true)
      setSaveStatus('Saved to news word list.')
    } catch {
      setSaveStatus('Could not save this word right now.')
    }
  }

  return (
    <div
      className="study-word-popover-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="study-word-popover" role="dialog" aria-label="Word meaning">
        <button type="button" className="study-word-popover__close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="study-word-popover__title-row">
          <h3>{normalizedWord}</h3>
          <button
            type="button"
            className={`study-word-save-btn ${isSaved ? 'study-word-save-btn--active' : ''}`}
            onClick={saveNewsWord}
            disabled={!isAuthenticated || isSaved}
            title={isAuthenticated ? 'Save this word' : 'Login is required to save words'}
          >
            <span className="material-symbols-outlined">{isSaved ? 'star' : 'star_outline'}</span>
          </button>
        </div>
        <div className="study-word-pronunciation">
          <span>IPA</span>
          <strong>{fallbackPhonetic || (isLoadingDetail ? 'Loading...' : 'Not available')}</strong>
          <button
            type="button"
            className="study-pronunciation-accent-btn"
            onClick={() => playPronunciation('us')}
            title="Play American pronunciation"
          >
            <span aria-hidden="true">🇺🇸</span>
            US
          </button>
          <button
            type="button"
            className="study-pronunciation-accent-btn"
            onClick={() => playPronunciation('uk')}
            title="Play British pronunciation"
          >
            <span aria-hidden="true">🇬🇧</span>
            UK
          </button>
        </div>
        {verbForms ? (
          <div className="study-word-verb-forms" aria-label="Verb forms">
            <span className="study-word-verb-forms__label">Verb forms</span>
            <div className="study-word-verb-forms__row">
              <span><em>Present</em><strong>{verbForms.base}</strong></span>
              <span><em>Past</em><strong>{verbForms.past}</strong></span>
              <span><em>Past participle</em><strong>{verbForms.participle}</strong></span>
            </div>
          </div>
        ) : null}
        <div className="study-chip-group study-word-lang-group">
          {[
            ['en', 'English'],
            ['ko', 'Korean'],
            ['zh', 'Chinese'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`study-filter-chip ${lang === id ? 'study-filter-chip--active' : ''}`}
              onClick={() => setLang(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {lang !== 'en' && localizedTerm ? (
          <div className="study-word-local-meaning">
            <strong>{localizedTerm}</strong>
          </div>
        ) : null}
        <p>{meaning}</p>
        {detail?.meanings?.length ? (
          <div className="study-word-definitions">
            {detail.meanings.slice(0, 2).map((item, index) => (
              <div key={`${item.partOfSpeech}-${index}`}>
                <strong>{item.partOfSpeech}</strong>
                <span>{item.definitions?.[0]?.definition}</span>
              </div>
            ))}
          </div>
        ) : null}
        {saveStatus ? <p className="study-word-save-status">{saveStatus}</p> : null}
      </div>
    </div>
  )
}

const PHRASAL_VERB_ENGLISH_OVERRIDES = {
  'look for': 'To try to find someone, something, or a solution.',
  'go for': 'To choose something, try to get something, or decide to do something.',
  'knock up': 'In British English, to wake someone by knocking. In American slang, it can mean to make someone pregnant, so use it carefully.',
  'look up': 'To search for information in a book, list, dictionary, or online.',
  'come across': 'To find or meet someone or something by chance, or to give a particular impression.',
  'figure out': 'To understand, solve, or discover something after thinking about it.',
  'bring up': 'To mention a topic in conversation, or to raise a child.',
  'carry on': 'To continue doing something.',
  'give up': 'To stop trying or stop doing something regularly.',
  'get over': 'To recover from an illness, problem, or difficult feeling.',
  'put off': 'To delay something, or to make someone dislike something.',
  'take over': 'To take control of a job, role, business, or situation.',
  'set up': 'To arrange, prepare, install, or start something.',
  'turn on': 'To start a machine, light, or device.',
  'turn off': 'To stop a machine, light, or device.',
  'hang on': 'To wait for a short time, hold tightly, or continue despite difficulty.',
  'hang around': 'To stay in a place without doing much, often while waiting.',
  'hang back': 'To stay behind because you are shy, nervous, or unsure.',
  'hang in there': 'To keep going and not give up when something is difficult.',
  'hang over': 'To remain as a worry, threat, feeling, or unfinished issue.',
  'hang together': 'To make sense as a whole or stay united as a group.',
  'hang onto': 'To keep holding or keep something because it is useful or important.',
  'hang about': 'To wait or stay somewhere doing very little, mainly British English.',
}

const PHRASAL_VERB_EXAMPLE_OVERRIDES = {
  'look for': [
    ['I am looking for my keys.', '열쇠를 찾고 있어요.', '我在找钥匙。'],
    ['She is looking for a better apartment.', '그녀는 더 나은 아파트를 찾고 있어요.', '她在找更好的公寓。'],
    ['We are looking for someone with experience.', '우리는 경험 있는 사람을 찾고 있어요.', '我们在找有经验的人。'],
    ['He looked for the receipt in his bag.', '그는 가방에서 영수증을 찾았어요.', '他在包里找收据。'],
    ['I am looking for a simple way to explain this.', '이것을 쉽게 설명할 방법을 찾고 있어요.', '我在找一个简单的方法来解释这个。'],
    ['They looked for parking near the station.', '그들은 역 근처 주차 공간을 찾았어요.', '他们在车站附近找停车位。'],
    ['Are you looking for anything special?', '특별히 찾는 것이 있나요?', '你在找什么特别的东西吗？'],
    ['The company is looking for new suppliers.', '회사는 새 공급업체를 찾고 있어요.', '公司在寻找新的供应商。'],
    ['I looked for your message but could not find it.', '네 메시지를 찾았지만 못 찾았어요.', '我找了你的信息，但没找到。'],
    ['Let us look for another option.', '다른 선택지를 찾아봅시다.', '我们找另一个选择吧。'],
  ],
  'go for': [
    ['I will go for the grilled chicken.', '저는 구운 치킨으로 할게요.', '我选烤鸡。'],
    ['You should go for the job if you want it.', '원한다면 그 일에 도전해 보세요.', '如果你想要那份工作，就去争取吧。'],
    ['Let us go for a walk after dinner.', '저녁 먹고 산책하러 갑시다.', '晚饭后我们去散步吧。'],
    ['This sofa goes for about eight hundred dollars.', '이 소파는 약 800달러 정도 해요.', '这张沙发大约卖八百美元。'],
    ['I usually go for coffee when I need a break.', '쉴 때는 보통 커피를 마시러 가요.', '我需要休息时通常去喝咖啡。'],
    ['She went for the safer choice.', '그녀는 더 안전한 선택을 했어요.', '她选择了更安全的方案。'],
    ['If you are ready, go for it.', '준비됐다면 해 보세요.', '如果你准备好了，就去做吧。'],
    ['We went for a cheaper plan.', '우리는 더 저렴한 요금제를 선택했어요.', '我们选择了更便宜的套餐。'],
    ['He always goes for simple designs.', '그는 항상 단순한 디자인을 선택해요.', '他总是选择简洁的设计。'],
    ['I would go for quality over speed.', '저라면 속도보다 품질을 선택하겠어요.', '我会选择质量而不是速度。'],
  ],
  'knock up': [
    ['Can you knock me up at seven?', '7시에 나를 깨워줄래요? 영국식 표현입니다.', '你能七点叫醒我吗？这是英式用法。'],
    ['The hotel clerk knocked us up early for the tour.', '호텔 직원이 투어 때문에 우리를 일찍 깨워 줬어요.', '酒店员工为了行程很早叫醒了我们。'],
    ['In the UK, knock up can mean wake someone by knocking.', '영국에서는 knock up이 노크해서 깨우다는 뜻일 수 있어요.', '在英国，knock up 可以表示敲门叫醒某人。'],
    ['Be careful using knock up in North America.', '북미에서는 knock up 사용에 주의하세요.', '在北美使用 knock up 要小心。'],
    ['In American slang, knock up can sound rude or sexual.', '미국식 속어에서는 무례하거나 성적인 의미로 들릴 수 있어요.', '在美式俚语中，knock up 可能听起来粗鲁或带有性意味。'],
    ['Use wake me up if you want to be safe.', '안전하게 말하려면 wake me up을 쓰세요.', '想安全表达就用 wake me up。'],
    ['Could you wake me up at seven is safer than knock me up.', 'Could you wake me up at seven이 knock me up보다 안전해요.', 'Could you wake me up at seven 比 knock me up 更安全。'],
    ['The phrase is common in some older British contexts.', '이 표현은 일부 오래된 영국식 맥락에서 보입니다.', '这个表达在一些较老的英式语境中出现。'],
    ['Do not use knock up in a formal workplace email.', '공식 업무 이메일에서는 knock up을 쓰지 마세요.', '正式工作邮件中不要用 knock up。'],
    ['If unsure, say wake someone up instead.', '확실하지 않으면 wake someone up이라고 하세요.', '不确定时就说 wake someone up。'],
  ],
}

const PHRASAL_VERB_TOPIC_EXAMPLES = {
  'daily-life': [
    ['I need to {phrase} before I leave.', '나가기 전에 {phrase} 해야 해요.', '离开前我需要 {phrase}。'],
    ['Can you {phrase} after breakfast?', '아침 먹고 {phrase} 해 줄래요?', '早饭后你能 {phrase} 吗？'],
    ['We usually {phrase} on weekends.', '우리는 보통 주말에 {phrase} 해요.', '我们通常周末 {phrase}。'],
    ['She forgot to {phrase} this morning.', '그녀는 오늘 아침 {phrase} 하는 것을 깜빡했어요.', '她今天早上忘了 {phrase}。'],
  ],
  'work-school': [
    ['Please {phrase} before the meeting.', '회의 전에 {phrase} 해 주세요.', '会议前请 {phrase}。'],
    ['The team had to {phrase} quickly.', '팀은 빠르게 {phrase} 해야 했어요.', '团队必须快速 {phrase}。'],
    ['I will {phrase} and send you an update.', '{phrase} 하고 업데이트를 보내드릴게요.', '我会 {phrase}，然后给你更新。'],
    ['Students often need to {phrase} after class.', '학생들은 수업 후 자주 {phrase} 해야 해요.', '学生课后经常需要 {phrase}。'],
  ],
  relationships: [
    ['Good friends know how to {phrase}.', '좋은 친구들은 {phrase} 하는 법을 알아요.', '好朋友知道如何 {phrase}。'],
    ['They decided to {phrase} after the conversation.', '그들은 대화 후 {phrase} 하기로 했어요.', '他们谈过后决定 {phrase}。'],
    ['I tried to {phrase} without sounding rude.', '무례하게 들리지 않게 {phrase} 하려고 했어요.', '我试着在不显得无礼的情况下 {phrase}。'],
    ['It is hard to {phrase} when people are upset.', '사람들이 화났을 때 {phrase} 하기는 어려워요.', '人们生气时很难 {phrase}。'],
  ],
  'money-shopping': [
    ['I need to {phrase} before I buy it.', '그것을 사기 전에 {phrase} 해야 해요.', '买之前我需要 {phrase}。'],
    ['We should {phrase} to save money.', '돈을 아끼려면 {phrase} 해야 해요.', '为了省钱，我们应该 {phrase}。'],
    ['The store helped me {phrase}.', '그 가게가 제가 {phrase} 하는 것을 도와줬어요.', '商店帮我 {phrase}。'],
    ['Customers often {phrase} during a sale.', '고객들은 세일 기간에 자주 {phrase} 해요.', '顾客在打折时经常 {phrase}。'],
  ],
  'health-energy': [
    ['You should {phrase} if you feel tired.', '피곤하면 {phrase} 해야 해요.', '如果累了，你应该 {phrase}。'],
    ['It took me a few days to {phrase}.', '{phrase} 하는 데 며칠 걸렸어요.', '我花了几天才 {phrase}。'],
    ['Try to {phrase} before the pain gets worse.', '통증이 심해지기 전에 {phrase} 해 보세요.', '疼痛加重前试着 {phrase}。'],
    ['Rest can help you {phrase}.', '휴식은 {phrase} 하는 데 도움이 돼요.', '休息可以帮助你 {phrase}。'],
  ],
  'problem-solving': [
    ['Let us {phrase} before making a decision.', '결정하기 전에 {phrase} 해 봅시다.', '做决定前我们先 {phrase}。'],
    ['We need to {phrase} the main problem.', '핵심 문제를 {phrase} 해야 해요.', '我们需要 {phrase} 主要问题。'],
    ['The manager asked us to {phrase} a solution.', '매니저가 해결책을 {phrase} 하라고 했어요.', '经理让我们 {phrase} 一个解决方案。'],
    ['This helps us {phrase} faster.', '이것은 우리가 더 빨리 {phrase} 하는 데 도움이 돼요.', '这帮助我们更快地 {phrase}。'],
  ],
  digital: [
    ['Click here to {phrase}.', '여기를 클릭해서 {phrase} 하세요.', '点击这里 {phrase}。'],
    ['The app lets you {phrase} in seconds.', '이 앱은 몇 초 만에 {phrase} 할 수 있게 해요.', '这个应用可以让你几秒内 {phrase}。'],
    ['You may need to {phrase} again.', '다시 {phrase} 해야 할 수도 있어요.', '你可能需要再次 {phrase}。'],
    ['The system failed when I tried to {phrase}.', '{phrase} 하려고 했을 때 시스템이 실패했어요.', '我尝试 {phrase} 时系统失败了。'],
  ],
  'movement-travel': [
    ['We had to {phrase} before noon.', '우리는 정오 전에 {phrase} 해야 했어요.', '我们必须中午前 {phrase}。'],
    ['Tourists often {phrase} near the station.', '관광객들은 역 근처에서 자주 {phrase} 해요.', '游客经常在车站附近 {phrase}。'],
    ['I will {phrase} after I check the map.', '지도를 확인한 후 {phrase} 할게요.', '我看完地图后会 {phrase}。'],
    ['The driver decided to {phrase}.', '운전자는 {phrase} 하기로 했어요.', '司机决定 {phrase}。'],
  ],
  'emotion-tone': [
    ['Try not to {phrase} during the conversation.', '대화 중에 {phrase} 하지 않도록 해 보세요.', '谈话时尽量不要 {phrase}。'],
    ['She started to {phrase} after hearing the news.', '그녀는 그 소식을 듣고 {phrase} 하기 시작했어요.', '她听到消息后开始 {phrase}。'],
    ['It is normal to {phrase} under stress.', '스트레스 상황에서 {phrase} 하는 것은 자연스러워요.', '压力下 {phrase} 是正常的。'],
    ['A short break helped him {phrase}.', '짧은 휴식이 그가 {phrase} 하는 데 도움이 됐어요.', '短暂休息帮助他 {phrase}。'],
  ],
}

const PHRASAL_VERB_GENERAL_EXAMPLES = [
  ['I hear people use "{phrase}" in everyday conversation.', '일상 대화에서 사람들이 "{phrase}"를 쓰는 것을 들어요.', '我在日常对话中听到人们使用 "{phrase}"。'],
  ['This is a useful phrase when you want to sound natural.', '자연스럽게 말하고 싶을 때 유용한 표현입니다.', '想说得自然时，这是一个有用的表达。'],
  ['Try using "{phrase}" in one short sentence today.', '오늘 짧은 문장 하나에 "{phrase}"를 써 보세요.', '今天试着用 "{phrase}" 造一个短句。'],
  ['Native speakers often say "{phrase}" quickly.', '원어민들은 "{phrase}"를 빠르게 말하는 경우가 많아요.', '母语者经常很快地说 "{phrase}"。'],
]

function makeTranslatedExample(row, phrase) {
  return {
    en: row[0].replaceAll('{phrase}', phrase),
    ko: row[1].replaceAll('{phrase}', phrase),
    zh: row[2].replaceAll('{phrase}', phrase),
  }
}

function getPhrasalVerbEnglishMeaning(verb) {
  return verb.meaning?.en
    || PHRASAL_VERB_ENGLISH_OVERRIDES[verb.phrase]
    || `A practical everyday phrasal verb. Use "${verb.phrase}" as one meaning unit, then check the examples below to learn its natural context.`
}

function buildPhrasalVerbExamples(verb) {
  const overrideRows = PHRASAL_VERB_EXAMPLE_OVERRIDES[verb.phrase] || []
  const baseRows = (verb.examples || []).map((example) => [example.en, example.ko, example.zh])
  const topicRows = PHRASAL_VERB_TOPIC_EXAMPLES[verb.topic] || []
  const allRows = [...baseRows, ...overrideRows, ...topicRows, ...PHRASAL_VERB_GENERAL_EXAMPLES]
  const seen = new Set()
  const examples = []
  allRows.forEach((row) => {
    const example = makeTranslatedExample(row, verb.phrase)
    const key = example.en.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    examples.push(example)
  })
  while (examples.length < 10) {
    const number = examples.length + 1
    examples.push({
      en: `Practice ${number}: Make your own sentence with "${verb.phrase}".`,
      ko: `연습 ${number}: "${verb.phrase}"를 넣어 직접 문장을 만들어 보세요.`,
      zh: `练习 ${number}：用 "${verb.phrase}" 自己造一个句子。`,
    })
  }
  return examples.slice(0, 10)
}

function PhrasalVerbsPanel() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const tokens = useAuthStore((state) => state.tokens)
  const accountKey = user?.id || user?.email || 'guest'
  const canSyncPhrasalFavorites = Boolean(isAuthenticated && tokens?.access_token)
  const [viewMode, setViewMode] = useState('browse')
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [translationLang, setTranslationLang] = useState('ko')
  const [sortMode, setSortMode] = useState('importance')
  const [search, setSearch] = useState('')
  const [selectedParticle, setSelectedParticle] = useState('all')
  const [randomSeed, setRandomSeed] = useState(() => Date.now())
  const [favoriteIds, setFavoriteIds] = useState(() => readJsonStorage(PHRASAL_VERB_FAVORITES_STORAGE_KEY, accountKey, []))
  const [favoriteSyncReady, setFavoriteSyncReady] = useState(false)
  const [hiddenIds, setHiddenIds] = useState([])
  const [selectedVerb, setSelectedVerb] = useState(null)
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0)
  const [ordinaryVerbPopup, setOrdinaryVerbPopup] = useState(null)
  const [showFavoriteReview, setShowFavoriteReview] = useState(false)
  const [favoriteMeaningsVisible, setFavoriteMeaningsVisible] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PHRASAL_VERB_BATCH_SIZE)
  const [forcedPhraseSearch, setForcedPhraseSearch] = useState('')
  const loadMoreRef = useRef(null)
  const favoriteReviewRef = useRef(null)
  const favoriteReviewScrollTopRef = useRef(0)
  const favoriteReviewReturnTargetRef = useRef('')
  const favoriteReviewShouldRestoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const localFavoriteIds = readJsonStorage(PHRASAL_VERB_FAVORITES_STORAGE_KEY, accountKey, [])

    async function loadFavoriteIds() {
      if (!canSyncPhrasalFavorites) {
        setFavoriteIds(localFavoriteIds)
        setFavoriteSyncReady(true)
        return
      }

      setFavoriteSyncReady(false)
      try {
        const response = await apiGet('/api/study-lab/state/phrasalVerbFavorites', {}, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        if (cancelled) return
        const serverFavoriteIds = Array.isArray(response.data?.value) ? response.data.value : []
        const mergedFavoriteIds = [...new Set([...serverFavoriteIds, ...localFavoriteIds])]
        setFavoriteIds(mergedFavoriteIds)
        setFavoriteSyncReady(true)

        if (localFavoriteIds.length) {
          await apiPut('/api/study-lab/state/phrasalVerbFavorites', { value: mergedFavoriteIds }, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })
          if (!cancelled && typeof window !== 'undefined') {
            window.localStorage.removeItem(getAccountStorageKey(PHRASAL_VERB_FAVORITES_STORAGE_KEY, accountKey))
          }
        }
      } catch {
        if (cancelled) return
        setFavoriteIds(localFavoriteIds)
        setFavoriteSyncReady(false)
      }
    }

    loadFavoriteIds()
    return () => {
      cancelled = true
    }
  }, [accountKey, canSyncPhrasalFavorites, tokens?.access_token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!canSyncPhrasalFavorites) {
      window.localStorage.setItem(getAccountStorageKey(PHRASAL_VERB_FAVORITES_STORAGE_KEY, accountKey), JSON.stringify(favoriteIds))
      return
    }
    if (!favoriteSyncReady) return
    const syncTimeout = window.setTimeout(() => {
      apiPut('/api/study-lab/state/phrasalVerbFavorites', { value: favoriteIds }, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).catch(() => {})
    }, 250)
    return () => window.clearTimeout(syncTimeout)
  }, [accountKey, canSyncPhrasalFavorites, favoriteIds, favoriteSyncReady, tokens?.access_token])

  useEffect(() => {
    setHiddenIds(readJsonStorage(PHRASAL_VERB_HIDDEN_STORAGE_KEY, accountKey, []))
  }, [accountKey])

  const topicMap = useMemo(() => (
    PHRASAL_VERB_TOPICS.reduce((map, topic) => ({ ...map, [topic.id]: topic }), {})
  ), [])

  const mergedPhrasalVerbs = useMemo(() => mergePhrasalVerbEntries(PHRASAL_VERBS), [])

  const favoriteVerbs = useMemo(() => (
    mergedPhrasalVerbs
      .filter((verb) => (verb.sourceIds || [verb.id]).some((id) => favoriteIds.includes(id)))
      .sort((a, b) => b.importance - a.importance || a.phrase.localeCompare(b.phrase))
  ), [favoriteIds, mergedPhrasalVerbs])

  const hiddenVerbs = useMemo(() => (
    mergedPhrasalVerbs
      .filter((verb) => (verb.sourceIds || [verb.id]).some((id) => hiddenIds.includes(id)))
      .sort((a, b) => b.importance - a.importance || a.phrase.localeCompare(b.phrase))
  ), [hiddenIds, mergedPhrasalVerbs])

  const particleOptions = useMemo(() => {
    const counts = new Map()
    mergedPhrasalVerbs.forEach((verb) => {
      getPhrasalVerbParticles(verb.phrase).forEach((particle) => {
        counts.set(particle, (counts.get(particle) || 0) + 1)
      })
    })
    const priorityIndex = new Map(PHRASAL_VERB_PARTICLE_PRIORITY.map((particle, index) => [particle, index]))
    return [...counts.entries()]
      .map(([particle, count]) => ({ particle, count }))
      .sort((a, b) => {
        const left = priorityIndex.has(a.particle) ? priorityIndex.get(a.particle) : 999
        const right = priorityIndex.has(b.particle) ? priorityIndex.get(b.particle) : 999
        return left - right || a.particle.localeCompare(b.particle)
      })
  }, [mergedPhrasalVerbs])

  const searchSuggestions = useMemo(() => {
    const query = normalizePhrasalSearchText(search)
    if (!query) return []
    const suggestions = []
    const seen = new Set()
    const addSuggestion = (value, hint) => {
      const normalized = normalizePhrasalSearchText(value)
      if (!normalized || seen.has(normalized)) return
      seen.add(normalized)
      suggestions.push({ value, hint })
    }

    PHRASAL_VERB_SEARCH_ALIASES
      .map((alias) => ({ alias, score: getPhrasalAliasScore(alias, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .forEach(({ alias }) => {
        addSuggestion(alias.label, `Similar meaning: ${(alias.keywords || []).slice(0, 3).join(', ')}`)
        ;(alias.keywords || []).slice(0, 2).forEach((keyword) => addSuggestion(keyword, alias.label))
      })

    particleOptions.forEach((option) => {
      if (!option.particle.includes(query) && !query.includes(option.particle)) return
      addSuggestion(option.particle, `${option.count} phrasal verbs use this particle`)
    })

    mergedPhrasalVerbs
      .map((verb) => ({
        verb,
        score: getPhrasalVerbSearchScore(verb, query, topicMap),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.verb.importance - a.verb.importance || a.verb.phrase.localeCompare(b.verb.phrase))
      .slice(0, 10)
      .forEach(({ verb, score }) => {
        if (suggestions.length >= 10) return
        addSuggestion(
          verb.phrase,
          `${score >= 70 ? 'Strong match' : 'Related meaning'} · ${verb.meaning?.[translationLang] || verb.meaning?.ko || ''}`,
        )
      })

    return suggestions.slice(0, 10)
  }, [mergedPhrasalVerbs, particleOptions, search, topicMap, translationLang])

  const visibleVerbs = useMemo(() => {
    const hasSearch = Boolean(normalizePhrasalSearchText(search))
    const normalizedForcedPhrase = normalizePhrasalSearchText(forcedPhraseSearch)
    const filtered = mergedPhrasalVerbs
      .map((item) => ({
        item,
        score: getPhrasalVerbSearchScore(item, search, topicMap),
      }))
      .filter(({ item, score }) => {
        const sourceIds = item.sourceIds || [item.id]
        const isFav = sourceIds.some((id) => favoriteIds.includes(id))
        const isHid = sourceIds.some((id) => hiddenIds.includes(id))
        if (viewMode === 'favorites') {
          if (!isFav) return false
        } else if (viewMode === 'hidden') {
          if (!isHid) return false
        } else {
          if (isHid) return false
          const topicIds = getPhrasalVerbTopicIds(item)
          const topicMatch = selectedTopic === 'all' || topicIds.includes(selectedTopic)
          if (!topicMatch) return false
        }
        const particleMatch = selectedParticle === 'all' || getPhrasalVerbParticles(item.phrase).includes(selectedParticle)
        if (!particleMatch) return false
        if (normalizedForcedPhrase) return normalizePhrasalSearchText(item.phrase) === normalizedForcedPhrase
        return !hasSearch || score > 0
      })

    if (sortMode === 'az') return filtered.map(({ item }) => item).sort((a, b) => a.phrase.localeCompare(b.phrase))
    if (sortMode === 'za') return filtered.map(({ item }) => item).sort((a, b) => b.phrase.localeCompare(a.phrase))
    if (sortMode === 'random') {
      return filtered.map(({ item }) => item).sort((a, b) => {
        const left = Math.sin((a.id.length + a.phrase.charCodeAt(0) + randomSeed) * 9999)
        const right = Math.sin((b.id.length + b.phrase.charCodeAt(0) + randomSeed) * 9999)
        return left - right
      })
    }
    return filtered
      .sort((a, b) => {
        if (hasSearch && b.score !== a.score) return b.score - a.score
        return b.item.importance - a.item.importance || a.item.phrase.localeCompare(b.item.phrase)
      })
      .map(({ item }) => item)
  }, [favoriteIds, hiddenIds, viewMode, forcedPhraseSearch, mergedPhrasalVerbs, randomSeed, search, selectedParticle, selectedTopic, sortMode, topicMap])

  const shouldUseProgressiveLoad = viewMode === 'browse' && selectedTopic === 'all' && selectedParticle === 'all'
  const renderedVerbs = shouldUseProgressiveLoad ? visibleVerbs.slice(0, visibleCount) : visibleVerbs
  const hasMoreVerbs = shouldUseProgressiveLoad && visibleCount < visibleVerbs.length
  const selectedVerbExamples = useMemo(() => (
    selectedVerb ? buildPhrasalVerbExamples(selectedVerb) : []
  ), [selectedVerb])
  const selectedVerbEnglishMeaning = selectedVerb ? getPhrasalVerbEnglishMeaning(selectedVerb) : ''
  const selectedVerbBaseVerb = selectedVerb ? getPhrasalVerbBaseVerb(selectedVerb.phrase) : ''
  const selectedVerbBaseHint = selectedVerb ? getPhrasalVerbBaseHint(selectedVerb.phrase) : null
  const selectedVerbOrdinaryVerbs = selectedVerbBaseHint
    ? getUniqueOrdinaryVerbs(selectedVerbBaseHint.verbs, [selectedVerbBaseVerb])
    : []

  useEffect(() => {
    setVisibleCount(PHRASAL_VERB_BATCH_SIZE)
  }, [search, selectedParticle, selectedTopic, sortMode, randomSeed, viewMode])

  useEffect(() => {
    if (!hasMoreVerbs || !loadMoreRef.current || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setVisibleCount((current) => Math.min(current + PHRASAL_VERB_BATCH_SIZE, visibleVerbs.length))
    }, { rootMargin: '420px 0px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMoreVerbs, visibleVerbs.length])

  const isPhrasalVerbFavorite = (verb) => (
    (verb?.sourceIds || [verb?.id].filter(Boolean)).some((id) => favoriteIds.includes(id))
  )

  const toggleFavorite = (verb) => {
    const sourceIds = verb?.sourceIds || [verb?.id].filter(Boolean)
    const canonicalId = sourceIds[0]
    if (!canonicalId) return
    setFavoriteIds((current) => {
      const isAlreadyFavorite = sourceIds.some((id) => current.includes(id))
      if (isAlreadyFavorite) return current.filter((id) => !sourceIds.includes(id))
      return [...current, canonicalId]
    })
  }

  const isPhrasalVerbHidden = (verb) => (
    (verb?.sourceIds || [verb?.id].filter(Boolean)).some((id) => hiddenIds.includes(id))
  )

  const toggleHidden = (verb) => {
    const sourceIds = verb?.sourceIds || [verb?.id].filter(Boolean)
    const canonicalId = sourceIds[0]
    if (!canonicalId) return
    setHiddenIds((current) => {
      const isAlreadyHidden = sourceIds.some((id) => current.includes(id))
      const next = isAlreadyHidden
        ? current.filter((id) => !sourceIds.includes(id))
        : [...current, canonicalId]
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getAccountStorageKey(PHRASAL_VERB_HIDDEN_STORAGE_KEY, accountKey), JSON.stringify(next))
      }
      return next
    })
  }

  const openExample = (verb, index = 0) => {
    setSelectedVerb(verb)
    setSelectedExampleIndex(index)
  }

  const openFavoriteReview = () => {
    favoriteReviewShouldRestoreRef.current = false
    favoriteReviewReturnTargetRef.current = ''
    favoriteReviewScrollTopRef.current = 0
    setShowFavoriteReview(true)
  }

  const closeSelectedVerbDetail = () => {
    setSelectedVerb(null)
    if (favoriteReviewShouldRestoreRef.current) {
      setShowFavoriteReview(true)
    }
  }

  useEffect(() => {
    if (!showFavoriteReview || !favoriteReviewShouldRestoreRef.current || !favoriteReviewRef.current) return
    favoriteReviewRef.current.scrollTop = favoriteReviewScrollTopRef.current
    if (favoriteReviewReturnTargetRef.current) {
      const target = favoriteReviewRef.current.querySelector(`[data-favorite-verb-id="${favoriteReviewReturnTargetRef.current}"]`)
      target?.scrollIntoView({ block: 'nearest' })
    }
    favoriteReviewShouldRestoreRef.current = false
  }, [showFavoriteReview])

  const selectedTopicMeta = viewMode === 'favorites'
    ? { label: 'Favorite phrasal verbs', emoji: '⭐', tone: 'Your saved review list' }
    : viewMode === 'hidden'
      ? { label: 'Hidden phrasal verbs', emoji: '🙈', tone: 'Cards you hid from browsing' }
      : selectedTopic === 'all'
        ? { label: 'All real-life topics', emoji: '✨', tone: 'Situation-first practice for daily English' }
        : topicMap[selectedTopic]
  const hasActivePhrasalFilters = Boolean(search.trim()) || viewMode !== 'browse' || selectedTopic !== 'all' || selectedParticle !== 'all' || sortMode !== 'importance'
  const resetPhrasalSearch = () => {
    setSearch('')
    setViewMode('browse')
    setSelectedTopic('all')
    setSelectedParticle('all')
    setSortMode('importance')
    setRandomSeed(Date.now())
    setForcedPhraseSearch('')
    setVisibleCount(PHRASAL_VERB_BATCH_SIZE)
  }

  return (
    <section className="study-phrasal">
      <div className="study-phrasal-hero">
        <div>
          <span className="study-news-source">Real-life phrasal verbs</span>
          <h2>Learn the phrases native speakers actually use.</h2>
          <p>Grouped by situation, with meaning, nuance, examples, and a quick favorite review list.</p>
        </div>
        <div className="study-phrasal-hero__aside">
          <div className="study-phrasal-hero__count">
            <strong>{mergedPhrasalVerbs.length}</strong>
            <span>expressions</span>
          </div>
          <div className="study-phrasal-viewtabs" role="tablist" aria-label="Phrasal verb view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'browse'}
              className={viewMode === 'browse' ? 'study-phrasal-viewtab study-phrasal-viewtab--active' : 'study-phrasal-viewtab'}
              onClick={() => {
                setViewMode('browse')
                setForcedPhraseSearch('')
              }}
            >
              <span className="material-symbols-outlined">grid_view</span>
              Browse
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'favorites'}
              className={viewMode === 'favorites' ? 'study-phrasal-viewtab study-phrasal-viewtab--active' : 'study-phrasal-viewtab'}
              onClick={() => {
                setViewMode('favorites')
                setForcedPhraseSearch('')
              }}
            >
              <span className="material-symbols-outlined">star</span>
              Favorites
              <em>{favoriteVerbs.length}</em>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'hidden'}
              className={viewMode === 'hidden' ? 'study-phrasal-viewtab study-phrasal-viewtab--active' : 'study-phrasal-viewtab'}
              onClick={() => {
                setViewMode('hidden')
                setForcedPhraseSearch('')
              }}
            >
              <span className="material-symbols-outlined">visibility_off</span>
              Hidden
              <em>{hiddenVerbs.length}</em>
            </button>
          </div>
        </div>
      </div>

      <div className="study-phrasal-controls">
        <label>
          Search
          <div className="study-phrasal-search-field">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                const nextSearch = event.target.value
                setSearch(nextSearch)
                setForcedPhraseSearch('')
                if (searchSuggestions.some((suggestion) => suggestion.value === nextSearch)) {
                  setSelectedTopic('all')
                }
              }}
              list="phrasal-search-suggestions"
              placeholder="Phrase, meaning, topic, or similar idea..."
            />
          </div>
          <datalist id="phrasal-search-suggestions">
            {searchSuggestions.map((suggestion) => (
              <option key={suggestion.value} value={suggestion.value} />
            ))}
          </datalist>
        </label>
        <label>
          Topic
          <select
            value={viewMode === 'browse' ? selectedTopic : 'all'}
            onChange={(event) => {
              setViewMode('browse')
              setSelectedTopic(event.target.value)
              setForcedPhraseSearch('')
              setVisibleCount(PHRASAL_VERB_BATCH_SIZE)
            }}
          >
            <option value="all">✨ All topics</option>
            {PHRASAL_VERB_TOPICS.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.emoji} {topic.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preposition / Particle
          <select
            value={selectedParticle}
            onChange={(event) => {
              setSelectedParticle(event.target.value)
              setForcedPhraseSearch('')
              setVisibleCount(PHRASAL_VERB_BATCH_SIZE)
            }}
          >
            <option value="all">All prepositions</option>
            {particleOptions.map((option) => (
              <option key={option.particle} value={option.particle}>
                {option.particle} ({option.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value)
              setForcedPhraseSearch('')
              if (event.target.value === 'random') setRandomSeed(Date.now())
            }}
          >
            <option value="importance">Most important first</option>
            <option value="az">A to Z</option>
            <option value="za">Z to A</option>
            <option value="random">Random mix</option>
          </select>
        </label>
        <button
          type="button"
          className="study-phrasal-reset-btn"
          onClick={resetPhrasalSearch}
          disabled={!hasActivePhrasalFilters}
          aria-label="Reset phrasal verb search and filters"
        >
          <span className="material-symbols-outlined">restart_alt</span>
          Reset
        </button>
      </div>

      {searchSuggestions.length ? (
        <div className="study-phrasal-suggestions" aria-label="Similar phrasal verb search suggestions">
          <span>Similar searches</span>
          {searchSuggestions.map((suggestion) => (
            <button
              key={`${suggestion.value}-${suggestion.hint}`}
              type="button"
              onClick={() => {
                const particleMatch = particleOptions.find((option) => option.particle === suggestion.value)
                const exactPhraseMatch = mergedPhrasalVerbs.some((verb) => (
                  normalizePhrasalSearchText(verb.phrase) === normalizePhrasalSearchText(suggestion.value)
                ))
                setSelectedTopic('all')
                if (particleMatch) {
                  setSelectedParticle(particleMatch.particle)
                  setSearch('')
                  setForcedPhraseSearch('')
                } else {
                  setSelectedParticle('all')
                  setSearch(suggestion.value)
                  setForcedPhraseSearch(exactPhraseMatch ? suggestion.value : '')
                }
                setVisibleCount(PHRASAL_VERB_BATCH_SIZE)
              }}
            >
              <strong>{suggestion.value}</strong>
              {suggestion.hint ? <small>{suggestion.hint}</small> : null}
            </button>
          ))}
        </div>
      ) : null}


      <div className="study-phrasal-section-title">
        <span>{selectedTopicMeta?.emoji}</span>
        <div className="study-phrasal-section-copy">
          <div className="study-phrasal-section-heading">
            <h3>
              {selectedTopicMeta?.label}
            </h3>
            <strong className="study-phrasal-result-count">
              {selectedParticle !== 'all'
                ? `${selectedParticle} · ${visibleVerbs.length} results`
                : search.trim()
                  ? `${visibleVerbs.length} results`
                  : `${visibleVerbs.length} expressions`}
            </strong>
          </div>
          <p>{selectedTopicMeta?.tone}</p>
        </div>
        {viewMode === 'favorites' && favoriteVerbs.length ? (
          <button type="button" className="study-phrasal-review-btn" onClick={openFavoriteReview}>
            <span className="material-symbols-outlined">style</span>
            Flashcard review
          </button>
        ) : null}
        <div className="study-phrasal-lang" aria-label="Translation language">
          <button
            type="button"
            className={translationLang === 'ko' ? 'study-filter-chip study-filter-chip--active' : 'study-filter-chip'}
            onClick={() => setTranslationLang('ko')}
          >
            🇰🇷 Korean
          </button>
          <button
            type="button"
            className={translationLang === 'zh' ? 'study-filter-chip study-filter-chip--active' : 'study-filter-chip'}
            onClick={() => setTranslationLang('zh')}
          >
            🇨🇳 Chinese
          </button>
        </div>
      </div>

      <div className="study-phrasal-grid">
        {renderedVerbs.map((verb) => {
          const topics = getPhrasalVerbTopicIds(verb).map((topicId) => topicMap[topicId]).filter(Boolean)
          const isFavorite = isPhrasalVerbFavorite(verb)
          const isHidden = isPhrasalVerbHidden(verb)
          const baseHint = getPhrasalVerbBaseHint(verb.phrase)
          const baseVerb = getPhrasalVerbBaseVerb(verb.phrase)
          const ordinaryVerbs = getUniqueOrdinaryVerbs(baseHint.verbs, [baseVerb])
          return (
            <article key={verb.id} className={isHidden ? 'study-phrasal-card study-phrasal-card--hidden' : 'study-phrasal-card'}>
              <header>
                <div className="study-phrasal-topic-tags">
                  {topics.map((topic) => (
                    <span key={`${verb.id}-${topic.id}`} className="study-phrasal-topic-badge">
                      {topic.emoji} {topic.shortLabel || topic.label}
                    </span>
                  ))}
                  {(verb.sourceRefs || []).map((source) => (
                    <span
                      key={`${verb.id}-${source.url || source.label || source.shortLabel}`}
                      className="study-phrasal-source-badge"
                      title={`${source.label} material`}
                    >
                      <span className="material-symbols-outlined">school</span>
                      {source.shortLabel || source.label}
                    </span>
                  ))}
                </div>
                <div className="study-phrasal-card-actions">
                  <button
                    type="button"
                    className={isFavorite ? 'study-phrasal-fav study-phrasal-fav--active' : 'study-phrasal-fav'}
                    onClick={() => toggleFavorite(verb)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Save as favorite'}
                  >
                    {isFavorite ? '★' : '☆'}
                  </button>
                  <button
                    type="button"
                    className={isHidden ? 'study-phrasal-fav study-phrasal-hide study-phrasal-hide--active' : 'study-phrasal-fav study-phrasal-hide'}
                    onClick={() => toggleHidden(verb)}
                    aria-label={isHidden ? 'Unhide this phrasal verb' : 'Hide this phrasal verb'}
                    title={isHidden ? 'Unhide this phrasal verb' : 'Hide this phrasal verb (too easy)'}
                  >
                    <span className="material-symbols-outlined">{isHidden ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </header>
              <div className="study-phrasal-card__main">
                <button type="button" onClick={() => playSpeech(verb.phrase)} className="study-phrasal-sound" aria-label={`Play ${verb.phrase}`}>
                  <span className="material-symbols-outlined">volume_up</span>
                </button>
                <div>
                  <button type="button" className="study-phrasal-title-button" onClick={() => openExample(verb, 0)}>
                    {verb.phrase}
                  </button>
                  <p className="study-phrasal-meaning">{verb.meaning[translationLang]}</p>
                </div>
              </div>
              <div className="study-phrasal-note-row">
                <strong>Use</strong>
                <p>{verb.when[translationLang]}</p>
              </div>
              <div className="study-phrasal-note-row study-phrasal-note-row--soft">
                <strong>Nuance</strong>
                <p>{verb.nuance[translationLang]}</p>
              </div>
              <div className="study-phrasal-base-row">
                <strong>
                  <button
                    type="button"
                    className="study-phrasal-base-word"
                    onClick={() => setOrdinaryVerbPopup(getOrdinaryVerbLookupWord(baseVerb))}
                    aria-label={`Open dictionary for ${baseVerb}`}
                  >
                    {baseVerb}
                  </button>
                </strong>
                <span className="study-phrasal-base-row__verbs">
                  {ordinaryVerbs.map((ordinaryVerb) => {
                    const lookupWord = getOrdinaryVerbLookupWord(ordinaryVerb)
                    return (
                      <button
                        key={`${verb.id}-${ordinaryVerb}`}
                        type="button"
                        className="study-phrasal-base-word"
                        onClick={() => setOrdinaryVerbPopup(lookupWord)}
                        aria-label={`Open dictionary for ${ordinaryVerb}`}
                      >
                        {ordinaryVerb}
                      </button>
                    )
                  })}
                </span>
                <small>{baseHint[translationLang]}</small>
              </div>
              <button type="button" className="study-phrasal-example" onClick={() => openExample(verb, 0)}>
                <span>{verb.examples[0].en}</span>
                <small>{verb.examples[0][translationLang]}</small>
              </button>
            </article>
          )
        })}
      </div>

      {hasMoreVerbs ? (
        <div ref={loadMoreRef} className="study-phrasal-load-more">
          <span>{renderedVerbs.length} / {visibleVerbs.length}</span>
          <button
            type="button"
            onClick={() => setVisibleCount((current) => Math.min(current + PHRASAL_VERB_BATCH_SIZE, visibleVerbs.length))}
          >
            Load more phrasal verbs
          </button>
        </div>
      ) : shouldUseProgressiveLoad && visibleVerbs.length ? (
        <div className="study-phrasal-load-more study-phrasal-load-more--done">
          All {visibleVerbs.length} phrasal verbs loaded.
        </div>
      ) : null}

      {!visibleVerbs.length ? (
        <div className="study-news-state">No phrasal verbs match this filter yet.</div>
      ) : null}

      <div className="study-phrasal-sources">
        <strong>Reference inspiration</strong>
        {PHRASAL_VERB_SOURCES.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
        ))}
        <span>Examples and translations here are original study content for UniLingo.</span>
      </div>

      {showFavoriteReview && typeof document !== 'undefined' ? createPortal((
        <div className="study-phrasal-modal" role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowFavoriteReview(false)
        }}>
          <article className="study-phrasal-favorite-review" ref={favoriteReviewRef}>
            <header>
              <div>
                <span className="study-phrasal-topic-badge">Favorites</span>
                <h2>Favorite Phrasal Verbs</h2>
                <p>Click a phrase to open its full study card.</p>
              </div>
              <div className="study-phrasal-detail__actions">
                <button
                  type="button"
                  onClick={() => setFavoriteMeaningsVisible((visible) => !visible)}
                  aria-label={favoriteMeaningsVisible ? 'Hide meanings' : 'Show meanings'}
                >
                  <span className="material-symbols-outlined">{favoriteMeaningsVisible ? 'visibility_off' : 'visibility'}</span>
                </button>
                <button type="button" onClick={() => setShowFavoriteReview(false)} aria-label="Close favorite review">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>
            <div className="study-phrasal-favorite-review__toolbar">
              <strong>{favoriteVerbs.length} saved</strong>
              <button type="button" onClick={() => setFavoriteMeaningsVisible((visible) => !visible)}>
                {favoriteMeaningsVisible ? 'Hide meanings' : 'Show meanings'}
              </button>
            </div>
            {favoriteVerbs.length ? (
              <div className={favoriteMeaningsVisible ? 'study-phrasal-favorite-list' : 'study-phrasal-favorite-list study-phrasal-favorite-list--hidden'}>
                {favoriteVerbs.map((verb) => {
                  const baseVerb = getPhrasalVerbBaseVerb(verb.phrase)
                  const baseHint = getPhrasalVerbBaseHint(verb.phrase)
                  const ordinaryVerbs = baseHint
                    ? getUniqueOrdinaryVerbs(baseHint.verbs, [baseVerb]).slice(0, 3)
                    : []
                  return (
                    <button
                      key={verb.id}
                      type="button"
                      className="study-phrasal-favorite-item"
                      data-favorite-verb-id={verb.id}
                      onClick={() => {
                        favoriteReviewScrollTopRef.current = favoriteReviewRef.current?.scrollTop || 0
                        favoriteReviewReturnTargetRef.current = verb.id
                        favoriteReviewShouldRestoreRef.current = true
                        setShowFavoriteReview(false)
                        openExample(verb, 0)
                      }}
                    >
                      <span className="study-phrasal-favorite-item__icon material-symbols-outlined">bookmark_star</span>
                      <span className="study-phrasal-favorite-item__content">
                        <span className="study-phrasal-favorite-item__phrase">
                          <strong>{verb.phrase}</strong>
                          <small>{ordinaryVerbs.length ? `Similar verb: ${ordinaryVerbs.join(', ')}` : 'Open the full study card'}</small>
                        </span>
                        <span className="study-phrasal-favorite-item__meaning">
                          {favoriteMeaningsVisible ? verb.meaning[translationLang] : 'Meaning hidden'}
                        </span>
                      </span>
                      <span className="study-phrasal-favorite-item__hint">10 examples</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="study-news-state">
                No favorite phrasal verbs yet. Tap the star on a card to save it here.
              </div>
            )}
          </article>
        </div>
      ), document.body) : null}

      {selectedVerb && typeof document !== 'undefined' ? createPortal((
        <div className="study-phrasal-modal" role="dialog" aria-modal="true" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSelectedVerbDetail()
        }}>
          <article className="study-phrasal-detail">
            <header>
              <div>
                <div className="study-phrasal-topic-tags">
                  {getPhrasalVerbTopicIds(selectedVerb).map((topicId) => topicMap[topicId]).filter(Boolean).map((topic) => (
                    <span key={`${selectedVerb.id}-${topic.id}`} className="study-phrasal-topic-badge">
                      {topic.emoji} {topic.label}
                    </span>
                  ))}
                  {(selectedVerb.sourceRefs || []).map((source) => (
                    <span
                      key={`${selectedVerb.id}-${source.url || source.label || source.shortLabel}`}
                      className="study-phrasal-source-badge"
                      title={`${source.label} material`}
                    >
                      <span className="material-symbols-outlined">school</span>
                      {source.shortLabel || source.label}
                    </span>
                  ))}
                </div>
                <h2>{selectedVerb.phrase}</h2>
                <p>{selectedVerb.meaning[translationLang]}</p>
                {(selectedVerb.sourceRefs || []).length ? (
                  <div className="study-phrasal-source-links">
                    {selectedVerb.sourceRefs.map((source) => (
                      <a
                        key={`${selectedVerb.id}-link-${source.url || source.label || source.shortLabel}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="study-phrasal-detail__actions">
                <button type="button" onClick={() => playSpeech(selectedVerb.phrase)} aria-label="Play phrasal verb">
                  <span className="material-symbols-outlined">volume_up</span>
                </button>
                <button type="button" onClick={() => toggleFavorite(selectedVerb)} aria-label="Toggle favorite">
                  {isPhrasalVerbFavorite(selectedVerb) ? '★' : '☆'}
                </button>
                <button type="button" onClick={closeSelectedVerbDetail} aria-label="Close">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>
            <div className="study-phrasal-detail__meta">
              <span>{translationLang === 'ko' ? 'Korean meaning' : 'Chinese meaning'}</span>
              <span>10 practice examples</span>
            </div>
            <section className="study-phrasal-english-meaning">
              <h3>English meaning</h3>
              <p>{selectedVerbEnglishMeaning}</p>
            </section>
            {selectedVerbBaseHint ? (
              <section className="study-phrasal-base-detail">
                <h3>Related ordinary verb</h3>
                <div>
                  <strong>
                    <button
                      type="button"
                      className="study-phrasal-base-word"
                      onClick={() => setOrdinaryVerbPopup(getOrdinaryVerbLookupWord(selectedVerbBaseVerb))}
                      aria-label={`Open dictionary for ${selectedVerbBaseVerb}`}
                    >
                      {selectedVerbBaseVerb}
                    </button>
                  </strong>
                  <span className="study-phrasal-base-row__verbs">
                    {selectedVerbOrdinaryVerbs.map((ordinaryVerb) => {
                      const lookupWord = getOrdinaryVerbLookupWord(ordinaryVerb)
                      return (
                        <button
                          key={`${selectedVerb.id}-${ordinaryVerb}`}
                          type="button"
                          className="study-phrasal-base-word"
                          onClick={() => setOrdinaryVerbPopup(lookupWord)}
                          aria-label={`Open dictionary for ${ordinaryVerb}`}
                        >
                          {ordinaryVerb}
                        </button>
                      )
                    })}
                  </span>
                </div>
                <p>{selectedVerbBaseHint[translationLang]}</p>
              </section>
            ) : null}
            <div className="study-phrasal-detail__explain">
              <section>
                <h3>When to use</h3>
                <p>{selectedVerb.when[translationLang]}</p>
              </section>
              <section>
                <h3>Nuance</h3>
                <p>{selectedVerb.nuance[translationLang]}</p>
              </section>
            </div>
            <div className="study-phrasal-detail__examples">
              <h3>Everyday examples</h3>
              {selectedVerbExamples.map((example, index) => (
                <button
                  key={example.en}
                  type="button"
                  className={selectedExampleIndex === index ? 'study-phrasal-example-row study-phrasal-example-row--active' : 'study-phrasal-example-row'}
                  onClick={() => {
                    setSelectedExampleIndex(index)
                    playSpeech(example.en)
                  }}
                >
                  <span className="study-phrasal-example-row__number">{index + 1}</span>
                  <span className="study-phrasal-example-row__text">
                    <strong>{example.en}</strong>
                    <small>{example[translationLang]}</small>
                  </span>
                  <span className="study-phrasal-example-row__sound material-symbols-outlined" aria-hidden="true">volume_up</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      ), document.body) : null}

      {ordinaryVerbPopup && typeof document !== 'undefined' ? createPortal((
        <NewsWordPopup
          word={ordinaryVerbPopup}
          initialLang={translationLang}
          onClose={() => setOrdinaryVerbPopup(null)}
        />
      ), document.body) : null}
    </section>
  )
}

function NewsReadingPanel({ resetToken = 0 }) {
  const user = useAuthStore((state) => state.user)
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const tokens = useAuthStore((state) => state.tokens)
  const accountKey = user?.id || user?.email || 'guest'
  const canSyncNews = isAdmin || user?.user_level === 'admin' || user?.userLevel === 'admin'
  const approvalStatus = user?.approvalStatus || user?.approval_status
  const isApprovedUser = user?.is_approved === true || approvalStatus === 'approved'
  const canOpenNewsDetail = Boolean(isAuthenticated && (canSyncNews || isApprovedUser))
  const initialSyncState = getSharedNewsSyncState(accountKey)
  const [newsArticles, setNewsArticles] = useState([])
  const [newsMeta, setNewsMeta] = useState({ total: 0, latestDate: '', storage: '' })
  const [articleDetails, setArticleDetails] = useState({})
  const [newsLoadStatus, setNewsLoadStatus] = useState('loading')
  const [newsLoadError, setNewsLoadError] = useState('')
  const [difficulty, setDifficulty] = useState('all')
  const [newsSearch, setNewsSearch] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeSection, setActiveSection] = useState(null)
  const [selectedArticleId, setSelectedArticleId] = useState(null)
  const [isArticleModalFullscreen, setIsArticleModalFullscreen] = useState(false)
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [newsTranslationLang, setNewsTranslationLang] = useState('en')
  const [showNewsWordHints, setShowNewsWordHints] = useState(() => {
    const prefs = readJsonStorage(NEWS_READER_PREF_STORAGE_KEY, accountKey, { showWordHints: true })
    return prefs?.showWordHints !== false
  })
  const [sentenceTranslations, setSentenceTranslations] = useState({})
  const [speakingSentenceIndex, setSpeakingSentenceIndex] = useState(null)
  const [isArticleSpeechPlaying, setIsArticleSpeechPlaying] = useState(false)
  const [isArticleSpeechPaused, setIsArticleSpeechPaused] = useState(false)
  const [wordPopup, setWordPopup] = useState(null)
  const [studyGuideItems, setStudyGuideItems] = useState([])
  const [studyGuideStatus, setStudyGuideStatus] = useState('idle')
  const [newsQuizQuestions, setNewsQuizQuestions] = useState([])
  const [newsQuizStatus, setNewsQuizStatus] = useState('idle')
  const [quizSelections, setQuizSelections] = useState({})
  const [showQuizAnswers, setShowQuizAnswers] = useState(false)
  const [insightRetryCount, setInsightRetryCount] = useState(0)
  const [syncProgress, setSyncProgress] = useState(initialSyncState.progress)
  const [syncStatus, setSyncStatus] = useState(initialSyncState.status)
  const [isSyncing, setIsSyncing] = useState(initialSyncState.isSyncing)
  const [syncFetchedCount, setSyncFetchedCount] = useState(initialSyncState.fetchedCount)
  const [syncFinishedAt, setSyncFinishedAt] = useState(initialSyncState.finishedAt)
  const [favoriteNewsIds, setFavoriteNewsIds] = useState(() => readJsonStorage(NEWS_FAVORITES_STORAGE_KEY, accountKey, []))
  const [completedNewsIds, setCompletedNewsIds] = useState(() => readJsonStorage(NEWS_COMPLETED_STORAGE_KEY, accountKey, []))
  const [visibleSectionArticleCount, setVisibleSectionArticleCount] = useState(NEWS_SECTION_BATCH_SIZE)
  const speechRunRef = useRef(0)
  const newsSectionLoadMoreRef = useRef(null)
  const newsDetailScrollRef = useRef(null)
  const newsModalHeaderRef = useRef(null)

  const newsSections = useMemo(() => {
    const sections = [...new Set(newsArticles.map((article) => article.section).filter(Boolean))]
    return sections.length ? sections.sort() : NEWS_SECTION_FALLBACKS
  }, [newsArticles])

  const articleLatestDate = useMemo(() => {
    return newsArticles.reduce((latest, item) => (!latest || item.date > latest ? item.date : latest), '')
  }, [newsArticles])
  const latestDate = articleLatestDate || newsMeta.latestDate || ''
  const favoriteNewsCount = favoriteNewsIds.length
  const applySyncState = (state) => {
    setSyncProgress(state.progress)
    setSyncStatus(state.status)
    setIsSyncing(state.isSyncing)
    setSyncFetchedCount(state.fetchedCount)
    setSyncFinishedAt(state.finishedAt)
  }

  const openNewsReadFilterView = (filter) => {
    setNewsSearch('')
    setDifficulty('all')
    setReadFilter((current) => (current === filter ? 'all' : filter))
    setDateFrom('')
    setDateTo('')
    setActiveSection(null)
  }

  const filteredArticles = useMemo(() => {
    const normalizedSearch = newsSearch.trim().toLowerCase()
    return newsArticles
      .filter((article) => difficulty === 'all' || article.difficulty === difficulty)
      .filter((article) => {
        if (!normalizedSearch) return true
        return [
          article.title,
          article.excerpt,
          article.section,
          article.difficulty,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      })
      .filter((article) => {
        if (readFilter === 'completed') return completedNewsIds.includes(article.id)
        if (readFilter === 'unread') return !completedNewsIds.includes(article.id)
        if (readFilter === 'favorites') return favoriteNewsIds.includes(article.id)
        return true
      })
      .filter((article) => !dateFrom || article.date >= dateFrom)
      .filter((article) => !dateTo || article.date <= dateTo)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [completedNewsIds, dateFrom, dateTo, difficulty, favoriteNewsIds, newsArticles, newsSearch, readFilter])

  const sectionSummaries = useMemo(() => {
    return newsSections
      .map((item) => {
        const articles = filteredArticles.filter((article) => article.section === item)
        return {
          section: item,
          count: articles.length,
          articles: articles.slice(0, NEWS_SECTION_PREVIEW_LIMIT),
          latestDate: articles[0]?.date || '',
        }
      })
      .filter((item) => item.count > 0)
  }, [filteredArticles, newsSections])

  const activeSectionArticles = useMemo(() => {
    if (!activeSection) return []
    return filteredArticles.filter((article) => article.section === activeSection)
  }, [activeSection, filteredArticles])
  const renderedActiveSectionArticles = useMemo(() => (
    activeSectionArticles.slice(0, visibleSectionArticleCount)
  ), [activeSectionArticles, visibleSectionArticleCount])
  const hasMoreActiveSectionArticles = visibleSectionArticleCount < activeSectionArticles.length

  const selectedArticleSummary = useMemo(() => {
    return newsArticles.find((article) => article.id === selectedArticleId) || null
  }, [newsArticles, selectedArticleId])
  const selectedArticle = selectedArticleId ? (articleDetails[selectedArticleId] || selectedArticleSummary) : null

  const articleSentenceEntries = useMemo(() => splitArticleIntoSentenceEntries(selectedArticle), [selectedArticle])
  const isFavorite = selectedArticle ? favoriteNewsIds.includes(selectedArticle.id) : false
  const isCompleted = selectedArticle ? completedNewsIds.includes(selectedArticle.id) : false
  const speechProgress = articleSentenceEntries.length
    ? Math.round(((speakingSentenceIndex ?? activeSentenceIndex) + 1) / articleSentenceEntries.length * 100)
    : 0
  const hasActiveNewsFilters = Boolean(newsSearch.trim())
    || difficulty !== 'all'
    || readFilter !== 'all'
    || Boolean(dateFrom)
    || Boolean(dateTo)
    || Boolean(activeSection)
  const resetNewsFilters = () => {
    setNewsSearch('')
    setDifficulty('all')
    setReadFilter('all')
    setDateFrom('')
    setDateTo('')
    setActiveSection(null)
  }

  useEffect(() => {
    resetNewsFilters()
    setSelectedArticleId(null)
    setIsArticleModalFullscreen(false)
    setActiveSentenceIndex(0)
    setSpeakingSentenceIndex(null)
    setIsArticleSpeechPlaying(false)
    setIsArticleSpeechPaused(false)
    setSentenceTranslations({})
    speechRunRef.current += 1
    window.speechSynthesis?.cancel()
  }, [resetToken])

  useEffect(() => {
    setFavoriteNewsIds(readJsonStorage(NEWS_FAVORITES_STORAGE_KEY, accountKey, []))
    setCompletedNewsIds(readJsonStorage(NEWS_COMPLETED_STORAGE_KEY, accountKey, []))
    const prefs = readJsonStorage(NEWS_READER_PREF_STORAGE_KEY, accountKey, { showWordHints: true })
    setShowNewsWordHints(prefs?.showWordHints !== false)
    clearOversizedNewsCacheStorage()
  }, [accountKey])

  useEffect(() => {
    applySyncState(getSharedNewsSyncState(accountKey))
    return subscribeNewsSyncState((syncAccountKey, state) => {
      if (syncAccountKey !== accountKey) return
      applySyncState(state)
    })
  }, [accountKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      getAccountStorageKey(NEWS_READER_PREF_STORAGE_KEY, accountKey),
      JSON.stringify({ showWordHints: showNewsWordHints }),
    )
  }, [accountKey, showNewsWordHints])

  // Admins: automatically fetch articles newer than the saved library once per session
  useEffect(() => {
    if (NEWS_AUTO_SYNC_TRIGGERED) return
    if (!canSyncNews || !tokens?.access_token || isSyncing) return
    if (newsLoadStatus !== 'ready') return
    NEWS_AUTO_SYNC_TRIGGERED = true
    runAdminSync()
  }, [canSyncNews, isSyncing, newsLoadStatus, tokens?.access_token])

  useEffect(() => {
    setVisibleSectionArticleCount(NEWS_SECTION_BATCH_SIZE)
  }, [activeSection, newsSearch, difficulty, readFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!activeSection || !hasMoreActiveSectionArticles || !newsSectionLoadMoreRef.current || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setVisibleSectionArticleCount((current) => Math.min(current + NEWS_SECTION_BATCH_SIZE, activeSectionArticles.length))
    }, { rootMargin: '420px 0px' })
    observer.observe(newsSectionLoadMoreRef.current)
    return () => observer.disconnect()
  }, [activeSection, activeSectionArticles.length, hasMoreActiveSectionArticles])

  useEffect(() => {
    let cancelled = false

    async function loadNewsSummaries() {
      setNewsLoadStatus('loading')
      setNewsLoadError('')
      try {
        const response = await fetchNewsSummariesPayload()
        if (cancelled) return
        setNewsArticles(response.articles)
        setNewsMeta(response.meta)
        setNewsLoadStatus('ready')
      } catch (error) {
        if (cancelled) return
        setNewsLoadError(error?.message || 'Failed to load Engoo news.')
        setNewsLoadStatus('error')
      }
    }

    loadNewsSummaries()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!syncFinishedAt || !syncStatus.startsWith('Fetched ')) return undefined
    let cancelled = false

    async function refreshAfterSync() {
      try {
        const response = await fetchNewsSummariesPayload()
        if (cancelled) return
        setNewsArticles(response.articles)
        setNewsMeta(response.meta)
      } catch {
        // Keep the existing list if the post-sync refresh fails.
      }
    }

    refreshAfterSync()
    return () => {
      cancelled = true
    }
  }, [syncFinishedAt, syncStatus])

  useEffect(() => {
    if (!selectedArticleId || articleDetails[selectedArticleId] || !canOpenNewsDetail) return undefined
    let cancelled = false

    async function loadArticleDetail() {
      try {
        const response = await apiGet(`/api/study-lab/engoo-news/${encodeURIComponent(selectedArticleId)}`)
        if (cancelled) return
        setArticleDetails((current) => ({
          ...current,
          [selectedArticleId]: response.data?.article || selectedArticleSummary,
        }))
      } catch {
        if (cancelled) return
        setArticleDetails((current) => ({
          ...current,
          [selectedArticleId]: selectedArticleSummary,
        }))
      }
    }

    loadArticleDetail()
    return () => {
      cancelled = true
    }
  }, [articleDetails, canOpenNewsDetail, selectedArticleId, selectedArticleSummary])

  useEffect(() => {
    setQuizSelections({})
    setShowQuizAnswers(false)
    if (!selectedArticleId || !canOpenNewsDetail || !tokens?.access_token) {
      setStudyGuideItems([])
      setNewsQuizQuestions([])
      setStudyGuideStatus('idle')
      setNewsQuizStatus('idle')
      return undefined
    }

    const insightLang = newsTranslationLang === 'en' ? 'ko' : newsTranslationLang
    const cacheKey = `${selectedArticleId}:${insightLang}`
    const cached = NEWS_AI_INSIGHT_CACHE.get(cacheKey)
    if (cached) {
      setStudyGuideItems(cached.items)
      setStudyGuideStatus(cached.items.length ? 'ready' : 'error')
      setNewsQuizQuestions(cached.questions)
      setNewsQuizStatus(cached.questions.length ? 'ready' : 'error')
      return undefined
    }

    let cancelled = false
    const authHeaders = { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    const encodedId = encodeURIComponent(selectedArticleId)

    async function loadInsights() {
      setStudyGuideItems([])
      setNewsQuizQuestions([])
      setStudyGuideStatus('loading')
      setNewsQuizStatus('waiting')

      let items = []
      try {
        const response = await apiGet(`/api/study-lab/engoo-news/${encodedId}/study-guide`, { lang: insightLang }, authHeaders)
        if (cancelled) return
        items = response.data?.items || []
        setStudyGuideItems(items)
        setStudyGuideStatus(items.length ? 'ready' : 'error')
      } catch {
        if (cancelled) return
        setStudyGuideStatus('error')
      }

      let questions = []
      setNewsQuizStatus('loading')
      try {
        const response = await apiGet(`/api/study-lab/engoo-news/${encodedId}/quiz`, { lang: insightLang, count: 5 }, authHeaders)
        if (cancelled) return
        questions = response.data?.questions || []
        setNewsQuizQuestions(questions)
        setNewsQuizStatus(questions.length ? 'ready' : 'error')
      } catch {
        if (cancelled) return
        setNewsQuizStatus('error')
      }

      if (items.length || questions.length) {
        NEWS_AI_INSIGHT_CACHE.set(cacheKey, { items, questions })
      }
    }

    loadInsights()
    return () => {
      cancelled = true
    }
  }, [canOpenNewsDetail, insightRetryCount, newsTranslationLang, selectedArticleId, tokens?.access_token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(NEWS_FAVORITES_STORAGE_KEY, accountKey), JSON.stringify(favoriteNewsIds))
  }, [accountKey, favoriteNewsIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(NEWS_COMPLETED_STORAGE_KEY, accountKey), JSON.stringify(completedNewsIds))
  }, [accountKey, completedNewsIds])

  useEffect(() => {
    setActiveSentenceIndex(0)
    setSpeakingSentenceIndex(null)
    setIsArticleSpeechPlaying(false)
    setIsArticleSpeechPaused(false)
    setSentenceTranslations({})
    speechRunRef.current += 1
    window.speechSynthesis?.cancel()
  }, [selectedArticle?.id])

  useEffect(() => {
    if (typeof document === 'undefined' || !selectedArticleId) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [selectedArticleId])

  useEffect(() => {
    let cancelled = false

    async function translateArticleSentences() {
      if (!selectedArticle || newsTranslationLang === 'en') {
        setSentenceTranslations({})
        return
      }

      const cachePrefix = `${selectedArticle.id}.${newsTranslationLang}`
      const cachedEntries = {}
      const missingEntries = []
      for (const entry of articleSentenceEntries) {
        const cacheKey = `${cachePrefix}.${entry.id}`
        if (NEWS_TRANSLATION_CACHE.has(cacheKey)) {
          cachedEntries[entry.id] = NEWS_TRANSLATION_CACHE.get(cacheKey)
        } else {
          missingEntries.push(entry)
        }
      }
      setSentenceTranslations(cachedEntries)

      try {
        const { translateText } = await import('../../dictionary/_06_services/service')
        const translatedEntries = await Promise.all(missingEntries.map(async (entry) => {
          const cacheKey = `${cachePrefix}.${entry.id}`
          const translated = await translateText(entry.text, 'en', newsTranslationLang)
          const nextText = translated || 'Translation is unavailable right now.'
          NEWS_TRANSLATION_CACHE.set(cacheKey, nextText)
          return [entry.id, nextText]
        }))
        if (!cancelled) {
          setSentenceTranslations((current) => ({
            ...current,
            ...Object.fromEntries(translatedEntries),
          }))
        }
      } catch {
        if (!cancelled) {
          setSentenceTranslations((current) => ({ ...current }))
        }
      }
    }

    translateArticleSentences()
    return () => {
      cancelled = true
    }
  }, [articleSentenceEntries, newsTranslationLang, selectedArticle])

  const toggleFavorite = (articleId) => {
    if (!canOpenNewsDetail) return
    setFavoriteNewsIds((current) => (
      current.includes(articleId) ? current.filter((id) => id !== articleId) : [...current, articleId]
    ))
  }

  const toggleCompleted = (articleId) => {
    if (!canOpenNewsDetail) return
    setCompletedNewsIds((current) => (
      current.includes(articleId) ? current.filter((id) => id !== articleId) : [...current, articleId]
    ))
  }

  const openArticle = (articleId) => {
    setSelectedArticleId(articleId)
    setActiveSentenceIndex(0)
    setSpeakingSentenceIndex(null)
    setIsArticleSpeechPlaying(false)
    setIsArticleSpeechPaused(false)
    speechRunRef.current += 1
    window.speechSynthesis?.cancel()
  }

  const closeArticle = () => {
    setSelectedArticleId(null)
    setIsArticleModalFullscreen(false)
    setActiveSentenceIndex(0)
    setSpeakingSentenceIndex(null)
    setIsArticleSpeechPlaying(false)
    setIsArticleSpeechPaused(false)
    speechRunRef.current += 1
    window.speechSynthesis?.cancel()
  }

  const playArticleSentence = (index = activeSentenceIndex, runId = speechRunRef.current + 1) => {
    if (!canOpenNewsDetail) return
    const entry = articleSentenceEntries[index]
    if (!entry) return
    speechRunRef.current = runId
    setActiveSentenceIndex(index)
    setSpeakingSentenceIndex(index)
    setIsArticleSpeechPlaying(true)
    setIsArticleSpeechPaused(false)
    playSpeech(entry.text, {
      rate: speed,
      onEnd: () => {
        if (speechRunRef.current !== runId) return
        const nextIndex = index + 1
        if (nextIndex < articleSentenceEntries.length) {
          playArticleSentence(nextIndex, runId)
          return
        }
        setSpeakingSentenceIndex(null)
        setActiveSentenceIndex(0)
        setIsArticleSpeechPlaying(false)
        setIsArticleSpeechPaused(false)
      },
    })
  }

  useEffect(() => {
    if (!selectedArticleId || typeof ResizeObserver === 'undefined') return undefined
    const headerElement = newsModalHeaderRef.current
    const container = newsDetailScrollRef.current
    if (!headerElement || !container) return undefined
    const updateStickyOffset = () => {
      container.style.setProperty('--news-header-height', `${headerElement.offsetHeight}px`)
    }
    updateStickyOffset()
    const observer = new ResizeObserver(updateStickyOffset)
    observer.observe(headerElement)
    return () => observer.disconnect()
  }, [selectedArticleId])

  useEffect(() => {
    const followIndex = speakingSentenceIndex ?? (isArticleSpeechPlaying ? activeSentenceIndex : null)
    if (followIndex == null) return
    const container = newsDetailScrollRef.current
    if (!container) return
    const target = container.querySelector(`[data-sentence-index="${followIndex}"]`)
    if (!target) return
    const containerRect = container.getBoundingClientRect()
    const stickyHeaderHeight = container.querySelector('header')?.getBoundingClientRect().height || 0
    const targetRect = target.getBoundingClientRect()
    const visibleTop = containerRect.top + stickyHeaderHeight
    const isOutOfView = targetRect.top < visibleTop || targetRect.bottom > containerRect.bottom
    if (!isOutOfView) return
    const centerOffset = targetRect.top - visibleTop - (containerRect.bottom - visibleTop - targetRect.height) / 2
    container.scrollTo({ top: container.scrollTop + centerOffset, behavior: 'smooth' })
  }, [activeSentenceIndex, isArticleSpeechPlaying, speakingSentenceIndex])

  const readAdjacentSentence = (direction) => {
    if (!canOpenNewsDetail) return
    if (!articleSentenceEntries.length) return
    const next = activeSentenceIndex + direction
    const bounded = next < 0 ? articleSentenceEntries.length - 1 : next >= articleSentenceEntries.length ? 0 : next
    playArticleSentence(bounded)
  }

  const toggleArticlePause = () => {
    if (!canOpenNewsDetail) return
    if (!window.speechSynthesis?.speaking && !window.speechSynthesis?.paused) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsArticleSpeechPaused(false)
      setIsArticleSpeechPlaying(true)
      return
    }
    window.speechSynthesis.pause()
    setIsArticleSpeechPaused(true)
    setIsArticleSpeechPlaying(false)
  }

  const stopArticleSpeech = () => {
    speechRunRef.current += 1
    window.speechSynthesis?.cancel()
    setActiveSentenceIndex(0)
    setSpeakingSentenceIndex(null)
    setIsArticleSpeechPlaying(false)
    setIsArticleSpeechPaused(false)
  }

  const runAdminSync = async () => {
    if (isSyncing) return
    if (!tokens?.access_token) {
      applySyncState(publishNewsSyncState(accountKey, {
        progress: 0,
        status: 'Admin login is required before syncing Engoo data.',
        isSyncing: false,
        fetchedCount: 0,
        error: 'Authentication required',
      }))
      return
    }

    try {
      await startAdminNewsSync({
        accountKey,
        accessToken: tokens.access_token,
        latestDate,
      })
    } catch {
      // Shared sync state already stores the error for every mounted view.
    }
  }

  const renderInteractiveText = (text, options = {}) => {
    const { variant = 'body' } = options
    return text.split(/(\s+)/).map((part, index) => {
      const word = cleanWord(part)
      if (!word || word.length < 4 || isLikelyProperNoun(part)) return <span key={`${part}-${index}`}>{part}</span>
      return (
        <button
          key={`${word}-${index}`}
          type="button"
          className={[
            'study-news-word',
            !showNewsWordHints ? 'study-news-word--plain' : '',
            variant === 'title' ? 'study-news-word--title' : '',
          ].filter(Boolean).join(' ')}
          onClick={(event) => {
            event.stopPropagation()
            if (!canOpenNewsDetail) return
            setWordPopup(word)
            playSpeech(word)
          }}
        >
          {part}
        </button>
      )
    })
  }

  return (
    <section className="study-news">
      <div className="study-news-hero">
        <div>
          <span className="study-news-source">Source: Engoo Daily News</span>
          <h2>Read current news by level, then listen sentence by sentence.</h2>
          <p>Choose a section, level, or date range. Admin sync can refresh all available Engoo sections.</p>
        </div>
        <div className="study-news-latest">
          <strong>{newsLoadStatus === 'loading' ? 'Loading...' : latestDate || 'Not synced'}</strong>
          <span>{newsMeta.total ? `${newsMeta.total.toLocaleString()} saved articles` : 'latest saved data'}</span>
          <div className="study-news-summary-row">
            <button
              type="button"
              className={`study-news-favorite-summary ${readFilter === 'favorites' ? 'study-news-favorite-summary--active' : ''}`}
              onClick={() => openNewsReadFilterView('favorites')}
              disabled={favoriteNewsCount === 0}
              aria-label={`Show favorite news articles (${favoriteNewsCount})`}
              title={`Show favorite articles (${favoriteNewsCount})`}
            >
              <span className="material-symbols-outlined">star</span>
              <strong>{favoriteNewsCount}</strong>
            </button>
            <button
              type="button"
              className={`study-news-favorite-summary study-news-favorite-summary--done ${readFilter === 'completed' ? 'study-news-favorite-summary--active' : ''}`}
              onClick={() => openNewsReadFilterView('completed')}
              disabled={completedNewsIds.length === 0}
              aria-label={`Show completed news articles (${completedNewsIds.length})`}
              title={`Show completed articles (${completedNewsIds.length})`}
            >
              <span className="material-symbols-outlined">task_alt</span>
              <strong>{completedNewsIds.length}</strong>
            </button>
          </div>
        </div>
      </div>

      <div className="study-news-filters">
        <label>
          Search
          <input
            type="search"
            value={newsSearch}
            onChange={(event) => setNewsSearch(event.target.value)}
            placeholder="Title, topic, section..."
          />
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="all">Mixed levels</option>
            {NEWS_DIFFICULTIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Reading status
          <select value={readFilter} onChange={(event) => setReadFilter(event.target.value)}>
            <option value="all">All articles</option>
            <option value="unread">Unread only</option>
            <option value="completed">Completed</option>
            <option value="favorites">Favorites ({favoriteNewsCount})</option>
          </select>
        </label>
        <label>
          From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button
          type="button"
          className="study-news-reset-btn"
          onClick={resetNewsFilters}
          disabled={!hasActiveNewsFilters}
          aria-label="Reset news search and filters"
        >
          <span className="material-symbols-outlined">restart_alt</span>
          Reset
        </button>
      </div>

      {newsLoadStatus === 'loading' ? (
        <div
          className="study-news-state study-news-state--loading"
          role="status"
          aria-live="polite"
          aria-label="Loading Engoo news"
        >
          <div className="study-news-loading-bar" aria-hidden="true">
            <i />
          </div>
          <span className="study-news-loading-sr">Loading Engoo news</span>
        </div>
      ) : null}

      {newsLoadStatus === 'error' ? (
        <div className="study-news-state study-news-state--error">
          {newsLoadError || 'Failed to load saved Engoo news.'}
        </div>
      ) : null}

      {!activeSection ? (
        <div className="study-news-section-grid">
          {sectionSummaries.map((item) => (
            <article key={item.section} className="study-news-section-card">
              <header className="study-news-section-card__header">
                <div>
                  <h3>{item.section}</h3>
                  <span>{item.count} articles · latest {item.latestDate}</span>
                </div>
                <button type="button" className="study-news-section-more" onClick={() => setActiveSection(item.section)}>
                  <span className="material-symbols-outlined">newspaper</span>
                  More
                </button>
              </header>
              <div className="study-news-feature-grid">
                {item.articles.map((article, articleIndex) => (
                  <button
                    key={article.id}
                    type="button"
                    className={`study-news-feature-card ${!canOpenNewsDetail ? 'study-news-feature-card--locked' : ''} ${completedNewsIds.includes(article.id) ? 'study-news-feature-card--completed' : ''}`}
                    onClick={() => openArticle(article.id)}
                  >
                    <span className="study-news-feature-image">
                      {article.imageUrl ? <img src={article.imageUrl} alt="" loading="lazy" /> : <span className="study-news-image-fallback">Engoo</span>}
                      {isRecentNewsArticle(article) ? <span className="study-news-new-badge">NEW</span> : null}
                      {!canOpenNewsDetail ? <span className="study-news-lock-badge">Locked</span> : null}
                      {completedNewsIds.includes(article.id) ? <span className="study-news-complete-badge">Done</span> : null}
                    </span>
                    <span className="study-news-feature-content">
                      <strong>{article.title}</strong>
                      <span className="study-news-level-row">
                        <span className="study-news-level-main">
                          <b>{getNewsLevelNumber(article.difficulty)}</b>
                          {getNewsLevelLabel(article.difficulty)}
                        </span>
                        <span className="study-news-level-date">{formatNewsDateLabel(article)}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="study-news-section-view">
          <header>
            <button type="button" className="study-news-back-btn" onClick={() => setActiveSection(null)}>
              <span className="material-symbols-outlined">arrow_back</span>
              Sections
            </button>
            <div>
              <h3>{activeSection}</h3>
              <span>{activeSectionArticles.length} articles, newest first</span>
            </div>
          </header>
          <div className="study-news-grid study-news-grid--wide">
            {renderedActiveSectionArticles.map((article) => {
              const isCompleted = completedNewsIds.includes(article.id)
              const isFavorite = favoriteNewsIds.includes(article.id)
              return (
                <article
                  key={article.id}
                  className={`study-news-feature-card study-news-feature-card--section ${!canOpenNewsDetail ? 'study-news-feature-card--locked' : ''} ${isCompleted ? 'study-news-feature-card--completed' : ''}`}
                  onClick={() => openArticle(article.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openArticle(article.id)
                    }
                  }}
                >
                  <span className="study-news-feature-image">
                    {article.imageUrl ? <img src={article.imageUrl} alt="" loading="lazy" /> : <span className="study-news-image-fallback">Engoo</span>}
                    {isRecentNewsArticle(article) ? <span className="study-news-new-badge">NEW</span> : null}
                    {!canOpenNewsDetail ? <span className="study-news-lock-badge">Locked</span> : null}
                  </span>
                  <div className="study-news-feature-content study-news-feature-content--section">
                    <small>{article.difficulty}</small>
                    <strong>{article.title}</strong>
                    <p>{article.excerpt}</p>
                    <span className="study-news-level-row">
                      <span className="study-news-level-main">
                        <b>{getNewsLevelNumber(article.difficulty)}</b>
                        {getNewsLevelLabel(article.difficulty)}
                      </span>
                      <span className="study-news-level-side">
                        {(isFavorite || isCompleted) ? (
                          <span className="study-news-status-inline" aria-label="Saved article status">
                            {isFavorite ? <span className="material-symbols-outlined" title="Favorite">star</span> : null}
                            {isCompleted ? <span className="material-symbols-outlined" title="Completed">task_alt</span> : null}
                          </span>
                        ) : null}
                        <span className="study-news-level-date">{formatNewsDateLabel(article)}</span>
                      </span>
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
          {hasMoreActiveSectionArticles ? (
            <div ref={newsSectionLoadMoreRef} className="study-news-state study-news-state--loading" role="status" aria-live="polite">
              <div className="study-news-loading-bar" aria-hidden="true">
                <i />
              </div>
              <span className="study-news-loading-sr">Loading more {activeSection} articles</span>
            </div>
          ) : null}
        </section>
      )}

      {canSyncNews ? (
        <section className="study-news-admin" aria-label="Admin Engoo news sync">
          <div>
            <strong>Admin data sync</strong>
            <span>
              Fetch Engoo articles newer than {latestDate || 'the latest saved date'}.
              {newsMeta.total ? ` Current library: ${newsMeta.total.toLocaleString()} articles.` : ''}
            </span>
          </div>
          <button type="button" onClick={runAdminSync} disabled={isSyncing}>
            <span className="material-symbols-outlined">{isSyncing ? 'sync' : 'cloud_download'}</span>
            {isSyncing ? 'Fetching...' : 'Fetch latest data'}
          </button>
          <div className="study-progress-line">
            <span>{syncProgress}%</span>
            <div><i style={{ width: `${syncProgress}%` }} /></div>
          </div>
          <p>{syncStatus}</p>
          {!isSyncing && syncFetchedCount > 0 ? (
            <p>Last fetch result: {syncFetchedCount.toLocaleString()} new articles added.</p>
          ) : null}
        </section>
      ) : null}

      {selectedArticle && typeof document !== 'undefined' ? createPortal((
        <div className={`study-news-modal ${isArticleModalFullscreen ? 'study-news-modal--fullscreen' : ''}`} role="dialog" aria-modal="true">
          <article className="study-news-detail" ref={newsDetailScrollRef}>
            <header ref={newsModalHeaderRef}>
              <div>
                <span>{selectedArticle.section} · {selectedArticle.difficulty} · {selectedArticle.source}</span>
                <h2 className="study-news-title">{renderInteractiveText(selectedArticle.title, { variant: 'title' })}</h2>
                {!canOpenNewsDetail ? (
                  <span className="study-news-locked-copy">Log in and wait for admin approval to read the full article.</span>
                ) : null}
              </div>
              <div className="study-news-modal-actions">
                <button
                  type="button"
                  className={`study-news-icon-btn ${isFavorite ? 'study-news-icon-btn--active' : ''}`}
                  onClick={() => toggleFavorite(selectedArticle.id)}
                  disabled={!canOpenNewsDetail}
                  title={isFavorite ? 'Remove favorite' : 'Favorite article'}
                  aria-label={isFavorite ? 'Remove favorite' : 'Favorite article'}
                >
                  <span className="material-symbols-outlined">{isFavorite ? 'star' : 'star_outline'}</span>
                </button>
                <button
                  type="button"
                  className={`study-news-complete-btn ${isCompleted ? 'study-news-complete-btn--active' : ''}`}
                  onClick={() => toggleCompleted(selectedArticle.id)}
                  disabled={!canOpenNewsDetail}
                  title={isCompleted ? 'Mark as unread' : 'Mark as completed'}
                  aria-label={isCompleted ? 'Mark as unread' : 'Mark as completed'}
                >
                  <span className="material-symbols-outlined">{isCompleted ? 'task_alt' : 'check_circle'}</span>
                </button>
                <button type="button" className="study-news-icon-btn" onClick={() => setIsArticleModalFullscreen((current) => !current)} title="Toggle fullscreen" aria-label="Toggle fullscreen">
                  <span className="material-symbols-outlined">{isArticleModalFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
                <button type="button" className="study-news-icon-btn" onClick={closeArticle} title="Close article" aria-label="Close article">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>

            {selectedArticle.imageUrl ? (
              <figure className="study-news-detail-image">
                <img src={selectedArticle.imageUrl} alt="" />
                <figcaption>
                  {selectedArticle.section} ·{' '}
                  <a href={selectedArticle.sourceUrl} target="_blank" rel="noreferrer">Engoo Daily News</a>
                </figcaption>
              </figure>
            ) : null}

            {!canOpenNewsDetail ? (
              <div className="study-news-lock-panel">
                <span className="material-symbols-outlined">lock</span>
                <div>
                  <strong>Article practice is available after login and admin approval.</strong>
                  <p>Please sign in with an approved account to read, listen, favorite, and mark articles as completed.</p>
                </div>
              </div>
            ) : null}

            <div className="study-news-toolbar">
              <div className="study-news-toolbar__side">
                <div className="study-news-language-row" aria-label="Article translation language">
                  {[
                    ['en', '🇺🇸', 'English'],
                    ['ko', '🇰🇷', 'Korean'],
                    ['zh', '🇨🇳', 'Chinese'],
                  ].map(([id, flag, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`study-filter-chip ${newsTranslationLang === id ? 'study-filter-chip--active' : ''}`}
                      onClick={() => setNewsTranslationLang(id)}
                      disabled={!canOpenNewsDetail}
                      aria-label={label}
                      title={label}
                    >
                      <span className="study-news-language-flag" aria-hidden="true">{flag}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`study-news-word-toggle ${showNewsWordHints ? 'study-news-word-toggle--active' : ''}`}
                  onClick={() => setShowNewsWordHints((current) => !current)}
                  disabled={!canOpenNewsDetail}
                  aria-label={showNewsWordHints ? 'Hide word hints' : 'Show word hints'}
                  title={showNewsWordHints ? 'Hide word hints' : 'Show word hints'}
                >
                  <span className="material-symbols-outlined">{showNewsWordHints ? 'format_ink_highlighter_off' : 'ink_highlighter'}</span>
                  <span className="study-news-word-toggle__label">{showNewsWordHints ? 'Hints on' : 'Hints off'}</span>
                </button>
                <label className="study-news-speed-control" aria-label="Article reading speed">
                  <span>Speed</span>
                  <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} disabled={!canOpenNewsDetail}>
                    {SPEED_OPTIONS.map((option) => <option key={option} value={option}>{option}x</option>)}
                  </select>
                </label>
              </div>

              <div className="study-news-reader-controls" aria-label="Article audio controls">
                <button type="button" onClick={() => readAdjacentSentence(-1)} disabled={!canOpenNewsDetail}>
                  <span className="material-symbols-outlined">chevron_left</span>
                  Prev
                </button>
                <button
                  type="button"
                  className={`study-play-btn study-news-play-btn ${isArticleSpeechPlaying || isArticleSpeechPaused ? 'study-news-play-btn--stop' : ''}`}
                  onClick={() => (isArticleSpeechPlaying || isArticleSpeechPaused ? stopArticleSpeech() : playArticleSentence(activeSentenceIndex))}
                  disabled={!canOpenNewsDetail}
                >
                  <span className="material-symbols-outlined">{isArticleSpeechPlaying || isArticleSpeechPaused ? 'stop' : 'play_arrow'}</span>
                  {isArticleSpeechPlaying || isArticleSpeechPaused ? 'Stop' : 'Play'}
                </button>
                <button type="button" onClick={toggleArticlePause} disabled={!canOpenNewsDetail || (!isArticleSpeechPlaying && !isArticleSpeechPaused)}>
                  <span className="material-symbols-outlined">{isArticleSpeechPaused ? 'play_arrow' : 'pause'}</span>
                  {isArticleSpeechPaused ? 'Resume' : 'Pause'}
                </button>
                <button type="button" onClick={() => readAdjacentSentence(1)} disabled={!canOpenNewsDetail}>
                  Next
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <label className="study-news-position-control">
              <span>{articleSentenceEntries.length ? `Sentence ${(speakingSentenceIndex ?? activeSentenceIndex) + 1} / ${articleSentenceEntries.length}` : 'Sentence 0 / 0'}</span>
              <input
                type="range"
                min="0"
                max={Math.max(articleSentenceEntries.length - 1, 0)}
                value={Math.min(activeSentenceIndex, Math.max(articleSentenceEntries.length - 1, 0))}
                onChange={(event) => {
                  const nextIndex = Number(event.target.value)
                  setActiveSentenceIndex(nextIndex)
                  if (isArticleSpeechPlaying) playArticleSentence(nextIndex)
                }}
                disabled={!canOpenNewsDetail || !articleSentenceEntries.length}
              />
              <span>{speechProgress}%</span>
            </label>

            <div className="study-news-body">
              {!canOpenNewsDetail ? (
                <p className="study-news-locked-body">Full article text and listening practice unlock after login and admin approval.</p>
              ) : selectedArticle.body?.length ? selectedArticle.body.map((paragraph, paragraphIndex) => {
                const paragraphSentences = splitIntoSentences(paragraph)
                return (
                  <p key={`${selectedArticle.id}-${paragraphIndex}`}>
                    {paragraphSentences.map((sentence, sentenceIndex) => {
                      const entryIndex = articleSentenceEntries.findIndex((entry) => (
                        entry.paragraphIndex === paragraphIndex && entry.sentenceIndex === sentenceIndex
                      ))
                      const entry = articleSentenceEntries[entryIndex]
                      return (
                        <span key={entry?.id || `${paragraphIndex}-${sentenceIndex}`} className="study-news-sentence-unit">
                          <span
                            className={`study-news-sentence-fragment ${entryIndex === activeSentenceIndex ? 'study-news-sentence--active' : ''} ${entryIndex === speakingSentenceIndex ? 'study-news-sentence--speaking' : ''}`}
                            data-sentence-index={entryIndex}
                            onClick={() => setActiveSentenceIndex(entryIndex)}
                          >
                            {renderInteractiveText(sentence)}
                          </span>
                          {newsTranslationLang !== 'en' ? (
                            <span className="study-news-sentence-translation">
                              {sentenceTranslations[entry?.id] || 'Translating...'}
                            </span>
                          ) : ' '}
                        </span>
                      )
                    })}
                  </p>
                )
              }) : (
                <div className="study-news-article-loading" role="status" aria-live="polite" aria-label="Loading article">
                  <div className="study-news-loading-bar" aria-hidden="true">
                    <i />
                  </div>
                  <span className="study-news-loading-sr">Loading article</span>
                </div>
              )}
            </div>

            {selectedArticle.discussion?.length ? (
              <div className="study-news-discussion">
                <h3>Discussion topics</h3>
                {selectedArticle.discussion.map((topic) => <p key={topic}>{topic}</p>)}
              </div>
            ) : null}

            {canOpenNewsDetail ? (
              <section className="study-news-ai-box study-news-ai-box--guide" aria-label="Key expressions from this article">
                <header className="study-news-ai-box__header">
                  <h3>
                    <span className="material-symbols-outlined">school</span>
                    Key expressions &amp; patterns
                  </h3>
                  <span className="study-news-ai-badge" title="Generated by the Lannie home server (Ollama qwen)">
                    <span className="material-symbols-outlined">smart_toy</span>
                    Analyzed by Lannie Server
                  </span>
                </header>
                {studyGuideStatus === 'loading' ? (
                  <AiInsightProgress label="Lannie server is reading this article..." />
                ) : null}
                {studyGuideStatus === 'error' ? (
                  <p className="study-news-ai-status study-news-ai-status--error">
                    Could not get study points from the Lannie server.
                    <button type="button" onClick={() => setInsightRetryCount((current) => current + 1)}>Retry</button>
                  </p>
                ) : null}
                {studyGuideStatus === 'ready' ? (
                  <ul className="study-news-ai-guide-list">
                    {studyGuideItems.map((item, index) => (
                      <li key={`${item.text}-${index}`}>
                        <div className="study-news-ai-guide-head">
                          <span className={`study-news-ai-type study-news-ai-type--${item.type}`}>
                            {{ phrasal_verb: 'Phrasal verb', idiom: 'Idiom', collocation: 'Collocation', pattern: 'Pattern' }[item.type] || 'Pattern'}
                          </span>
                          <strong>{item.text}</strong>
                        </div>
                        <p className="study-news-ai-guide-meaning">
                          {item.meaning}
                          {item.meaning_translated ? <span> — {item.meaning_translated}</span> : null}
                        </p>
                        {item.example ? (
                          <p className="study-news-ai-guide-example">
                            “{item.example}”
                            {item.example_translated ? <span> {item.example_translated}</span> : null}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {canOpenNewsDetail ? (
              <section className="study-news-ai-box study-news-ai-box--quiz" aria-label="CELPIP style listening questions">
                <header className="study-news-ai-box__header">
                  <h3>
                    <span className="material-symbols-outlined">quiz</span>
                    CELPIP-style listening questions
                  </h3>
                  <span className="study-news-ai-badge" title="Generated by the Lannie home server (Ollama qwen)">
                    <span className="material-symbols-outlined">smart_toy</span>
                    Analyzed by Lannie Server
                  </span>
                </header>
                {newsQuizStatus === 'waiting' ? (
                  <AiInsightProgress label="Waiting for the study points to finish first..." indeterminate />
                ) : null}
                {newsQuizStatus === 'loading' ? (
                  <AiInsightProgress label="Lannie server is writing questions..." />
                ) : null}
                {newsQuizStatus === 'error' ? (
                  <p className="study-news-ai-status study-news-ai-status--error">
                    Could not get quiz questions from the Lannie server.
                    <button type="button" onClick={() => setInsightRetryCount((current) => current + 1)}>Retry</button>
                  </p>
                ) : null}
                {newsQuizStatus === 'ready' ? (
                  <>
                    <ol className="study-news-ai-quiz-list">
                      {newsQuizQuestions.map((question, questionIndex) => (
                        <li key={`quiz-${questionIndex}`}>
                          <p className="study-news-ai-quiz-question">{question.question}</p>
                          <div className="study-news-ai-quiz-options">
                            {question.options.map((option, optionIndex) => {
                              const isSelected = quizSelections[questionIndex] === optionIndex
                              const isCorrect = optionIndex === question.answer_index
                              const revealClass = showQuizAnswers
                                ? (isCorrect ? ' study-news-ai-quiz-option--correct' : (isSelected ? ' study-news-ai-quiz-option--wrong' : ''))
                                : ''
                              return (
                                <button
                                  key={`quiz-${questionIndex}-${optionIndex}`}
                                  type="button"
                                  className={`study-news-ai-quiz-option${isSelected ? ' study-news-ai-quiz-option--selected' : ''}${revealClass}`}
                                  onClick={() => setQuizSelections((current) => ({ ...current, [questionIndex]: optionIndex }))}
                                >
                                  <span className="study-news-ai-quiz-letter">{'ABCD'[optionIndex]}</span>
                                  {option}
                                </button>
                              )
                            })}
                          </div>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      className="study-news-ai-answers-toggle"
                      onClick={() => setShowQuizAnswers((current) => !current)}
                    >
                      <span className="material-symbols-outlined">{showQuizAnswers ? 'visibility_off' : 'visibility'}</span>
                      {showQuizAnswers ? 'Hide answers & explanations' : 'Show answers & explanations'}
                    </button>
                    {showQuizAnswers ? (
                      <div className="study-news-ai-answers">
                        <h4>Answers &amp; explanations</h4>
                        {newsQuizQuestions.map((question, questionIndex) => (
                          <div key={`answer-${questionIndex}`} className="study-news-ai-answer-item">
                            <strong>Q{questionIndex + 1}. Answer: {'ABCD'[question.answer_index]}</strong>
                            <p>{question.explanation}</p>
                            {question.explanation_translated ? <p className="study-news-ai-answer-translated">{question.explanation_translated}</p> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            ) : null}
          </article>
        </div>
      ), document.body) : null}

      {wordPopup && typeof document !== 'undefined' ? createPortal((
        <NewsWordPopup word={wordPopup} initialLang={newsTranslationLang} sourceArticle={selectedArticle} onClose={() => setWordPopup(null)} />
      ), document.body) : null}
    </section>
  )
}

const DP_LEVEL_LABELS = { Intermediate: '중급', Advanced: '상급' }
const DP_MODEL_ANSWER_CACHE = new Map()
const DP_STRATEGY_CACHE = new Map()
const DP_FAVORITES_STORAGE_KEY = 'unilingo.studyLab.dpFavorites'
const DP_COMPLETED_STORAGE_KEY = 'unilingo.studyLab.dpCompleted'
const DP_WORD_FAVORITES_STORAGE_KEY = 'unilingo.studyLab.dpWordFavorites'
const DP_PAGE_SIZE_OPTIONS = [12, 20, 40, 60]
const DP_LANG_OPTIONS = [
  { id: 'en', label: 'US' },
  { id: 'ko', label: 'KR' },
  { id: 'zh', label: 'CN' },
]

const DP_TEMPLATES = [
  {
    id: 'overview',
    label: 'General scene',
    ko: '전체 묘사',
    lines: [
      { parts: ['This picture shows ', { hint: '장소나 상황 (예: a doctor\'s office, a busy street)' }, '.'] },
      { parts: ['In the ', { hint: '위치: center / foreground / background' }, ' of the picture, I can see ', { hint: '가장 눈에 띄는 사람이나 사물' }, '.'] },
      { parts: [{ hint: '주인공: The man / The woman / They' }, ' is ', { hint: '동작 (~ing)' }, '.'] },
      { parts: ['In the background, there ', { hint: 'is / are' }, ' ', { hint: '배경에 보이는 것' }, '.'] },
      { parts: ['It looks like ', { hint: '전체 상황 추측 (문장으로)' }, '.'] },
      { parts: ['Overall, the atmosphere seems ', { hint: '분위기 형용사: calm / busy / cheerful / tense' }, '.'] },
    ],
  },
  {
    id: 'people',
    label: 'People focus',
    ko: '인물 중심',
    lines: [
      { parts: ['There ', { hint: 'is / are' }, ' ', { hint: '인원: two people / a man and a woman' }, ' in this picture.'] },
      { parts: ['The person on the ', { hint: 'left / right' }, ' is wearing ', { hint: '옷차림' }, '.'] },
      { parts: [{ hint: 'He / She / They' }, ' seem(s) to be ', { hint: '동작이나 상태 (~ing)' }, '.'] },
      { parts: ['Judging from ', { hint: 'their expressions / their body language' }, ', they look ', { hint: '감정 형용사: happy / worried / focused' }, '.'] },
      { parts: ['They are probably ', { hint: '관계 추측: colleagues / family / a doctor and a patient' }, '.'] },
      { parts: ['I think ', { hint: '인물에 대한 마무리 의견 (문장으로)' }, '.'] },
    ],
  },
  {
    id: 'place',
    label: 'Place & objects',
    ko: '장소/사물',
    lines: [
      { parts: ['This picture was probably taken ', { hint: '장소: at a hospital / in a park / at home' }, '.'] },
      { parts: ['I can see ', { hint: '사물 1' }, ' and ', { hint: '사물 2' }, ' in the picture.'] },
      { parts: ['On the ', { hint: 'left / right' }, ' side, there is ', { hint: '그쪽에 보이는 것' }, '.'] },
      { parts: ['The ', { hint: '사물' }, ' is used for ', { hint: '용도 (~ing)' }, '.'] },
      { parts: ['This place looks ', { hint: '형용사: clean / crowded / modern' }, ' because ', { hint: '그렇게 보이는 이유' }, '.'] },
    ],
  },
  {
    id: 'story',
    label: 'Story & guess',
    ko: '추측/스토리',
    lines: [
      { parts: ['In this picture, ', { hint: '지금 일어나고 있는 일 (문장으로)' }, '.'] },
      { parts: ['Before this moment, ', { hint: '직전 상황 추측: they probably ~' }, '.'] },
      { parts: ['I guess this because ', { hint: '추측의 근거' }, '.'] },
      { parts: ['After this, ', { hint: '다음 상황 추측: they might ~' }, '.'] },
      { parts: ['If I were in this picture, I would ', { hint: '나라면 어떻게 할지' }, '.'] },
    ],
  },
]

function DescribingPicturesPanel() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const tokens = useAuthStore((state) => state.tokens)
  const canSync = isAdmin || user?.user_level === 'admin' || user?.userLevel === 'admin'
  const approvalStatus = user?.approvalStatus || user?.approval_status
  const isApprovedUser = user?.is_approved === true || approvalStatus === 'approved'
  const canOpenDetail = Boolean(isAuthenticated && (canSync || isApprovedUser))
  const accountKey = user?.id || user?.email || 'guest'

  const [pictures, setPictures] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(() => readJsonStorage(DP_FAVORITES_STORAGE_KEY, accountKey, []))
  const [completedIds, setCompletedIds] = useState(() => readJsonStorage(DP_COMPLETED_STORAGE_KEY, accountKey, []))
  const [wordFavorites, setWordFavorites] = useState(() => readJsonStorage(DP_WORD_FAVORITES_STORAGE_KEY, accountKey, []))
  const [readFilter, setReadFilter] = useState('all')
  const [listMeta, setListMeta] = useState({ total: 0, levels: {}, imported_lessons: 0, total_lessons: 0, headers_loaded: false })
  const [listStatus, setListStatus] = useState('loading')
  const [levelFilter, setLevelFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedId, setSelectedId] = useState(null)
  const [isDpModalFullscreen, setIsDpModalFullscreen] = useState(false)
  const [isImageCompact, setIsImageCompact] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailStatus, setDetailStatus] = useState('idle')
  const [wordPopup, setWordPopup] = useState(null)
  const [dpLang, setDpLang] = useState('ko')
  const [showStrategy, setShowStrategy] = useState(true)
  const [showPractice, setShowPractice] = useState(true)
  const [showVocab, setShowVocab] = useState(true)
  const [strategySteps, setStrategySteps] = useState([])
  const [strategyStatus, setStrategyStatus] = useState('idle')
  const [strategyRetryCount, setStrategyRetryCount] = useState(0)
  const [templateId, setTemplateId] = useState('overview')
  const [templateAnswers, setTemplateAnswers] = useState({})
  const [visibleHints, setVisibleHints] = useState({})
  const [modelSentences, setModelSentences] = useState([])
  const [modelStatus, setModelStatus] = useState('idle')
  const [headersJson, setHeadersJson] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const importCancelRef = useRef(false)

  const loadPictureList = async () => {
    setListStatus('loading')
    try {
      const response = await apiGet('/api/study-lab/describing-pictures')
      setPictures(response.data?.pictures || [])
      setListMeta({
        total: response.data?.total || 0,
        levels: response.data?.levels || {},
        imported_lessons: response.data?.imported_lessons || 0,
        total_lessons: response.data?.total_lessons || 0,
        headers_loaded: Boolean(response.data?.headers_loaded),
      })
      setListStatus('ready')
    } catch {
      setListStatus('error')
    }
  }

  useEffect(() => {
    loadPictureList()
  }, [])

  useEffect(() => {
    const pictureParam = new URLSearchParams(location.search).get('picture')
    if (pictureParam) setSelectedId(pictureParam)
  }, [location.search])

  useEffect(() => {
    setFavoriteIds(readJsonStorage(DP_FAVORITES_STORAGE_KEY, accountKey, []))
    setCompletedIds(readJsonStorage(DP_COMPLETED_STORAGE_KEY, accountKey, []))
    setWordFavorites(readJsonStorage(DP_WORD_FAVORITES_STORAGE_KEY, accountKey, []))
  }, [accountKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(DP_FAVORITES_STORAGE_KEY, accountKey), JSON.stringify(favoriteIds))
  }, [accountKey, favoriteIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(DP_COMPLETED_STORAGE_KEY, accountKey), JSON.stringify(completedIds))
  }, [accountKey, completedIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getAccountStorageKey(DP_WORD_FAVORITES_STORAGE_KEY, accountKey), JSON.stringify(wordFavorites))
  }, [accountKey, wordFavorites])

  const toggleFavoritePicture = (pictureId) => {
    setFavoriteIds((current) => (
      current.includes(pictureId) ? current.filter((id) => id !== pictureId) : [...current, pictureId]
    ))
  }

  const toggleCompletedPicture = (pictureId) => {
    setCompletedIds((current) => (
      current.includes(pictureId) ? current.filter((id) => id !== pictureId) : [...current, pictureId]
    ))
  }

  const toggleWordFavorite = (item) => {
    const word = item.word
    const isAdding = !wordFavorites.includes(word)
    setWordFavorites((current) => (
      isAdding ? [...current, word] : current.filter((entry) => entry !== word)
    ))
    if (isAdding && isAuthenticated && tokens?.access_token) {
      apiPost('/api/admin/dictionary-logs', {
        search_word: word,
        source_lang: 'en',
        target_lang: dpLang === 'en' ? 'ko' : dpLang,
        search_source: 'describing_pictures',
        result_summary: item.definition || '',
        search_results: {
          phonetic: item.pronunciation || '',
          definition: item.definition || '',
          localizedTerm: (dpLang === 'zh' ? item.zh : item.ko) || '',
          source: 'describing_pictures',
          articleTitle: detail?.exerciseTitle || '',
          articleId: detail?.id || '',
        },
      }, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }).catch(() => {})
    }
  }

  const filteredPictures = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return pictures
      .filter((item) => levelFilter === 'all' || item.level === levelFilter)
      .filter((item) => {
        if (readFilter === 'favorites') return favoriteIds.includes(item.id)
        if (readFilter === 'completed') return completedIds.includes(item.id)
        if (readFilter === 'unread') return !completedIds.includes(item.id)
        return true
      })
      .filter((item) => {
        if (!normalizedSearch) return true
        return [item.exerciseTitle, item.lessonTitle, item.level]
          .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      })
  }, [completedIds, favoriteIds, levelFilter, pictures, readFilter, search])
  const totalPages = Math.max(1, Math.ceil(filteredPictures.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visiblePictures = filteredPictures.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const pageNumbers = useMemo(() => {
    const windowSize = 2
    const numbers = new Set([1, totalPages])
    for (let i = currentPage - windowSize; i <= currentPage + windowSize; i += 1) {
      if (i >= 1 && i <= totalPages) numbers.add(i)
    }
    return [...numbers].sort((a, b) => a - b)
  }, [currentPage, totalPages])

  const goToPage = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    setPage(1)
  }, [levelFilter, readFilter, search, pageSize])

  useEffect(() => {
    setTemplateAnswers({})
    setVisibleHints({})
    setModelSentences([])
    setModelStatus('idle')
    if (!selectedId) {
      setDetail(null)
      setDetailStatus('idle')
      return undefined
    }
    let cancelled = false
    setDetailStatus('loading')
    async function loadDetail() {
      try {
        const response = await apiGet(`/api/study-lab/describing-pictures/${encodeURIComponent(selectedId)}`)
        if (cancelled) return
        setDetail(response.data?.picture || null)
        setDetailStatus('ready')
      } catch {
        if (cancelled) return
        setDetailStatus('error')
      }
    }
    loadDetail()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const modelAnswerLang = dpLang === 'en' ? 'ko' : dpLang

  useEffect(() => {
    setModelSentences([])
    setModelStatus('idle')
  }, [modelAnswerLang, templateId])

  useEffect(() => {
    setStrategySteps([])
    setStrategyStatus('idle')
    if (!selectedId || !canOpenDetail || !tokens?.access_token || detailStatus !== 'ready') return undefined
    if (DP_STRATEGY_CACHE.has(selectedId)) {
      setStrategySteps(DP_STRATEGY_CACHE.get(selectedId))
      setStrategyStatus('ready')
      return undefined
    }
    let cancelled = false
    setStrategyStatus('loading')
    async function loadStrategy() {
      try {
        const response = await apiGet(
          `/api/study-lab/describing-pictures/${encodeURIComponent(selectedId)}/strategy`,
          {},
          { headers: { Authorization: `Bearer ${tokens.access_token}` } },
        )
        if (cancelled) return
        const steps = response.data?.steps || []
        if (steps.length) {
          DP_STRATEGY_CACHE.set(selectedId, steps)
          setStrategySteps(steps)
          setStrategyStatus('ready')
        } else {
          setStrategyStatus('error')
        }
      } catch {
        if (cancelled) return
        setStrategyStatus('error')
      }
    }
    loadStrategy()
    return () => {
      cancelled = true
    }
  }, [canOpenDetail, detailStatus, selectedId, strategyRetryCount, tokens?.access_token])

  const retryStrategy = () => {
    if (selectedId) DP_STRATEGY_CACHE.delete(selectedId)
    setStrategyRetryCount((current) => current + 1)
  }

  const activeTemplate = DP_TEMPLATES.find((template) => template.id === templateId) || DP_TEMPLATES[0]

  const blankKey = (lineIndex, partIndex) => `${templateId}-${lineIndex}-${partIndex}`

  const buildLineText = (line, lineIndex) => {
    return line.parts.map((part, partIndex) => {
      if (typeof part === 'string') return part
      return templateAnswers[blankKey(lineIndex, partIndex)] || '...'
    }).join('')
  }

  const fetchModelAnswer = async () => {
    if (!selectedId || !tokens?.access_token) return
    const cacheKey = `${selectedId}:${templateId}:${modelAnswerLang}`
    if (DP_MODEL_ANSWER_CACHE.has(cacheKey)) {
      setModelSentences(DP_MODEL_ANSWER_CACHE.get(cacheKey))
      setModelStatus('ready')
      return
    }
    setModelStatus('loading')
    try {
      const response = await apiGet(
        `/api/study-lab/describing-pictures/${encodeURIComponent(selectedId)}/model-answer`,
        { template: templateId, lang: modelAnswerLang },
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      )
      const sentences = response.data?.sentences || []
      if (sentences.length) {
        DP_MODEL_ANSWER_CACHE.set(cacheKey, sentences)
        setModelSentences(sentences)
        setModelStatus('ready')
      } else {
        setModelStatus('error')
      }
    } catch {
      setModelStatus('error')
    }
  }

  const saveHeadersJson = async () => {
    if (!headersJson.trim() || !tokens?.access_token) return
    setImportStatus('Saving lesson list...')
    try {
      const raw = JSON.parse(headersJson)
      const response = await apiPut('/api/study-lab/describing-pictures/headers', { raw }, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const courses = response.data?.courses || []
      setImportStatus(`Lesson list saved: ${courses.map((course) => `${course.level} ${course.lessons}`).join(', ')} lessons.`)
      setHeadersJson('')
      loadPictureList()
    } catch (error) {
      setImportStatus(error?.data?.error?.message || 'Could not parse the pasted JSON. Paste the full response.')
    }
  }

  const runImport = async () => {
    if (isImporting || !tokens?.access_token) return
    importCancelRef.current = false
    setIsImporting(true)
    try {
      for (let round = 0; round < 60; round += 1) {
        if (importCancelRef.current) break
        const response = await apiPost('/api/study-lab/describing-pictures/sync', { limit: 8 }, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const data = response.data || {}
        setImportStatus(`Imported ${data.imported_lessons || 0} / ${data.total_lessons || 0} lessons (${data.total_pictures || 0} pictures).`)
        setListMeta((current) => ({
          ...current,
          imported_lessons: data.imported_lessons || current.imported_lessons,
          total_lessons: data.total_lessons || current.total_lessons,
        }))
        if (data.done) {
          setImportStatus(`Import complete: ${data.total_pictures || 0} pictures from ${data.imported_lessons || 0} lessons.`)
          break
        }
      }
    } catch (error) {
      setImportStatus(error?.data?.error?.message || 'Import failed. Try again to continue where it stopped.')
    } finally {
      setIsImporting(false)
      loadPictureList()
    }
  }

  const importPercent = listMeta.total_lessons
    ? Math.round((listMeta.imported_lessons / listMeta.total_lessons) * 100)
    : 0

  return (
    <section className="study-panel study-dp-panel" aria-label="Engoo describing pictures practice">
      <header className="study-dp-hero">
        <div>
          <h2>Describing Pictures</h2>
          <p>
            Engoo picture-description materials. Study the vocabulary, listen to it, then practice
            speaking with guided templates and a Lannie-server model answer.
          </p>
        </div>
        <div className="study-dp-hero-stats">
          <span><strong>{listMeta.levels?.Intermediate || 0}</strong> Intermediate</span>
          <span><strong>{listMeta.levels?.Advanced || 0}</strong> Advanced</span>
          <span><strong>{listMeta.total}</strong> Pictures</span>
        </div>
      </header>

      <div className="study-dp-toolbar">
        <div className="study-chip-group">
          {['all', 'Intermediate', 'Advanced'].map((level) => (
            <button
              key={level}
              type="button"
              className={`study-filter-chip ${levelFilter === level ? 'study-filter-chip--active' : ''}`}
              onClick={() => setLevelFilter(level)}
            >
              {level === 'all' ? 'All levels' : level}
            </button>
          ))}
          <button
            type="button"
            className={`study-filter-chip ${readFilter === 'favorites' ? 'study-filter-chip--active' : ''}`}
            onClick={() => setReadFilter((current) => (current === 'favorites' ? 'all' : 'favorites'))}
            title="Show favorite pictures"
          >
            ★ Favorites ({favoriteIds.length})
          </button>
          <button
            type="button"
            className={`study-filter-chip ${readFilter === 'completed' ? 'study-filter-chip--active' : ''}`}
            onClick={() => setReadFilter((current) => (current === 'completed' ? 'all' : 'completed'))}
            title="Show completed pictures"
          >
            ✓ Completed ({completedIds.length})
          </button>
          <button
            type="button"
            className={`study-filter-chip ${readFilter === 'unread' ? 'study-filter-chip--active' : ''}`}
            onClick={() => setReadFilter((current) => (current === 'unread' ? 'all' : 'unread'))}
            title="Show pictures not completed yet"
          >
            Unread
          </button>
        </div>
        <div className="study-dp-toolbar-right">
          <input
            type="search"
            value={search}
            placeholder="Search picture titles"
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="study-dp-page-size">
            Per page
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {DP_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {listStatus === 'loading' ? (
        <div className="study-news-state study-news-state--loading" role="status">
          <div className="study-news-loading-bar" aria-hidden="true"><i /></div>
          <span className="study-news-loading-sr">Loading pictures</span>
        </div>
      ) : null}
      {listStatus === 'error' ? (
        <div className="study-news-state study-news-state--error">
          Could not load the picture list.
          <button type="button" onClick={loadPictureList}>Retry</button>
        </div>
      ) : null}
      {listStatus === 'ready' && !pictures.length ? (
        <div className="study-news-state">
          No pictures imported yet. {canSync ? 'Use the admin import box below to fetch all Engoo describing-pictures lessons.' : 'Please wait until the admin imports the materials.'}
        </div>
      ) : null}

      <div className="study-dp-grid">
        {visiblePictures.map((picture) => (
          <button
            key={picture.id}
            type="button"
            className="study-dp-card"
            onClick={() => setSelectedId(picture.id)}
          >
            <span className="study-dp-card-thumb">
              {picture.thumbUrl || picture.imageUrl ? <img src={picture.thumbUrl || picture.imageUrl} alt={picture.exerciseTitle} loading="lazy" /> : null}
              <span className={`study-dp-level study-dp-level--${(picture.level || '').toLowerCase()}`}>
                {picture.level}
              </span>
              <span className="study-dp-card-badges">
                {favoriteIds.includes(picture.id) ? <span className="study-dp-card-badge study-dp-card-badge--fav">★</span> : null}
                {completedIds.includes(picture.id) ? <span className="study-dp-card-badge study-dp-card-badge--done">✓</span> : null}
              </span>
            </span>
            <span className="study-dp-card-body">
              <strong>{picture.exerciseTitle}</strong>
              <span>{picture.lessonTitle} · {picture.vocabCount} words</span>
            </span>
          </button>
        ))}
      </div>
      {totalPages > 1 ? (
        <nav className="study-dp-pagination" aria-label="Picture pages">
          <button
            type="button"
            className="study-dp-page-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          {pageNumbers.map((pageNumber, index) => (
            <span key={pageNumber} className="study-dp-page-slot">
              {index > 0 && pageNumber - pageNumbers[index - 1] > 1 ? <span className="study-dp-page-ellipsis">…</span> : null}
              <button
                type="button"
                className={`study-dp-page-btn ${pageNumber === currentPage ? 'study-dp-page-btn--active' : ''}`}
                onClick={() => goToPage(pageNumber)}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            </span>
          ))}
          <button
            type="button"
            className="study-dp-page-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
          <span className="study-dp-page-info">{filteredPictures.length} pictures</span>
        </nav>
      ) : null}

      {canSync ? (
        <section className="study-news-admin" aria-label="Admin describing pictures import">
          <div>
            <strong>Admin data import</strong>
            <span>
              {listMeta.headers_loaded
                ? `Lesson list loaded: ${listMeta.imported_lessons} / ${listMeta.total_lessons} lessons imported.`
                : 'Step 1: paste the Engoo course JSON (lesson_headers/by_course response) below and save. Step 2: run the import.'}
            </span>
          </div>
          {!listMeta.headers_loaded ? (
            <>
              <textarea
                className="study-dp-headers-input"
                value={headersJson}
                placeholder='Paste the JSON from https://api.engoo.com/api/lesson_headers/by_course?category=3ff1eb88-c3a7-11e8-9fa3-43bec8c3f8db&type=Published&count=300 (opened in your logged-in Engoo browser tab)'
                onChange={(event) => setHeadersJson(event.target.value)}
              />
              <button type="button" onClick={saveHeadersJson} disabled={!headersJson.trim()}>
                <span className="material-symbols-outlined">save</span>
                Save lesson list
              </button>
            </>
          ) : (
            <button type="button" onClick={isImporting ? () => { importCancelRef.current = true } : runImport}>
              <span className="material-symbols-outlined">{isImporting ? 'stop_circle' : 'cloud_download'}</span>
              {isImporting ? 'Stop import' : (listMeta.imported_lessons > 0 && listMeta.imported_lessons < listMeta.total_lessons ? 'Continue import' : 'Import all pictures')}
            </button>
          )}
          <div className="study-progress-line">
            <span>{importPercent}%</span>
            <div><i style={{ width: `${importPercent}%` }} /></div>
          </div>
          {importStatus ? <p>{importStatus}</p> : null}
        </section>
      ) : null}

      {selectedId && typeof document !== 'undefined' ? createPortal((
        <div className={`study-news-modal ${isDpModalFullscreen ? 'study-news-modal--fullscreen' : ''}`} role="dialog" aria-modal="true">
          <article className="study-news-detail study-dp-detail">
            <header>
              <div>
                <span>
                  {DP_LEVEL_LABELS[detail?.level] || detail?.level || ''} ({detail?.level || '...'}) · {detail?.lessonTitle || ''} · Engoo Describing Pictures
                </span>
                <h2 className="study-news-title">{detail?.exerciseTitle || 'Loading...'}</h2>
              </div>
              <div className="study-news-modal-actions">
                <button
                  type="button"
                  className={`study-news-icon-btn ${favoriteIds.includes(selectedId) ? 'study-news-icon-btn--active' : ''}`}
                  onClick={() => toggleFavoritePicture(selectedId)}
                  title={favoriteIds.includes(selectedId) ? 'Remove favorite' : 'Favorite this picture'}
                  aria-label={favoriteIds.includes(selectedId) ? 'Remove favorite' : 'Favorite this picture'}
                >
                  <span className="material-symbols-outlined">{favoriteIds.includes(selectedId) ? 'star' : 'star_outline'}</span>
                </button>
                <button
                  type="button"
                  className={`study-news-complete-btn ${completedIds.includes(selectedId) ? 'study-news-complete-btn--active' : ''}`}
                  onClick={() => toggleCompletedPicture(selectedId)}
                  title={completedIds.includes(selectedId) ? 'Mark as not done' : 'Mark as completed'}
                  aria-label={completedIds.includes(selectedId) ? 'Mark as not done' : 'Mark as completed'}
                >
                  <span className="material-symbols-outlined">{completedIds.includes(selectedId) ? 'task_alt' : 'check_circle'}</span>
                </button>
                <button
                  type="button"
                  className="study-news-icon-btn"
                  onClick={() => setIsDpModalFullscreen((current) => !current)}
                  title="Toggle fullscreen"
                  aria-label="Toggle fullscreen"
                >
                  <span className="material-symbols-outlined">{isDpModalFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
                <button type="button" className="study-news-icon-btn" onClick={() => { setSelectedId(null); setIsDpModalFullscreen(false) }} title="Close" aria-label="Close">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>

            {detailStatus === 'loading' ? (
              <div className="study-news-loading-bar" aria-hidden="true"><i /></div>
            ) : null}
            {detailStatus === 'error' ? (
              <p className="study-news-ai-status study-news-ai-status--error">Could not load this picture.</p>
            ) : null}

            {detail ? (
              <>
                <figure className={`study-news-detail-image study-dp-detail-image ${isImageCompact ? 'study-dp-detail-image--compact' : ''}`}>
                  <img src={detail.imageUrl} alt={detail.exerciseTitle} />
                  <button
                    type="button"
                    className="study-dp-image-resize-btn"
                    onClick={() => setIsImageCompact((current) => !current)}
                    title={isImageCompact ? 'Show full size' : 'Shrink image'}
                    aria-label={isImageCompact ? 'Show full size' : 'Shrink image'}
                  >
                    <span className="material-symbols-outlined">{isImageCompact ? 'zoom_in' : 'zoom_out'}</span>
                  </button>
                  {detail.imageAttribution ? <figcaption>{detail.imageAttribution}</figcaption> : null}
                </figure>

                {detail.prompt ? <p className="study-dp-prompt">{detail.prompt}</p> : null}

                {!canOpenDetail ? (
                  <p className="study-news-locked-body">Vocabulary and speaking practice unlock after login and admin approval.</p>
                ) : (
                  <>
                    <div className="study-dp-lang-row">
                      <span className="study-dp-lang-label">Translation</span>
                      <div className="study-chip-group">
                        {DP_LANG_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`study-filter-chip ${dpLang === option.id ? 'study-filter-chip--active' : ''}`}
                            onClick={() => setDpLang(option.id)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <section className="study-dp-strategy" aria-label="How to describe this picture">
                      <header className="study-dp-section-head">
                        <h3>
                          <span className="material-symbols-outlined">route</span>
                          How to describe this picture
                        </h3>
                        <div className="study-dp-section-tools">
                          <span className="study-news-ai-badge" title="Generated by the Lannie home server (Ollama qwen)">
                            <span className="material-symbols-outlined">smart_toy</span>
                            Analyzed by Lannie Server
                          </span>
                          <button
                            type="button"
                            className="study-dp-collapse-btn"
                            onClick={() => setShowStrategy((current) => !current)}
                            aria-label={showStrategy ? 'Hide strategy' : 'Show strategy'}
                            title={showStrategy ? 'Hide strategy' : 'Show strategy'}
                          >
                            <span className="material-symbols-outlined">{showStrategy ? 'expand_less' : 'expand_more'}</span>
                          </button>
                        </div>
                      </header>
                      {showStrategy ? (
                        <>
                          {strategyStatus === 'loading' ? (
                            <AiInsightProgress label="Lannie server is planning a speaking flow for this picture..." />
                          ) : null}
                          {strategyStatus === 'error' ? (
                            <p className="study-news-ai-status study-news-ai-status--error">
                              Could not get the speaking strategy.
                              <button type="button" onClick={retryStrategy}>Retry</button>
                            </p>
                          ) : null}
                          {strategyStatus === 'ready' ? (
                            <ol className="study-dp-strategy-steps">
                              {strategySteps.map((step, stepIndex) => (
                                <li key={`${selectedId}-step-${stepIndex}`}>
                                  <strong>
                                    {dpLang === 'ko' ? (step.ko || step.en) : dpLang === 'zh' ? (step.zh || step.en) : step.en}
                                  </strong>
                                  {dpLang !== 'en' && step.en ? <em>{step.en}</em> : null}
                                </li>
                              ))}
                            </ol>
                          ) : null}
                        </>
                      ) : null}
                    </section>

                    <section className="study-dp-practice" aria-label="Speaking template practice">
                      <header className="study-dp-section-head">
                        <h3>
                          <span className="material-symbols-outlined">record_voice_over</span>
                          Speaking template practice
                        </h3>
                        <button
                          type="button"
                          className="study-dp-collapse-btn"
                          onClick={() => setShowPractice((current) => !current)}
                          aria-label={showPractice ? 'Hide practice' : 'Show practice'}
                          title={showPractice ? 'Hide practice' : 'Show practice'}
                        >
                          <span className="material-symbols-outlined">{showPractice ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </header>
                      {showPractice ? (
                      <>
                      <div className="study-chip-group">
                        {DP_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className={`study-filter-chip ${templateId === template.id ? 'study-filter-chip--active' : ''}`}
                            onClick={() => setTemplateId(template.id)}
                          >
                            {template.ko} · {template.label}
                          </button>
                        ))}
                      </div>
                      <p className="study-dp-practice-help">
                        Fill the blanks about THIS picture (use the vocabulary above), press ? for a hint,
                        then read each sentence out loud. The play button reads your completed sentence.
                      </p>
                      <ol className="study-dp-template-lines">
                        {activeTemplate.lines.map((line, lineIndex) => (
                          <li key={`${activeTemplate.id}-${lineIndex}`}>
                            <div className="study-dp-template-line">
                              <button
                                type="button"
                                className="study-dp-line-play"
                                onClick={() => playSpeech(buildLineText(line, lineIndex))}
                                title="Listen to this sentence"
                                aria-label="Listen to this sentence"
                              >
                                <span className="material-symbols-outlined">play_circle</span>
                              </button>
                              <span className="study-dp-line-text">
                                {line.parts.map((part, partIndex) => {
                                  if (typeof part === 'string') return <span key={partIndex}>{part}</span>
                                  const key = blankKey(lineIndex, partIndex)
                                  return (
                                    <span key={partIndex} className="study-dp-blank">
                                      <input
                                        type="text"
                                        value={templateAnswers[key] || ''}
                                        placeholder="______"
                                        onChange={(event) => setTemplateAnswers((current) => ({ ...current, [key]: event.target.value }))}
                                      />
                                      <button
                                        type="button"
                                        className="study-dp-hint-btn"
                                        onClick={() => setVisibleHints((current) => ({ ...current, [key]: !current[key] }))}
                                        title="Show hint"
                                        aria-label="Show hint"
                                      >
                                        ?
                                      </button>
                                      {visibleHints[key] ? <em className="study-dp-hint">{part.hint}</em> : null}
                                    </span>
                                  )
                                })}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>

                      <div className="study-dp-model">
                        <div className="study-dp-model-head">
                          <h4>
                            <span className="material-symbols-outlined">smart_toy</span>
                            Model answer — {activeTemplate.ko}
                          </h4>
                          <span className="study-news-ai-badge" title="Generated by the Lannie home server (Ollama qwen)">
                            <span className="material-symbols-outlined">smart_toy</span>
                            Analyzed by Lannie Server
                          </span>
                        </div>
                        {modelStatus === 'idle' ? (
                          <button type="button" className="study-news-ai-answers-toggle" onClick={fetchModelAnswer} disabled={!tokens?.access_token}>
                            <span className="material-symbols-outlined">auto_awesome</span>
                            Get a model answer from the Lannie server
                          </button>
                        ) : null}
                        {modelStatus === 'loading' ? (
                          <AiInsightProgress label="Lannie server is writing a model answer..." />
                        ) : null}
                        {modelStatus === 'error' ? (
                          <p className="study-news-ai-status study-news-ai-status--error">
                            Could not get a model answer.
                            <button type="button" onClick={fetchModelAnswer}>Retry</button>
                          </p>
                        ) : null}
                        {modelStatus === 'ready' ? (
                          <ol className="study-dp-model-sentences">
                            {modelSentences.map((sentence, index) => (
                              <li key={`${selectedId}-model-${index}`}>
                                <button type="button" onClick={() => playSpeech(sentence.en)} title="Listen" aria-label="Listen">
                                  <span className="material-symbols-outlined">play_circle</span>
                                </button>
                                <span>
                                  {sentence.en}
                                  {sentence.translated ? <em>{sentence.translated}</em> : null}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </div>
                      </>
                      ) : null}
                    </section>

                    {(detail.vocabulary || []).length ? (
                      <section className="study-dp-vocab" aria-label="Helpful vocabulary">
                        <header className="study-dp-section-head">
                          <h3>
                            <span className="material-symbols-outlined">translate</span>
                            Helpful vocabulary
                          </h3>
                          <button
                            type="button"
                            className="study-dp-collapse-btn"
                            onClick={() => setShowVocab((current) => !current)}
                            aria-label={showVocab ? 'Hide vocabulary' : 'Show vocabulary'}
                            title={showVocab ? 'Hide vocabulary' : 'Show vocabulary'}
                          >
                            <span className="material-symbols-outlined">{showVocab ? 'expand_less' : 'expand_more'}</span>
                          </button>
                        </header>
                        {showVocab ? (
                          <div className="study-dp-vocab-grid">
                            {(detail.vocabulary || []).map((item) => {
                              const localizedWord = dpLang === 'ko' ? item.ko : dpLang === 'zh' ? item.zh : ''
                              return (
                                <div key={`${detail.id}-${item.word}`} className="study-dp-vocab-card">
                                  <div className="study-dp-vocab-head">
                                    <button type="button" className="study-dp-vocab-word" onClick={() => setWordPopup(item.word)} title="Open dictionary popup">
                                      {item.word}
                                    </button>
                                    <span className="study-dp-vocab-tools">
                                      <button
                                        type="button"
                                        className={`study-dp-vocab-fav ${wordFavorites.includes(item.word) ? 'study-dp-vocab-fav--active' : ''}`}
                                        onClick={() => toggleWordFavorite(item)}
                                        title={wordFavorites.includes(item.word) ? 'Remove from favorite words' : 'Add to favorite words'}
                                        aria-label={wordFavorites.includes(item.word) ? 'Remove from favorite words' : 'Add to favorite words'}
                                      >
                                        <span className="material-symbols-outlined">{wordFavorites.includes(item.word) ? 'star' : 'star_outline'}</span>
                                      </button>
                                      <button type="button" className="study-dp-vocab-sound" onClick={() => playSpeech(item.word)} title="Listen" aria-label={`Listen to ${item.word}`}>
                                        <span className="material-symbols-outlined">volume_up</span>
                                      </button>
                                    </span>
                                  </div>
                                  <span className="study-dp-vocab-meta">
                                    {item.partOfSpeech}{item.pronunciation ? ` · /${item.pronunciation}/` : ''}
                                  </span>
                                  {localizedWord ? <strong className="study-dp-vocab-ko">{localizedWord}</strong> : null}
                                  {item.definition ? <p>{item.definition}</p> : null}
                                  {(item.examples || []).slice(0, 1).map((example) => {
                                    const localizedExample = dpLang === 'ko' ? example.ko : dpLang === 'zh' ? example.zh : ''
                                    return (
                                      <button
                                        key={example.text}
                                        type="button"
                                        className="study-dp-vocab-example"
                                        onClick={() => playSpeech(example.text)}
                                        title="Listen to the example"
                                      >
                                        <span className="material-symbols-outlined">play_circle</span>
                                        <span>
                                          {example.text}
                                          {localizedExample ? <em>{localizedExample}</em> : null}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </section>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </article>
        </div>
      ), document.body) : null}

      {wordPopup && typeof document !== 'undefined' ? createPortal((
        <NewsWordPopup word={wordPopup} initialLang="ko" onClose={() => setWordPopup(null)} />
      ), document.body) : null}
    </section>
  )
}

export function StudyLabView() {
  const location = useLocation()
  const [showTopButton, setShowTopButton] = useState(false)
  const [newsReadingResetToken, setNewsReadingResetToken] = useState(0)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'sentence-listening'
    const savedTab = window.localStorage.getItem(STUDY_ACTIVE_TAB_STORAGE_KEY)
    return STUDY_TABS.some((tab) => tab.id === savedTab) ? savedTab : 'sentence-listening'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STUDY_ACTIVE_TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(location.search).get('tab')
    if (!STUDY_TABS.some((tab) => tab.id === tabFromUrl)) return
    if (tabFromUrl === 'news-reading' && activeTab !== 'news-reading') {
      setNewsReadingResetToken((current) => current + 1)
    }
    setActiveTab(tabFromUrl)
  }, [activeTab, location.search])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleScroll = () => setShowTopButton(window.scrollY > 520)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToStudyTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <PageLayout title="English Study Lab" className="study-lab-page">
      <PageBox noPadding>
        <div className="study-lab study-lab--content-only">
          {activeTab === 'sentence-listening' ? (
            <SentenceListeningPanel />
          ) : activeTab === 'celpip-words' ? (
            <CelpipVocabularyPanel />
          ) : activeTab === 'pte-core-words' ? (
            <PteVocabularyPanel />
          ) : activeTab === 'news-reading' ? (
            <NewsReadingPanel resetToken={newsReadingResetToken} />
          ) : activeTab === 'phrasal-verbs' ? (
            <PhrasalVerbsPanel />
          ) : activeTab === 'describing-pictures' ? (
            <DescribingPicturesPanel />
          ) : (
            <section className="study-placeholder">
              <span className="material-symbols-outlined">construction</span>
              <h2>{STUDY_TABS.find((tab) => tab.id === activeTab)?.label}</h2>
              <p>This section is reserved for the next focused study module.</p>
            </section>
          )}
        </div>
      </PageBox>
      <button
        type="button"
        className={`study-top-button ${showTopButton ? 'study-top-button--visible' : ''}`}
        onClick={scrollToStudyTop}
        aria-label="Back to top"
        title="Back to top"
      >
        <span className="material-symbols-outlined">keyboard_arrow_up</span>
      </button>
    </PageLayout>
  )
}

export default StudyLabView
