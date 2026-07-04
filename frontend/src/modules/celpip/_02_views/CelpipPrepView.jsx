import { useEffect, useMemo, useRef, useState } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { CELPIP_MOCK_TESTS, CELPIP_SECTIONS } from '../_01_data/celpipMockTests'
import { saveCelpipTestLog, getCelpipTestLogs } from '../_06_services/celpipApi'
import { analyzeRespondSituation } from '../../pte/_07_utils/respondSituationAnalyzer'
import useAuthStore from '../../auth/_05_stores/authStore'
import '../_10_styles/celpip.css'

const EXAM_QUESTION_COUNTS = {
  listening: {
    'Problem Solving': '8',
    'Daily Life Conversation': '5',
    'Information': '6',
    'News Item': '5',
    'Discussion': '8',
    'Viewpoints': '6',
  },
  reading: {
    'Correspondence': '11',
    'Apply a Diagram': '8',
    'Information': '9',
    'Viewpoints': '10',
  },
  writing: {
    'Email': '1',
    'Survey': '1',
  },
  speaking: {
    'Giving Advice': '1',
    'Personal Experience': '1',
    'Describing a Scene': '1',
    'Making Predictions': '1',
    'Comparing and Persuading': '1',
    'Difficult Situation': '1',
    'Expressing Opinions': '1',
    'Unusual Situation': '1',
  },
}

const SPEAKING_OFFICIAL_ORDER = [
  'Giving Advice',
  'Personal Experience',
  'Describing a Scene',
  'Making Predictions',
  'Comparing and Persuading',
  'Difficult Situation',
  'Expressing Opinions',
  'Unusual Situation',
]

const SPEAKING_OFFICIAL_TITLES = {
  'Giving Advice': 'Giving Advice',
  'Personal Experience': 'Talking about a Personal Experience',
  'Describing a Scene': 'Describing a Scene',
  'Making Predictions': 'Making Predictions',
  'Comparing and Persuading': 'Comparing and Persuading',
  'Difficult Situation': 'Dealing with a Difficult Situation',
  'Expressing Opinions': 'Expressing Opinions',
  'Unusual Situation': 'Describing an Unusual Situation',
}

function getOfficialTypeLabel(sectionId, type) {
  if (sectionId !== 'speaking') return type
  return SPEAKING_OFFICIAL_TITLES[type] || type
}

function sortTypeGroups(sectionId, groups) {
  if (sectionId !== 'speaking') return groups

  return [...groups].sort((a, b) => {
    const aIndex = SPEAKING_OFFICIAL_ORDER.indexOf(a.type)
    const bIndex = SPEAKING_OFFICIAL_ORDER.indexOf(b.type)
    const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
    const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
    return safeAIndex - safeBIndex
  })
}

function getExamCountLabel(sectionId, count, lang) {
  if (!count) return ''
  if (sectionId === 'writing' || sectionId === 'speaking') {
    if (lang === 'ko') return `${count}문제`
    if (lang === 'zh') return `${count}题`
    return `${count} task`
  } else {
    if (lang === 'ko') return `${count}문항`
    if (lang === 'zh') return `${count}题`
    return `${count}Q`
  }
}
const TYPE_DIFFICULTY = {}
const CELPIP_ACTIVE_SECTION_STORAGE_KEY = 'unilingo.celpip.activeSection'
const CELPIP_FORCE_LISTENING_STORAGE_KEY = 'unilingo.celpip.forceListening'

const OFFICIAL_LINKS = [
  { label: 'CELPIP General', href: 'https://www.celpip.ca/celpip-general/' },
  { label: 'CELPIP Test Format', href: 'https://www.celpip.ca/take-celpip/test-format/' },
  { label: 'Free Sample Test', href: 'https://secure.paragontesting.ca/InstructionalProducts/FreeOnlineSampleTest/FOST' },
  { label: 'IRCC PGWP Eligibility', href: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html' },
  { label: 'CELPIP Score Descriptors', href: 'https://www.celpip.ca/prepare-for-celpip/score-comparison-chart/' },
  { label: 'CELPIP Simulator Speaking Prompts', href: 'https://www.celpipsimulator.com/resources/celpip-speaking-questions' },
  { label: 'HZad Speaking Part 1-2 Prompts', href: 'https://hzadeducation.com/2024/09/11/100-celpip-speaking-part-1-and-2-questions/' },
  { label: 'Gurully CELPIP Speaking Samples', href: 'https://www.gurully.com/blog/celpip-speaking-test/' },
]

const INFO_LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
]

const INFO_COPY = {
  en: {
    title: 'CELPIP General for PGWP',
    subtitle: 'Key CELPIP structure, cost, and CLB information for PGWP applicants.',
    overviewTitle: 'Exam Overview',
    facts: [
      {
        icon: 'verified',
        title: 'IRCC-designated English test',
        body: 'CELPIP - General is a four-skill English test used for Canadian permanent residence, some visa pathways, and professional purposes.',
      },
      {
        icon: 'desktop_windows',
        title: 'Computer-based test in one sitting',
        body: 'Listening, Reading, Writing, and Speaking are completed at a test centre in one session, with no separate speaking appointment.',
      },
      {
        icon: 'payments',
        title: 'Canada test fee',
        body: 'The official Test Format page lists CAD $295 + taxes. Always confirm the fee before registration because location, date, and policy can change.',
      },
      {
        icon: 'schedule',
        title: 'Test duration',
        body: 'CELPIP General is listed as less than 2 hours and 50 minutes. Section times are Listening 46-55 minutes, Reading 43-56 minutes, Writing 53 minutes, and Speaking 15 minutes.',
      },
    ],
    pgwpTitle: 'PGWP CLB Requirements',
    universityTitle: 'CLB 7 in all 4 areas',
    universityBody: 'Graduates from bachelor, master, doctoral, or other university programs need CLB 7 in all four English skills.',
    collegeTitle: 'CLB 5 in all 4 areas',
    collegeBody: 'Graduates from college, polytechnic, or other non-university programs need CLB 5 in all four English skills.',
    pgwpNote: 'IRCC states that applicants who applied for a PGWP before November 1, 2024 do not need to meet this language requirement.',
    clbTitle: 'CELPIP Score and CLB',
    memoHeader: 'PGWP note',
    universityMemo: 'University target',
    collegeMemo: 'College target',
    sourcesTitle: 'Official Sources',
  },
  ko: {
    title: 'PGWP를 위한 CELPIP General',
    subtitle: 'PGWP 신청자가 알아야 할 CELPIP 시험 구조, 비용, CLB 기준입니다.',
    overviewTitle: '시험 개요',
    facts: [
      {
        icon: 'verified',
        title: 'IRCC 지정 영어 시험',
        body: 'CELPIP - General은 캐나다 영주권, 일부 비자 및 전문 자격 목적에 사용되는 4영역 영어 시험입니다.',
      },
      {
        icon: 'desktop_windows',
        title: '한 번에 보는 컴퓨터 시험',
        body: 'Listening, Reading, Writing, Speaking을 한 시험장에서 한 번에 진행하며 별도 speaking 세션이 없습니다.',
      },
      {
        icon: 'payments',
        title: '캐나다 응시료',
        body: '공식 Test Format 페이지 기준 CAD $295 + taxes입니다. 지역, 날짜, 정책에 따라 등록 전 재확인이 필요합니다.',
      },
      {
        icon: 'schedule',
        title: '시험 시간',
        body: 'General은 2시간 50분 미만으로 안내됩니다. 영역별 시간은 Listening 46-55분, Reading 43-56분, Writing 53분, Speaking 15분입니다.',
      },
    ],
    pgwpTitle: 'PGWP CLB 기준',
    universityTitle: '4영역 모두 CLB 7',
    universityBody: '학사, 석사, 박사 또는 기타 university program 졸업자는 영어 4영역 모두 CLB 7이 필요합니다.',
    collegeTitle: '4영역 모두 CLB 5',
    collegeBody: 'college, polytechnic, non-university program 졸업자는 영어 4영역 모두 CLB 5가 필요합니다.',
    pgwpNote: 'IRCC 페이지 기준, 2024년 11월 1일 이전 PGWP 신청자는 해당 언어 요건이 적용되지 않는다고 안내되어 있습니다.',
    clbTitle: 'CELPIP 점수와 CLB',
    memoHeader: 'PGWP 메모',
    universityMemo: 'University 목표선',
    collegeMemo: 'College 목표선',
    sourcesTitle: '공식 출처',
  },
  zh: {
    title: '适用于 PGWP 的 CELPIP General',
    subtitle: 'PGWP 申请人需要了解的 CELPIP 考试结构、费用和 CLB 要求。',
    overviewTitle: '考试概览',
    facts: [
      {
        icon: 'verified',
        title: 'IRCC 指定英语考试',
        body: 'CELPIP - General 是评估听、说、读、写四项能力的英语考试，可用于加拿大永久居民、部分签证路径和专业用途。',
      },
      {
        icon: 'desktop_windows',
        title: '一次完成的机考',
        body: 'Listening、Reading、Writing 和 Speaking 会在考试中心同一次考试中完成，不需要单独预约口语考试。',
      },
      {
        icon: 'payments',
        title: '加拿大考试费用',
        body: '官方 Test Format 页面列出的费用为 CAD $295 + taxes。由于地点、日期和政策可能变化，报名前请再次确认。',
      },
      {
        icon: 'schedule',
        title: '考试时长',
        body: 'CELPIP General 官方说明为少于 2 小时 50 分钟。各部分时间为 Listening 46-55 分钟、Reading 43-56 分钟、Writing 53 分钟、Speaking 15 分钟。',
      },
    ],
    pgwpTitle: 'PGWP CLB 要求',
    universityTitle: '四项均需 CLB 7',
    universityBody: '本科、硕士、博士或其他 university program 毕业生，英语四项都需要达到 CLB 7。',
    collegeTitle: '四项均需 CLB 5',
    collegeBody: 'college、polytechnic 或其他 non-university program 毕业生，英语四项都需要达到 CLB 5。',
    pgwpNote: 'IRCC 说明，2024 年 11 月 1 日之前提交 PGWP 申请的人不需要满足该语言要求。',
    clbTitle: 'CELPIP 分数与 CLB',
    memoHeader: 'PGWP 备注',
    universityMemo: 'University 目标',
    collegeMemo: 'College 目标',
    sourcesTitle: '官方来源',
  },
}

const PAGE_COPY = {
  en: {
    sectionLabels: {
      listening: 'Listening',
      reading: 'Reading',
      writing: 'Writing',
      speaking: 'Speaking',
    },
    focusLabel: 'Focus',
    timeLabel: 'Time',
    openMock: 'Open Mock',
    openDrill: 'Start Drill',
    drillLockedLabel: 'Start Drill',
    drillAccessNote: 'Available after login and administrator approval.',
    templateButton: 'Templates',
    templateModalTitle: 'Writing Templates',
    speakingTemplateModalTitle: 'Speaking Templates',
    templateCoachTitle: 'Recommended template tip',
    templateCoachShow: 'Show template tip',
    templateCoachHide: 'Hide template tip',
    templateCoachBadge: 'Practice aid',
    templateCoachNote: 'This is a practice guide, not a confirmed official on-screen note box.',
    templatePhraseLabel: 'Template phrase',
    prepLabel: 'Prep',
    speakLabel: 'Speak',
    speakingSetupTitle: 'Choose speaking practice',
    speakingSetupBody: 'Pick a prompt form first. The timer starts only after you press Start.',
    speakingRandomTab: 'Random mix',
    speakingAllFormsTab: 'All forms',
    speakingShuffleLabel: 'Random order',
    speakingSkipAttemptedLabel: 'Skip already attempted prompts',
    speakingStartPractice: 'Start speaking practice',
    speakingBackToSetup: 'Back to practice choices',
    speakingPauseTime: 'Pause time',
    speakingResumeTime: 'Resume time',
    speakingScoringTitle: 'Local speaking practice score',
    speakingScoringNote: 'Based on your typed notes/response text. Server Whisper/Qwen scoring can be connected when the speech endpoint is ready.',
    speakingMissingWords: 'Words to practice',
    speakingPrepPhase: 'Prepare your answer',
    speakingRecordingPhase: 'Recording time',
    speakingDonePhase: 'Speaking time finished',
    speakingRecordingButton: 'Recording',
    speakingStopRecording: 'Stop recording',
    intuitiveDifficulty: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    },
    intuitiveMemory: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
    templateUseTitle: 'How to Use',
    templateUseBody: 'Replace only the bracketed blanks with details from the prompt, then adjust tone and examples.',
    templateFlowTitle: 'Memorize the Flow',
    templateBlankTitle: 'Fill These Blanks',
    templateTipTitle: 'Template Tips',
    templateExamplesTitle: 'Similar Prompt Examples',
    templateExamplesNote: 'These are not Skill Drill questions. Use them to recognize when this template fits.',
    templateTextTitle: 'Ready-to-fill Template',
    historyTitle: 'Your attempt history',
    historyEmpty: 'No attempt history yet.',
    historyOpen: 'View result',
    historyDetailTitle: 'Attempt result',
    historyDateLabel: 'Date',
    historyScoreLabel: 'Score',
    historyTimeLabel: 'Time',
    historyCorrectLabel: 'Correct',
    historyIncorrectLabel: 'Incorrect',
    historyCorrectQuestions: 'Correct questions',
    historyIncorrectQuestions: 'Incorrect questions',
    mockSets: 'mock sets',
    typesLabel: 'types',
    currentQuestion: 'Current mock',
    playAudio: 'Play',
    stopAudio: 'Stop',
    repeatAudio: 'Repeat',
    speedLabel: 'Speed',
    showTranscript: 'Show script',
    hideTranscript: 'Hide script',
    transcriptHidden: 'Script is hidden first, like the real test. Reveal it after you listen.',
    transcriptTitle: 'Practice Script',
    passageTitle: 'Reading Passage',
    promptTitle: 'Prompt',
    questionsTitle: 'Questions',
    prevMock: 'Previous',
    nextMock: 'Next',
    responseTitle: 'Your Response',
    speakingNotesTitle: 'Speaking Notes (Practice Aid)',
    showAnswers: 'Show Answers',
    hideAnswers: 'Hide Answers',
    modelAnswerTitle: 'Answer',
    strategyLabel: 'Strategy',
    quickTipLabel: 'Quick tip',
    questionDifficultyLabel: 'Difficulty',
    typeDifficultyLabel: 'Difficulty',
    memoryLoadLabel: 'Memory',
    memoFocusLabel: 'Memo focus',
    challengeLabel: 'Why it is tricky',
    examCountPrefix: 'Exam',
    difficulty: {
      easy: 'Easy',
      medium: 'Med',
      hard: 'Hard',
    },
    officialReferences: 'Official References',
    testFocus: {
      'ls-01': 'Find suggestions, conditions, and next steps in a problem-solving conversation',
      'ls-02': 'Compare schedule changes and options in a daily conversation',
      'ls-03': 'Identify required documents and deadlines in a school announcement',
      'ls-04': 'Catch causes, effects, and exceptions in a news item',
      'ls-05': 'Organize different speakers opinions and the final decision',
      'ls-06': 'Separate attitudes and supporting reasons in viewpoint listening',
      'ls-07': 'Understand customer service checks and compensation options',
      'ls-08': 'Identify location changes and service limits in an announcement',
      'rd-01': 'Find requests, reasons, and next steps in an email',
      'rd-02': 'Compare chart conditions and choose the best option',
      'rd-03': 'Separate rules, exceptions, and recommendations in an information text',
      'rd-04': 'Connect claims, counterarguments, and reasons in an opinion text',
      'rd-05': 'Identify responsibilities and timing in a short message',
      'rd-06': 'Find fees and exception conditions in a policy text',
      'rd-07': 'Compare what each option includes and excludes',
      'rd-08': 'Understand pros, cons, and a balanced conclusion',
      'wr-01': 'Make a polite request, explain your purpose, and include a deadline',
      'wr-02': 'Choose a preference and develop two or three reasons',
      'wr-03': 'Describe a problem, give specific examples, and request a solution',
      'wr-04': 'Balance advantages and disadvantages in a policy topic',
      'wr-05': 'Apologize, explain the conflict, and suggest alternative times',
      'wr-06': 'State a position, support it with reasons, and explain the effect',
      'wr-07': 'Give order details, explain the problem, and request action',
      'wr-08': 'Use personal experience to support your opinion',
      'sp-01': 'Show empathy, then give advice using two or three criteria',
      'sp-02': 'Speak in order: experience, feeling, and lesson learned',
      'sp-03': 'Describe the whole scene, people, actions, and atmosphere',
      'sp-04': 'Predict what will happen next from the current situation',
      'sp-05': 'Compare two options and persuade someone to choose one',
      'sp-06': 'Acknowledge the problem, speak politely, and suggest a solution',
      'sp-07': 'Give a clear opinion with reasons, examples, and a conclusion',
      'sp-08': 'Explain an unusual situation calmly and say what you will do',
    },
  },
  ko: {
    sectionLabels: {
      listening: 'Listening · 듣기',
      reading: 'Reading · 읽기',
      writing: 'Writing · 쓰기',
      speaking: 'Speaking · 말하기',
    },
    focusLabel: '핵심',
    timeLabel: '시간',
    openMock: '목테스트 열기',
    openDrill: '유형 연습',
    drillLockedLabel: '유형 연습',
    drillAccessNote: '로그인 후 관리자 승인 완료 시 이용 가능합니다.',
    templateButton: '템플릿',
    templateModalTitle: '쓰기 템플릿',
    speakingTemplateModalTitle: '스피킹 템플릿',
    templateCoachTitle: '추천 템플릿 팁',
    templateCoachShow: '템플릿 팁 보기',
    templateCoachHide: '템플릿 팁 숨기기',
    templateCoachBadge: '연습 보조',
    templateCoachNote: '공식 화면에 확인된 타이핑 노트 박스가 아니라, 말하기 연습용 보조 가이드입니다.',
    templatePhraseLabel: '템플릿 문구',
    prepLabel: '준비',
    speakLabel: '말하기',
    speakingSetupTitle: '스피킹 연습 선택',
    speakingSetupBody: '먼저 지문 형태를 고르세요. 시작 버튼을 누른 뒤에만 타이머가 시작됩니다.',
    speakingRandomTab: '랜덤 섞기',
    speakingAllFormsTab: '전체 형태',
    speakingShuffleLabel: '랜덤 순서',
    speakingSkipAttemptedLabel: '이미 푼 문제 스킵',
    speakingStartPractice: '말하기 연습 시작',
    speakingBackToSetup: '연습 선택으로 돌아가기',
    speakingPauseTime: '시간 멈추기',
    speakingResumeTime: '시간 다시 시작',
    speakingScoringTitle: '로컬 말하기 연습 점수',
    speakingScoringNote: '입력한 노트/답변 텍스트 기준 분석입니다. 서버 Whisper/Qwen 채점은 음성 엔드포인트가 준비되면 연결할 수 있습니다.',
    speakingMissingWords: '연습할 단어',
    speakingPrepPhase: '답변 준비 중',
    speakingRecordingPhase: '녹음 시간',
    speakingDonePhase: '말하기 시간 종료',
    speakingRecordingButton: '녹음 중',
    speakingStopRecording: '녹음 정지',
    intuitiveDifficulty: {
      easy: '쉬움',
      medium: '보통',
      hard: '어려움',
    },
    intuitiveMemory: {
      low: '낮음',
      medium: '중간',
      high: '높음',
    },
    templateUseTitle: '사용 방법',
    templateUseBody: '대괄호 빈칸만 문제의 핵심 단어로 바꾸고, 톤과 예시를 문제 상황에 맞게 조정하세요.',
    templateFlowTitle: '암기 흐름',
    templateBlankTitle: '채울 빈칸',
    templateTipTitle: '템플릿 팁',
    templateExamplesTitle: '유사 문제 예시',
    templateExamplesNote: 'Skill Drill 실제 문제가 아니라, 이 템플릿을 언제 쓰는지 감 잡기 위한 별도 예시입니다.',
    templateTextTitle: '빈칸 완성 템플릿',
    historyTitle: '내 풀이 이력',
    historyEmpty: '아직 풀이 이력이 없습니다.',
    historyOpen: '결과 보기',
    historyDetailTitle: '풀이 결과',
    historyDateLabel: '날짜',
    historyScoreLabel: '점수',
    historyTimeLabel: '소요 시간',
    historyCorrectLabel: '맞은 문제',
    historyIncorrectLabel: '틀린 문제',
    historyCorrectQuestions: '맞은 문항',
    historyIncorrectQuestions: '틀린 문항',
    mockSets: '목테스트',
    typesLabel: '유형',
    currentQuestion: '현재 목테스트',
    playAudio: '재생',
    stopAudio: '정지',
    repeatAudio: '반복',
    speedLabel: '속도',
    showTranscript: '스크립트 보기',
    hideTranscript: '스크립트 숨기기',
    transcriptHidden: '처음에는 실제 시험처럼 스크립트를 숨깁니다. 들은 뒤 필요할 때 확인하세요.',
    transcriptTitle: '연습 스크립트',
    passageTitle: '읽기 지문',
    promptTitle: '문제',
    questionsTitle: '문항',
    prevMock: '이전',
    nextMock: '다음',
    responseTitle: '내 답안',
    speakingNotesTitle: '말하기 노트 (연습용)',
    showAnswers: '정답 보기',
    hideAnswers: '정답 숨기기',
    modelAnswerTitle: '정답',
    strategyLabel: '풀이 전략',
    quickTipLabel: '빠른 팁',
    questionDifficultyLabel: '난이도',
    typeDifficultyLabel: '난이도',
    memoryLoadLabel: '기억',
    memoFocusLabel: '메모 핵심',
    challengeLabel: '왜 헷갈리는지',
    examCountPrefix: '실전',
    difficulty: {
      easy: '하',
      medium: '중',
      hard: '상',
    },
    officialReferences: '공식 출처',
    testFocus: {},
  },
  zh: {
    sectionLabels: {
      listening: 'Listening · 听力',
      reading: 'Reading · 阅读',
      writing: 'Writing · 写作',
      speaking: 'Speaking · 口语',
    },
    focusLabel: '重点',
    timeLabel: '时间',
    openMock: '打开模拟题',
    openDrill: '开始练习',
    drillLockedLabel: '开始练习',
    drillAccessNote: '登录并经管理员批准后才可使用。',
    templateButton: '模板',
    templateModalTitle: '写作模板',
    speakingTemplateModalTitle: '口语模板',
    templateCoachTitle: '推荐模板提示',
    templateCoachShow: '显示模板提示',
    templateCoachHide: '隐藏模板提示',
    templateCoachBadge: '练习辅助',
    templateCoachNote: '这是练习辅助提示，不是已确认的官方屏幕笔记框。',
    templatePhraseLabel: '模板句',
    prepLabel: '准备',
    speakLabel: '口语',
    speakingSetupTitle: '选择口语练习',
    speakingSetupBody: '先选择题目形式。点击开始后计时器才会启动。',
    speakingRandomTab: '随机混合',
    speakingAllFormsTab: '全部形式',
    speakingShuffleLabel: '随机顺序',
    speakingSkipAttemptedLabel: '跳过已练习题目',
    speakingStartPractice: '开始口语练习',
    speakingBackToSetup: '返回练习选择',
    speakingPauseTime: '暂停计时',
    speakingResumeTime: '继续计时',
    speakingScoringTitle: '本地口语练习评分',
    speakingScoringNote: '基于输入的笔记/回答文本分析。服务器 Whisper/Qwen 评分可在语音接口准备后连接。',
    speakingMissingWords: '需要练习的词',
    speakingPrepPhase: '准备回答',
    speakingRecordingPhase: '录音时间',
    speakingDonePhase: '口语时间结束',
    speakingRecordingButton: '录音中',
    speakingStopRecording: '停止录音',
    intuitiveDifficulty: {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    },
    intuitiveMemory: {
      low: '低',
      medium: '中',
      high: '高',
    },
    templateUseTitle: '使用方法',
    templateUseBody: '只替换方括号中的空格，填入题目里的关键词，再按语气和例子微调。',
    templateFlowTitle: '记忆流程',
    templateBlankTitle: '需要填写',
    templateTipTitle: '模板技巧',
    templateExamplesTitle: '相似题目示例',
    templateExamplesNote: '这些不是 Skill Drill 题目，只用于判断这个模板适合什么题型。',
    templateTextTitle: '可填空模板',
    historyTitle: '我的作答记录',
    historyEmpty: '还没有作答记录。',
    historyOpen: '查看结果',
    historyDetailTitle: '作答结果',
    historyDateLabel: '日期',
    historyScoreLabel: '分数',
    historyTimeLabel: '耗时',
    historyCorrectLabel: '答对',
    historyIncorrectLabel: '答错',
    historyCorrectQuestions: '答对题目',
    historyIncorrectQuestions: '答错题目',
    mockSets: '套模拟题',
    typesLabel: '题型',
    currentQuestion: '当前模拟题',
    playAudio: '播放',
    stopAudio: '停止',
    repeatAudio: '重复',
    speedLabel: '速度',
    showTranscript: '显示文本',
    hideTranscript: '隐藏文本',
    transcriptHidden: '初始状态像真实考试一样隐藏文本。听完后可自行查看。',
    transcriptTitle: '练习文本',
    passageTitle: '阅读文章',
    promptTitle: '题目',
    questionsTitle: '问题',
    prevMock: '上一题',
    nextMock: '下一题',
    responseTitle: '我的答案',
    speakingNotesTitle: '口语笔记（练习辅助）',
    showAnswers: '显示答案',
    hideAnswers: '隐藏答案',
    modelAnswerTitle: '答案',
    strategyLabel: '解题策略',
    quickTipLabel: '快速技巧',
    questionDifficultyLabel: '难度',
    typeDifficultyLabel: '难度',
    memoryLoadLabel: '记忆',
    memoFocusLabel: '笔记重点',
    challengeLabel: '为什么容易错',
    examCountPrefix: '实考',
    difficulty: {
      easy: '低',
      medium: '中',
      hard: '高',
    },
    officialReferences: '官方来源',
    testFocus: {
      'ls-01': '在解决问题的对话中找出建议、条件和下一步',
      'ls-02': '在日常对话中比较日程变化和选项',
      'ls-03': '从学校通知中找出必交材料和截止日期',
      'ls-04': '听懂新闻中的原因、影响和例外',
      'ls-05': '整理不同说话人的观点和最终决定',
      'ls-06': '区分观点听力中的态度和理由',
      'ls-07': '理解客服核查步骤和补偿方案',
      'ls-08': '从通知中找出地点变化和服务限制',
      'rd-01': '在邮件中找出请求、原因和下一步',
      'rd-02': '比较图表条件并选择最合适的选项',
      'rd-03': '区分信息文本中的规则、例外和建议',
      'rd-04': '连接观点文章中的主张、反方意见和理由',
      'rd-05': '在短信息中找出责任和时间安排',
      'rd-06': '从政策文本中找出费用和例外条件',
      'rd-07': '比较每个选项包含和不包含的内容',
      'rd-08': '理解优点、缺点和平衡结论',
      'wr-01': '礼貌提出请求，说明目的，并写明截止时间',
      'wr-02': '选择一个偏好，并展开两到三个理由',
      'wr-03': '说明问题，给出具体例子，并请求解决方案',
      'wr-04': '在政策话题中平衡利弊',
      'wr-05': '道歉、说明冲突，并提出替代时间',
      'wr-06': '表达立场，用理由支持，并说明影响',
      'wr-07': '提供订单信息，说明问题，并要求处理',
      'wr-08': '用个人经历支持你的观点',
      'sp-01': '先表达理解，再用两到三个标准给建议',
      'sp-02': '按经历、感受、学到的内容来表达',
      'sp-03': '描述整体场景、人物、动作和氛围',
      'sp-04': '根据当前情况预测接下来会发生什么',
      'sp-05': '比较两个选项，并说服对方选择其中一个',
      'sp-06': '承认问题，礼貌表达，并提出解决办法',
      'sp-07': '给出明确观点、理由、例子和结论',
      'sp-08': '冷静说明异常情况，并说出你的处理方式',
    },
  },
}

