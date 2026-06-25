import { useEffect, useMemo, useRef, useState } from 'react'
import { PageLayout, PageBox } from '../../../components/layout/PageLayout'
import { CELPIP_MOCK_TESTS, CELPIP_SECTIONS } from '../_01_data/celpipMockTests'
import { EXAM_QUESTION_COUNTS, TYPE_DIFFICULTY } from './_08_constants/celpipExamConfig'
import { getSpeechText } from './_07_utils/speechUtils'
import { saveCelpipTestLog, getCelpipTestLogs } from './_06_services/celpipApi'
import '../_10_styles/celpip.css'

const OFFICIAL_LINKS = [
  { label: 'CELPIP General', href: 'https://www.celpip.ca/celpip-general/' },
  { label: 'CELPIP Test Format', href: 'https://www.celpip.ca/take-celpip/test-format/' },
  { label: 'Free Sample Test', href: 'https://secure.paragontesting.ca/InstructionalProducts/FreeOnlineSampleTest/FOST' },
  { label: 'IRCC PGWP Eligibility', href: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html' },
  { label: 'CELPIP Score Descriptors', href: 'https://www.celpip.ca/prepare-for-celpip/score-comparison-chart/' },
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
    speakingNotesTitle: 'Speaking Notes',
    showAnswers: 'Show Answers',
    hideAnswers: 'Hide Answers',
    modelAnswerTitle: 'Answer',
    strategyLabel: 'Strategy',
    questionDifficultyLabel: 'Difficulty',
    typeDifficultyLabel: 'Type level',
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
    speakingNotesTitle: '말하기 노트',
    showAnswers: '정답 보기',
    hideAnswers: '정답 숨기기',
    modelAnswerTitle: '정답',
    strategyLabel: '풀이 전략',
    questionDifficultyLabel: '난이도',
    typeDifficultyLabel: '유형 난이도',
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
    speakingNotesTitle: '口语笔记',
    showAnswers: '显示答案',
    hideAnswers: '隐藏答案',
    modelAnswerTitle: '答案',
    strategyLabel: '解题策略',
    questionDifficultyLabel: '难度',
    typeDifficultyLabel: '题型难度',
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

const QUESTION_DIFFICULTY_ORDER = ['easy', 'medium', 'hard']

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
  return 90
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
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

// Listening plays as segments. Problem Solving has explicit segments; other
// types are a single segment covering the whole transcript.
function getListeningSegments(test, sectionId) {
  if (sectionId !== 'listening' || !test) return []
  if (Array.isArray(test.segments) && test.segments.length) return test.segments
  if (test.transcript) return [{ text: test.transcript, q: test.questions?.length || 0 }]
  return []
}

const DRILL_LABELS = {
  en: { nextQuestion: 'Next question', submit: 'Submit & see results', question: 'Question', part: 'Part', score: 'Score' },
  ko: { nextQuestion: '다음 문제', submit: '제출하고 결과 보기', question: '문항', part: '구간', score: '점수' },
  zh: { nextQuestion: '下一题', submit: '提交并查看结果', question: '第', part: '段落', score: '得分' },
}

function CelpipDrillModal({ drill, section, onClose, pageCopy, pageLang, testLogs = [] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [segIndex, setSegIndex] = useState(0) // which audio segment is currently playing
  const [qCursor, setQCursor] = useState(0) // how many questions have we advanced past
  const [draft, setDraft] = useState('')
  const [selectedChoices, setSelectedChoices] = useState({})
  const [showTranscript, setShowTranscript] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [listeningPhase, setListeningPhase] = useState('answer')
  const [speed, setSpeed] = useState(1)
  const [repeatAudio, setRepeatAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerDone, setTimerDone] = useState(false)
  const repeatRef = useRef(false)
  const audioTimersRef = useRef([])
  const tests = drill?.tests || []
  const test = tests[activeIndex]

  const isWriting = section?.id === 'writing'
  const isSpeaking = section?.id === 'speaking'
  const isListening = section?.id === 'listening'
  const isListeningReview = isListening && listeningPhase === 'review'
  const isListeningAudio = isListening && listeningPhase === 'audio'
  const listeningSegments = getListeningSegments(test, section?.id)
  const totalQuestions = Array.isArray(test?.questions) ? test.questions.length : 0
  const segStartIndex = (idx) => listeningSegments.slice(0, idx).reduce((sum, segment) => sum + segment.q, 0)
  const labels = DRILL_LABELS[pageLang] || DRILL_LABELS.en

  useEffect(() => {
    repeatRef.current = repeatAudio
  }, [repeatAudio])

  useEffect(() => {
    setActiveIndex(0)
  }, [drill?.type])

  // Reset per-test state and start the first audio segment (listening) when the test changes.
  useEffect(() => {
    setDraft('')
    setSelectedChoices({})
    setShowTranscript(false)
    setShowAnswers(false)
    setTimerDone(false)
    setSegIndex(0)
    setQCursor(0)
    setIsPlaying(false)
    setIsPaused(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    const segments = getListeningSegments(test, section?.id)
    if (isListening && segments.length) {
      setTimeLeft(PER_QUESTION_SECONDS)
      setListeningPhase('audio')
      isSubmittedRef.current = false
      const didStart = playAudio(segments[0].text, false, () => setListeningPhase('answer'))
      if (!didStart) setListeningPhase('answer')
    } else {
      setListeningPhase('answer')
      isSubmittedRef.current = false
      setTimeLeft(getPracticeSeconds(test, section?.id))
    }
    return undefined
  }, [test?.id, activeIndex, section?.id])

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
    if (!test || isListening || timerDone) return undefined
    if (timeLeft <= 0) {
      setTimerDone(true)
      return undefined
    }
    const timerId = window.setTimeout(() => setTimeLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timerId)
  }, [test?.id, timeLeft, timerDone, isListening])

  useEffect(() => () => {
    audioTimersRef.current.forEach((id) => {
      window.clearInterval(id)
      window.clearTimeout(id)
    })
    audioTimersRef.current = []
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  if (!test || !section) return null

  const timerIsDone = isListening ? isListeningReview : timerDone
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0
  const isLastQuestion = qCursor >= totalQuestions - 1
  const score = isListening
    ? (test.questions || []).reduce((sum, _question, index) => {
      const correct = getChoiceOptions(test, section.id, index).find((option) => option.isCorrect)
      return sum + (selectedChoices[index] === correct?.id ? 1 : 0)
    }, 0)
    : 0

  useEffect(() => {
    if (isListening && isListeningReview && !isSubmittedRef.current && test?.id) {
      isSubmittedRef.current = true;
      saveCelpipTestLog(test.id, score, selectedChoices)
        .then(() => {
          if (typeof onClose === 'function' && onClose.onLogSubmitted) {
            onClose.onLogSubmitted() // HACK: We'll pass onLogSubmitted via drill modal props
          }
        })
        .catch(console.error);
    }
  }, [isListening, isListeningReview, score, selectedChoices, test?.id, onClose])

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
    setDraft('')
    setSelectedChoices({})
    setShowTranscript(false)
    setShowAnswers(false)
    setTimerDone(false)
    setSegIndex(0)
    setQCursor(0)
    setIsPlaying(false)
    setIsPaused(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    const segments = getListeningSegments(test, section?.id)
    if (isListening && segments.length) {
      setTimeLeft(PER_QUESTION_SECONDS)
      setListeningPhase('audio')
      isSubmittedRef.current = false
      const didStart = playAudio(segments[0].text, false, () => setListeningPhase('answer'))
      if (!didStart) setListeningPhase('answer')
    } else {
      setListeningPhase('answer')
      isSubmittedRef.current = false
      setTimeLeft(getPracticeSeconds(test, section?.id))
    }
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
            <p>{section.label} · {test.type}</p>
            <div className="celpip-practice-title-row">
              <h2 id="celpip-practice-title">{test.title}</h2>
              <span className="celpip-title-chip">{getDrillMetaLabel(test)}</span>
              {test.source && (
                <span className="celpip-title-chip" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                  출처: {test.source}
                </span>
              )}
              {(() => {
                const logsForTest = testLogs.filter(log => log.test_id === test.id)
                if (logsForTest.length > 0) {
                  const lastLog = logsForTest[logsForTest.length - 1]
                  return (
                    <span className="celpip-title-chip celpip-title-chip--success" style={{ marginLeft: '8px', background: '#e6f4ea', color: '#137333' }}>
                      {pageLang === 'ko' ? `풀이 횟수: ${logsForTest.length}회 (최고 점수: ${Math.max(...logsForTest.map(l => l.score))})` : `Attempts: ${logsForTest.length} (Best: ${Math.max(...logsForTest.map(l => l.score))})`}
                    </span>
                  )
                }
                return null
              })()}
              <span className={`celpip-title-timer ${timerIsDone ? 'celpip-title-timer--done' : ''} ${isListeningAudio ? 'celpip-title-timer--audio' : ''}`}>
                {isListeningReview ? `${score} / ${totalQuestions}` : isListeningAudio ? 'Audio' : formatTimer(timeLeft)}
              </span>
            </div>
          </div>
        </div>

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

        <div className="celpip-practice-modal__body">
          {isListening && test.transcript && (
            <section className="celpip-listening-panel">
              {isListeningReview ? (
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
                  <p>{test.transcript}</p>
                </div>
              )}
            </section>
          )}

          {test.passage && (
            <section className="celpip-prompt-panel">
              <h3>{pageCopy.passageTitle}</h3>
              <p>{test.passage}</p>
            </section>
          )}

          {test.prompt && (
            <section className="celpip-prompt-panel">
              <h3>{pageCopy.promptTitle}</h3>
              <p>{test.prompt}</p>
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

          {/* Reading: all questions at once with an answer toggle. */}
          {!isListening && Array.isArray(test.questions) && (
            <section className="celpip-question-list">
              <h3>{pageCopy.questionsTitle}</h3>
              {getDisplayQuestions(test).map((question, index) => renderQuestionItem(question, index, showAnswers))}
              <button className="celpip-answer-toggle" onClick={() => setShowAnswers((value) => !value)}>
                <span className="material-symbols-outlined">{showAnswers ? 'visibility_off' : 'task_alt'}</span>
                {showAnswers ? pageCopy.hideAnswers : pageCopy.showAnswers}
              </button>
            </section>
          )}

          {(isWriting || isSpeaking) && (
            <section className="celpip-answer-panel">
              <div className="celpip-answer-panel__top">
                <h3>{isSpeaking ? pageCopy.speakingNotesTitle : pageCopy.responseTitle}</h3>
                <span>{wordCount} words</span>
              </div>
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
                  <p>{getModelAnswer(test, section.id, 0, pageLang)}</p>
                  <div className="celpip-answer-strategy">
                    <span className="material-symbols-outlined">tips_and_updates</span>
                    <span><strong>{pageCopy.strategyLabel}:</strong> {getQuestionStrategy(section.id, test.type, 0, pageLang)}</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </div>
  )
}

function TipModal({ test, section, onClose, pageLang }) {
  if (!test || !section) return null

  const tipCopy = TIP_COPY[pageLang]
  const tipKey = `${section.id}:${test.type}`
  const tips = tipCopy.items[tipKey] || TIP_COPY.en.items[tipKey]

  return (
    <div className="celpip-modal-overlay">
      <section className="celpip-tip-modal" role="dialog" aria-modal="true" aria-labelledby="celpip-tip-title">
        <button className="celpip-modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="celpip-practice-modal__header">
          <span className="material-symbols-outlined">tips_and_updates</span>
          <div>
            <p>{section.label} · {test.type}</p>
            <h2 id="celpip-tip-title">{tipCopy.modalTitle}: {test.title}</h2>
          </div>
        </div>

        <div className="celpip-tip-modal__body">
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
  const difficulty = difficultyOrder[(numericId - 1) % difficultyOrder.length]

  return (
    <article className="celpip-mock-card">
      <div className="celpip-mock-card__top">
        <span className="celpip-badge" style={{ '--badge-color': section.color }}>{test.type}</span>
        <span className={`celpip-difficulty celpip-difficulty--${difficulty}`}>
          {pageCopy.difficulty[difficulty]}
        </span>
        {examCount && <span>{pageCopy.examCountPrefix}: {examCount}Q</span>}
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

function TypeCard({ group, section, onOpen, onTips, pageCopy, pageLang }) {
  const tipCopy = TIP_COPY[pageLang]
  const firstTest = group.tests[0]
  const examCount = EXAM_QUESTION_COUNTS[section.id]?.[group.type]
  const difficulty = TYPE_DIFFICULTY[section.id]?.[group.type] || 'medium'
  const focus = pageCopy.testFocus[firstTest?.id] || firstTest?.focus || section.goal

  return (
    <article className="celpip-mock-card celpip-type-card">
      <div className="celpip-mock-card__top">
        <span className="celpip-badge" style={{ '--badge-color': section.color }}>{group.type}</span>
        {examCount && <span>{pageCopy.examCountPrefix}: {examCount}Q</span>}
      </div>
      <p>{focus}</p>
      <div className="celpip-type-card__meta">
        <span className={`celpip-difficulty celpip-difficulty--${difficulty}`}>
          {pageCopy.typeDifficultyLabel}: {pageCopy.difficulty[difficulty]}
        </span>
      </div>
      <div className="celpip-card-actions">
        <button className="celpip-tip-btn" onClick={onTips} title={tipCopy.tipsButton} aria-label={tipCopy.tipsButton}>
          <span className="material-symbols-outlined">tips_and_updates</span>
          <span className="celpip-tip-btn__tooltip">{tipCopy.tipsButton}</span>
        </button>
        <button className="celpip-open-btn" onClick={onOpen}>
          <span className="material-symbols-outlined">quiz</span>
          {pageCopy.openDrill} ({group.tests.length})
        </button>
      </div>
    </article>
  )
}

export function CelpipPrepView() {
  const [activeSectionId, setActiveSectionId] = useState('listening')
  const [pageLang, setPageLang] = useState('en')
  const [showInfo, setShowInfo] = useState(false)
  const [selectedDrill, setSelectedDrill] = useState(null)
  const [selectedTipTest, setSelectedTipTest] = useState(null)
  const [testLogs, setTestLogs] = useState([])

  const fetchLogs = () => {
    getCelpipTestLogs().then(setTestLogs).catch(console.error)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const activeSection = useMemo(
    () => CELPIP_SECTIONS.find((section) => section.id === activeSectionId) || CELPIP_SECTIONS[0],
    [activeSectionId],
  )

  const activeTests = CELPIP_MOCK_TESTS[activeSection.id] || []
  const pageCopy = PAGE_COPY[pageLang]
  const typeGroups = activeTests.reduce((groups, test) => {
    const existingGroup = groups.find((group) => group.type === test.type)
    if (existingGroup) {
      existingGroup.tests.push(test)
    } else {
      groups.push({ type: test.type, tests: [test] })
    }
    return groups
  }, [])

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

          <div className="celpip-mock-grid">
            {typeGroups.map((group) => (
              <TypeCard
                key={group.type}
                group={group}
                section={activeSection}
                pageCopy={pageCopy}
                pageLang={pageLang}
                onTips={() => setSelectedTipTest({ ...group.tests[0], title: group.type })}
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