const LISTENING_PART_PROFILES = {
  en: {
    'Problem Solving': {
      memory: 'Low-Med',
      difficultyKey: 'medium',
      memoFocus: 'Problem -> option -> final choice',
      challenge: 'Early options often change before the final decision.',
    },
    'Daily Life Conversation': {
      memory: 'Medium',
      difficultyKey: 'easy',
      memoFocus: 'Who, where, why, next action',
      challenge: 'Casual talk hides small but important detail changes.',
    },
    Information: {
      memory: 'Med-High',
      difficultyKey: 'medium',
      memoFocus: 'Numbers, dates, conditions, order',
      challenge: 'You need to hold structured details and sequence at once.',
    },
    'News Item': {
      memory: 'Med-High',
      difficultyKey: 'hard',
      memoFocus: 'Cause -> result -> exception',
      challenge: 'Cause, effect, and exceptions arrive quickly in one report.',
    },
    Discussion: {
      memory: 'High',
      difficultyKey: 'hard',
      memoFocus: 'Speaker -> opinion -> final agreement',
      challenge: 'It is easy to mix up which speaker said which reason.',
    },
    Viewpoints: {
      memory: 'High',
      difficultyKey: 'hard',
      memoFocus: 'Claim -> reason 1 -> reason 2 -> attitude',
      challenge: 'You must track stance, support, and tone together.',
    },
  },
  ko: {
    'Problem Solving': {
      memory: '낮음~중간',
      difficultyKey: 'medium',
      memoFocus: '문제 -> 제안 -> 최종 선택',
      challenge: '초반 선택지가 뒤집히는 경우가 많아 최종 해결책까지 들어야 합니다.',
    },
    'Daily Life Conversation': {
      memory: '중간',
      difficultyKey: 'easy',
      memoFocus: '누가, 어디서, 왜, 다음 행동',
      challenge: '대화는 쉬워 보여도 일정, 장소, 조건이 슬쩍 바뀝니다.',
    },
    Information: {
      memory: '중간~높음',
      difficultyKey: 'medium',
      memoFocus: '숫자, 날짜, 조건, 순서',
      challenge: '안내형 정보가 많아서 구조를 놓치면 한 번에 무너집니다.',
    },
    'News Item': {
      memory: '중간~높음',
      difficultyKey: 'hard',
      memoFocus: '원인 -> 결과 -> 예외',
      challenge: '뉴스 한 문단 안에 원인, 결과, 세부 사실이 빠르게 섞여 나옵니다.',
    },
    Discussion: {
      memory: '높음',
      difficultyKey: 'hard',
      memoFocus: '사람 이름/역할 -> 각자 의견 -> 최종 결정',
      challenge: '여러 사람의 의견과 근거를 분리해서 기억해야 합니다.',
    },
    Viewpoints: {
      memory: '높음',
      difficultyKey: 'hard',
      memoFocus: '주장 -> 근거 1 -> 근거 2 -> 태도',
      challenge: '주장뿐 아니라 말하는 태도와 숨은 뉘앙스도 함께 잡아야 합니다.',
    },
  },
  zh: {
    'Problem Solving': {
      memory: '低到中',
      difficultyKey: 'medium',
      memoFocus: '问题 -> 方案 -> 最终选择',
      challenge: '前面提到的选项常常会改变，必须听到最后决定。',
    },
    'Daily Life Conversation': {
      memory: '中等',
      difficultyKey: 'easy',
      memoFocus: '谁、哪里、为什么、下一步',
      challenge: '对话看似简单，但时间地点条件会悄悄变化。',
    },
    Information: {
      memory: '中到高',
      difficultyKey: 'medium',
      memoFocus: '数字、日期、条件、顺序',
      challenge: '信息结构多，漏掉顺序或条件就容易连错。',
    },
    'News Item': {
      memory: '中到高',
      difficultyKey: 'hard',
      memoFocus: '原因 -> 结果 -> 例外',
      challenge: '新闻里原因、结果和细节出现得很快。',
    },
    Discussion: {
      memory: '高',
      difficultyKey: 'hard',
      memoFocus: '说话人 -> 观点 -> 最终决定',
      challenge: '最容易把不同说话人的理由和立场混在一起。',
    },
    Viewpoints: {
      memory: '高',
      difficultyKey: 'hard',
      memoFocus: '主张 -> 理由1 -> 理由2 -> 态度',
      challenge: '不仅要抓观点，还要抓语气和隐藏态度。',
    },
  },
}

const READING_PART_PROFILES = {
  en: {
    Correspondence: {
      memory: 'Low-Med',
      difficultyKey: 'medium',
      memoFocus: 'Sender -> purpose -> request -> next step',
      challenge: 'Small deadline or document details often decide the answer.',
    },
    'Apply a Diagram': {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'Label -> condition -> best match',
      challenge: 'One missed limit can make an attractive option wrong.',
    },
    Information: {
      memory: 'Med-High',
      difficultyKey: 'medium',
      memoFocus: 'Rule -> exception -> required action',
      challenge: 'Rules, recommendations, and exceptions look similar at first glance.',
    },
    Viewpoints: {
      memory: 'High',
      difficultyKey: 'hard',
      memoFocus: 'Claim -> counterclaim -> reason -> conclusion',
      challenge: 'You must connect each reason to the correct side of the argument.',
    },
  },
  ko: {
    Correspondence: {
      memory: '낮음~중간',
      difficultyKey: 'medium',
      memoFocus: '보낸 사람 -> 목적 -> 요청 -> 다음 행동',
      challenge: '마감일, 문서, 조건 같은 작은 정보가 답을 결정합니다.',
    },
    'Apply a Diagram': {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '라벨 -> 조건 -> 최적 선택',
      challenge: '제한 조건 하나를 놓치면 그럴듯한 선택지가 오답이 됩니다.',
    },
    Information: {
      memory: '중간~높음',
      difficultyKey: 'medium',
      memoFocus: '규칙 -> 예외 -> 필수 행동',
      challenge: '규칙, 권장사항, 예외가 비슷하게 보여서 구분이 필요합니다.',
    },
    Viewpoints: {
      memory: '높음',
      difficultyKey: 'hard',
      memoFocus: '주장 -> 반론 -> 근거 -> 결론',
      challenge: '각 근거가 어느 입장에 붙는지 연결해야 합니다.',
    },
  },
  zh: {
    Correspondence: {
      memory: '低到中',
      difficultyKey: 'medium',
      memoFocus: '发送者 -> 目的 -> 请求 -> 下一步',
      challenge: '截止时间、文件和条件等小细节常常决定答案。',
    },
    'Apply a Diagram': {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '标签 -> 条件 -> 最佳匹配',
      challenge: '漏掉一个限制条件，就可能把看似正确的选项选错。',
    },
    Information: {
      memory: '中到高',
      difficultyKey: 'medium',
      memoFocus: '规则 -> 例外 -> 必须行动',
      challenge: '规则、建议和例外看起来相似，需要仔细区分。',
    },
    Viewpoints: {
      memory: '高',
      difficultyKey: 'hard',
      memoFocus: '主张 -> 反方观点 -> 理由 -> 结论',
      challenge: '必须把每个理由连接到正确的一方。',
    },
  },
}

const WRITING_PART_PROFILES = {
  en: {
    Email: {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'Reader -> purpose -> details -> request',
      challenge: 'The score depends on covering every bullet with the right tone.',
    },
    Survey: {
      memory: 'Med-High',
      difficultyKey: 'medium',
      memoFocus: 'Position -> reason 1 -> reason 2 -> conclusion',
      challenge: 'A clear opinion needs concrete support, not only general statements.',
    },
  },
  ko: {
    Email: {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '독자 -> 목적 -> 세부정보 -> 요청',
      challenge: '모든 bullet을 빠짐없이 넣고 독자에 맞는 톤을 유지해야 합니다.',
    },
    Survey: {
      memory: '중간~높음',
      difficultyKey: 'medium',
      memoFocus: '입장 -> 이유 1 -> 이유 2 -> 결론',
      challenge: '일반적인 말보다 구체적인 이유와 예시가 점수를 만듭니다.',
    },
  },
  zh: {
    Email: {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '读者 -> 目的 -> 细节 -> 请求',
      challenge: '必须覆盖所有 bullet，同时保持合适语气。',
    },
    Survey: {
      memory: '中到高',
      difficultyKey: 'medium',
      memoFocus: '立场 -> 理由1 -> 理由2 -> 结论',
      challenge: '清楚观点需要具体理由和例子，不能只写泛泛而谈。',
    },
  },
}

const SPEAKING_PART_PROFILES = {
  en: {
    'Giving Advice': {
      memory: 'Low-Med',
      difficultyKey: 'medium',
      memoFocus: 'Situation -> advice -> reason -> next step',
      challenge: 'You must sound natural while giving practical advice quickly.',
    },
    'Personal Experience': {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'When/where -> event -> feeling -> result',
      challenge: 'A story needs clear order and enough detail without running out of time.',
    },
    'Describing a Scene': {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'Overall -> people -> actions -> location',
      challenge: 'Fluency drops if you list objects without organizing the image.',
    },
    'Making Predictions': {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'Current clue -> likely action -> reason -> result',
      challenge: 'The answer must move from description into prediction quickly.',
    },
    'Comparing and Persuading': {
      memory: 'High',
      difficultyKey: 'hard',
      memoFocus: 'Option A -> option B -> choice -> persuasion',
      challenge: 'You need to compare both options but still make one strong recommendation.',
    },
    'Difficult Situation': {
      memory: 'High',
      difficultyKey: 'hard',
      memoFocus: 'Problem -> impact -> polite request -> solution',
      challenge: 'Tone matters: you must be firm without sounding rude.',
    },
    'Expressing Opinions': {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'Opinion -> reason 1 -> reason 2 -> closing',
      challenge: 'General opinions sound weak unless you add examples.',
    },
    'Unusual Situation': {
      memory: 'Medium',
      difficultyKey: 'medium',
      memoFocus: 'What happened -> where/when -> concern -> request',
      challenge: 'You must explain an unexpected issue clearly and calmly.',
    },
  },
  ko: {
    'Giving Advice': {
      memory: '낮음~중간',
      difficultyKey: 'medium',
      memoFocus: '상황 -> 조언 -> 이유 -> 다음 행동',
      challenge: '짧은 시간 안에 자연스럽고 실용적인 조언처럼 말해야 합니다.',
    },
    'Personal Experience': {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '언제/어디서 -> 사건 -> 느낌 -> 결과',
      challenge: '이야기 순서와 디테일을 유지하면서 시간 안에 마무리해야 합니다.',
    },
    'Describing a Scene': {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '전체 장면 -> 사람 -> 행동 -> 장소',
      challenge: '물건만 나열하면 유창성이 떨어져 장면 구조를 잡아야 합니다.',
    },
    'Making Predictions': {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '현재 단서 -> 예상 행동 -> 이유 -> 결과',
      challenge: '묘사에서 빨리 예측으로 넘어가야 답변이 완성됩니다.',
    },
    'Comparing and Persuading': {
      memory: '높음',
      difficultyKey: 'hard',
      memoFocus: 'A 비교 -> B 비교 -> 선택 -> 설득',
      challenge: '둘 다 비교하면서도 한쪽을 강하게 추천해야 합니다.',
    },
    'Difficult Situation': {
      memory: '높음',
      difficultyKey: 'hard',
      memoFocus: '문제 -> 영향 -> 공손한 요청 -> 해결책',
      challenge: '무례하지 않게 말하면서도 요청은 분명해야 합니다.',
    },
    'Expressing Opinions': {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '의견 -> 이유 1 -> 이유 2 -> 마무리',
      challenge: '일반론만 말하면 약하므로 구체적인 예시가 필요합니다.',
    },
    'Unusual Situation': {
      memory: '중간',
      difficultyKey: 'medium',
      memoFocus: '무슨 일 -> 언제/어디서 -> 걱정 -> 요청',
      challenge: '예상 밖 상황을 차분하고 명확하게 설명해야 합니다.',
    },
  },
  zh: {
    'Giving Advice': {
      memory: '低到中',
      difficultyKey: 'medium',
      memoFocus: '情况 -> 建议 -> 理由 -> 下一步',
      challenge: '需要在短时间内自然地给出实用建议。',
    },
    'Personal Experience': {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '时间/地点 -> 事件 -> 感受 -> 结果',
      challenge: '故事要有顺序和细节，同时不能超时。',
    },
    'Describing a Scene': {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '整体 -> 人物 -> 动作 -> 地点',
      challenge: '如果只列物品会不流利，需要组织画面。',
    },
    'Making Predictions': {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '当前线索 -> 可能行动 -> 理由 -> 结果',
      challenge: '必须很快从描述转到预测。',
    },
    'Comparing and Persuading': {
      memory: '高',
      difficultyKey: 'hard',
      memoFocus: '选项A -> 选项B -> 选择 -> 说服',
      challenge: '既要比较两个选项，又要明确推荐一个。',
    },
    'Difficult Situation': {
      memory: '高',
      difficultyKey: 'hard',
      memoFocus: '问题 -> 影响 -> 礼貌请求 -> 解决方案',
      challenge: '语气要礼貌，但请求必须清楚。',
    },
    'Expressing Opinions': {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '观点 -> 理由1 -> 理由2 -> 结尾',
      challenge: '只有泛泛观点会显弱，需要具体例子。',
    },
    'Unusual Situation': {
      memory: '中等',
      difficultyKey: 'medium',
      memoFocus: '发生了什么 -> 时间/地点 -> 担心 -> 请求',
      challenge: '需要冷静清楚地说明突发情况。',
    },
  },
}

PAGE_COPY.ko.testFocus = Object.values(CELPIP_MOCK_TESTS)
  .flat()
  .reduce((acc, test) => {
    acc[test.id] = test.focusKo || test.focus
    return acc
  }, {})

PAGE_COPY.zh.testFocus = {
  ...PAGE_COPY.zh.testFocus,
  ...Object.values(CELPIP_MOCK_TESTS)
    .flat()
    .reduce((acc, test) => {
      if (test.focusZh) acc[test.id] = test.focusZh
      return acc
    }, {}),
}

const TIP_COPY = {
  en: {
    tipsButton: 'Tips',
    modalTitle: 'Type Tips',
    strategyTitle: 'How to Approach',
    highScoreTitle: 'High-score Checklist',
    items: {
      'listening:Problem Solving': {
        strategy: ['Track the problem, each option, and the final recommendation.', 'Write short symbols for conditions like time, cost, location, and availability.', 'Expect distractors: the first option is often rejected or changed.'],
        highScore: ['Choose the answer that matches the final decision, not an earlier idea.', 'Listen for contrast words such as but, however, actually, and instead.', 'Do not overthink outside knowledge; use only what the speakers say.'],
      },
      'listening:Daily Life Conversation': {
        strategy: ['Identify who needs what and why the conversation is happening.', 'Mark changed details: day, time, place, price, and requirement.', 'Listen for casual paraphrases rather than exact words from the answer.'],
        highScore: ['Confirm the latest version of the plan before answering.', 'Separate facts from opinions or preferences.', 'Use the speaker tone to catch agreement, hesitation, or uncertainty.'],
      },
      'listening:Information': {
        strategy: ['Listen for the structure: topic, requirements, deadlines, exceptions.', 'Group details by category instead of writing full sentences.', 'Pay attention to numbers and sequence markers.'],
        highScore: ['Do not miss negative conditions such as not required or unavailable.', 'Match answers to the speaker purpose, not isolated keywords.', 'Check whether the question asks for a requirement, suggestion, or warning.'],
      },
      'listening:News Item': {
        strategy: ['Catch the main event first, then cause, effect, and who is affected.', 'Watch for dates, amounts, locations, and exceptions.', 'Summarize the news in one sentence before choosing answers.'],
        highScore: ['Distinguish what already happened from what will happen.', 'Treat statistics carefully; one number may describe a different group.', 'Avoid answers that sound dramatic but are not stated.'],
      },
      'listening:Discussion': {
        strategy: ['Label each speaker and their position as positive, negative, or mixed.', 'Listen for compromise language and final agreement.', 'Track who says each reason.'],
        highScore: ['Do not combine opinions from different speakers.', 'Choose the answer tied to the correct speaker.', 'Notice when a speaker changes their mind.'],
      },
      'listening:Viewpoints': {
        strategy: ['Separate the main viewpoint from supporting examples.', 'Mark attitude words that show approval, concern, doubt, or criticism.', 'Compare both sides before answering.'],
        highScore: ['Answer based on the speaker stance, not your own opinion.', 'Choose moderate answers when the speaker is balanced.', 'Watch for contrast between public benefit and personal concern.'],
      },
      'reading:Correspondence': {
        strategy: ['Identify sender, receiver, purpose, request, and next step.', 'Scan dates, documents, conditions, and action verbs.', 'Read the question before rereading the whole email.'],
        highScore: ['Match pronouns and references carefully.', 'Do not confuse background information with the requested action.', 'Use the exact relationship between people to infer tone.'],
      },
      'reading:Apply a Diagram': {
        strategy: ['Read labels and legends before details.', 'Compare options row by row or column by column.', 'Eliminate choices that fail one condition.'],
        highScore: ['Check units, frequency, and eligibility limits.', 'Do not assume the most expensive or complete option is best.', 'Verify every condition in the question.'],
      },
      'reading:Information': {
        strategy: ['Find headings, rule words, exceptions, and recommendations.', 'Underline who must do what and by when.', 'Separate required actions from optional advice.'],
        highScore: ['Pay attention to except, unless, only, and at least.', 'Use the passage wording over common sense.', 'Choose the answer that covers the full condition.'],
      },
      'reading:Viewpoints': {
        strategy: ['Identify the writer position and the opposing view.', 'Connect each reason to the correct side.', 'Look for conclusion or compromise language.'],
        highScore: ['Distinguish evidence from opinion.', 'Avoid extreme answers unless the passage is extreme.', 'Answer attitude questions from tone, not just keywords.'],
      },
      'writing:Email': {
        strategy: ['Open with purpose, give context, make the request, and close politely.', 'Use the right tone for the reader: formal, semi-formal, or friendly.', 'Include all bullet points with enough detail.'],
        highScore: ['Keep paragraphs clear and easy to scan.', 'Use specific dates, names, and actions when useful.', 'Proofread verb tense, articles, and polite request forms.'],
      },
      'writing:Survey': {
        strategy: ['Choose one side clearly in the first paragraph.', 'Develop two or three reasons with examples.', 'End with a concise recommendation or conclusion.'],
        highScore: ['Do not sit on the fence unless the prompt asks for balance.', 'Use linking words naturally, not mechanically.', 'Support opinions with concrete examples.'],
      },
      'speaking:Giving Advice': {
        strategy: ['Acknowledge the person situation, then give clear advice.', 'Use two reasons and a practical next step.', 'Speak as if talking to a real friend or coworker.'],
        highScore: ['Avoid listing too many options.', 'Use modal verbs naturally: should, could, might want to.', 'Finish with a confident closing sentence.'],
      },
      'speaking:Personal Experience': {
        strategy: ['Tell the story in order: background, event, result.', 'Add feelings and one lesson learned.', 'Use concrete details so it sounds personal.'],
        highScore: ['Stay in one tense pattern unless the timeline changes.', 'Do not memorize a generic story.', 'End before time runs out with a clear takeaway.'],
      },
      'speaking:Describing a Scene': {
        strategy: ['Start with the overall scene, then describe people, actions, and location.', 'Use present continuous for actions.', 'Mention mood or purpose at the end.'],
        highScore: ['Keep moving across the image logically.', 'Avoid repeating there is for every sentence.', 'Use descriptive vocabulary but stay fluent.'],
      },
      'speaking:Making Predictions': {
        strategy: ['Describe the current situation briefly, then predict likely next steps.', 'Use because to explain why your prediction makes sense.', 'Give one possible outcome and consequence.'],
        highScore: ['Use future language naturally: will, might, is likely to.', 'Do not spend all the time describing the picture.', 'Make the prediction specific.'],
      },
      'speaking:Comparing and Persuading': {
        strategy: ['Compare both choices using two criteria.', 'Choose one option and persuade with benefits.', 'Address one weakness of your choice briefly.'],
        highScore: ['Use comparative language accurately.', 'Be decisive instead of saying both are equal.', 'End with a recommendation.'],
      },
      'speaking:Difficult Situation': {
        strategy: ['Stay polite, calm, and solution-focused.', 'State the issue, explain impact, and suggest a fair action.', 'Use softeners to reduce conflict.'],
        highScore: ['Avoid blaming language.', 'Use I statements and polite requests.', 'Show empathy while still being clear.'],
      },
      'speaking:Expressing Opinions': {
        strategy: ['State your opinion immediately.', 'Give two reasons with examples.', 'Close by restating your position.'],
        highScore: ['Use clear signposting: first, another reason, overall.', 'Avoid vague examples.', 'Sound confident but not aggressive.'],
      },
      'speaking:Unusual Situation': {
        strategy: ['Explain what happened, why it is unusual, and what you want done.', 'Stay calm and practical.', 'Include key details such as place, time, and item.'],
        highScore: ['Use polite reporting language.', 'Do not overdramatize the situation.', 'End with a clear requested action.'],
      },
    },
  },
  ko: {
    tipsButton: '팁',
    modalTitle: '유형별 팁',
    strategyTitle: '접근 방법',
    highScoreTitle: '고득점 체크포인트',
    items: {},
  },
  zh: {
    tipsButton: '技巧',
    modalTitle: '题型技巧',
    strategyTitle: '答题方法',
    highScoreTitle: '高分检查点',
    items: {},
  },
}

function buildLocalizedTips(lang, key) {
  const [section, type] = key.split(':')

  if (lang === 'ko') {
    const bySection = {
      listening: {
        strategy: [`${type} 유형은 문제 상황, 선택지, 최종 결론을 순서대로 잡는 것이 핵심입니다.`, '시간, 장소, 비용, 조건, 예외는 짧은 기호로 메모하세요.', '초반에 나온 답이 나중에 바뀌는 경우가 많으니 마지막 결정까지 확인하세요.'],
        highScore: ['키워드가 들렸다는 이유만으로 고르지 말고 문맥과 결론을 확인하세요.', 'but, however, instead 같은 전환 표현 뒤를 특히 주의하세요.', '화자의 태도와 최종 행동을 구분하면 오답을 줄일 수 있습니다.'],
      },
      reading: {
        strategy: [`${type} 유형은 먼저 질문을 읽고 필요한 정보 위치를 빠르게 찾으세요.`, '조건, 예외, 날짜, 대상자를 표시하면서 읽으면 시간이 줄어듭니다.', '도표나 이메일은 제목, 발신자, 목적, 요구사항을 먼저 확인하세요.'],
        highScore: ['지문에 없는 상식으로 답하지 말고 문장 근거를 찾으세요.', 'only, unless, at least, except 같은 제한 표현을 놓치지 마세요.', '부분적으로 맞는 답보다 모든 조건을 만족하는 답을 고르세요.'],
      },
      writing: {
        strategy: [`${type} 유형은 목적을 첫 문단에서 분명히 밝히고, 이유를 2-3개로 정리하세요.`, '독자에 맞는 톤을 선택하고 문단을 짧게 나누세요.', '요구된 bullet point를 빠짐없이 포함하세요.'],
        highScore: ['문법보다 먼저 과제 충족, 구성, 명확성을 챙기세요.', '구체적인 날짜, 요청, 예시를 넣으면 설득력이 올라갑니다.', '마지막 2분은 시제, 관사, 단수/복수, 공손한 표현을 점검하세요.'],
      },
      speaking: {
        strategy: [`${type} 유형은 도입, 이유 2개, 예시, 마무리 순서로 말하면 안정적입니다.`, '준비 시간에는 문장 전체보다 키워드만 적으세요.', '끊기더라도 같은 말을 반복하지 말고 다음 포인트로 넘어가세요.'],
        highScore: ['유창성, 명확성, 자연스러운 연결어를 우선하세요.', '너무 어려운 단어보다 정확하고 자연스러운 문장을 쓰세요.', '마지막에는 결론이나 요청을 분명하게 마무리하세요.'],
      },
    }
    return bySection[section]
  }

  const bySection = {
    listening: {
      strategy: [`${type} 题型要按顺序抓住问题、选项和最后决定。`, '时间、地点、费用、条件和例外要用简短符号记录。', '前面出现的选项 later 可能会被否定或改变，要听到最后。'],
      highScore: ['不要只因为听到关键词就选择答案，要看上下文和结论。', '特别注意 but、however、instead 等转折后的内容。', '区分说话人的态度和最终行动，可以减少错误。'],
    },
    reading: {
      strategy: [`${type} 题型先读问题，再快速定位需要的信息。`, '阅读时标出条件、例外、日期和对象。', '邮件和图表要先看标题、对象、目的和要求。'],
      highScore: ['不要用常识作答，要找到文章中的依据。', '注意 only、unless、at least、except 等限制词。', '选择满足所有条件的答案，而不是只部分正确的答案。'],
    },
    writing: {
      strategy: [`${type} 题型第一段要明确目的，并展开两到三个理由。`, '根据读者选择合适语气，并用清楚段落组织内容。', '题目要求的 bullet point 要全部覆盖。'],
      highScore: ['先确保完成任务、结构清楚、表达明确，再检查细节语法。', '加入具体日期、请求和例子会更有说服力。', '最后两分钟检查时态、冠词、单复数和礼貌表达。'],
    },
    speaking: {
      strategy: [`${type} 题型可以按开头、两个理由、例子、结尾来组织。`, '准备时间只写关键词，不要写完整句子。', '卡住时不要重复同一句，直接进入下一个要点。'],
      highScore: ['优先保证流利度、清晰度和自然连接。', '与其使用难词，不如使用准确自然的句子。', '结尾要明确给出结论、建议或请求。'],
    },
  }

  return bySection[section]
}

TIP_COPY.ko.items = Object.fromEntries(Object.keys(TIP_COPY.en.items).map((key) => [key, buildLocalizedTips('ko', key)]))
TIP_COPY.zh.items = Object.fromEntries(Object.keys(TIP_COPY.en.items).map((key) => [key, buildLocalizedTips('zh', key)]))

const WRITING_TEMPLATE_SETS = {
  Email: [
    {
      id: 'email-request',
      label: 'Request / Inquiry',
      labelKo: '요청 / 문의',
      labelZh: '请求 / 咨询',
      flow: ['Greeting', 'Purpose', 'Context', 'Request', 'Thanks'],
      flowKo: ['인사', '목적', '상황', '요청', '감사'],
      flowZh: ['问候', '目的', '背景', '请求', '感谢'],
      blanks: ['recipient', 'topic', 'reason', 'request', 'deadline'],
      tips: ['Be polite but direct.', 'Use one paragraph for context and one for the request.', 'Add a deadline only if the prompt gives one.'],
      tipsKo: ['공손하지만 요청은 분명하게 쓰세요.', '상황 설명과 요청을 문단으로 나누세요.', '문제에 마감일이 있으면 반드시 넣으세요.'],
      tipsZh: ['语气礼貌但请求要明确。', '背景和请求分成不同段落。', '如果题目给了截止时间，一定要写进去。'],
      template: `Dear [recipient],

I am writing to ask about [topic]. I recently noticed that [reason], and I would appreciate your help with this matter.

Could you please [request]? If possible, I would be grateful if this could be done by [deadline].

Thank you for your time and assistance. I look forward to your reply.

Sincerely,
[your name]`,
    },
    {
      id: 'email-complaint',
      label: 'Complaint / Problem',
      labelKo: '불만 / 문제 제기',
      labelZh: '投诉 / 问题',
      flow: ['Greeting', 'Problem', 'Impact', 'Solution', 'Polite close'],
      flowKo: ['인사', '문제', '영향', '해결 요청', '공손한 마무리'],
      flowZh: ['问候', '问题', '影响', '解决方案', '礼貌结尾'],
      blanks: ['service or item', 'problem', 'date or place', 'impact', 'solution'],
      tips: ['Stay calm and factual.', 'Explain the impact before asking for a solution.', 'Avoid angry language even when complaining.'],
      tipsKo: ['감정적으로 쓰지 말고 사실 중심으로 쓰세요.', '해결 요청 전에 어떤 불편이 있었는지 설명하세요.', '불만 유형이어도 공격적인 표현은 피하세요.'],
      tipsZh: ['保持冷静并写事实。', '提出解决方案前先说明影响。', '即使是投诉，也避免攻击性语言。'],
      template: `Dear [recipient],

I am writing to report a problem with [service or item]. On [date or place], I noticed that [problem].

This caused [impact], so I hope the issue can be resolved soon. I would appreciate it if you could [solution].

Please let me know if you need any further information. Thank you for your attention to this matter.

Sincerely,
[your name]`,
    },
    {
      id: 'email-apology',
      label: 'Apology / Reschedule',
      labelKo: '사과 / 일정 변경',
      labelZh: '道歉 / 改期',
      flow: ['Apology', 'Reason', 'New plan', 'Responsibility', 'Close'],
      flowKo: ['사과', '이유', '새 계획', '책임 표현', '마무리'],
      flowZh: ['道歉', '原因', '新安排', '承担责任', '结尾'],
      blanks: ['missed event', 'reason', 'new date or plan', 'action', 'recipient'],
      tips: ['Apologize in the first sentence.', 'Give a reason without over-explaining.', 'Offer a concrete next step.'],
      tipsKo: ['첫 문장에서 바로 사과하세요.', '이유는 짧게 설명하고 변명처럼 길게 쓰지 마세요.', '구체적인 다음 행동을 제안하세요.'],
      tipsZh: ['第一句直接道歉。', '原因简短，不要解释过多。', '给出明确的下一步。'],
      template: `Dear [recipient],

I am sorry that I could not [missed event]. Unfortunately, [reason], so I was unable to follow the original plan.

Would it be possible to [new date or plan]? I will also [action] to make sure this does not cause further inconvenience.

Thank you for your understanding.

Sincerely,
[your name]`,
    },
    {
      id: 'email-thanks',
      label: 'Thank-you / Appreciation',
      labelKo: '감사 / 칭찬',
      labelZh: '感谢 / 表扬',
      flow: ['Thanks', 'Specific help', 'Result', 'Future note', 'Close'],
      flowKo: ['감사', '구체적 도움', '결과', '앞으로의 언급', '마무리'],
      flowZh: ['感谢', '具体帮助', '结果', '未来说明', '结尾'],
      blanks: ['recipient', 'help received', 'result', 'future benefit', 'specific detail'],
      tips: ['Name the exact help you received.', 'Explain the positive result.', 'Keep the tone warm but organized.'],
      tipsKo: ['무엇에 감사하는지 구체적으로 쓰세요.', '그 도움으로 생긴 좋은 결과를 설명하세요.', '따뜻한 톤을 유지하되 문단은 깔끔하게 나누세요.'],
      tipsZh: ['具体说明感谢的内容。', '说明这个帮助带来的好结果。', '语气温暖，但结构清楚。'],
      template: `Dear [recipient],

I wanted to thank you for [help received]. Your support with [specific detail] was very helpful.

Because of your help, [result]. I believe this will also help me [future benefit].

I truly appreciate your time and kindness.

Sincerely,
[your name]`,
    },
  ],
  Survey: [
    {
      id: 'survey-agree',
      label: 'Agree / Disagree',
      labelKo: '찬성 / 반대',
      labelZh: '同意 / 不同意',
      flow: ['Position', 'Reason 1', 'Example', 'Reason 2', 'Conclusion'],
      flowKo: ['입장', '이유 1', '예시', '이유 2', '결론'],
      flowZh: ['立场', '理由1', '例子', '理由2', '结论'],
      blanks: ['issue', 'position', 'reason one', 'example', 'reason two'],
      tips: ['Choose one side clearly.', 'Use two strong reasons instead of many weak ones.', 'End by repeating your recommendation.'],
      tipsKo: ['한쪽 입장을 분명히 고르세요.', '약한 이유 여러 개보다 강한 이유 두 개가 좋습니다.', '마지막에 추천/입장을 다시 정리하세요.'],
      tipsZh: ['明确选择一方。', '两个有力理由比多个弱理由更好。', '结尾再次强调建议或立场。'],
      template: `In my opinion, I [position] with the idea of [issue].

The first reason is [reason one]. For example, [example]. This would make the situation more practical for many people.

Another important reason is [reason two]. If this change is made, people will be able to make better use of their time and resources.

For these reasons, I believe [position] is the better choice.`,
    },
    {
      id: 'survey-option',
      label: 'Choose Option A / B',
      labelKo: '선택형 A / B',
      labelZh: '选项 A / B',
      flow: ['Choice', 'Benefit 1', 'Benefit 2', 'Address weakness', 'Recommendation'],
      flowKo: ['선택', '장점 1', '장점 2', '약점 보완', '추천'],
      flowZh: ['选择', '优点1', '优点2', '处理缺点', '建议'],
      blanks: ['option chosen', 'main benefit', 'second benefit', 'possible concern', 'group affected'],
      tips: ['Compare briefly, then commit.', 'Mention one weakness and explain why it is manageable.', 'Use the prompt words naturally.'],
      tipsKo: ['짧게 비교한 뒤 한 가지를 확실히 선택하세요.', '약점 하나를 인정하고 해결 가능하다고 설명하세요.', '문제의 핵심 단어를 자연스럽게 넣으세요.'],
      tipsZh: ['先简短比较，再明确选择。', '承认一个缺点并说明可以解决。', '自然使用题目关键词。'],
      template: `I would choose [option chosen] because it is the most useful option for [group affected].

The main benefit is [main benefit]. This would help people because it is convenient and easy to understand.

In addition, [second benefit]. Although some people may worry about [possible concern], I think this problem can be managed with clear communication.

Overall, [option chosen] is the better option because it offers more practical benefits.`,
    },
    {
      id: 'survey-recommendation',
      label: 'Recommendation / Policy',
      labelKo: '추천 / 정책 의견',
      labelZh: '建议 / 政策',
      flow: ['Recommendation', 'Need', 'Evidence', 'Action', 'Closing'],
      flowKo: ['추천', '필요성', '근거', '실행', '마무리'],
      flowZh: ['建议', '需求', '依据', '行动', '结尾'],
      blanks: ['recommendation', 'current problem', 'evidence or example', 'action step', 'expected result'],
      tips: ['Sound practical, not emotional.', 'Connect the policy to a real problem.', 'Make the final action easy to understand.'],
      tipsKo: ['감정보다 실용적인 해결책처럼 쓰세요.', '정책을 실제 문제와 연결하세요.', '마지막 행동 제안을 쉽게 이해되게 쓰세요.'],
      tipsZh: ['语气要实际，不要情绪化。', '把政策和真实问题连接起来。', '最后的行动建议要清楚。'],
      template: `I recommend [recommendation] because it would solve [current problem].

At the moment, [evidence or example]. This shows that the current situation is not ideal and needs improvement.

The best action would be to [action step]. If this is done, [expected result].

Therefore, I strongly believe this recommendation would be fair and useful.`,
    },
    {
      id: 'survey-balanced',
      label: 'Balanced Opinion',
      labelKo: '균형 의견',
      labelZh: '平衡观点',
      flow: ['Main view', 'Other side', 'Your reason', 'Condition', 'Final view'],
      flowKo: ['내 입장', '반대쪽', '내 이유', '조건', '최종 입장'],
      flowZh: ['主要观点', '另一方', '理由', '条件', '最终观点'],
      blanks: ['main view', 'opposite view', 'reason', 'condition', 'final recommendation'],
      tips: ['Use this when both choices have value.', 'Still make your final opinion clear.', 'A condition sentence can make the answer sound mature.'],
      tipsKo: ['양쪽에 장점이 있는 문제에 쓰기 좋습니다.', '그래도 최종 입장은 분명히 써야 합니다.', '조건 문장을 넣으면 더 성숙한 답안처럼 보입니다.'],
      tipsZh: ['适合两个选择都有优点的题目。', '最终立场仍然要明确。', '加入条件句会显得更成熟。'],
      template: `I understand why some people support [opposite view], because it can be helpful in certain situations.

However, I believe [main view] is the better choice. The main reason is [reason].

This option would work especially well if [condition]. In that case, people could enjoy the benefits without creating serious problems.

For this reason, my final recommendation is [final recommendation].`,
    },
  ],
}

const SPEAKING_TEMPLATE_SETS = {
  'Giving Advice': [
    {
      id: 'advice-friend',
      label: 'Friend / Family Advice',
      labelKo: '친구 / 가족 조언',
      labelZh: '朋友 / 家人建议',
      flow: ['Empathy', 'Main advice', 'Reason 1', 'Reason 2', 'Next step'],
      flowKo: ['공감', '핵심 조언', '이유 1', '이유 2', '다음 행동'],
      flowZh: ['共情', '主要建议', '理由1', '理由2', '下一步'],
      blanks: ['person', 'problem', 'advice', 'reason one', 'next step'],
      tips: ['Start warmly so the answer sounds natural.', 'Use should/could/might want to.', 'End with one practical action.'],
      tipsKo: ['따뜻하게 시작하면 자연스럽게 들립니다.', 'should/could/might want to를 활용하세요.', '마지막은 실천 가능한 행동 하나로 끝내세요.'],
      tipsZh: ['开头要自然温暖。', '使用 should/could/might want to。', '结尾给出一个可执行步骤。'],
      template: `I understand why [person] feels worried about [problem]. If I were in this situation, I would [advice].

The first reason is [reason one]. Also, it would help because [reason two].

So my suggestion is to [next step] first, and then decide what to do after seeing the result.`,
    },
    {
      id: 'advice-work-school',
      label: 'Work / School Advice',
      labelKo: '직장 / 학교 조언',
      labelZh: '工作 / 学校建议',
      flow: ['Situation', 'Professional advice', 'Benefit', 'Risk to avoid', 'Close'],
      flowKo: ['상황', '전문적 조언', '장점', '피할 위험', '마무리'],
      flowZh: ['情况', '正式建议', '好处', '避免风险', '结尾'],
      blanks: ['situation', 'recommended action', 'benefit', 'risk', 'person to contact'],
      tips: ['Sound polite and practical.', 'Mention one benefit and one risk.', 'Close with a clear first step.'],
      tipsKo: ['공손하고 실용적으로 말하세요.', '장점 하나와 피할 위험 하나를 말하세요.', '첫 행동을 분명히 제시하세요.'],
      tipsZh: ['语气礼貌且实际。', '说一个好处和一个风险。', '给出明确第一步。'],
      template: `For [situation], I think the best choice is to [recommended action].

This would be helpful because [benefit]. At the same time, it can prevent [risk].

I would recommend speaking with [person to contact] and making a simple plan before taking action.`,
    },
  ],
  'Personal Experience': [
    {
      id: 'experience-problem',
      label: 'Problem Solved Story',
      labelKo: '문제 해결 경험',
      labelZh: '解决问题经历',
      flow: ['Background', 'Problem', 'Action', 'Result', 'Lesson'],
      flowKo: ['배경', '문제', '행동', '결과', '교훈'],
      flowZh: ['背景', '问题', '行动', '结果', '收获'],
      blanks: ['time/place', 'problem', 'action', 'result', 'lesson'],
      tips: ['Keep the timeline simple.', 'Use past tense clearly.', 'End with what you learned.'],
      tipsKo: ['시간 순서를 단순하게 유지하세요.', '과거 시제를 명확히 쓰세요.', '배운 점으로 마무리하세요.'],
      tipsZh: ['时间线保持简单。', '清楚使用过去时。', '用学到的经验结尾。'],
      template: `One experience I remember happened [time/place]. At that time, [problem].

At first, I felt stressed, but I decided to [action]. After that, [result].

This experience taught me [lesson], so I still remember it clearly.`,
    },
    {
      id: 'experience-person',
      label: 'Person / Mentor Story',
      labelKo: '사람 / 멘토 경험',
      labelZh: '人物 / 导师经历',
      flow: ['Who', 'Situation', 'What happened', 'Feeling', 'Impact'],
      flowKo: ['누구', '상황', '일어난 일', '느낌', '영향'],
      flowZh: ['人物', '情况', '发生了什么', '感受', '影响'],
      blanks: ['person', 'situation', 'help or action', 'feeling', 'impact'],
      tips: ['Name the relationship quickly.', 'Show emotion, not only facts.', 'Explain why it mattered.'],
      tipsKo: ['관계를 빠르게 밝혀 주세요.', '사실만 말하지 말고 감정을 넣으세요.', '왜 중요했는지 설명하세요.'],
      tipsZh: ['快速说明关系。', '不仅说事实，也说感受。', '解释为什么重要。'],
      template: `A person who affected me was [person]. I met this person when [situation].

What I remember most is that [help or action]. Because of that, I felt [feeling].

This was important to me because [impact], and it changed the way I think about similar situations.`,
    },
  ],
  'Describing a Scene': [
    {
      id: 'scene-public',
      label: 'Busy Public Place',
      labelKo: '붐비는 공공장소',
      labelZh: '繁忙公共场所',
      flow: ['Overall scene', 'People', 'Actions', 'Objects', 'Mood'],
      flowKo: ['전체 장면', '사람', '행동', '사물', '분위기'],
      flowZh: ['整体画面', '人物', '动作', '物品', '氛围'],
      blanks: ['place', 'main people', 'main action', 'important object', 'mood'],
      tips: ['Move from general to specific.', 'Use present continuous.', 'Mention the atmosphere at the end.'],
      tipsKo: ['전체에서 세부로 이동하세요.', '현재진행형을 쓰세요.', '마지막에 분위기를 말하세요.'],
      tipsZh: ['从整体到细节。', '使用现在进行时。', '最后描述气氛。'],
      template: `This picture seems to show [place]. Overall, it looks [mood].

In the center, [main people] are [main action]. I can also see [important object], which suggests that the people are busy.

The scene feels organized and realistic, like a normal day in this place.`,
    },
    {
      id: 'scene-outdoor',
      label: 'Outdoor / Community Scene',
      labelKo: '야외 / 커뮤니티 장면',
      labelZh: '户外 / 社区场景',
      flow: ['Location', 'Weather/setting', 'Main action', 'Details', 'Purpose'],
      flowKo: ['장소', '날씨/배경', '주요 행동', '세부 묘사', '목적'],
      flowZh: ['地点', '天气/背景', '主要动作', '细节', '目的'],
      blanks: ['location', 'setting', 'main activity', 'detail', 'purpose'],
      tips: ['Use location words like on the left/right.', 'Add one guess about purpose.', 'Do not list every small object.'],
      tipsKo: ['왼쪽/오른쪽 같은 위치 표현을 쓰세요.', '목적을 한 번 추측하세요.', '작은 물건을 전부 나열하지 마세요.'],
      tipsZh: ['使用左边/右边等位置词。', '可以推测一个目的。', '不要罗列所有小物品。'],
      template: `The scene appears to be in [location], and the setting looks [setting].

Several people are [main activity]. On one side, I notice [detail], which helps explain what is happening.

I think the purpose of this activity is [purpose], and the overall atmosphere is positive.`,
    },
  ],
  'Making Predictions': [
    {
      id: 'prediction-problem',
      label: 'Problem Will Be Solved',
      labelKo: '문제 해결 예측',
      labelZh: '问题会被解决',
      flow: ['Current clue', 'Prediction', 'Reason', 'Next action', 'Result'],
      flowKo: ['현재 단서', '예측', '이유', '다음 행동', '결과'],
      flowZh: ['当前线索', '预测', '理由', '下一步', '结果'],
      blanks: ['current situation', 'prediction', 'reason', 'next action', 'result'],
      tips: ['Do not only describe the picture.', 'Use will/is likely to/might.', 'Connect every prediction to a clue.'],
      tipsKo: ['그림 묘사만 하지 마세요.', 'will/is likely to/might를 쓰세요.', '예측을 단서와 연결하세요.'],
      tipsZh: ['不要只描述图片。', '使用 will/is likely to/might。', '每个预测都要连接线索。'],
      template: `Based on [current situation], I think [prediction] will probably happen next.

The reason is that [reason]. The people may decide to [next action].

If that happens, the result will be [result], so the situation should improve soon.`,
    },
    {
      id: 'prediction-delay',
      label: 'Delay / Conflict Prediction',
      labelKo: '지연 / 갈등 예측',
      labelZh: '延误 / 冲突预测',
      flow: ['Problem clue', 'Likely issue', 'Cause', 'Consequence', 'Solution'],
      flowKo: ['문제 단서', '예상 문제', '원인', '결과', '해결책'],
      flowZh: ['问题线索', '可能问题', '原因', '后果', '解决方案'],
      blanks: ['problem clue', 'likely issue', 'cause', 'consequence', 'solution'],
      tips: ['A prediction can be negative, but keep it calm.', 'Explain why the problem may continue.', 'Offer a likely solution.'],
      tipsKo: ['부정적 예측도 가능하지만 차분하게 말하세요.', '문제가 이어질 이유를 설명하세요.', '가능한 해결책도 말하세요.'],
      tipsZh: ['预测可以是负面的，但语气要冷静。', '说明问题为什么可能持续。', '给出可能解决方式。'],
      template: `I notice [problem clue], so I predict that [likely issue] may happen.

This could happen because [cause]. As a result, [consequence].

However, if the people [solution], they can probably handle the situation without a serious problem.`,
    },
  ],
  'Comparing and Persuading': [
    {
      id: 'persuade-practical',
      label: 'Practical Choice',
      labelKo: '실용적 선택',
      labelZh: '实用选择',
      flow: ['Two options', 'Criteria', 'Choice', 'Benefits', 'Persuasion'],
      flowKo: ['두 선택지', '기준', '선택', '장점', '설득'],
      flowZh: ['两个选项', '标准', '选择', '好处', '说服'],
      blanks: ['option A', 'option B', 'criterion', 'chosen option', 'benefit'],
      tips: ['Compare both options before choosing.', 'Use one clear criterion like cost/time.', 'Persuade directly at the end.'],
      tipsKo: ['선택 전에 둘 다 비교하세요.', '비용/시간 같은 기준 하나를 세우세요.', '마지막에 직접 설득하세요.'],
      tipsZh: ['先比较两个选项再选择。', '用成本/时间等一个明确标准。', '最后直接说服对方。'],
      template: `Both [option A] and [option B] have advantages, but I would choose [chosen option].

The most important criterion is [criterion]. In this area, [chosen option] is better because [benefit].

For that reason, I really think you should choose [chosen option]. It is the more practical decision.`,
    },
    {
      id: 'persuade-lifestyle',
      label: 'Lifestyle / Learning Choice',
      labelKo: '생활 / 학습 선택',
      labelZh: '生活 / 学习选择',
      flow: ['Acknowledge', 'Preference', 'Personal fit', 'Long-term benefit', 'Close'],
      flowKo: ['인정', '선호', '개인 적합성', '장기 장점', '마무리'],
      flowZh: ['承认', '偏好', '适合度', '长期好处', '结尾'],
      blanks: ['other option', 'preferred option', 'personal need', 'long-term benefit', 'final message'],
      tips: ['Good for choices about study, habits, or daily life.', 'Mention why it fits the person.', 'Keep persuasion friendly.'],
      tipsKo: ['학습, 습관, 생활 선택에 좋습니다.', '그 사람에게 왜 맞는지 말하세요.', '설득은 친근하게 유지하세요.'],
      tipsZh: ['适合学习、习惯或生活选择。', '说明为什么适合这个人。', '说服语气要友好。'],
      template: `I understand why [other option] might seem attractive, but I believe [preferred option] is better for you.

It matches [personal need], so it will be easier to continue. Also, the long-term benefit is [long-term benefit].

That is why my final advice is [final message].`,
    },
  ],
  'Difficult Situation': [
    {
      id: 'difficult-complaint',
      label: 'Polite Complaint / Request',
      labelKo: '공손한 불만 / 요청',
      labelZh: '礼貌投诉 / 请求',
      flow: ['Greeting', 'Problem', 'Impact', 'Request', 'Polite close'],
      flowKo: ['인사', '문제', '영향', '요청', '공손한 마무리'],
      flowZh: ['问候', '问题', '影响', '请求', '礼貌结尾'],
      blanks: ['person', 'problem', 'impact', 'request', 'time'],
      tips: ['Stay calm and respectful.', 'Use I statements.', 'Ask for a specific solution.'],
      tipsKo: ['차분하고 존중하는 톤을 유지하세요.', 'I 문장으로 말하세요.', '구체적인 해결책을 요청하세요.'],
      tipsZh: ['保持冷静和尊重。', '使用 I statements。', '请求具体解决方案。'],
      template: `Hi [person], I wanted to talk to you about [problem].

I understand that mistakes can happen, but this has caused [impact]. Would it be possible to [request] by [time]?

I appreciate your help, and I hope we can solve this in a fair way.`,
    },
    {
      id: 'difficult-conflict',
      label: 'Friend / Coworker Conflict',
      labelKo: '친구 / 동료 갈등',
      labelZh: '朋友 / 同事冲突',
      flow: ['Respect', 'Issue', 'Feeling', 'Compromise', 'Close'],
      flowKo: ['존중', '문제', '느낌', '타협', '마무리'],
      flowZh: ['尊重', '问题', '感受', '折中', '结尾'],
      blanks: ['relationship', 'issue', 'feeling', 'compromise', 'future action'],
      tips: ['Do not blame directly.', 'Name the feeling briefly.', 'Offer a compromise.'],
      tipsKo: ['직접 비난하지 마세요.', '감정을 짧게 말하세요.', '타협안을 제시하세요.'],
      tipsZh: ['不要直接责怪。', '简短说明感受。', '提出折中方案。'],
      template: `I value our [relationship], so I want to explain something honestly.

The issue is [issue], and it made me feel [feeling]. I am not trying to blame you, but I think we need a better plan.

Could we [compromise]? If we do that, [future action] will be easier for both of us.`,
    },
  ],
  'Expressing Opinions': [
    {
      id: 'opinion-agree',
      label: 'Agree / Disagree',
      labelKo: '찬성 / 반대',
      labelZh: '同意 / 不同意',
      flow: ['Opinion', 'Reason 1', 'Example', 'Reason 2', 'Conclusion'],
      flowKo: ['의견', '이유 1', '예시', '이유 2', '결론'],
      flowZh: ['观点', '理由1', '例子', '理由2', '结论'],
      blanks: ['topic', 'position', 'reason one', 'example', 'reason two'],
      tips: ['State your side immediately.', 'Use examples to avoid sounding generic.', 'End with the same position.'],
      tipsKo: ['입장을 바로 말하세요.', '일반론처럼 들리지 않게 예시를 쓰세요.', '같은 입장으로 마무리하세요.'],
      tipsZh: ['立刻表明立场。', '用例子避免空泛。', '结尾再次强调立场。'],
      template: `In my opinion, I [position] with [topic].

First, [reason one]. For example, [example].

Another reason is [reason two]. Overall, I believe my position is reasonable because it is practical and fair.`,
    },
    {
      id: 'opinion-balanced',
      label: 'Balanced Preference',
      labelKo: '균형 있는 선호',
      labelZh: '平衡偏好',
      flow: ['Both sides', 'Your choice', 'Main reason', 'Condition', 'Final view'],
      flowKo: ['양쪽 인정', '내 선택', '주요 이유', '조건', '최종 의견'],
      flowZh: ['两边观点', '你的选择', '主要理由', '条件', '最终观点'],
      blanks: ['side A', 'side B', 'your choice', 'main reason', 'condition'],
      tips: ['Useful when both sides have value.', 'Still make a clear final choice.', 'A condition sentence sounds mature.'],
      tipsKo: ['양쪽에 장점이 있을 때 유용합니다.', '최종 선택은 분명해야 합니다.', '조건 문장이 답변을 성숙하게 만듭니다.'],
      tipsZh: ['适合双方都有优点的题。', '最终选择仍要明确。', '条件句会显得成熟。'],
      template: `I can understand both [side A] and [side B], because each one has some benefits.

However, I personally prefer [your choice]. The main reason is [main reason].

If [condition], this choice would work even better. So my final opinion is that [your choice] is the stronger option.`,
    },
  ],
  'Unusual Situation': [
    {
      id: 'unusual-lost-found',
      label: 'Lost / Found / Wrong Item',
      labelKo: '분실 / 발견 / 잘못된 물건',
      labelZh: '遗失 / 找到 / 错误物品',
      flow: ['What happened', 'Where/when', 'Concern', 'Request', 'Contact'],
      flowKo: ['무슨 일', '언제/어디서', '걱정', '요청', '연락'],
      flowZh: ['发生了什么', '时间/地点', '担心', '请求', '联系'],
      blanks: ['item/situation', 'place/time', 'concern', 'request', 'contact method'],
      tips: ['Report facts in order.', 'Stay calm even if the situation is strange.', 'End with a clear request.'],
      tipsKo: ['사실을 순서대로 말하세요.', '이상한 상황이어도 차분하게 말하세요.', '명확한 요청으로 끝내세요.'],
      tipsZh: ['按顺序报告事实。', '情况奇怪也要冷静。', '以明确请求结尾。'],
      template: `I am calling because something unusual happened with [item/situation].

It happened at [place/time]. My concern is that [concern].

Could you please [request]? You can reach me by [contact method] if you need more details.`,
    },
    {
      id: 'unusual-emergency',
      label: 'Emergency / Travel / Building Issue',
      labelKo: '긴급 / 이동 / 건물 문제',
      labelZh: '紧急 / 出行 / 建筑问题',
      flow: ['Urgent issue', 'Details', 'Risk', 'Action needed', 'Thanks'],
      flowKo: ['긴급 문제', '세부정보', '위험', '필요한 행동', '감사'],
      flowZh: ['紧急问题', '细节', '风险', '需要行动', '感谢'],
      blanks: ['urgent issue', 'details', 'risk', 'action needed', 'deadline'],
      tips: ['Sound calm but urgent.', 'Include the most important detail first.', 'Say exactly what action is needed.'],
      tipsKo: ['차분하지만 긴급하게 말하세요.', '가장 중요한 세부정보를 먼저 말하세요.', '필요한 행동을 정확히 말하세요.'],
      tipsZh: ['语气冷静但有紧迫感。', '最重要细节先说。', '明确说明需要什么行动。'],
      template: `I need to report [urgent issue]. The important detail is that [details].

This could create [risk], so I think it needs attention soon.

Please [action needed] by [deadline] if possible. Thank you for taking care of this quickly.`,
    },
  ],
}

function getTemplateCopy(template, key, lang) {
  if (!template) return ''
  if (lang === 'ko') return template[`${key}Ko`] || template[key]
  if (lang === 'zh') return template[`${key}Zh`] || template[key]
  return template[key]
}

function getTemplates(sectionId, type) {
  if (sectionId === 'speaking') return SPEAKING_TEMPLATE_SETS[type] || []
  if (sectionId === 'writing') return WRITING_TEMPLATE_SETS[type] || []
  return []
}

function getRecommendedSpeakingTemplate(test) {
  const templates = getTemplates('speaking', test?.type)
  if (!templates.length) return null

  const promptText = `${test?.title || ''} ${test?.prompt || ''}`.toLowerCase()
  const preferredIdByType = {
    'Giving Advice': /(work|job|shift|school|class|classmate|coworker|interview)/.test(promptText)
      ? 'advice-work-school'
      : 'advice-friend',
    'Personal Experience': /(person|teacher|mentor|friend|family|helped|affected)/.test(promptText)
      ? 'experience-person'
      : 'experience-problem',
    'Describing a Scene': /(park|street|snow|outdoor|community|beach|road)/.test(promptText)
      ? 'scene-outdoor'
      : 'scene-public',
    'Making Predictions': /(late|stuck|empty|out|power|drops|delay|traffic)/.test(promptText)
      ? 'prediction-delay'
      : 'prediction-problem',
    'Comparing and Persuading': /(course|apartment|studio|volunteer|career|study|lifestyle)/.test(promptText)
      ? 'persuade-lifestyle'
      : 'persuade-practical',
    'Difficult Situation': /(roommate|coworker|friend|group|library|conflict|deadline)/.test(promptText)
      ? 'difficult-conflict'
      : 'difficult-complaint',
    'Expressing Opinions': /(better|effective|prefer|public transit|online|in-person)/.test(promptText)
      ? 'opinion-balanced'
      : 'opinion-agree',
    'Unusual Situation': /(elevator|hotel|security|emergency|building|stops|occupied)/.test(promptText)
      ? 'unusual-emergency'
      : 'unusual-lost-found',
  }

  const preferredId = preferredIdByType[test?.type]
  return templates.find((template) => template.id === preferredId) || templates[0]
}

function getSpeakingTemplateAnswerSegments(test) {
  const template = getRecommendedSpeakingTemplate(test)
  const prompt = test?.prompt || 'this situation'
  const shortPrompt = prompt.replace(/\s+/g, ' ').replace(/\.$/, '')

  const answerByTemplate = {
    'advice-friend': [
      { template: true, text: `I understand why this person feels worried about ${shortPrompt.toLowerCase()}.` },
      { text: 'If I were in this situation, I would take one practical step first instead of trying to solve everything at once.' },
      { template: true, text: 'The first reason is that a clear plan reduces stress.' },
      { text: 'Also, it gives the person time to compare options and avoid a rushed decision.' },
      { template: true, text: 'So my suggestion is to choose one next step today and then review the result.' },
    ],
    'advice-work-school': [
      { template: true, text: 'For this situation, I think the best choice is to speak honestly and make a practical plan.' },
      { text: 'Taking too many shifts can hurt health, lower concentration, and make work less effective.' },
      { template: true, text: 'This would be helpful because it creates a clear schedule and prevents burnout.' },
      { text: 'I would recommend asking the manager to reduce a few shifts this week and setting a healthier routine.' },
    ],
    'experience-problem': [
      { template: true, text: 'One experience I remember happened when I had to solve a stressful problem.' },
      { text: 'At first, I felt unsure, but I broke the problem into smaller steps and asked for advice.' },
      { template: true, text: 'After that, the situation improved because I had a clear plan.' },
      { text: 'This experience taught me to stay calm and act step by step.' },
    ],
    'experience-person': [
      { template: true, text: 'A person who affected me was someone who supported me during a difficult time.' },
      { text: 'What I remember most is that this person listened carefully and gave practical advice.' },
      { template: true, text: 'Because of that, I felt more confident and less alone.' },
      { text: 'This was important because it changed how I handle similar situations now.' },
    ],
    'scene-public': [
      { template: true, text: 'This picture seems to show a busy public place.' },
      { text: 'There are several people doing different activities, and the scene looks active and organized.' },
      { template: true, text: 'In the center, the main people are focused on what they are doing.' },
      { text: 'The overall atmosphere feels realistic, like a normal day in this place.' },
    ],
    'scene-outdoor': [
      { template: true, text: 'The scene appears to be outdoors, and the setting looks active.' },
      { text: 'Several people are doing something together, and I can notice details that explain the situation.' },
      { template: true, text: 'I think the purpose of this activity is practical and connected to the setting.' },
      { text: 'The overall atmosphere seems busy but positive.' },
    ],
    'prediction-problem': [
      { template: true, text: 'Based on the current situation, I think the problem will probably be solved soon.' },
      { text: 'The reason is that the people seem to have enough information to take the next step.' },
      { template: true, text: 'If that happens, the result will be better and the situation should improve.' },
    ],
    'prediction-delay': [
      { template: true, text: 'I notice a problem clue, so I predict that there may be a delay or difficulty.' },
      { text: 'This could happen because the person does not have enough time or resources right now.' },
      { template: true, text: 'However, if they communicate quickly, they can probably handle the situation.' },
    ],
    'persuade-practical': [
      { template: true, text: 'Both options have advantages, but I would choose the more practical option.' },
      { text: 'The most important criterion is convenience, cost, and how easy it is to continue.' },
      { template: true, text: 'For that reason, I really think this choice is the better decision.' },
    ],
    'persuade-lifestyle': [
      { template: true, text: 'I understand why the other option might seem attractive, but I believe this choice is better.' },
      { text: 'It matches the person’s needs more closely and will be easier to continue over time.' },
      { template: true, text: 'That is why my final advice is to choose the option with the stronger long-term benefit.' },
    ],
    'difficult-complaint': [
      { template: true, text: 'I wanted to talk to you about this problem in a calm and respectful way.' },
      { text: 'I understand mistakes can happen, but the situation has caused some inconvenience.' },
      { template: true, text: 'Would it be possible to fix this soon so we can solve it fairly?' },
    ],
    'difficult-conflict': [
      { template: true, text: 'I value our relationship, so I want to explain something honestly.' },
      { text: 'The issue is affecting the situation, and I think we need a clearer plan.' },
      { template: true, text: 'Could we agree on a compromise that works for both of us?' },
    ],
    'opinion-agree': [
      { template: true, text: 'In my opinion, I agree with this idea.' },
      { text: 'The first reason is that it is practical and can help people make better choices.' },
      { template: true, text: 'Another reason is that it creates a positive long-term effect.' },
      { text: 'Overall, I believe this opinion is reasonable and fair.' },
    ],
    'opinion-balanced': [
      { template: true, text: 'I can understand both sides because each one has some benefits.' },
      { text: 'However, I personally prefer the option that is more practical for everyday life.' },
      { template: true, text: 'So my final opinion is that this is the stronger option.' },
    ],
    'unusual-lost-found': [
      { template: true, text: 'I am calling because something unusual happened.' },
      { text: 'It happened recently, and I want to report the situation clearly before it becomes a bigger problem.' },
      { template: true, text: 'Could you please check this and let me know what I should do next?' },
    ],
    'unusual-emergency': [
      { template: true, text: 'I need to report an urgent and unusual issue.' },
      { text: 'The important detail is that the situation could create inconvenience or risk if no one responds.' },
      { template: true, text: 'Please take care of this as soon as possible. Thank you for your help.' },
    ],
  }

  return {
    template,
    segments: answerByTemplate[template?.id] || [],
  }
}

const QUESTION_DIFFICULTY_ORDER = ['easy', 'medium', 'hard']

const READING_PART_SECONDS = {
  Correspondence: 11 * 60,
  'Apply a Diagram': 9 * 60,
  Information: 10 * 60,
  Viewpoints: 13 * 60,
}

const READING_EXAM_TASK_SPLITS = {
  Correspondence: [6, 5],
  'Apply a Diagram': [3, 5],
  Information: [4, 5],
  Viewpoints: [5, 5],
}

const READING_EXAM_TASK_COPY = {
  en: {
    examNote: 'Exam-style layout: each Reading part has one timed set, but questions are grouped into task blocks.',
    taskLabel: 'Task',
    questionRange: 'Questions',
    tasks: {
      Correspondence: [
        ['Read the message', 'Answer questions about purpose, details, reasons, and next steps.'],
        ['Complete the response', 'Use the message context to choose the best response details.'],
      ],
      'Apply a Diagram': [
        ['Read the diagram', 'Compare labels, limits, prices, times, or conditions.'],
        ['Apply the information', 'Use the diagram to answer a follow-up message or situation.'],
      ],
      Information: [
        ['Find information', 'Match rules, categories, and details to the correct part of the text.'],
        ['Apply details', 'Use exceptions, requirements, and warnings to choose answers.'],
      ],
      Viewpoints: [
        ['Read the article', 'Identify opinions, reasons, tone, and supporting evidence.'],
        ['Read the response', 'Connect the response to the writer viewpoint and details.'],
      ],
    },
  },
  ko: {
    examNote: '시험형 레이아웃: Reading 각 파트는 제한시간 안에 한 세트를 풀지만, 문항은 태스크 블록으로 나뉩니다.',
    taskLabel: '태스크',
    questionRange: '문항',
    tasks: {
      Correspondence: [
        ['메시지 읽기', '목적, 세부정보, 이유, 다음 행동을 묻는 문제를 풉니다.'],
        ['응답 완성', '앞 메시지의 맥락을 이용해 가장 자연스러운 응답 정보를 고릅니다.'],
      ],
      'Apply a Diagram': [
        ['도표 읽기', '라벨, 제한, 가격, 시간, 조건을 비교합니다.'],
        ['정보 적용', '도표 정보를 후속 메시지나 상황에 적용해 답합니다.'],
      ],
      Information: [
        ['정보 찾기', '규칙, 범주, 세부정보를 지문의 알맞은 부분과 연결합니다.'],
        ['세부정보 적용', '예외, 요구사항, 주의사항을 확인해 답을 고릅니다.'],
      ],
      Viewpoints: [
        ['글 읽기', '의견, 이유, 어조, 근거를 파악합니다.'],
        ['응답 읽기', '응답 내용을 글쓴이의 관점과 세부정보에 연결합니다.'],
      ],
    },
  },
  zh: {
    examNote: '考试式布局：Reading 每个部分是在限时内完成的一组题，但题目会按任务块呈现。',
    taskLabel: '任务',
    questionRange: '题目',
    tasks: {
      Correspondence: [
        ['阅读信息', '回答目的、细节、原因和下一步相关问题。'],
        ['完成回复', '根据前文语境选择最合适的回复内容。'],
      ],
      'Apply a Diagram': [
        ['阅读图表', '比较标签、限制、价格、时间或条件。'],
        ['应用信息', '把图表信息用于后续信息或情境题。'],
      ],
      Information: [
        ['查找信息', '把规则、类别和细节对应到文章正确部分。'],
        ['应用细节', '根据例外、要求和提醒选择答案。'],
      ],
      Viewpoints: [
        ['阅读文章', '找出观点、理由、语气和支持证据。'],
        ['阅读回应', '把回应和作者观点及细节联系起来。'],
      ],
    },
  },
}

function shuffleTests(tests) {
  const shuffled = [...tests]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled
}

function getQuestionDifficulty(test, questionIndex) {
  const question = normalizeQuestion(test.questions?.[questionIndex])
  if (question.difficulty) return question.difficulty

  const numericId = Number(test.id.match(/\d+/)?.[0] || 1)
  return QUESTION_DIFFICULTY_ORDER[(numericId + questionIndex) % QUESTION_DIFFICULTY_ORDER.length]
}

function getPracticeSeconds(test, sectionId) {
  if (!test) return 0
  const minutes = Number(test.time?.match(/(\d+)\s*min/)?.[1])
  if (Number.isFinite(minutes) && minutes > 0) return minutes * 60
  if (sectionId === 'speaking') return 60
  if (sectionId === 'listening') {
    // Answer time scales with the number of questions, like the real exam (~30s each).
    const count = Array.isArray(test.questions) ? test.questions.length : 5
    return Math.max(count, 1) * 30
  }
  if (sectionId === 'reading') {
    const count = Array.isArray(test.questions) ? test.questions.length : 1
    return READING_PART_SECONDS[test.type] || Math.max(count, 1) * 60
  }
  return 90
}

function getMemoryLevelKey(memory = '') {
  const text = String(memory).toLowerCase()
  if (text.includes('high') || text.includes('높') || text.includes('高')) return 'high'
  if (text.includes('medium') || text.includes('med') || text.includes('중') || text.includes('中')) return 'medium'
  return 'low'
}

function getSpeakingTemplateId(test) {
  return getRecommendedSpeakingTemplate(test)?.id || 'all'
}

function buildSpeakingPracticeOptions(type, pageCopy, pageLang) {
  const templates = getTemplates('speaking', type)
  return [
    { id: 'random', label: pageCopy.speakingRandomTab, description: pageCopy.speakingAllFormsTab },
    ...templates.map((template) => ({
      id: template.id,
      label: getTemplateCopy(template, 'label', pageLang),
      description: (getTemplateCopy(template, 'flow', pageLang) || template.flow || []).join(' -> '),
    })),
  ]
}

function getConstructedResponseScore(sectionId, draft) {
  const count = draft.trim() ? draft.trim().split(/\s+/).length : 0
  if (sectionId === 'writing') return count >= 80 ? 1 : 0
  if (sectionId === 'speaking') return count > 0 ? 1 : 0
  return 0
}

function buildConstructedAnswerDetails(test, sectionId, draft, pageLang, speakingTemplateAnswer) {
  const expected = sectionId === 'speaking' && speakingTemplateAnswer?.segments?.length
    ? speakingTemplateAnswer.segments.map((segment) => segment.text).join(' ')
    : getModelAnswer(test, sectionId, 0, pageLang)

  return [{
    question_index: 0,
    prompt: test?.prompt || test?.title || '',
    response_text: draft,
    model_answer: expected,
    is_correct: Boolean(draft.trim()),
  }]
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function formatMinutesFromSeconds(seconds) {
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

function getTypeTimeLabel(test, sectionId) {
  if (!test) return ''
  if (sectionId === 'reading') return formatMinutesFromSeconds(getPracticeSeconds(test, sectionId))
  if (sectionId === 'writing' || sectionId === 'speaking') return test.time || formatTimer(getPracticeSeconds(test, sectionId))
  return ''
}

function getSpeakingTimingParts(timeLabel = '') {
  const prepMatch = timeLabel.match(/(\d+)\s*sec\s*prep/i)
  const speakMatch = timeLabel.match(/(\d+)\s*sec\s*speak/i)
  return {
    prep: prepMatch ? `${prepMatch[1]}s` : '',
    speak: speakMatch ? `${speakMatch[1]}s` : '',
  }
}

function getSpeakingTimingSeconds(timeLabel = '') {
  const prepMatch = timeLabel.match(/(\d+)\s*sec\s*prep/i)
  const speakMatch = timeLabel.match(/(\d+)\s*sec\s*speak/i)
  return {
    prep: prepMatch ? Number(prepMatch[1]) : 30,
    speak: speakMatch ? Number(speakMatch[1]) : 60,
  }
}

function getTypeTimingChips(test, section, pageCopy, pageLang) {
  if (!test || !section) return []

  const examCount = EXAM_QUESTION_COUNTS[section.id]?.[test.type]
  const timeLabel = getTypeTimeLabel(test, section.id) || (section.id === 'listening' ? section.time : '')

  if (section.id === 'speaking') {
    const speakingTiming = getSpeakingTimingParts(timeLabel)
    return [
      speakingTiming.prep ? { label: pageCopy.prepLabel, value: speakingTiming.prep } : null,
      speakingTiming.speak ? { label: pageCopy.speakLabel, value: speakingTiming.speak } : null,
      examCount ? { label: pageCopy.examCountPrefix, value: getExamCountLabel(section.id, examCount, pageLang) } : null,
    ].filter(Boolean)
  }

  return [
    timeLabel ? { label: pageCopy.timeLabel, value: timeLabel } : null,
    examCount ? { label: pageCopy.examCountPrefix, value: getExamCountLabel(section.id, examCount, pageLang) } : null,
  ].filter(Boolean)
}

function getReadingExamTasks(test, pageLang) {
  const questions = getDisplayQuestions(test)
  const split = READING_EXAM_TASK_SPLITS[test?.type] || [questions.length]
  const copy = READING_EXAM_TASK_COPY[pageLang] || READING_EXAM_TASK_COPY.en
  const taskCopy = copy.tasks[test?.type] || []
  const tasks = []
  let cursor = 0

  split.forEach((count, index) => {
    const remaining = questions.length - cursor
    if (remaining <= 0) return
    const taskCount = Math.min(count, remaining)
    const localizedTask = taskCopy[index] || [`${copy.taskLabel} ${index + 1}`, 'Answer the questions in this block.']
    tasks.push({
      title: localizedTask[0],
      instruction: localizedTask[1],
      start: cursor,
      questions: questions.slice(cursor, cursor + taskCount),
    })
    cursor += taskCount
  })

  if (cursor < questions.length) {
    const localizedTask = taskCopy[tasks.length] || [`${copy.taskLabel} ${tasks.length + 1}`, 'Answer the remaining questions.']
    tasks.push({
      title: localizedTask[0],
      instruction: localizedTask[1],
      start: cursor,
      questions: questions.slice(cursor),
    })
  }

  return tasks
}

function getSourceSentences(test) {
  const source = test.transcript || test.passage || test.prompt || ''
  return source
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function normalizeQuestion(question) {
  if (typeof question === 'string') {
    return { prompt: question }
  }

  if (!question || typeof question !== 'object') {
    return { prompt: '' }
  }

  return {
    prompt: question.prompt || question.question || '',
    answer: question.answer || question.correctAnswer || '',
    options: question.options || [],
    strategy: question.strategy || '',
    strategyKo: question.strategyKo || '',
    strategyZh: question.strategyZh || '',
    difficulty: question.difficulty || '',
  }
}

function getLocalizedQuestionStrategy(question, pageLang) {
  if (pageLang === 'ko' && question.strategyKo) return question.strategyKo
  if (pageLang === 'zh' && question.strategyZh) return question.strategyZh
  return question.strategy
}

function getModelAnswer(test, sectionId, questionIndex, pageLang, questionItem = normalizeQuestion(test.questions?.[questionIndex])) {
  if (questionItem.answer) {
    if (pageLang === 'ko') return `근거 답안: ${questionItem.answer}`
    if (pageLang === 'zh') return `参考答案: ${questionItem.answer}`
    return `Suggested answer: ${questionItem.answer}`
  }

  const sourceSentences = getSourceSentences(test)
  const sourceAnswer = sourceSentences[questionIndex] || sourceSentences[sourceSentences.length - 1]

  if (sectionId === 'writing') {
    if (pageLang === 'ko') return '정답은 하나가 아니지만, 목적을 첫 문단에 밝히고 모든 요구사항을 포함한 3-4문단 답안이 고득점에 유리합니다.'
    if (pageLang === 'zh') return '写作没有唯一答案。高分答案应在开头明确目的，并用 3-4 个清晰段落覆盖所有要求。'
    return 'There is no single fixed answer. A high-score response states the purpose early and covers every required point in 3-4 clear paragraphs.'
  }

  if (sectionId === 'speaking') {
    if (pageLang === 'ko') return '정답은 하나가 아니지만, 도입 → 이유 2개 → 예시 → 결론 순서로 자연스럽게 말하면 안정적입니다.'
    if (pageLang === 'zh') return '口语没有唯一答案。按开头、两个理由、例子、结论组织回答会更稳定。'
    return 'There is no single fixed answer. A strong response uses an opening, two reasons, a specific example, and a clear closing.'
  }

  if (!sourceAnswer) {
    if (pageLang === 'ko') return '지문이나 음성에서 질문과 직접 연결되는 근거 문장을 찾아 답하세요.'
    if (pageLang === 'zh') return '从文章或音频中找到与问题直接对应的依据句作答。'
    return 'Use the source sentence that directly supports the answer.'
  }

  if (pageLang === 'ko') return `근거 답안: ${sourceAnswer}`
  if (pageLang === 'zh') return `参考答案: ${sourceAnswer}`
  return `Suggested answer: ${sourceAnswer}`
}

function getAnswerPrefix(pageLang) {
  if (pageLang === 'ko') return '정답'
  if (pageLang === 'zh') return '正确答案'
  return 'Correct answer'
}

function getChoiceOptions(test, sectionId, questionIndex, questionItem = normalizeQuestion(test.questions?.[questionIndex])) {
  if (Array.isArray(questionItem.options) && questionItem.options.length > 0) {
    return questionItem.options.map((option, index) => {
      const optionText = typeof option === 'string' ? option : option.text
      const isCorrect = typeof option === 'object'
        ? Boolean(option.isCorrect) || optionText === questionItem.answer
        : optionText === questionItem.answer

      return {
        id: `${test.id}-q${questionIndex}-o${index}`,
        text: optionText,
        isCorrect,
      }
    })
  }

  const sourceSentences = getSourceSentences(test)
  const correctAnswer = sourceSentences[questionIndex] || sourceSentences[sourceSentences.length - 1] || test.title
  const distractorPools = {
    listening: [
      'The speakers decide to wait and make no change.',
      'The listener needs to call a different office immediately.',
      'The main issue has already been solved before the conversation starts.',
      'The speaker only asks for general information about the service.',
      'The final decision is postponed until next month.',
    ],
    reading: [
      'The reader should ignore the notice because it is only background information.',
      'The main action is optional and has no deadline.',
      'The best choice is the most expensive option listed.',
      'The message says no documents or follow-up steps are needed.',
      'The policy applies to every person with no exceptions.',
    ],
  }
  const pool = distractorPools[sectionId] || distractorPools.reading
  const correctIndex = (Number(test.id.match(/\d+/)?.[0] || 1) + questionIndex) % 4
  const distractors = pool
    .filter((option) => option !== correctAnswer)
    .slice(questionIndex % 2, questionIndex % 2 + 3)
  const options = [...distractors]

  while (options.length < 3) {
    options.push(pool[options.length] || 'The detail is not stated clearly in the source.')
  }

  options.splice(correctIndex, 0, correctAnswer)

  return options.slice(0, 4).map((text, index) => ({
    id: `${test.id}-q${questionIndex}-o${index}`,
    text,
    isCorrect: text === correctAnswer,
  }))
}

function getDisplayQuestions(test) {
  if (!Array.isArray(test.questions)) return []

  return test.questions
}

function getDrillMetaLabel(test) {
  const questionCount = getDisplayQuestions(test).length
  return questionCount ? `${questionCount} questions` : test.time
}

function getQuestionStrategy(sectionId, type, questionIndex, pageLang, questionItem = {}) {
  const customStrategy = getLocalizedQuestionStrategy(questionItem, pageLang)
  if (customStrategy) return customStrategy

  const strategyIndex = questionIndex % 3
  const strategies = {
    en: {
      listening: [
        `For ${type}, listen for the speaker's purpose before choosing details.`,
        'Match the answer to the exact condition, time, place, or exception you hear.',
        'Use the final decision or next step; earlier options are often changed.',
      ],
      reading: [
        `For ${type}, locate the part of the text that matches the question first.`,
        'Check names, dates, conditions, and exceptions before choosing.',
        'Choose the answer supported by the whole sentence, not a single keyword.',
      ],
      writing: [
        'Plan the reader, purpose, and tone before writing.',
        'Cover every bullet point with a specific detail or example.',
        'Leave time to check grammar, paragraphing, and polite wording.',
      ],
      speaking: [
        'Use preparation time for keywords, not full sentences.',
        'Give a clear point, then add one reason and one example.',
        'Finish with a direct conclusion or requested action.',
      ],
    },
    ko: {
      listening: [
        `${type} 유형은 세부정보보다 먼저 화자의 목적을 잡으세요.`,
        '시간, 장소, 조건, 예외처럼 질문에 직접 연결되는 정보를 확인하세요.',
        '초반 선택지가 바뀔 수 있으니 최종 결정이나 다음 행동을 기준으로 답하세요.',
      ],
      reading: [
        `${type} 유형은 질문과 맞는 문단 위치를 먼저 찾으세요.`,
        '이름, 날짜, 조건, 예외를 확인한 뒤 답을 고르세요.',
        '키워드 하나보다 전체 문장의 근거가 맞는지 확인하세요.',
      ],
      writing: [
        '쓰기 전에 독자, 목적, 톤을 먼저 정하세요.',
        '모든 요구사항을 구체적인 디테일이나 예시로 채우세요.',
        '마지막에는 문법, 문단, 공손한 표현을 점검하세요.',
      ],
      speaking: [
        '준비 시간에는 문장 전체보다 키워드만 적으세요.',
        '주장 하나를 말한 뒤 이유와 예시를 붙이세요.',
        '마지막은 결론이나 요청을 분명하게 마무리하세요.',
      ],
    },
    zh: {
      listening: [
        `${type} 题型先抓说话人的目的，再处理细节。`,
        '确认时间、地点、条件和例外等与问题直接相关的信息。',
        '以前面的选项可能会被改变，最终决定或下一步更重要。',
      ],
      reading: [
        `${type} 题型先定位与问题对应的段落。`,
        '选择前检查姓名、日期、条件和例外。',
        '不要只看关键词，要看整句话是否支持答案。',
      ],
      writing: [
        '写作前先确定读者、目的和语气。',
        '每个要求都要用具体细节或例子覆盖。',
        '最后检查语法、段落和礼貌表达。',
      ],
      speaking: [
        '准备时只写关键词，不要写完整句子。',
        '先给明确观点，再加理由和例子。',
        '结尾要清楚给出结论或请求。',
      ],
    },
  }

  return strategies[pageLang]?.[sectionId]?.[strategyIndex] || strategies.en[sectionId]?.[strategyIndex]
}

function getTypeProfile(sectionId, type, pageLang) {
  if (!type) return null
  const profileSources = {
    listening: LISTENING_PART_PROFILES,
    reading: READING_PART_PROFILES,
    writing: WRITING_PART_PROFILES,
    speaking: SPEAKING_PART_PROFILES,
  }
  const profileSource = profileSources[sectionId]
  if (!profileSource) return null
  const localizedProfiles = profileSource[pageLang] || profileSource.en
  return localizedProfiles[type] || profileSource.en[type] || null
}

function formatDateTime(value, pageLang) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  try {
    const locale = pageLang === 'ko' ? 'ko-KR' : pageLang === 'zh' ? 'zh-CN' : 'en-CA'
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function normalizeHistoryAnswerDetails(log, test, sectionId) {
  if (!log || !test) return []

  if (Array.isArray(log.answer_details)) {
    return log.answer_details
  }

  const answers = log.answers && typeof log.answers === 'object' ? log.answers : {}
  return getDisplayQuestions(test).map((question, index) => {
    const questionItem = normalizeQuestion(question)
    const options = getChoiceOptions(test, sectionId, index, questionItem)
    const correctOption = options.find((option) => option.isCorrect)
    const selectedOptionId = answers[index] || answers[String(index)] || null
    const selectedOption = options.find((option) => option.id === selectedOptionId) || null
    return {
      question_index: index,
      prompt: questionItem.prompt,
      selected_option_id: selectedOptionId,
      selected_option_text: selectedOption?.text || '',
      correct_option_id: correctOption?.id || null,
      correct_option_text: correctOption?.text || '',
      is_correct: selectedOptionId != null && selectedOptionId === correctOption?.id,
    }
  })
}

function CelpipInfoModal({ isOpen, onClose }) {
  const [lang, setLang] = useState('en')
  const copy = INFO_COPY[lang]

  if (!isOpen) return null

  return (
    <div className="celpip-modal-overlay">
      <section className="celpip-info-modal" role="dialog" aria-modal="true" aria-labelledby="celpip-info-title">
        <button className="celpip-modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="celpip-info-modal__header">
          <div className="celpip-info-modal__icon">
            <span className="material-symbols-outlined">help</span>
          </div>
          <div>
            <h2 id="celpip-info-title">{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>

        <div className="celpip-info-modal__lang-toggle">
          {INFO_LANGS.map((item) => (
            <button
              key={item.code}
              className={`celpip-info-modal__lang-btn ${lang === item.code ? 'celpip-info-modal__lang-btn--active' : ''}`}
              onClick={() => setLang(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="celpip-info-modal__body">
          <section className="celpip-info-section">
            <h3>{copy.overviewTitle}</h3>
            <div className="celpip-fact-grid">
              {copy.facts.map((fact) => (
                <div key={fact.title} className="celpip-fact">
                  <span className="material-symbols-outlined">{fact.icon}</span>
                  <strong>{fact.title}</strong>
                  <p>{fact.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="celpip-info-section">
            <h3>{copy.pgwpTitle}</h3>
            <div className="celpip-pgwp-grid">
              <div>
                <span className="celpip-badge celpip-badge--blue">University</span>
                <strong>{copy.universityTitle}</strong>
                <p>{copy.universityBody}</p>
              </div>
              <div>
                <span className="celpip-badge celpip-badge--teal">College</span>
                <strong>{copy.collegeTitle}</strong>
                <p>{copy.collegeBody}</p>
              </div>
            </div>
            <p className="celpip-note">{copy.pgwpNote}</p>
          </section>

          <section className="celpip-info-section">
            <h3>{copy.clbTitle}</h3>
            <div className="celpip-table-wrap">
              <table className="celpip-table">
                <thead>
                  <tr>
                    <th>CELPIP Level</th>
                    <th>CLB Level</th>
                    <th>{copy.memoHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {[12, 11, 10, 9, 8, 7, 6, 5, 4].map((level) => (
                    <tr key={level} className={level === 7 || level === 5 ? 'celpip-row-highlight' : ''}>
                      <td>{level}</td>
                      <td>CLB {level}</td>
                      <td>
                        {level === 7
                          ? copy.universityMemo
                          : level === 5
                            ? copy.collegeMemo
                            : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="celpip-info-section">
            <h3>{copy.sourcesTitle}</h3>
            <div className="celpip-source-list">
              {OFFICIAL_LINKS.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

const PER_QUESTION_SECONDS = 45

// Listening can play as a single full transcript or segmented practice chunks.
function getListeningSegments(test, sectionId, mode = 'segmented') {
  if (sectionId !== 'listening' || !test) return []
  if (mode === 'full' && test.transcript) {
    return [{ text: test.transcript, q: test.questions?.length || 0 }]
  }
  if (Array.isArray(test.segments) && test.segments.length) return test.segments
  if (test.transcript) return [{ text: test.transcript, q: test.questions?.length || 0 }]
  return []
}

const DRILL_LABELS = {
  en: { nextQuestion: 'Next question', submit: 'Submit & see results', question: 'Question', part: 'Part', score: 'Score' },
  ko: { nextQuestion: '다음 문제', submit: '제출하고 결과 보기', question: '문항', part: '구간', score: '점수' },
  zh: { nextQuestion: '下一题', submit: '提交并查看结果', question: '第', part: '段落', score: '得分' },
}

const TRANSCRIPT_LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
]

const LISTENING_MODE_COPY = {
  en: {
    title: 'Choose listening mode',
    body: 'This practice set can start with the full conversation or with shorter guided parts.',
    examFormat: 'Exam format',
    full: 'Full listening',
    fullHint: 'Play the whole audio first, then answer all questions.',
    segmented: 'Segmented listening',
    segmentedHint: 'Play guided parts and answer in smaller blocks.',
    activeFull: 'Full listening',
    activeSegmented: 'Segmented practice',
  },
  ko: {
    title: '듣기 방식 선택',
    body: '이 연습 세트는 전체 대화를 한 번에 듣거나, 짧은 구간으로 나누어 들을 수 있습니다.',
    full: '전체 듣기',
    fullHint: '전체 오디오를 먼저 듣고, 이후 모든 문제를 풉니다.',
    segmented: '부분별 듣기',
    segmentedHint: '구간별로 듣고, 작은 묶음으로 나눠서 풉니다.',
    activeFull: '전체 듣기',
    activeSegmented: '부분별 듣기',
  },
  zh: {
    title: '选择听力模式',
    body: '这套练习可以先完整听整段对话，也可以分段练习。',
    full: '完整听力',
    fullHint: '先听完整音频，再回答全部问题。',
    segmented: '分段听力',
    segmentedHint: '按小段播放，再分块答题。',
    activeFull: '完整听力',
    activeSegmented: '分段练习',
  },
}

const TRANSCRIPT_STUDY_COPY = {
  en: {
    translationTitle: 'Script Translation',
    translationHint: 'Choose Korean or Chinese to reveal a translated script below.',
    translationLoading: 'Translating the script...',
    translationUnavailable: 'Translation is unavailable right now.',
    clickHint: 'Click an English word to open pronunciation and meaning help.',
    wordLoading: 'Loading word details...',
    wordNotFound: 'Word details were not found.',
    translatedWord: 'Translated word',
    meaning: 'Meaning',
    example: 'Example',
    pronunciation: 'Pronunciation',
  },
  ko: {
    translationTitle: '스크립트 번역',
    translationHint: '한국어 또는 中文을 눌러 아래 번역을 확인하세요.',
    translationLoading: '스크립트를 번역하는 중입니다...',
    translationUnavailable: '지금은 번역을 불러올 수 없습니다.',
    clickHint: '영어 단어를 누르면 발음과 뜻을 볼 수 있습니다.',
    wordLoading: '단어 정보를 불러오는 중입니다...',
    wordNotFound: '단어 정보를 찾지 못했습니다.',
    translatedWord: '번역 단어',
    meaning: '뜻',
    example: '예문',
    pronunciation: '발음',
  },
  zh: {
    translationTitle: '脚本翻译',
    translationHint: '点击 한국어 或 中文，可在下方显示翻译。',
    translationLoading: '正在翻译脚本...',
    translationUnavailable: '暂时无法显示翻译。',
    clickHint: '点击英文单词即可查看发音和词义。',
    wordLoading: '正在加载单词信息...',
    wordNotFound: '未找到该单词信息。',
    translatedWord: '翻译',
    meaning: '词义',
    example: '例句',
    pronunciation: '发音',
  },
}

function getPreferredPracticeLang() {
  return 'en'
}

async function loadTranslateText() {
  const dictionaryModule = await import('../../dictionary/_06_services/service')
  return dictionaryModule.translateText
}

async function loadWordHelpers() {
  const wordModule = await import('../../pte/_06_services/pteWordService')
  return {
    fetchWordDetail: wordModule.fetchWordDetail,
    translateWord: wordModule.translateWord,
  }
}

function CelpipDrillModal({ drill, section, onClose, pageCopy, pageLang, testLogs = [] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [listeningMode, setListeningMode] = useState(null)
  const [selectedHistoryLog, setSelectedHistoryLog] = useState(null)
  const [segIndex, setSegIndex] = useState(0) // which audio segment is currently playing
  const [qCursor, setQCursor] = useState(0) // how many questions have we advanced past
  const [draft, setDraft] = useState('')
  const [selectedChoices, setSelectedChoices] = useState({})
  const [showTranscript, setShowTranscript] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showSpeakingTemplateGuide, setShowSpeakingTemplateGuide] = useState(true)
  const [speakingSetupOpen, setSpeakingSetupOpen] = useState(true)
  const [speakingPracticeMode, setSpeakingPracticeMode] = useState('random')
  const [speakingShuffleEnabled, setSpeakingShuffleEnabled] = useState(true)
  const [speakingSkipAttempted, setSpeakingSkipAttempted] = useState(false)
  const [speakingPracticeTests, setSpeakingPracticeTests] = useState(null)
  const [isPracticeTimerPaused, setIsPracticeTimerPaused] = useState(false)
  const [speakingPhase, setSpeakingPhase] = useState('setup')
  const [speakingTimeTotal, setSpeakingTimeTotal] = useState(0)
  const [isSpeakingRecording, setIsSpeakingRecording] = useState(false)
  const [speakingAudioUrl, setSpeakingAudioUrl] = useState('')
  const [hasSpeakingRecordedAudio, setHasSpeakingRecordedAudio] = useState(false)
  const [speakingRecordingError, setSpeakingRecordingError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [listeningPhase, setListeningPhase] = useState('answer')
  const [speed, setSpeed] = useState(1)
  const [repeatAudio, setRepeatAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerDone, setTimerDone] = useState(false)
  const [transcriptLang, setTranscriptLang] = useState('en')
  const [translatedTranscriptMap, setTranslatedTranscriptMap] = useState({})
  const [translatedPromptMap, setTranslatedPromptMap] = useState({})
  const [wordPopup, setWordPopup] = useState(null)
  const [wordPopupCache, setWordPopupCache] = useState({})
  const repeatRef = useRef(false)
  const isSubmittedRef = useRef(false)
  const attemptStartedAtRef = useRef(Date.now())
  const audioTimersRef = useRef([])
  const speakingRecorderRef = useRef(null)
  const speakingStreamRef = useRef(null)
  const speakingChunksRef = useRef([])
  const isWriting = section?.id === 'writing'
  const isSpeaking = section?.id === 'speaking'
  const isListening = section?.id === 'listening'
  const isReading = section?.id === 'reading'
  const baseTests = drill?.tests || []
  const tests = isSpeaking && speakingPracticeTests ? speakingPracticeTests : baseTests
  const test = tests[activeIndex]
  const isListeningSetup = isListening && listeningMode == null
  const isListeningReview = isListening && listeningPhase === 'review'
  const isListeningAudio = isListening && listeningPhase === 'audio'
  const isReadingReview = isReading && showAnswers
  const listeningSegments = getListeningSegments(test, section?.id, listeningMode || 'segmented')
  const totalQuestions = Array.isArray(test?.questions) ? test.questions.length : 0
  const displayQuestions = test ? getDisplayQuestions(test) : []
  const readingExamTasks = isReading && test ? getReadingExamTasks(test, pageLang) : []
  const segStartIndex = (idx) => listeningSegments.slice(0, idx).reduce((sum, segment) => sum + segment.q, 0)
  const labels = DRILL_LABELS[pageLang] || DRILL_LABELS.en
  const listeningModeCopy = LISTENING_MODE_COPY[pageLang] || LISTENING_MODE_COPY.en
  const studyCopy = TRANSCRIPT_STUDY_COPY[pageLang] || TRANSCRIPT_STUDY_COPY.en
  const listeningReadyLabel = pageLang === 'ko' ? '준비' : pageLang === 'zh' ? '准备' : 'Ready'
  const typeProfile = getTypeProfile(section?.id, test?.type, pageLang)
  const speakingTemplateGuide = isSpeaking ? getRecommendedSpeakingTemplate(test) : null
  const speakingTemplateAnswer = isSpeaking ? getSpeakingTemplateAnswerSegments(test) : null
  const speakingLocalAnalysis = isSpeaking
    ? analyzeRespondSituation({ question: test?.prompt || test?.title || '', recognizedText: draft })
    : null
  const sectionLabel = pageCopy.sectionLabels?.[section?.id] || section?.label || ''
  const logsForCurrentTest = useMemo(
    () => testLogs.filter((log) => log.test_id === test?.id),
    [test?.id, testLogs],
  )
  const speakingPracticeOptions = useMemo(
    () => buildSpeakingPracticeOptions(drill?.type, pageCopy, pageLang),
    [drill?.type, pageCopy, pageLang],
  )
  const speakingAttemptedIds = useMemo(
    () => new Set(testLogs.filter((log) => log.section_id === 'speaking').map((log) => log.test_id)),
    [testLogs],
  )
  const transcriptTranslationKey = `${test?.id || 'none'}:${transcriptLang}`
  const hasTranslatedTranscript = Object.prototype.hasOwnProperty.call(translatedTranscriptMap, transcriptTranslationKey)
  const translatedTranscript = translatedTranscriptMap[transcriptTranslationKey] || ''
  const promptTranslationKey = `${test?.id || 'none'}:${pageLang}`
  const hasTranslatedPrompt = Object.prototype.hasOwnProperty.call(translatedPromptMap, promptTranslationKey)
  const translatedPrompt = translatedPromptMap[promptTranslationKey] || ''

  useEffect(() => {
    repeatRef.current = repeatAudio
  }, [repeatAudio])

  useEffect(() => {
    setWordPopup(null)
  }, [transcriptLang])

  useEffect(() => {
    setActiveIndex(0)
    setSpeakingSetupOpen(true)
    setSpeakingPracticeMode('random')
    setSpeakingPracticeTests(null)
    setIsPracticeTimerPaused(false)
    setSpeakingPhase('setup')
    setSpeakingTimeTotal(0)
    setIsSpeakingRecording(false)
    setHasSpeakingRecordedAudio(false)
    setSpeakingAudioUrl('')
    setSpeakingRecordingError('')
  }, [drill?.type])

  // Reset per-test state and start the first audio segment (listening) when the test changes.
  useEffect(() => {
    setDraft('')
    setListeningMode(null)
    setSelectedHistoryLog(null)
    setSelectedChoices({})
    setShowTranscript(false)
    setShowAnswers(false)
    setShowSpeakingTemplateGuide(false)
    setIsPracticeTimerPaused(false)
    setIsSpeakingRecording(false)
    setHasSpeakingRecordedAudio(false)
    setSpeakingRecordingError('')
    setTranscriptLang('en')
    setWordPopup(null)
    setTimerDone(false)
    setSegIndex(0)
    setQCursor(0)
    setIsPlaying(false)
    setIsPaused(false)
    attemptStartedAtRef.current = Date.now()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    if (isSpeaking && speakingSetupOpen) {
      setListeningPhase('answer')
      isSubmittedRef.current = false
      setTimeLeft(0)
      setSpeakingPhase('setup')
      setSpeakingTimeTotal(0)
    } else if (isListening) {
      setTimeLeft(PER_QUESTION_SECONDS)
      setListeningPhase('setup')
      isSubmittedRef.current = false
    } else {
      setListeningPhase('answer')
      isSubmittedRef.current = false
      setTimeLeft(getPracticeSeconds(test, section?.id))
      if (isSpeaking) {
        const timing = getSpeakingTimingSeconds(test?.time)
        setSpeakingPhase('prep')
        setSpeakingTimeTotal(timing.prep)
        setTimeLeft(timing.prep)
      }
    }
    return undefined
  }, [test?.id, activeIndex, section?.id, isSpeaking, speakingSetupOpen])

  // Reset the per-question countdown whenever a new question is shown.
  useEffect(() => {
    if (isListening && listeningPhase === 'answer') setTimeLeft(PER_QUESTION_SECONDS)
  }, [qCursor, listeningPhase, isListening])

  // Listening: per-question timer that auto-advances when it reaches zero.
  useEffect(() => {
    if (!isListening || listeningPhase !== 'answer') return undefined
    if (timeLeft <= 0) {
      advanceQuestion()
      return undefined
    }
    const timerId = window.setTimeout(() => setTimeLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timerId)
  }, [isListening, listeningPhase, timeLeft, qCursor])

  // Non-listening: simple overall countdown.
  useEffect(() => {
    if (!test || isListening || isSpeaking || timerDone || isPracticeTimerPaused) return undefined
    if (timeLeft <= 0) {
      return undefined
    }
    const timerId = window.setTimeout(() => {
      setTimeLeft((seconds) => {
        if (seconds <= 1) {
          setTimerDone(true)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearTimeout(timerId)
  }, [test?.id, timeLeft, timerDone, isListening, isSpeaking, isPracticeTimerPaused])

  // Speaking: prep time automatically moves into recording time.
  useEffect(() => {
    if (!test || !isSpeaking || speakingSetupOpen || timerDone || isPracticeTimerPaused) return undefined
    if (timeLeft <= 0) {
      if (speakingPhase === 'prep') {
        const timing = getSpeakingTimingSeconds(test?.time)
        setSpeakingPhase('speak')
        setSpeakingTimeTotal(timing.speak)
        setTimeLeft(timing.speak)
        startSpeakingRecording()
        return undefined
      }
      if (speakingPhase === 'speak') {
        setSpeakingPhase('done')
        stopSpeakingRecording({ releaseTracks: false })
        setTimerDone(true)
      }
      return undefined
    }

    const timerId = window.setTimeout(() => setTimeLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timerId)
  }, [isPracticeTimerPaused, isSpeaking, speakingPhase, speakingSetupOpen, test, test?.id, timeLeft, timerDone])

  useEffect(() => {
    const recorder = speakingRecorderRef.current
    if (!recorder || speakingPhase !== 'speak') return
    if (isPracticeTimerPaused && recorder.state === 'recording') {
      recorder.pause()
      setIsSpeakingRecording(false)
    } else if (!isPracticeTimerPaused && recorder.state === 'paused') {
      recorder.resume()
      setIsSpeakingRecording(true)
    }
  }, [isPracticeTimerPaused, speakingPhase])

  useEffect(() => () => {
    audioTimersRef.current.forEach((id) => {
      window.clearInterval(id)
      window.clearTimeout(id)
    })
    audioTimersRef.current = []
    stopSpeakingRecording({ releaseTracks: true })
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!isListeningReview || !showTranscript || transcriptLang === 'en' || !test?.transcript) {
      return undefined
    }

    if (Object.prototype.hasOwnProperty.call(translatedTranscriptMap, transcriptTranslationKey)) {
      return undefined
    }

    ;(async () => {
      const translateText = await loadTranslateText()
      const translated = await translateText(test.transcript, 'en', transcriptLang)
      if (cancelled) return
      setTranslatedTranscriptMap((prev) => ({
        ...prev,
        [transcriptTranslationKey]: translated || '',
      }))
    })()

    return () => {
      cancelled = true
    }
  }, [
    isListeningReview,
    showTranscript,
    test?.transcript,
    transcriptLang,
    transcriptTranslationKey,
    translatedTranscriptMap,
  ])

  useEffect(() => {
    let cancelled = false

    if (!isSpeaking || pageLang === 'en' || !test?.prompt) {
      return undefined
    }

    if (Object.prototype.hasOwnProperty.call(translatedPromptMap, promptTranslationKey)) {
      return undefined
    }

    ;(async () => {
      const translateText = await loadTranslateText()
      const translated = await translateText(test.prompt, 'en', pageLang)
      if (cancelled) return
      setTranslatedPromptMap((prev) => ({
        ...prev,
        [promptTranslationKey]: translated || '',
      }))
    })()

    return () => {
      cancelled = true
    }
  }, [isSpeaking, pageLang, promptTranslationKey, test?.prompt, translatedPromptMap])

  const timerIsDone = isListening ? isListeningReview : timerDone || isReadingReview
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0
  const isLastQuestion = qCursor >= totalQuestions - 1
  const isChoiceScoredSection = isListening || isReading
  const answeredCount = isChoiceScoredSection
    ? displayQuestions.reduce((sum, _question, index) => sum + (selectedChoices[index] ? 1 : 0), 0)
    : 0
  const readingProgressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const score = isChoiceScoredSection
    ? (test?.questions || []).reduce((sum, _question, index) => {
      const correct = getChoiceOptions(test, section?.id, index).find((option) => option.isCorrect)
      return sum + (selectedChoices[index] === correct?.id ? 1 : 0)
    }, 0)
    : 0
  const incorrectCount = Math.max(totalQuestions - score, 0)
  const speakingElapsed = Math.max(0, speakingTimeTotal - timeLeft)
  const speakingProgressPercent = speakingTimeTotal > 0
    ? Math.min(100, Math.round((speakingElapsed / speakingTimeTotal) * 100))
    : 0
  const speakingPhaseLabel = speakingPhase === 'speak'
    ? pageCopy.speakingRecordingPhase
    : speakingPhase === 'done'
      ? pageCopy.speakingDonePhase
      : pageCopy.speakingPrepPhase

  useEffect(() => {
    const shouldSaveChoiceAttempt = (isListening && isListeningReview) || (isReading && showAnswers)
    const shouldSaveConstructedAttempt = (isWriting && showAnswers) || (isSpeaking && showAnswers && hasSpeakingRecordedAudio)
    if ((shouldSaveChoiceAttempt || shouldSaveConstructedAttempt) && !isSubmittedRef.current && test?.id) {
      isSubmittedRef.current = true;
      const timeSpentSeconds = Math.max(0, Math.round((Date.now() - attemptStartedAtRef.current) / 1000))
      const constructedScore = getConstructedResponseScore(section?.id, draft)
      const answerDetails = shouldSaveChoiceAttempt
        ? buildChoiceAnswerDetails()
        : buildConstructedAnswerDetails(test, section?.id, draft, pageLang, speakingTemplateAnswer)
      saveCelpipTestLog({
        test_id: test.id,
        section_id: section?.id,
        test_type: test.type,
        score: shouldSaveChoiceAttempt ? score : constructedScore,
        total_questions: shouldSaveChoiceAttempt ? totalQuestions : 1,
        correct_count: shouldSaveChoiceAttempt ? score : constructedScore,
        incorrect_count: shouldSaveChoiceAttempt ? incorrectCount : Math.max(1 - constructedScore, 0),
        time_spent_seconds: timeSpentSeconds,
        answers: shouldSaveChoiceAttempt ? selectedChoices : { response: draft, localAnalysis: speakingLocalAnalysis },
        answer_details: answerDetails,
      })
        .then(() => {
          if (typeof onClose === 'function' && onClose.onLogSubmitted) {
            onClose.onLogSubmitted() // HACK: We'll pass onLogSubmitted via drill modal props
          }
        })
        .catch(console.error);
    }
  }, [draft, hasSpeakingRecordedAudio, incorrectCount, isListening, isListeningReview, isReading, isSpeaking, isWriting, onClose, pageLang, score, section?.id, selectedChoices, showAnswers, speakingLocalAnalysis, speakingTemplateAnswer, test, test?.id, test?.type, totalQuestions])

  if (!test || !section) return null

  function buildChoiceAnswerDetails() {
    return getDisplayQuestions(test).map((question, index) => {
      const questionItem = normalizeQuestion(question)
      const options = getChoiceOptions(test, section.id, index, questionItem)
      const correctOption = options.find((option) => option.isCorrect)
      const selectedOptionId = selectedChoices[index] || null
      const selectedOption = options.find((option) => option.id === selectedOptionId) || null
      return {
        question_index: index,
        prompt: questionItem.prompt,
        selected_option_id: selectedOptionId,
        selected_option_text: selectedOption?.text || '',
        correct_option_id: correctOption?.id || null,
        correct_option_text: correctOption?.text || '',
        is_correct: selectedOptionId != null && selectedOptionId === correctOption?.id,
      }
    })
  }

  async function buildWordPopupPayload(detail, targetLang) {
    if (!detail || targetLang === 'en') {
      return {
        translatedWord: '',
        translatedMeanings: [],
      }
    }

    const { translateWord } = await loadWordHelpers()
    const translateText = await loadTranslateText()
    const translatedWord = (await translateWord(detail.word, targetLang)) || ''
    const translatedMeanings = await Promise.all(
      (detail.meanings || []).map(async (meaning) => ({
        partOfSpeech: meaning.partOfSpeech,
        definitions: await Promise.all(
          (meaning.definitions || []).map(async (definition) => ({
            definition: (await translateText(definition.definition, 'en', targetLang)) || definition.definition,
            example: definition.example
              ? ((await translateText(definition.example, 'en', targetLang)) || definition.example)
              : null,
          })),
        ),
      })),
    )

    return {
      translatedWord,
      translatedMeanings,
    }
  }

  async function handleTranscriptWordClick(word, event) {
    event.stopPropagation()
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    if (!cleanWord) return

    const rect = event.currentTarget.getBoundingClientRect()
    const popupBase = {
      word: cleanWord,
      x: Math.min(rect.left, window.innerWidth - 360),
      y: Math.min(rect.bottom + 10, window.innerHeight - 360),
      loading: true,
      detail: null,
      translatedWord: '',
      translatedMeanings: [],
    }

    setWordPopup(popupBase)

    const cacheKey = `${transcriptLang}:${cleanWord}`
    if (wordPopupCache[cacheKey]) {
      setWordPopup({
        ...popupBase,
        loading: false,
        ...wordPopupCache[cacheKey],
      })
      return
    }

    const { fetchWordDetail } = await loadWordHelpers()
    const detail = await fetchWordDetail(cleanWord)
    if (!detail) {
      setWordPopup((current) => current?.word === cleanWord
        ? { ...popupBase, loading: false, error: true }
        : current)
      return
    }

    const translatedPayload = await buildWordPopupPayload(detail, transcriptLang)
    const nextPayload = {
      detail,
      ...translatedPayload,
    }

    setWordPopupCache((prev) => ({
      ...prev,
      [cacheKey]: nextPayload,
    }))
    setWordPopup((current) => current?.word === cleanWord
      ? { ...popupBase, loading: false, ...nextPayload }
      : current)
  }

  function playWordPronunciation(audioUrl) {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audio.play().catch(() => {})
  }

  function renderInteractiveTranscript(text) {
    if (!text) return null
    return text.split(/(\b[\w'-]+\b)/g).map((part, index) => {
      const isWord = /^[A-Za-z][\w'-]*$/.test(part)
      const isClickable = isWord && part.replace(/[^A-Za-z]/g, '').length >= 3
      if (!isClickable) {
        return <span key={`${part}-${index}`}>{part}</span>
      }
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          className="celpip-transcript-word"
          onClick={(event) => handleTranscriptWordClick(part, event)}
        >
          {part}
        </button>
      )
    })
  }

  function clearAudioTimers() {
    audioTimersRef.current.forEach((id) => {
      window.clearInterval(id)
      window.clearTimeout(id)
    })
    audioTimersRef.current = []
  }

  function stopAudio() {
    clearAudioTimers()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setIsPaused(false)
  }

  function stopSpeakingMediaTracks() {
    if (speakingStreamRef.current) {
      speakingStreamRef.current.getTracks().forEach((track) => track.stop())
      speakingStreamRef.current = null
    }
  }

  async function prepareSpeakingRecording() {
    if (!isSpeaking || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    if (speakingStreamRef.current) return
    try {
      setSpeakingRecordingError('')
      speakingStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      setSpeakingRecordingError(pageLang === 'ko'
        ? '마이크 권한을 허용하면 실제 녹음 파일도 저장할 수 있습니다.'
        : pageLang === 'zh'
          ? '允许麦克风权限后可以保存实际录音。'
          : 'Allow microphone access to save an actual recording.')
    }
  }

  function startSpeakingRecording() {
    if (!isSpeaking || !speakingStreamRef.current || typeof MediaRecorder === 'undefined') return
    if (speakingRecorderRef.current?.state === 'recording') return

    try {
      speakingChunksRef.current = []
      const recorder = new MediaRecorder(speakingStreamRef.current)
      speakingRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) speakingChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(speakingChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size > 0) {
          setHasSpeakingRecordedAudio(true)
          setSpeakingAudioUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl)
            return URL.createObjectURL(blob)
          })
        }
        speakingChunksRef.current = []
      }
      recorder.start()
      setIsSpeakingRecording(true)
    } catch (error) {
      setSpeakingRecordingError(pageLang === 'ko'
        ? '이 브라우저에서 녹음을 시작하지 못했습니다.'
        : pageLang === 'zh'
          ? '此浏览器无法开始录音。'
          : 'Recording could not start in this browser.')
      setIsSpeakingRecording(false)
    }
  }

  function stopSpeakingRecording({ releaseTracks = false } = {}) {
    const recorder = speakingRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    speakingRecorderRef.current = null
    setIsSpeakingRecording(false)
    if (releaseTracks) stopSpeakingMediaTracks()
  }

  function pauseAudio() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause()
        setIsPaused(true)
        setIsPlaying(false)
      }
    }
  }

  function resumeOrPlayAudio() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
        setIsPaused(false)
        setIsPlaying(true)
      } else {
        playAudio()
      }
    } else {
      playAudio()
    }
  }

  function restartTest() {
    stopAudio()
    stopSpeakingRecording({ releaseTracks: false })
    setDraft('')
    setListeningMode(isListening ? null : listeningMode)
    setSelectedChoices({})
    setShowTranscript(false)
    setShowAnswers(false)
    setShowSpeakingTemplateGuide(true)
    setTimerDone(false)
    setSegIndex(0)
    setQCursor(0)
    setIsPlaying(false)
    setIsPaused(false)
    setIsPracticeTimerPaused(false)
    setIsSpeakingRecording(false)
    setHasSpeakingRecordedAudio(false)
    attemptStartedAtRef.current = Date.now()
    if (isListening) {
      setTimeLeft(PER_QUESTION_SECONDS)
      isSubmittedRef.current = false
      setListeningPhase('setup')
    } else if (isSpeaking) {
      setTimeLeft(0)
      setSpeakingPhase('setup')
      setSpeakingTimeTotal(0)
      isSubmittedRef.current = false
      setSpeakingSetupOpen(true)
    } else {
      setListeningPhase('answer')
      isSubmittedRef.current = false
      setTimeLeft(getPracticeSeconds(test, section?.id))
    }
  }

  function startListeningAttempt(mode) {
    const segments = getListeningSegments(test, section?.id, mode)
    setListeningMode(mode)
    setDraft('')
    setSelectedChoices({})
    setShowTranscript(false)
    setShowAnswers(false)
    setTimerDone(false)
    setSegIndex(0)
    setQCursor(0)
    setIsPlaying(false)
    setIsPaused(false)
    attemptStartedAtRef.current = Date.now()
    isSubmittedRef.current = false
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    if (segments.length) {
      setTimeLeft(PER_QUESTION_SECONDS)
      setListeningPhase('audio')
      const didStart = playAudio(segments[0].text, false, () => setListeningPhase('answer'))
      if (!didStart) setListeningPhase('answer')
    } else {
      setListeningPhase('answer')
      setTimeLeft(PER_QUESTION_SECONDS)
    }
  }

  async function startSpeakingPractice() {
    const filteredByMode = speakingPracticeMode === 'random'
      ? baseTests
      : baseTests.filter((item) => getSpeakingTemplateId(item) === speakingPracticeMode)
    const filteredByAttempt = speakingSkipAttempted
      ? filteredByMode.filter((item) => !speakingAttemptedIds.has(item.id))
      : filteredByMode
    const nextTests = filteredByAttempt.length > 0 ? filteredByAttempt : filteredByMode.length > 0 ? filteredByMode : baseTests
    const queuedTests = speakingShuffleEnabled ? shuffleTests(nextTests) : [...nextTests]

    setSpeakingPracticeTests(queuedTests)
    setSpeakingSetupOpen(false)
    setActiveIndex(0)
    setDraft('')
    setSelectedChoices({})
    setShowAnswers(false)
    setShowSpeakingTemplateGuide(false)
    setTimerDone(false)
    setIsPracticeTimerPaused(false)
    setIsSpeakingRecording(false)
    setHasSpeakingRecordedAudio(false)
    setSpeakingAudioUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return ''
    })
    setSpeakingRecordingError('')
    setListeningPhase('answer')
    attemptStartedAtRef.current = Date.now()
    isSubmittedRef.current = false
    await prepareSpeakingRecording()
    const timing = getSpeakingTimingSeconds(queuedTests[0]?.time)
    setSpeakingPhase('prep')
    setSpeakingTimeTotal(timing.prep)
    setTimeLeft(timing.prep)
  }

  function returnToSpeakingSetup() {
    setSpeakingSetupOpen(true)
    setSpeakingPracticeTests(null)
    setActiveIndex(0)
    setDraft('')
    setShowAnswers(false)
    setTimerDone(false)
    setIsPracticeTimerPaused(false)
    setSpeakingPhase('setup')
    setSpeakingTimeTotal(0)
    setIsSpeakingRecording(false)
    setHasSpeakingRecordedAudio(false)
    stopSpeakingRecording({ releaseTracks: true })
    setSpeakingAudioUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return ''
    })
    setSpeakingRecordingError('')
    isSubmittedRef.current = false
    setTimeLeft(0)
  }

  function playAudio(textArg, useRepeat = repeatRef.current, onComplete) {
    const text = textArg || test.transcript
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return false
    clearAudioTimers()
    window.speechSynthesis.cancel()
    const speechText = getSpeechText(text)
    const utterance = new SpeechSynthesisUtterance(speechText)
    utterance.lang = 'en-CA'
    utterance.rate = speed

    const finish = () => {
      clearAudioTimers()
      if (useRepeat && repeatRef.current) {
        playAudio(text, useRepeat, onComplete)
      } else {
        setIsPlaying(false)
        setIsPaused(false)
        if (typeof onComplete === 'function') onComplete()
      }
    }

    utterance.onend = finish
    utterance.onerror = finish

    setIsPlaying(true)
    setIsPaused(false)
    window.speechSynthesis.speak(utterance)

    // Chrome stops long utterances after ~15s and may never fire onend;
    // periodically resume, and use a duration-based fallback to advance anyway.
    const resumeId = window.setInterval(() => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.resume()
      else window.clearInterval(resumeId)
    }, 8000)
    const estimatedMs = (speechText.split(/\s+/).length / (2.6 * speed)) * 1000 + 4000
    const fallbackId = window.setTimeout(() => {
      if (!useRepeat) finish()
    }, estimatedMs)
    audioTimersRef.current = [resumeId, fallbackId]
    return true
  }

  const moveMock = (direction) => {
    if (isSpeaking) stopSpeakingRecording({ releaseTracks: false })
    setActiveIndex((current) => {
      const nextIndex = current + direction
      if (nextIndex < 0) return tests.length - 1
      if (nextIndex >= tests.length) return 0
      return nextIndex
    })
  }

  // Advance one question; play the next segment's audio when a segment ends; finish at review.
  function advanceQuestion() {
    const segments = listeningSegments
    const start = segStartIndex(segIndex)
    const segEnd = start + (segments[segIndex]?.q || totalQuestions)
    // Reset the countdown in the same update so the timer effect does not double-advance.
    setTimeLeft(PER_QUESTION_SECONDS)
    if (qCursor + 1 < segEnd) {
      setQCursor(qCursor + 1)
      return
    }
    if (segIndex + 1 < segments.length) {
      const nextSeg = segIndex + 1
      setSegIndex(nextSeg)
      setQCursor(segEnd)
      setListeningPhase('audio')
      const didStart = playAudio(segments[nextSeg].text, false, () => setListeningPhase('answer'))
      if (!didStart) setListeningPhase('answer')
      return
    }
    stopAudio()
    setListeningPhase('review')
  }

  const renderQuestionItem = (question, index, reveal) => {
    const questionItem = normalizeQuestion(question)
    const options = getChoiceOptions(test, section.id, index, questionItem)
    const correctOption = options.find((option) => option.isCorrect)
    const selectedOptionId = selectedChoices[index]

    return (
      <div key={`${test.id}-${index}-${questionItem.prompt}`} className="celpip-question-item">
        <div className="celpip-question-row">
          <span>{index + 1}</span>
          <p className="celpip-question-text">{questionItem.prompt}</p>
        </div>
        <div className="celpip-choice-list" role="radiogroup" aria-label={questionItem.prompt}>
          {options.map((option, optionIndex) => {
            const isSelected = selectedOptionId === option.id
            const showCorrect = reveal && option.isCorrect
            const showIncorrect = reveal && isSelected && !option.isCorrect

            return (
              <label
                key={option.id}
                className={`celpip-choice-option ${showCorrect ? 'celpip-choice-option--correct' : ''} ${showIncorrect ? 'celpip-choice-option--incorrect' : ''}`}
              >
                <input
                  type="radio"
                  name={`${test.id}-${index}`}
                  checked={isSelected}
                  disabled={reveal}
                  onChange={() => setSelectedChoices((choices) => ({ ...choices, [index]: option.id }))}
                />
                <strong>{String.fromCharCode(65 + optionIndex)}</strong>
                <span>{option.text}</span>
              </label>
            )
          })}
        </div>
        {reveal && (
          <div className="celpip-answer-review">
            <div className="celpip-answer-review__top">
              <strong>{pageCopy.modelAnswerTitle}</strong>
              <span className={`celpip-difficulty celpip-difficulty--${getQuestionDifficulty(test, index)}`}>
                {pageCopy.questionDifficultyLabel}: {pageCopy.difficulty[getQuestionDifficulty(test, index)]}
              </span>
            </div>
            <p>{getAnswerPrefix(pageLang)}: {correctOption?.text || getModelAnswer(test, section.id, index, pageLang, questionItem)}</p>
            <div className="celpip-answer-strategy">
              <span className="material-symbols-outlined">tips_and_updates</span>
              <span><strong>{pageCopy.strategyLabel}:</strong> {getQuestionStrategy(section.id, test.type, index, pageLang, questionItem)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleClose = () => {
    setIsFullscreen(false)
    stopAudio()
    stopSpeakingRecording({ releaseTracks: true })
    onClose()
  }

  return (
    <div className={`celpip-modal-overlay ${isFullscreen ? 'celpip-modal-overlay--fullscreen' : ''}`}>
      <section
        className={`celpip-practice-modal ${isFullscreen ? 'celpip-practice-modal--fullscreen' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celpip-practice-title"
      >
        <div className="celpip-modal-actions">
          <button
            className="celpip-modal-action-btn"
            onClick={() => setIsFullscreen((value) => !value)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <span className="material-symbols-outlined">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
          <button className="celpip-modal-action-btn" onClick={handleClose} title="Close" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="celpip-practice-modal__header" style={{ '--section-color': section.color }}>
          <span className="material-symbols-outlined">{section.icon}</span>
          <div>
            <p>{sectionLabel} · {test.type}</p>
            <div className="celpip-practice-title-row">
              <h2 id="celpip-practice-title">{test.title}</h2>
              <span className="celpip-title-chip">{getDrillMetaLabel(test)}</span>
              {test.source && (
                <span className="celpip-title-chip" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                  {pageLang === 'ko' ? '출처' : pageLang === 'zh' ? '来源' : 'Source'}: {test.source}
                </span>
              )}
              {isListening && listeningMode && (
                <span className="celpip-title-chip" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                  {listeningMode === 'full' ? listeningModeCopy.activeFull : listeningModeCopy.activeSegmented}
                </span>
              )}
              {(() => {
                if (logsForCurrentTest.length > 0) {
                  const lastLog = logsForCurrentTest[logsForCurrentTest.length - 1]
                  const latestTimeLabel = typeof lastLog.time_spent_seconds === 'number'
                    ? formatTimer(lastLog.time_spent_seconds)
                    : null
                  return (
                    <span className="celpip-title-chip celpip-title-chip--success" style={{ marginLeft: '8px', background: '#e6f4ea', color: '#137333' }}>
                      {pageLang === 'ko'
                        ? `풀이 횟수: ${logsForCurrentTest.length}회 (최고 점수: ${Math.max(...logsForCurrentTest.map(l => l.score))}${latestTimeLabel ? `, 최근 시간: ${latestTimeLabel}` : ''})`
                        : `Attempts: ${logsForCurrentTest.length} (Best: ${Math.max(...logsForCurrentTest.map(l => l.score))}${latestTimeLabel ? `, Latest Time: ${latestTimeLabel}` : ''})`}
                    </span>
                  )
                }
                return null
              })()}
              <span className={`celpip-title-timer ${timerIsDone ? 'celpip-title-timer--done' : ''} ${isListeningAudio ? 'celpip-title-timer--audio' : ''}`}>
                {isListeningReview || isReadingReview ? `${score} / ${totalQuestions}` : isListeningSetup || (isSpeaking && speakingSetupOpen) ? listeningReadyLabel : isListeningAudio ? 'Audio' : formatTimer(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {typeProfile && !isSpeaking && (
          <div className="celpip-part-profile celpip-part-profile--drill">
            <div className="celpip-part-profile__chips">
              <span className={`celpip-difficulty celpip-difficulty--${typeProfile.difficultyKey}`}>
                {pageCopy.typeDifficultyLabel}: {pageCopy.difficulty[typeProfile.difficultyKey]}
              </span>
              <span>{pageCopy.memoryLoadLabel}: {typeProfile.memory}</span>
            </div>
            <div className="celpip-part-profile__grid">
              <div>
                <strong>{pageCopy.memoFocusLabel}</strong>
                <p>{typeProfile.memoFocus}</p>
              </div>
              <div>
                <strong>{pageCopy.challengeLabel}</strong>
                <p>{typeProfile.challenge}</p>
              </div>
            </div>
          </div>
        )}

        <div className="celpip-drill-nav">
          <button onClick={() => moveMock(-1)} disabled={tests.length < 2}>
            <span className="material-symbols-outlined">chevron_left</span>
            {pageCopy.prevMock}
          </button>
          <strong>{pageCopy.currentQuestion} {activeIndex + 1} / {tests.length}</strong>
          <button onClick={() => moveMock(1)} disabled={tests.length < 2}>
            {pageCopy.nextMock}
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {isSpeaking && !speakingSetupOpen && (
          <div className="celpip-speaking-practice-bar">
            <button type="button" onClick={returnToSpeakingSetup}>
              <span className="material-symbols-outlined">arrow_back</span>
              {pageCopy.speakingBackToSetup}
            </button>
            <button type="button" onClick={() => setIsPracticeTimerPaused((value) => !value)}>
              <span className="material-symbols-outlined">{isPracticeTimerPaused ? 'play_arrow' : 'pause'}</span>
              {isPracticeTimerPaused ? pageCopy.speakingResumeTime : pageCopy.speakingPauseTime}
            </button>
          </div>
        )}

        {isSpeaking && !speakingSetupOpen && (
          <section className={`celpip-speaking-stage celpip-speaking-stage--${speakingPhase}`}>
            <div className="celpip-speaking-stage__top">
              <div>
                <span className="material-symbols-outlined">
                  {speakingPhase === 'speak' ? 'mic' : speakingPhase === 'done' ? 'check_circle' : 'hourglass_top'}
                </span>
                <div>
                  <strong>{speakingPhaseLabel}</strong>
                  <p>
                    {speakingPhase === 'prep'
                      ? (pageLang === 'ko' ? '준비 시간이 끝나면 자동으로 녹음 시간이 시작됩니다.' : pageLang === 'zh' ? '准备时间结束后会自动进入录音时间。' : 'Recording time starts automatically after prep.')
                      : speakingPhase === 'speak'
                        ? (pageLang === 'ko' ? '지금 말하세요. 진행바는 남은 말하기 시간을 보여줍니다.' : pageLang === 'zh' ? '现在开始说。进度条显示口语时间。' : 'Speak now. The bar shows your speaking time.')
                        : (pageLang === 'ko' ? '시간이 끝났습니다. 답변과 분석을 확인하세요.' : pageLang === 'zh' ? '时间结束。请查看答案和分析。' : 'Time is finished. Review the answer and analysis.')}
                  </p>
                </div>
              </div>
              <span className="celpip-speaking-stage__time">{formatTimer(timeLeft)}</span>
            </div>
            <div className="celpip-speaking-stage__track" aria-hidden="true">
              <div style={{ width: `${speakingProgressPercent}%` }} />
            </div>
            {speakingPhase === 'speak' && (
              <button
                type="button"
                className={`celpip-recording-pill ${isSpeakingRecording ? 'celpip-recording-pill--active' : ''}`}
                onClick={async () => {
                  if (isSpeakingRecording) {
                    stopSpeakingRecording({ releaseTracks: false })
                  } else {
                    await prepareSpeakingRecording()
                    startSpeakingRecording()
                  }
                }}
              >
                <span className="material-symbols-outlined">{isSpeakingRecording ? 'fiber_manual_record' : 'mic'}</span>
                {isSpeakingRecording
                  ? pageCopy.speakingRecordingButton
                  : (pageLang === 'ko' ? '녹음 다시 시작' : pageLang === 'zh' ? '继续录音' : 'Resume recording')}
              </button>
            )}
            {speakingRecordingError && (
              <div className="celpip-speaking-stage__error">{speakingRecordingError}</div>
            )}
            {speakingAudioUrl && (
              <audio className="celpip-speaking-audio" src={speakingAudioUrl} controls />
            )}
          </section>
        )}

        <div className="celpip-practice-modal__body">
          {isSpeaking && speakingSetupOpen ? (
            <section className="celpip-speaking-setup">
              <div className="celpip-speaking-setup__hero">
                <span className="material-symbols-outlined">record_voice_over</span>
                <div>
                  <h3>{pageCopy.speakingSetupTitle}</h3>
                  <p>{pageCopy.speakingSetupBody}</p>
                </div>
              </div>

              <div className="celpip-speaking-setup__tabs" role="tablist" aria-label={pageCopy.speakingSetupTitle}>
                {speakingPracticeOptions.map((option) => {
                  const count = option.id === 'random'
                    ? baseTests.length
                    : baseTests.filter((item) => getSpeakingTemplateId(item) === option.id).length
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`celpip-speaking-setup__tab ${speakingPracticeMode === option.id ? 'celpip-speaking-setup__tab--active' : ''}`}
                      onClick={() => setSpeakingPracticeMode(option.id)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                      <small>{count} prompts</small>
                    </button>
                  )
                })}
              </div>

              <div className="celpip-speaking-setup__options">
                <label>
                  <input
                    type="checkbox"
                    checked={speakingShuffleEnabled}
                    onChange={(event) => setSpeakingShuffleEnabled(event.target.checked)}
                  />
                  {pageCopy.speakingShuffleLabel}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={speakingSkipAttempted}
                    onChange={(event) => setSpeakingSkipAttempted(event.target.checked)}
                  />
                  {pageCopy.speakingSkipAttemptedLabel}
                </label>
              </div>

              <button type="button" className="celpip-speaking-setup__start" onClick={startSpeakingPractice}>
                <span className="material-symbols-outlined">mic</span>
                {pageCopy.speakingStartPractice}
              </button>
            </section>
          ) : (
            <>
          {isListening && test.transcript && (
            <section className="celpip-listening-panel">
              {isListeningSetup ? (
                <div className="celpip-listening-mode-picker">
                  <div className="celpip-listening-mode-picker__copy">
                    <span className="material-symbols-outlined">headphones</span>
                    <div>
                      <strong>{listeningModeCopy.title}</strong>
                      <p>{listeningModeCopy.body}</p>
                    </div>
                  </div>
                  <div className="celpip-listening-mode-picker__actions">
                    <button className="celpip-audio-btn" onClick={() => startListeningAttempt('segmented')}>
                      <span className="material-symbols-outlined">format_list_bulleted</span>
                      {listeningModeCopy.segmented}
                      <small className="celpip-listening-mode-picker__badge">{listeningModeCopy.examFormat || 'Exam format'}</small>
                    </button>
                    <button className="celpip-audio-btn celpip-audio-btn--secondary" onClick={() => startListeningAttempt('full')}>
                      <span className="material-symbols-outlined">queue_music</span>
                      {listeningModeCopy.full}
                    </button>
                  </div>
                  <div className="celpip-listening-mode-picker__notes">
                    <span>{listeningModeCopy.segmentedHint}</span>
                    <span>{listeningModeCopy.fullHint}</span>
                  </div>
                </div>
              ) : isListeningReview ? (
                <div className="celpip-listening-controls">
                  <button className="celpip-audio-btn" onClick={resumeOrPlayAudio} disabled={isPlaying}>
                    <span className="material-symbols-outlined">play_arrow</span>
                    {pageCopy.playAudio || 'Play'}
                  </button>
                  <button className="celpip-audio-btn" onClick={pauseAudio} disabled={!isPlaying && !isPaused}>
                    <span className="material-symbols-outlined">pause</span>
                    {pageLang === 'ko' ? '일시정지' : pageLang === 'zh' ? '暂停' : 'Pause'}
                  </button>
                  <button className="celpip-audio-btn" onClick={stopAudio}>
                    <span className="material-symbols-outlined">stop</span>
                    {pageCopy.stopAudio || 'Stop'}
                  </button>
                  <button className="celpip-audio-btn celpip-audio-btn--secondary" onClick={restartTest}>
                    <span className="material-symbols-outlined">replay</span>
                    {pageLang === 'ko' ? '문제 다시풀기' : pageLang === 'zh' ? '重新作答' : 'Retry Mock'}
                  </button>
                  <label className="celpip-repeat-toggle">
                    <input
                      type="checkbox"
                      checked={repeatAudio}
                      onChange={(event) => setRepeatAudio(event.target.checked)}
                    />
                    {pageCopy.repeatAudio}
                  </label>
                  <label className="celpip-speed-control">
                    <span>{pageCopy.speedLabel}</span>
                    <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                    </select>
                  </label>
                  <button className="celpip-script-toggle" onClick={() => setShowTranscript((value) => !value)}>
                    <span className="material-symbols-outlined">{showTranscript ? 'visibility_off' : 'visibility'}</span>
                    {showTranscript ? pageCopy.hideTranscript : pageCopy.showTranscript}
                  </button>
                </div>
              ) : (
                <div className="celpip-listening-locked">
                  <span className="material-symbols-outlined">{isListeningAudio ? 'volume_up' : 'timer'}</span>
                  <strong>
                    {isListeningAudio ? 'Audio is playing' : 'Answer time is running'}
                    {listeningSegments.length > 1 && ` · ${labels.part} ${segIndex + 1}/${listeningSegments.length}`}
                  </strong>
                  {isListeningAudio && (
                    <button
                      className="celpip-skip-audio-btn"
                      onClick={() => {
                        stopAudio()
                        setListeningPhase('answer')
                      }}
                    >
                      <span className="material-symbols-outlined">skip_next</span>
                      {pageLang === 'ko' ? '지금 문제 풀기' : pageLang === 'zh' ? '现在开始答题' : 'Start answering'}
                    </button>
                  )}
                </div>
              )}
              {isListeningReview && showTranscript && (
                <div className="celpip-transcript-shell">
                  <div className="celpip-transcript-shell__top">
                    <h3>{pageCopy.transcriptTitle}</h3>
                  </div>
                  <div className="celpip-transcript-shell__body">
                    <p>{renderInteractiveTranscript(test.transcript)}</p>
                    <div className="celpip-transcript-tools">
                      <div className="celpip-transcript-tools__hint">
                        <span className="material-symbols-outlined">translate</span>
                        <span>{studyCopy.clickHint}</span>
                      </div>
                      <div className="celpip-transcript-lang-toggle">
                        {TRANSCRIPT_LANG_OPTIONS.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            className={`celpip-transcript-lang-btn ${transcriptLang === option.code ? 'celpip-transcript-lang-btn--active' : ''}`}
                            onClick={() => setTranscriptLang(option.code)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {transcriptLang !== 'en' && (
                      <div className="celpip-transcript-translation">
                        <div className="celpip-transcript-translation__title">{studyCopy.translationTitle}</div>
                        {translatedTranscript ? (
                          <p>{translatedTranscript}</p>
                        ) : hasTranslatedTranscript ? (
                          <div className="celpip-transcript-translation__empty">
                            {studyCopy.translationUnavailable}
                          </div>
                        ) : (
                          <div className="celpip-transcript-translation__empty">
                            {studyCopy.translationLoading}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {test.passage && (
            <section className={`celpip-prompt-panel ${isReading ? 'celpip-prompt-panel--reading-sticky' : ''}`}>
              <div className="celpip-passage-header">
                <div>
                  <h3>{pageCopy.passageTitle}</h3>
                  {isReading && (
                    <p>
                      {pageLang === 'ko'
                        ? '주요 영어 단어를 클릭하면 뜻과 영어 발음을 볼 수 있습니다.'
                        : pageLang === 'zh'
                          ? '点击英文关键词可查看释义和英语发音。'
                          : 'Click key English words to view meaning and pronunciation.'}
                    </p>
                  )}
                </div>
                {isReading && (
                  <div className="celpip-transcript-lang-toggle" aria-label="Word meaning language">
                    {TRANSCRIPT_LANG_OPTIONS.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        className={`celpip-transcript-lang-btn ${transcriptLang === option.code ? 'celpip-transcript-lang-btn--active' : ''}`}
                        onClick={() => setTranscriptLang(option.code)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className={isReading ? 'celpip-interactive-passage' : undefined}>
                {isReading ? renderInteractiveTranscript(test.passage) : test.passage}
              </p>
            </section>
          )}

          {test.prompt && (
            <section className="celpip-prompt-panel">
              <h3>{pageCopy.promptTitle}</h3>
              <p>{test.prompt}</p>
              {isSpeaking && pageLang !== 'en' && (
                <div className="celpip-prompt-translation">
                  <strong>{pageLang === 'ko' ? '번역' : '翻译'}</strong>
                  <p>{translatedPrompt || (hasTranslatedPrompt ? '' : (pageLang === 'ko' ? '번역 중...' : '正在翻译...'))}</p>
                </div>
              )}
            </section>
          )}

          {/* Listening: one question at a time while answering. */}
          {isListening && listeningPhase === 'answer' && totalQuestions > 0 && (
            <section className="celpip-question-list">
              <div className="celpip-question-progress">
                <span>{labels.question} {qCursor + 1} / {totalQuestions}</span>
                {listeningSegments.length > 1 && (
                  <span className="celpip-segment-chip">{labels.part} {segIndex + 1} / {listeningSegments.length}</span>
                )}
              </div>
              {renderQuestionItem(test.questions[qCursor], qCursor, false)}
              <button className="celpip-answer-toggle celpip-next-question-btn" onClick={advanceQuestion}>
                {isLastQuestion ? labels.submit : labels.nextQuestion}
                <span className="material-symbols-outlined">{isLastQuestion ? 'task_alt' : 'arrow_forward'}</span>
              </button>
            </section>
          )}

          {/* Listening: review every question with answers and a score. */}
          {isListeningReview && totalQuestions > 0 && (
            <section className="celpip-question-list">
              <div className="celpip-score-banner">
                <span className="material-symbols-outlined">military_tech</span>
                <strong>{labels.score}: {score} / {totalQuestions}</strong>
              </div>
              {getDisplayQuestions(test).map((question, index) => renderQuestionItem(question, index, true))}
            </section>
          )}

          {/* Reading: one timed set, grouped into exam-style task blocks. */}
          {isReading && totalQuestions > 0 && (
            <section className="celpip-question-list">
              <div className="celpip-reading-progress">
                <div className="celpip-question-progress">
                  <span>{pageCopy.questionsTitle}: {answeredCount} / {totalQuestions}</span>
                  <span className="celpip-segment-chip">{readingProgressPercent}%</span>
                </div>
                <div className="celpip-reading-progress__track" aria-hidden="true">
                  <div className="celpip-reading-progress__fill" style={{ width: `${readingProgressPercent}%` }} />
                </div>
              </div>
              <div className="celpip-reading-format-note">
                <span className="material-symbols-outlined">menu_book</span>
                <span>
                  {pageLang === 'ko'
                    ? READING_EXAM_TASK_COPY.ko.examNote
                    : pageLang === 'zh'
                      ? READING_EXAM_TASK_COPY.zh.examNote
                      : READING_EXAM_TASK_COPY.en.examNote}
                </span>
              </div>
              {isReadingReview && (
                <div className="celpip-score-banner">
                  <span className="material-symbols-outlined">military_tech</span>
                  <strong>{labels.score}: {score} / {totalQuestions}</strong>
                </div>
              )}
              <div className="celpip-reading-task-list">
                {readingExamTasks.map((task, taskIndex) => {
                  const copy = READING_EXAM_TASK_COPY[pageLang] || READING_EXAM_TASK_COPY.en
                  const startQuestion = task.start + 1
                  const endQuestion = task.start + task.questions.length
                  return (
                    <section className="celpip-reading-task" key={`${test.id}-reading-task-${taskIndex}`}>
                      <div className="celpip-reading-task__header">
                        <div>
                          <span>{copy.taskLabel} {taskIndex + 1}</span>
                          <h3>{task.title}</h3>
                          <p>{task.instruction}</p>
                        </div>
                        <strong>{copy.questionRange} {startQuestion}-{endQuestion}</strong>
                      </div>
                      <div className="celpip-reading-task__questions">
                        {task.questions.map((question, index) => renderQuestionItem(question, task.start + index, isReadingReview))}
                      </div>
                    </section>
                  )
                })}
              </div>
              <div className="celpip-reading-actions">
                {!isReadingReview ? (
                  <button
                    className="celpip-answer-toggle"
                    onClick={() => {
                      setTimerDone(true)
                      setShowAnswers(true)
                    }}
                  >
                    <span className="material-symbols-outlined">task_alt</span>
                    {labels.submit}
                  </button>
                ) : (
                  <button className="celpip-answer-toggle" onClick={restartTest}>
                    <span className="material-symbols-outlined">restart_alt</span>
                    {pageLang === 'ko' ? '다시 풀기' : pageLang === 'zh' ? '重新练习' : 'Retry Mock'}
                  </button>
                )}
              </div>
            </section>
          )}

          {!isListening && !isReading && Array.isArray(test.questions) && (
            <section className="celpip-question-list">
              <h3>{pageCopy.questionsTitle}</h3>
              {displayQuestions.map((question, index) => renderQuestionItem(question, index, showAnswers))}
              <button className="celpip-answer-toggle" onClick={() => setShowAnswers((value) => !value)}>
                <span className="material-symbols-outlined">{showAnswers ? 'visibility_off' : 'task_alt'}</span>
                {showAnswers ? pageCopy.hideAnswers : pageCopy.showAnswers}
              </button>
            </section>
          )}

          {(isWriting || isSpeaking) && (
            <section className={`celpip-answer-panel ${isSpeaking ? 'celpip-answer-panel--speaking' : ''}`}>
              <div className="celpip-answer-panel__top">
                <h3>{isSpeaking ? pageCopy.speakingNotesTitle : pageCopy.responseTitle}</h3>
                <span>{wordCount} words</span>
              </div>
              {isSpeaking && speakingTemplateGuide && (
                <section className="celpip-speaking-template-guide">
                  <div className="celpip-speaking-template-guide__top">
                    <div>
                      <span className="celpip-template-badge">{pageCopy.templateCoachBadge}</span>
                      <strong>{pageCopy.templateCoachTitle}: {getTemplateCopy(speakingTemplateGuide, 'label', pageLang)}</strong>
                    </div>
                    <button
                      type="button"
                      className="celpip-template-toggle"
                      onClick={() => setShowSpeakingTemplateGuide((value) => !value)}
                    >
                      <span className="material-symbols-outlined">{showSpeakingTemplateGuide ? 'visibility_off' : 'visibility'}</span>
                      {showSpeakingTemplateGuide ? pageCopy.templateCoachHide : pageCopy.templateCoachShow}
                    </button>
                  </div>
                  {showSpeakingTemplateGuide && (
                    <div className="celpip-speaking-template-guide__body">
                      <p>{pageCopy.templateCoachNote}</p>
                      <div className="celpip-template-flow celpip-speaking-template-guide__flow">
                        {(getTemplateCopy(speakingTemplateGuide, 'flow', pageLang) || speakingTemplateGuide.flow).map((step, index) => (
                          <div className="celpip-template-flow__item" key={`${speakingTemplateGuide.id}-inline-flow-${step}`}>
                            <span>{index + 1}</span>
                            <strong>{step}</strong>
                          </div>
                        ))}
                      </div>
                      <pre>{parseTemplate(speakingTemplateGuide.template)}</pre>
                    </div>
                  )}
                </section>
              )}
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isSpeaking ? 'Key points only: situation, reasons, examples, closing...' : 'Write your full response here...'}
              />
              <div className="celpip-answer-panel__hint">
                <span className="material-symbols-outlined">tips_and_updates</span>
                {isSpeaking
                  ? '말하기는 문장 전체보다 키워드만 잡고 자연스럽게 확장하는 연습이 좋습니다.'
                  : 'Writing은 목적, 독자, 톤, 이유 2-3개, 마무리 요청/결론을 확인하세요.'}
              </div>
              <button className="celpip-answer-toggle" onClick={() => setShowAnswers((value) => !value)}>
                <span className="material-symbols-outlined">{showAnswers ? 'visibility_off' : 'task_alt'}</span>
                {showAnswers ? pageCopy.hideAnswers : pageCopy.showAnswers}
              </button>
              {showAnswers && (
                <div className="celpip-answer-review">
                  <div className="celpip-answer-review__top">
                    <strong>{pageCopy.modelAnswerTitle}</strong>
                    <span className={`celpip-difficulty celpip-difficulty--${getQuestionDifficulty(test, 0)}`}>
                      {pageCopy.questionDifficultyLabel}: {pageCopy.difficulty[getQuestionDifficulty(test, 0)]}
                    </span>
                  </div>
                  {isSpeaking && speakingTemplateAnswer?.segments?.length ? (
                    <div className="celpip-template-answer">
                      <div className="celpip-template-answer__label">
                        <span className="material-symbols-outlined">edit_note</span>
                        <strong>{pageCopy.templatePhraseLabel}: {getTemplateCopy(speakingTemplateAnswer.template, 'label', pageLang)}</strong>
                      </div>
                      {speakingTemplateAnswer.segments.map((segment, index) => (
                        <p
                          key={`${speakingTemplateAnswer.template?.id || 'speaking-answer'}-${index}`}
                          className={segment.template ? 'celpip-template-answer__phrase' : undefined}
                        >
                          {segment.template && <span>{pageCopy.templatePhraseLabel}</span>}
                          {segment.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p>{getModelAnswer(test, section.id, 0, pageLang)}</p>
                  )}
                  {isSpeaking && speakingLocalAnalysis && (
                    <div className="celpip-speaking-score-card">
                      <div className="celpip-speaking-score-card__top">
                        <strong>{pageCopy.speakingScoringTitle}</strong>
                        <span>{speakingLocalAnalysis.overall}/90</span>
                      </div>
                      <div className="celpip-speaking-score-grid">
                        <span>Content <strong>{speakingLocalAnalysis.content}</strong></span>
                        <span>Fluency <strong>{speakingLocalAnalysis.oralFluency}</strong></span>
                        <span>Pronunciation <strong>{speakingLocalAnalysis.pronunciation}</strong></span>
                        <span>Structure <strong>{speakingLocalAnalysis.structure}</strong></span>
                      </div>
                      <p>{pageCopy.speakingScoringNote}</p>
                      {speakingLocalAnalysis.missingKeywords?.length > 0 && (
                        <div className="celpip-speaking-practice-words">
                          <strong>{pageCopy.speakingMissingWords}</strong>
                          <div>
                            {speakingLocalAnalysis.missingKeywords.map((word) => (
                              <button
                                key={word}
                                type="button"
                                onClick={(event) => handleTranscriptWordClick(word, event)}
                              >
                                {word}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="celpip-answer-strategy">
                    <span className="material-symbols-outlined">tips_and_updates</span>
                    <span><strong>{pageCopy.strategyLabel}:</strong> {getQuestionStrategy(section.id, test.type, 0, pageLang)}</span>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="celpip-history-panel">
            <div className="celpip-history-panel__top">
              <h3>{pageCopy.historyTitle}</h3>
              {logsForCurrentTest.length > 0 && (
                <span>{logsForCurrentTest.length}</span>
              )}
            </div>
            {logsForCurrentTest.length === 0 ? (
              <div className="celpip-history-panel__empty">{pageCopy.historyEmpty}</div>
            ) : (
              <div className="celpip-history-list">
                {[...logsForCurrentTest].reverse().map((log) => {
                  const total = Number.isFinite(log.total_questions) && log.total_questions > 0
                    ? log.total_questions
                    : totalQuestions
                  const correctCount = Number.isFinite(log.correct_count) && log.correct_count >= 0
                    ? log.correct_count
                    : log.score
                  const incorrectCount = Number.isFinite(log.incorrect_count) && log.incorrect_count >= 0
                    ? log.incorrect_count
                    : Math.max((total || 0) - (correctCount || 0), 0)
                  return (
                    <button
                      key={log.id}
                      type="button"
                      className="celpip-history-item"
                      onClick={() => setSelectedHistoryLog(log)}
                    >
                      <div className="celpip-history-item__meta">
                        <strong>{formatDateTime(log.created_at, pageLang)}</strong>
                        <span>
                          {pageCopy.historyScoreLabel}: {log.score}/{total || totalQuestions || '-'}
                        </span>
                      </div>
                      <div className="celpip-history-item__stats">
                        <span>{pageCopy.historyTimeLabel}: {typeof log.time_spent_seconds === 'number' ? formatTimer(log.time_spent_seconds) : '-'}</span>
                        <span>{pageCopy.historyCorrectLabel}: {correctCount}</span>
                        <span>{pageCopy.historyIncorrectLabel}: {incorrectCount}</span>
                      </div>
                      <span className="celpip-history-item__open">{pageCopy.historyOpen}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
            </>
          )}
        </div>
      </section>

      {wordPopup && (
        <>
          <button
            type="button"
            className="celpip-word-popup-backdrop"
            onClick={() => setWordPopup(null)}
            aria-label="Close word details"
          />
          <div
            className="celpip-word-popup"
            style={{ left: `${wordPopup.x}px`, top: `${wordPopup.y}px` }}
          >
            <div className="celpip-word-popup__header">
              <div>
                <strong>{wordPopup.word}</strong>
                {wordPopup.detail?.phonetic && (
                  <div className="celpip-word-popup__phonetic">
                    {studyCopy.pronunciation}: {wordPopup.detail.phonetic}
                  </div>
                )}
              </div>
              <button type="button" className="celpip-word-popup__close" onClick={() => setWordPopup(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {wordPopup.loading ? (
              <div className="celpip-word-popup__loading">{studyCopy.wordLoading}</div>
            ) : wordPopup.error || !wordPopup.detail ? (
              <div className="celpip-word-popup__loading">{studyCopy.wordNotFound}</div>
            ) : (
              <div className="celpip-word-popup__content">
                <div className="celpip-word-popup__tools">
                  {!!wordPopup.detail.audioUrl && (
                    <button
                      type="button"
                      className="celpip-word-popup__audio"
                      onClick={() => playWordPronunciation(wordPopup.detail.audioUrl)}
                    >
                      <span className="material-symbols-outlined">volume_up</span>
                      English Audio
                    </button>
                  )}
                  {transcriptLang !== 'en' && wordPopup.translatedWord && (
                    <div className="celpip-word-popup__translated-word">
                      <span>{studyCopy.translatedWord}</span>
                      <strong>{wordPopup.translatedWord}</strong>
                    </div>
                  )}
                </div>

                {(wordPopup.detail.meanings || []).map((meaning, meaningIndex) => {
                  const translatedMeaning = wordPopup.translatedMeanings?.[meaningIndex]
                  return (
                    <div key={`${meaning.partOfSpeech}-${meaningIndex}`} className="celpip-word-popup__meaning">
                      <div className="celpip-word-popup__pos">{meaning.partOfSpeech}</div>
                      {(meaning.definitions || []).map((definition, definitionIndex) => (
                        <div key={`${meaning.partOfSpeech}-${definitionIndex}`} className="celpip-word-popup__definition">
                          <p>
                            {transcriptLang === 'en'
                              ? definition.definition
                              : translatedMeaning?.definitions?.[definitionIndex]?.definition || definition.definition}
                          </p>
                          {definition.example && (
                            <div className="celpip-word-popup__example">
                              <span>{studyCopy.example}:</span>
                              <em>
                                {transcriptLang === 'en'
                                  ? definition.example
                                  : translatedMeaning?.definitions?.[definitionIndex]?.example || definition.example}
                              </em>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {selectedHistoryLog && (
        <HistoryDetailModal
          log={selectedHistoryLog}
          test={test}
          section={section}
          pageCopy={pageCopy}
          pageLang={pageLang}
          onClose={() => setSelectedHistoryLog(null)}
        />
      )}
    </div>
  )
}

function HistoryDetailModal({ log, test, section, pageCopy, pageLang, onClose }) {
  const details = normalizeHistoryAnswerDetails(log, test, section.id)
  const correctItems = details.filter((item) => item.is_correct)
  const incorrectItems = details.filter((item) => !item.is_correct)
  const total = Number.isFinite(log.total_questions) && log.total_questions > 0
    ? log.total_questions
    : Array.isArray(test?.questions) ? test.questions.length : 0

  return (
    <div className="celpip-modal-overlay">
      <section className="celpip-tip-modal" role="dialog" aria-modal="true" aria-labelledby="celpip-history-title">
        <button className="celpip-modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="celpip-practice-modal__header">
          <span className="material-symbols-outlined">history</span>
          <div>
            <p>{pageCopy.historyDateLabel}: {formatDateTime(log.created_at, pageLang)}</p>
            <h2 id="celpip-history-title">{pageCopy.historyDetailTitle}</h2>
          </div>
        </div>

        <div className="celpip-tip-modal__body">
          <section className="celpip-part-profile celpip-part-profile--tip">
            <div className="celpip-part-profile__chips">
              <span>{pageCopy.historyScoreLabel}: {log.score}/{total || '-'}</span>
              <span>{pageCopy.historyTimeLabel}: {typeof log.time_spent_seconds === 'number' ? formatTimer(log.time_spent_seconds) : '-'}</span>
              <span>{pageCopy.historyCorrectLabel}: {correctItems.length}</span>
              <span>{pageCopy.historyIncorrectLabel}: {incorrectItems.length}</span>
            </div>
          </section>

          <div className="celpip-tip-modal__grid">
            <section className="celpip-tip-panel">
              <h3>{pageCopy.historyCorrectQuestions}</h3>
              {correctItems.length === 0 ? (
                <p className="celpip-history-panel__empty">-</p>
              ) : (
                <ul>
                  {correctItems.map((item) => (
                    <li key={`correct-${item.question_index}`}>
                      Q{item.question_index + 1}. {item.prompt}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="celpip-tip-panel">
              <h3>{pageCopy.historyIncorrectQuestions}</h3>
              {incorrectItems.length === 0 ? (
                <p className="celpip-history-panel__empty">-</p>
              ) : (
                <ul>
                  {incorrectItems.map((item) => (
                    <li key={`incorrect-${item.question_index}`}>
                      <strong>Q{item.question_index + 1}.</strong> {item.prompt}
                      <br />
                      <span>{pageCopy.historyIncorrectLabel}: {item.selected_option_text || '-'}</span>
                      <br />
                      <span>{pageCopy.historyCorrectLabel}: {item.correct_option_text || '-'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}

function TipModal({ test, section, onClose, pageLang }) {
  const [tipLang, setTipLang] = useState(pageLang || 'en')

  useEffect(() => {
    setTipLang(pageLang || 'en')
  }, [pageLang, test?.id, section?.id])

  if (!test || !section) return null

  const tipCopy = TIP_COPY[tipLang] || TIP_COPY.en
  const pageCopy = PAGE_COPY[tipLang] || PAGE_COPY.en
  const tipKey = `${section.id}:${test.type}`
  const tips = tipCopy.items[tipKey] || TIP_COPY.en.items[tipKey]
  const profile = getTypeProfile(section.id, test.type, tipLang)
  const sectionLabel = pageCopy.sectionLabels?.[section.id] || section.label
  const typeLabel = getOfficialTypeLabel(section.id, test.type)

  return (
    <div className="celpip-modal-overlay">
      <section className="celpip-tip-modal" role="dialog" aria-modal="true" aria-labelledby="celpip-tip-title">
        <button className="celpip-modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="celpip-practice-modal__header">
          <span className="material-symbols-outlined">tips_and_updates</span>
          <div>
            <p>{sectionLabel} · {typeLabel}</p>
            <h2 id="celpip-tip-title">{tipCopy.modalTitle}: {test.title}</h2>
          </div>
        </div>

        <div className="celpip-info-modal__lang-toggle">
          {INFO_LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`celpip-info-modal__lang-btn ${tipLang === item.code ? 'celpip-info-modal__lang-btn--active' : ''}`}
              onClick={() => setTipLang(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="celpip-tip-modal__body">
          {profile && (
            <section className="celpip-part-profile celpip-part-profile--tip">
              <div className="celpip-part-profile__chips">
                <span className={`celpip-difficulty celpip-difficulty--${profile.difficultyKey}`}>
                  {pageCopy.typeDifficultyLabel}: {pageCopy.difficulty[profile.difficultyKey]}
                </span>
                <span>{pageCopy.memoryLoadLabel}: {profile.memory}</span>
              </div>
              <div className="celpip-part-profile__grid">
                <div>
                  <strong>{pageCopy.memoFocusLabel}</strong>
                  <p>{profile.memoFocus}</p>
                </div>
                <div>
                  <strong>{pageCopy.challengeLabel}</strong>
                  <p>{profile.challenge}</p>
                </div>
              </div>
            </section>
          )}
          <div className="celpip-tip-modal__grid">
            <section className="celpip-tip-panel">
              <h3>{tipCopy.strategyTitle}</h3>
              <ul>
                {tips.strategy.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
            <section className="celpip-tip-panel">
              <h3>{tipCopy.highScoreTitle}</h3>
              <ul>
                {tips.highScore.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}

const SPEAKING_TEMPLATE_EXAMPLES = {
  'advice-friend': [
    'Your cousin is nervous about moving to a new city. Give advice about settling in.',
    'Your friend keeps missing sleep because of late-night studying. Give practical advice.',
    'Your sibling is worried about making friends at college. Suggest what they should do.',
    'A family member feels stressed about a job interview. Give advice to help them prepare.',
  ],
  'advice-work-school': [
    'A coworker is overwhelmed by a new project deadline. Give advice about managing the work.',
    'A classmate is struggling to participate in group discussions. Suggest a practical plan.',
    'A teammate often arrives late to meetings. Give polite advice about improving reliability.',
    'A student wants to improve presentation confidence. Explain what steps would help.',
  ],
  'experience-problem': [
    'Talk about a time when a plan changed suddenly and explain how you handled it.',
    'Describe an experience when you lost something important and what happened next.',
    'Talk about a time you solved a problem with very little time.',
    'Describe a day when transportation caused trouble and how you reacted.',
  ],
  'experience-person': [
    'Talk about a person who taught you an important lesson.',
    'Describe someone who helped you during a difficult moment.',
    'Talk about a person you admire and explain why.',
    'Describe a teacher, coworker, or relative who influenced your habits.',
  ],
  'scene-public': [
    'Describe a busy waiting area where people are trying to get information.',
    'Describe a park scene where families and workers are doing different activities.',
    'Describe a shopping area with people standing in line and checking signs.',
    'Describe a community event where several groups are interacting.',
  ],
  'scene-outdoor': [
    'Describe a street scene after heavy rain.',
    'Describe a campsite where people are preparing food and organizing equipment.',
    'Describe a beach or lakeside scene with different activities happening.',
    'Describe an outdoor market where vendors and customers are moving around.',
  ],
  'prediction-problem': [
    'A person is standing beside a broken bicycle on the sidewalk. Predict what will happen next.',
    'A customer is pointing at a damaged package while speaking to an employee. Predict the next step.',
    'A student is looking at a closed classroom door with a confused expression. Predict what may happen.',
    'A driver is checking a flat tire near a parking lot. Explain what will probably happen next.',
  ],
  'prediction-delay': [
    'People are waiting at a gate while a flight delay is announced. Predict what they will do next.',
    'A bus stop sign says service is temporarily suspended. Predict how commuters will respond.',
    'A meeting room is empty five minutes after the start time. Predict what the organizer may do.',
    'A restaurant line is moving very slowly. Predict what customers might decide.',
  ],
  'persuade-practical': [
    'Persuade a friend to choose the more reliable moving company instead of the cheaper one.',
    'Compare two study plans and persuade your classmate to choose the more realistic option.',
    'Persuade your roommate to buy the safer used car instead of the stylish one.',
    'Compare two apartment choices and persuade someone to choose the one closer to transit.',
  ],
  'persuade-lifestyle': [
    'Persuade a friend to join a weekend fitness class instead of watching videos alone.',
    'Compare eating out and cooking at home, then persuade someone to cook more often.',
    'Persuade a family member to take a short vacation instead of working all weekend.',
    'Compare two hobbies and persuade someone to choose the one that is easier to maintain.',
  ],
  'difficult-conflict': [
    'Tell a neighbor politely that their music is too loud late at night.',
    'Explain to a coworker that their repeated delays are affecting the team.',
    'Speak to a roommate about shared chores that have not been completed.',
    'Tell a friend that you cannot lend them money again and suggest another solution.',
  ],
  'difficult-complaint': [
    'Call a service office because your appointment was canceled without notice.',
    'Speak to a store manager about an item that broke the day after purchase.',
    'Explain to a landlord that a repair has still not been completed.',
    'Report that a delivery arrived late and some items were missing.',
  ],
  'opinion-agree': [
    'Do you agree that students should learn financial skills in school?',
    'Do you think public transit should be cheaper than parking downtown?',
    'Do you agree that people should spend less time on social media?',
    'Do you think working from home is better for productivity?',
  ],
  'opinion-balanced': [
    'Some people prefer living downtown, while others prefer quiet suburbs. Give your view.',
    'Some people like strict schedules, while others prefer flexibility. Explain your opinion.',
    'Some people think children need more homework, while others disagree. Give your view.',
    'Some people prefer online classes, while others learn better in person. Explain your opinion.',
  ],
  'unusual-lost-found': [
    'Explain that you found a wallet in a public place and need to report it.',
    'Describe losing your phone in a taxi and ask for help finding it.',
    'Explain that an item delivered to your home belongs to someone else.',
    'Describe finding a pet near your building and what action you want to take.',
  ],
  'unusual-emergency': [
    'Explain that water is leaking in your apartment and you need urgent help.',
    'Describe a sudden power outage during an online exam and ask what to do.',
    'Explain that your car is blocking an entrance because it will not start.',
    'Describe a medical appointment you cannot attend because of an unexpected emergency.',
  ],
}

function getSpeakingTemplateExamples(templateId) {
  return SPEAKING_TEMPLATE_EXAMPLES[templateId] || [
    'Use this template for prompts that ask you to organize a clear situation, reason, and next step.',
    'Use it when the prompt requires a practical answer rather than a simple description.',
    'Use it when you can replace the blanks with people, problems, reasons, and actions from the prompt.',
  ]
}

function parseTemplate(templateText) {
  if (!templateText) return ''
  const regex = /(\[[^\]]+\])/g
  const parts = templateText.split(regex)
  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      const blankContent = part.slice(1, -1)
      return (
        <span key={index} className="celpip-template-blank-inline">
          {blankContent}
        </span>
      )
    }
    return part
  })
}

function TemplateModal({ test, section, pageLang, onClose }) {
  const [templateLang, setTemplateLang] = useState(pageLang || 'en')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const templates = getTemplates(section?.id, test?.type)
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0]?.id || '')

  useEffect(() => {
    setTemplateLang(pageLang || 'en')
  }, [pageLang, test?.id])

  useEffect(() => {
    setActiveTemplateId(templates[0]?.id || '')
  }, [section?.id, test?.type])

  if (!test || !section || templates.length === 0) return null

  const pageCopy = PAGE_COPY[templateLang] || PAGE_COPY.en
  const sectionLabel = pageCopy.sectionLabels?.[section.id] || section.label
  const modalTitle = section.id === 'speaking' ? pageCopy.speakingTemplateModalTitle : pageCopy.templateModalTitle
  const typeLabel = getOfficialTypeLabel(section.id, test.type)
  const activeTemplate = templates.find((template) => template.id === activeTemplateId) || templates[0]
  const flow = getTemplateCopy(activeTemplate, 'flow', templateLang) || activeTemplate.flow
  const tips = getTemplateCopy(activeTemplate, 'tips', templateLang) || activeTemplate.tips
  const templateLabel = getTemplateCopy(activeTemplate, 'label', templateLang)
  const templateExamples = section.id === 'speaking' ? getSpeakingTemplateExamples(activeTemplate.id) : []

  return (
    <div className={`celpip-modal-overlay ${isFullscreen ? 'celpip-modal-overlay--fullscreen' : ''}`}>
      <section
        className={`celpip-tip-modal celpip-template-modal ${isFullscreen ? 'celpip-template-modal--fullscreen' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celpip-template-title"
      >
        <div className="celpip-modal-actions">
          <button
            type="button"
            className="celpip-modal-action-btn"
            onClick={() => setIsFullscreen((value) => !value)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <span className="material-symbols-outlined">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
          </button>
          <button type="button" className="celpip-modal-action-btn" onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="celpip-practice-modal__header">
          <span className="material-symbols-outlined">edit_note</span>
          <div>
            <p>{sectionLabel} · {typeLabel}</p>
            <h2 id="celpip-template-title">{modalTitle}: {templateLabel}</h2>
          </div>
        </div>

        <div className="celpip-info-modal__lang-toggle">
          {INFO_LANGS.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`celpip-info-modal__lang-btn ${templateLang === item.code ? 'celpip-info-modal__lang-btn--active' : ''}`}
              onClick={() => setTemplateLang(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="celpip-tip-modal__body celpip-template-modal__body">
          <section className="celpip-template-use">
            <strong>{pageCopy.templateUseTitle}</strong>
            <p>{pageCopy.templateUseBody}</p>
          </section>

          <div className="celpip-template-tabs" role="tablist" aria-label={modalTitle}>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`celpip-template-tab ${activeTemplate.id === template.id ? 'celpip-template-tab--active' : ''}`}
                onClick={() => setActiveTemplateId(template.id)}
              >
                {getTemplateCopy(template, 'label', templateLang)}
              </button>
            ))}
          </div>

          <div className="celpip-template-layout">
            <section className="celpip-tip-panel celpip-template-main">
              <h3>{pageCopy.templateTextTitle}</h3>
              <pre>{parseTemplate(activeTemplate.template)}</pre>
            </section>

            <aside className="celpip-template-side">
              <section className="celpip-tip-panel">
                <h3>{pageCopy.templateFlowTitle}</h3>
                <div className="celpip-template-flow">
                  {flow.map((step, index) => (
                    <div className="celpip-template-flow__item" key={`${activeTemplate.id}-flow-${step}`}>
                      <span>{index + 1}</span>
                      <strong>{step}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="celpip-tip-panel">
                <h3>{pageCopy.templateBlankTitle}</h3>
                <div className="celpip-template-blanks">
                  {activeTemplate.blanks.map((blank) => (
                    <span key={`${activeTemplate.id}-blank-${blank}`}>{blank}</span>
                  ))}
                </div>
              </section>

              <section className="celpip-tip-panel">
                <h3>{pageCopy.templateTipTitle}</h3>
                <ul>
                  {tips.map((tip) => (
                    <li key={`${activeTemplate.id}-tip-${tip}`}>{tip}</li>
                  ))}
                </ul>
              </section>

              {section.id === 'speaking' && (
                <section className="celpip-tip-panel celpip-template-examples">
                  <h3>{pageCopy.templateExamplesTitle}</h3>
                  <p>{pageCopy.templateExamplesNote}</p>
                  <ul>
                    {templateExamples.map((example) => (
                      <li key={`${activeTemplate.id}-example-${example}`}>{example}</li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionSummary({ section, tests, isActive, onClick }) {
  return (
    <button
      className={`celpip-section-tab ${isActive ? 'celpip-section-tab--active' : ''}`}
      style={{ '--section-color': section.color }}
      onClick={onClick}
    >
      <span className="material-symbols-outlined">{section.icon}</span>
      <span>
        <strong>{section.label}</strong>
        <small>{tests.length} mock sets · {section.time}</small>
      </span>
    </button>
  )
}

function MockCard({ test, section, onOpen, onTips, pageCopy, pageLang, mockTypeCount }) {
  const tipCopy = TIP_COPY[pageLang]
  const examCount = EXAM_QUESTION_COUNTS[section.id]?.[test.type]
  const difficultyOrder = ['easy', 'medium', 'hard']
  const numericId = Number(test.id.match(/\d+/)?.[0] || 1)
  const profile = getTypeProfile(section.id, test.type, pageLang)
  const difficulty = profile?.difficultyKey || difficultyOrder[(numericId - 1) % difficultyOrder.length]

  return (
    <article className="celpip-mock-card">
      <div className="celpip-mock-card__top">
        <span className="celpip-badge" style={{ '--badge-color': section.color }}>{test.type}</span>
        <span className={`celpip-difficulty celpip-difficulty--${difficulty}`}>
          {pageCopy.difficulty[difficulty]}
        </span>
        {examCount && <span>{pageCopy.examCountPrefix}: {getExamCountLabel(section.id, examCount, pageLang)}</span>}
      </div>
      <h3>{test.title}</h3>
      <p>{pageCopy.testFocus[test.id] || test.focus}</p>
      <div className="celpip-card-actions">
        <button className="celpip-tip-btn" onClick={onTips} title={tipCopy.tipsButton} aria-label={tipCopy.tipsButton}>
          <span className="material-symbols-outlined">tips_and_updates</span>
          <span className="celpip-tip-btn__tooltip">{tipCopy.tipsButton}</span>
        </button>
        <button className="celpip-open-btn" onClick={onOpen}>
          <span className="material-symbols-outlined">quiz</span>
          {pageCopy.openMock} ({mockTypeCount})
        </button>
      </div>
    </article>
  )
}

function TypeCard({ group, section, onOpen, onTips, onTemplates, pageCopy, pageLang, canStartDrill }) {
  const tipCopy = TIP_COPY[pageLang]
  const firstTest = group.tests[0]
  const typeLabel = getOfficialTypeLabel(section.id, group.type)
  const profile = getTypeProfile(section.id, group.type, pageLang)
  const difficulty = profile?.difficultyKey || TYPE_DIFFICULTY[section.id]?.[group.type] || 'medium'
  const memoryLevel = getMemoryLevelKey(profile?.memory)
  const focus = pageCopy.testFocus[firstTest?.id] || firstTest?.focus || section.goal
  const hasTemplates = (section.id === 'writing' || section.id === 'speaking') && typeof onTemplates === 'function'
  const timingChips = getTypeTimingChips({ ...firstTest, type: group.type }, section, pageCopy, pageLang)

  return (
    <article className="celpip-mock-card celpip-type-card">
      <div className="celpip-mock-card__top">
        <span className="celpip-badge" style={{ '--badge-color': section.color }}>{typeLabel}</span>
      </div>
      {timingChips.length > 0 && (
        <div className="celpip-speaking-time-chips">
          {timingChips.map((chip) => (
            <span key={`${group.type}-${chip.label}`}>
              <strong>{chip.label}</strong> {chip.value}
            </span>
          ))}
        </div>
      )}
      <p>{focus}</p>
      <div className="celpip-type-card__meta">
        <span className={`celpip-level-pill celpip-level-pill--${difficulty}`}>
          <span className="material-symbols-outlined">bar_chart</span>
          <strong>{pageCopy.typeDifficultyLabel}</strong>
          <em>{pageCopy.intuitiveDifficulty?.[difficulty] || pageCopy.difficulty[difficulty]}</em>
        </span>
        {profile && (
          <span className={`celpip-level-pill celpip-level-pill--${memoryLevel}`}>
            <span className="material-symbols-outlined">psychology</span>
            <strong>{pageCopy.memoryLoadLabel}</strong>
            <em>{pageCopy.intuitiveMemory?.[memoryLevel] || profile.memory}</em>
          </span>
        )}
      </div>
      <div className={`celpip-card-actions ${hasTemplates ? 'celpip-card-actions--three' : ''}`}>
        <button className="celpip-tip-btn" onClick={onTips} title={tipCopy.tipsButton} aria-label={tipCopy.tipsButton}>
          <span className="material-symbols-outlined">tips_and_updates</span>
          <span className="celpip-tip-btn__tooltip">{tipCopy.tipsButton}</span>
        </button>
        {hasTemplates && (
          <button className="celpip-template-btn" onClick={onTemplates} title={pageCopy.templateButton} aria-label={pageCopy.templateButton}>
            <span className="material-symbols-outlined">edit_note</span>
            <span className="celpip-tip-btn__tooltip">{pageCopy.templateButton}</span>
          </button>
        )}
        <button className="celpip-open-btn" onClick={onOpen} disabled={!canStartDrill} title={!canStartDrill ? pageCopy.drillAccessNote : undefined}>
          <span className="material-symbols-outlined">quiz</span>
          {(canStartDrill ? pageCopy.openDrill : pageCopy.drillLockedLabel)} ({group.tests.length})
        </button>
      </div>
      {!canStartDrill && (
        <div className="celpip-access-note">
          {pageCopy.drillAccessNote}
        </div>
      )}
    </article>
  )
}

export function CelpipPrepView() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.tokens?.access_token)
  const isAuthHydrating = useAuthStore((state) => state._rehydrationValidating)
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (typeof window === 'undefined') return 'listening'
    const shouldForceListening = window.sessionStorage.getItem(CELPIP_FORCE_LISTENING_STORAGE_KEY) === '1'
    if (shouldForceListening) {
      window.sessionStorage.removeItem(CELPIP_FORCE_LISTENING_STORAGE_KEY)
      return 'listening'
    }
    const savedSection = window.localStorage.getItem(CELPIP_ACTIVE_SECTION_STORAGE_KEY)
    return CELPIP_SECTIONS.some((section) => section.id === savedSection) ? savedSection : 'listening'
  })
  const [pageLang, setPageLang] = useState(() => getPreferredPracticeLang())
  const [showInfo, setShowInfo] = useState(false)
  const [selectedDrill, setSelectedDrill] = useState(null)
  const [selectedTipTest, setSelectedTipTest] = useState(null)
  const [selectedTemplateTest, setSelectedTemplateTest] = useState(null)
  const [testLogs, setTestLogs] = useState([])

  const fetchLogs = () => {
    getCelpipTestLogs().then(setTestLogs).catch(console.error)
  }

  const activeSection = useMemo(
    () => CELPIP_SECTIONS.find((section) => section.id === activeSectionId) || CELPIP_SECTIONS[0],
    [activeSectionId],
  )

  const activeTests = CELPIP_MOCK_TESTS[activeSection.id] || []
  const pageCopy = PAGE_COPY[pageLang]
  const typeGroups = sortTypeGroups(activeSection.id, activeTests.reduce((groups, test) => {
    const existingGroup = groups.find((group) => group.type === test.type)
    if (existingGroup) {
      existingGroup.tests.push(test)
    } else {
      groups.push({ type: test.type, tests: [test] })
    }
    return groups
  }, []))
  const canStartDrill = Boolean(isAdmin || (isAuthenticated && user?.is_approved))

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CELPIP_ACTIVE_SECTION_STORAGE_KEY, activeSectionId)
  }, [activeSectionId])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleExamPrepNav = (event) => {
      if (event?.detail?.target === 'celpip') {
        setActiveSectionId('listening')
      }
    }

    window.addEventListener('unilingo:exam-prep-nav', handleExamPrepNav)
    return () => window.removeEventListener('unilingo:exam-prep-nav', handleExamPrepNav)
  }, [])

  useEffect(() => {
    if (isAuthHydrating) return
    if (!canStartDrill || !accessToken) {
      setTestLogs([])
      return
    }
    fetchLogs()
  }, [accessToken, canStartDrill, isAuthHydrating])

  return (
    <PageLayout
      title="CELPIP General Prep"
      className="celpip-page"
    >
      <button className="celpip-help-btn" onClick={() => setShowInfo(true)} title="What is CELPIP?">
        <span className="material-symbols-outlined">help</span>
      </button>

      {showInfo && (
        <CelpipInfoModal isOpen={true} onClose={() => setShowInfo(false)} />
      )}
      <CelpipDrillModal
        drill={selectedDrill}
        section={activeSection}
        pageCopy={pageCopy}
        pageLang={pageLang}
        testLogs={testLogs}
        onClose={Object.assign(() => setSelectedDrill(null), { onLogSubmitted: fetchLogs })}
      />
      <TipModal
        test={selectedTipTest}
        section={activeSection}
        pageLang={pageLang}
        onClose={() => setSelectedTipTest(null)}
      />
      <TemplateModal
        test={selectedTemplateTest}
        section={activeSection}
        pageLang={pageLang}
        onClose={() => setSelectedTemplateTest(null)}
      />

      <div className="celpip-page-toolbar">
        {INFO_LANGS.map((item) => (
          <button
            key={item.code}
            className={`celpip-page-toolbar__btn ${pageLang === item.code ? 'celpip-page-toolbar__btn--active' : ''}`}
            onClick={() => setPageLang(item.code)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="celpip-section-tabs">
        {CELPIP_SECTIONS.map((section) => (
          <SectionSummary
            key={section.id}
            section={section}
            tests={CELPIP_MOCK_TESTS[section.id] || []}
            isActive={section.id === activeSection.id}
            onClick={() => setActiveSectionId(section.id)}
          />
        ))}
      </div>

      <PageBox noPadding>
        <div className="celpip-content">
          <header className="celpip-content__header" style={{ '--section-color': activeSection.color }}>
            <div className="celpip-content__title">
              <span className="material-symbols-outlined">{activeSection.icon}</span>
              <div>
                <h2>{pageCopy.sectionLabels[activeSection.id]}</h2>
                <p>{typeGroups.length} {pageCopy.typesLabel} · {activeTests.length} {pageCopy.mockSets}</p>
              </div>
            </div>
          </header>

          <div className={`celpip-mock-grid ${activeSection.id === 'writing' ? 'celpip-mock-grid--writing' : ''}`}>
            {typeGroups.map((group) => (
              <TypeCard
                key={group.type}
                group={group}
                section={activeSection}
                pageCopy={pageCopy}
                pageLang={pageLang}
                canStartDrill={canStartDrill}
                onTips={() => setSelectedTipTest({ ...group.tests[0], title: getOfficialTypeLabel(activeSection.id, group.type) })}
                onTemplates={(activeSection.id === 'writing' || activeSection.id === 'speaking') ? () => setSelectedTemplateTest({ ...group.tests[0], title: getOfficialTypeLabel(activeSection.id, group.type) }) : undefined}
                onOpen={() => setSelectedDrill({ ...group, tests: shuffleTests(group.tests) })}
              />
            ))}
          </div>
        </div>
      </PageBox>

      <footer className="celpip-sources">
        <div className="celpip-sources__links">
          <span>{pageCopy.officialReferences}</span>
          {OFFICIAL_LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
          ))}
        </div>
        <p className="celpip-copyright-note">
          CELPIP is a trademark of Prometric/Paragon Testing Enterprises. Official test materials remain the property of their respective owners. Unauthorized reproduction or redistribution is prohibited.
        </p>
      </footer>
    </PageLayout>
  )
}

export default CelpipPrepView
