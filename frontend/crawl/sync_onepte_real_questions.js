import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'modules', 'pte', '_01_data');
const PAGE_SIZE = 50;
const LIMIT_ARG = process.argv[2] || 'all';
const LIMIT = LIMIT_ARG === 'all' ? Infinity : Number(LIMIT_ARG || 1000);
const TASK_FILTER = (process.argv[3] || '').toLowerCase();

const TASKS = [
  {
    key: 'ra',
    categoryId: 2,
    output: path.join(DATA_DIR, 'read_aloud_questions.json'),
    titlePrefix: 'Read Aloud Real Question',
    sourceBase: 'https://onepte.com/academic/pte-practice-test/speaking/read-aloud/question/',
    extractText(detail) {
      return detail.passage || detail.text || detail.answer_details?.find((entry) => entry.label === 'Transcript')?.text || '';
    },
  },
  {
    key: 'rs',
    categoryId: 3,
    output: path.join(DATA_DIR, 'repeat_sentence_questions.json'),
    titlePrefix: 'Repeat Sentence Real Question',
    sourceBase: 'https://onepte.com/academic/pte-practice-test/speaking/repeat-sentence/question/',
    extractText(detail) {
      return detail.media?.transcript
        || detail.answer_details?.find((entry) => entry.label === 'Transcript')?.text
        || detail.options?.find((entry) => entry.is_correct)?.text
        || detail.text
        || '';
    },
  },
  {
    key: 'swt',
    categoryId: 27,
    output: path.join(DATA_DIR, 'summarize_written_text_questions.json'),
    titlePrefix: 'Summarize Written Text Real Question',
    sourceBase: 'https://onepte.com/core/pte-practice-test/writing/summarize-written-text/question/',
    extractText(detail) {
      return detail.passage || detail.text || '';
    },
    buildExtra(detail, item) {
      const passage = normalizeText(detail.passage || detail.text || '');
      const answer =
        normalizeText(detail.options?.find((entry) => entry.is_correct)?.text)
        || normalizeText(detail.options?.[0]?.text)
        || normalizeText(detail.answer_details?.find((entry) => /answer|sample/i.test(entry.label || ''))?.text)
        || '';

      return {
        onePteId: item.id,
        promptTitle: normalizeText(detail.title || item.title || `Passage ${item.id}`),
        text: passage,
        answer,
        sourceLabel: 'OnePTE',
        preparationTime: 0,
        answerTime: Number(detail.answer_time) || 600,
        minWords: 25,
        maxWords: 50,
        maxSentences: 2,
        templateHintId: 'swt-one-sentence',
      };
    },
  },
  {
    key: 'asq',
    categoryId: 6,
    output: path.join(DATA_DIR, 'answer_short_question_questions.json'),
    titlePrefix: 'Answer Short Question Real Question',
    sourceBase: 'https://onepte.com/core/pte-practice-test/speaking/answer-short-question/question/',
    extractText(detail) {
      return detail.media?.transcript
        || detail.answer_details?.find((entry) => /transcript|question|prompt/i.test(entry.label || ''))?.text
        || detail.text
        || '';
    },
    buildExtra(detail, item) {
      const promptText = normalizeText(
        detail.media?.transcript
        || detail.answer_details?.find((entry) => /transcript|question|prompt/i.test(entry.label || ''))?.text
        || detail.text
        || '',
      );

      const acceptedAnswers = [
        ...new Set(
          (Array.isArray(detail.options) ? detail.options : [])
            .map((entry) => normalizeText(entry?.text || ''))
            .filter(Boolean),
        ),
      ];

      const primaryAnswer =
        normalizeText(detail.options?.find((entry) => entry.is_correct)?.text)
        || acceptedAnswers[0]
        || normalizeText(detail.answer_details?.find((entry) => /answer/i.test(entry.label || ''))?.text)
        || '';

      return {
        onePteId: item.id,
        promptTitle: normalizeText(detail.title || item.title || `Question ${item.id}`),
        text: promptText,
        answer: primaryAnswer,
        acceptedAnswers: acceptedAnswers.length ? acceptedAnswers : [primaryAnswer].filter(Boolean),
        sourceLabel: 'OnePTE',
        preparationTime: 0,
        answerTime: Number(detail.answer_time) || 10,
      };
    },
  },
  {
    key: 'we',
    categoryId: 26,
    output: path.join(DATA_DIR, 'write_email_questions.json'),
    titlePrefix: 'Write Email Real Question',
    sourceBase: 'https://onepte.com/core/pte-practice-test/writing/write-email/question/',
    extractText(detail) {
      return detail.text || detail.passage || '';
    },
    buildExtra(detail, item) {
      const promptText = normalizeText(detail.text || detail.passage || '');
      const answer =
        normalizeText(detail.options?.find((entry) => entry.is_correct)?.text)
        || normalizeText(detail.options?.[0]?.text)
        || normalizeText(detail.answer_details?.find((entry) => /answer|sample/i.test(entry.label || ''))?.text)
        || '';
      const bulletPoints = extractBulletPoints(promptText);

      return {
        onePteId: item.id,
        promptTitle: normalizeText(detail.title || item.title || `Email ${item.id}`),
        text: promptText,
        answer,
        bulletPoints,
        sourceLabel: 'OnePTE',
        preparationTime: 0,
        answerTime: Number(detail.answer_time) || 540,
        minWords: 80,
        maxWords: 120,
        templateHintId: detectWeTemplateId(`${promptText} ${answer}`),
      };
    },
  },
  {
    key: 'rts',
    categoryId: 25,
    output: path.join(DATA_DIR, 'respond_situation_questions.json'),
    titlePrefix: 'Respond to a Situation Real Question',
    sourceBase: 'https://onepte.com/core/pte-practice-test/speaking/respond-to-a-situation/question/',
    extractText(detail) {
      return detail.passage
        || detail.media?.transcript
        || detail.text
        || detail.answer_details?.find((entry) => /transcript|prompt|question/i.test(entry.label || ''))?.text
        || '';
    },
    buildExtra(detail, item) {
      const promptText = normalizeText(
        detail.passage
        || detail.media?.transcript
        || detail.text
        || '',
      );
      const answer =
        normalizeText(detail.options?.find((entry) => entry.is_correct)?.text)
        || normalizeText(detail.options?.[0]?.text)
        || normalizeText(detail.answer_details?.find((entry) => /answer|sample/i.test(entry.label || ''))?.text)
        || '';

      return {
        onePteId: item.id,
        promptTitle: normalizeText(detail.title || item.title || `Situation ${item.id}`),
        text: promptText,
        answer,
        sourceLabel: 'OnePTE',
        preparationTime: Number(detail.preparation_time) || 20,
        answerTime: Number(detail.answer_time) || 40,
        templateHintId: detectRtsTemplateId(`${promptText} ${answer}`),
      };
    },
  },
];

function detectRtsTemplateId(text = '') {
  const lower = text.toLowerCase();
  if (/(meeting|appointment|schedule|reschedule|time|available|availability|shift|interview|booking|reservation)/.test(lower)) {
    return 'rts-availability';
  }
  if (/(problem|issue|complaint|delay|broken|error|mistake|refund|wrong|missing|late|cancel|apolog)/.test(lower)) {
    return 'rts-problem-solution';
  }
  return 'rts-core-polite';
}

function detectWeTemplateId(text = '') {
  const lower = text.toLowerCase();
  if (/(delay|late|mistake|apolog|sorry|issue|problem|complaint|refund)/.test(lower)) {
    return 'we-apology-follow-up';
  }
  if (/(request|arrange|confirm|availability|schedule|demonstrate|meeting|appointment)/.test(lower)) {
    return 'we-request-action';
  }
  return 'we-formal-core';
}

function extractBulletPoints(text = '') {
  const source = String(text || '');

  const lineMatches = [...source.matchAll(/(?:^|\n)\s*[-•]\s*(.+?)(?=\n|$)/g)]
    .map((match) => normalizeText(match[1] || ''))
    .filter(Boolean);

  if (lineMatches.length) return lineMatches;

  const themeAnchor = source.match(/(?:the following(?:\s+\w+)?\s+(?:themes?|points?|ideas?|aspects?)|focus on the following|based on the following)([\s\S]*)/i);
  const candidate = themeAnchor ? themeAnchor[1] : source;
  const stopAt = candidate.split(/(?:You should include|Provide supporting|Include all|Include both)/i)[0];
  const inlineMatches = [...stopAt.matchAll(/(?:^|\s)-\s*(.+?)(?=\s+-\s+[A-Z0-9]|\s*$)/g)]
    .map((match) => normalizeText(match[1] || ''))
    .filter(Boolean)
    .filter((part) => part.length <= 180);

  return [...new Set(inlineMatches)].slice(0, 6);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(getJson(new URL(res.headers.location, url).toString()));
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${url}: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

function normalizeText(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function getDifficultyLabel(value) {
  if (value === 0) return 'Easy';
  if (value === 1) return 'Medium';
  if (value === 2) return 'Hard';
  return '';
}

async function fetchQuestionList(categoryId) {
  const questions = [];
  let page = 1;

  while (questions.length < LIMIT) {
    const url = `https://api.onepte.com/api/question-bank/public/v1/questions/?category=${categoryId}&page=${page}&page_size=${PAGE_SIZE}`;
    const payload = await getJson(url);
    const results = Array.isArray(payload.results) ? payload.results : [];
    if (results.length === 0) break;

    questions.push(...results);

    if (!payload.next) break;
    page += 1;
  }

  return questions.slice(0, LIMIT);
}

async function fetchDetail(id) {
  return getJson(`https://api.onepte.com/api/question-bank/public/v3/questions/${id}/details/`);
}

async function syncTask(task) {
  const list = await fetchQuestionList(task.categoryId);
  const out = [];

  for (const item of list) {
    const detail = await fetchDetail(item.id);
    const text = normalizeText(task.extractText(detail));
    if (!text) continue;

    const difficulty = typeof detail.difficulty === 'number' ? detail.difficulty : item.difficulty;
    const difficultyLabel = getDifficultyLabel(difficulty);

    const baseQuestion = {
      id: out.length + 1,
      title: `${task.titlePrefix} ${out.length + 1}`,
      text,
      source: `${task.sourceBase}${item.id}`,
      difficulty,
      difficultyLabel,
      audioUrl: detail.media?.tracks?.[0]?.url || '',
    };

    out.push({
      ...baseQuestion,
      ...(typeof task.buildExtra === 'function' ? task.buildExtra(detail, item) : {}),
    });
  }

  fs.writeFileSync(task.output, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`${task.key.toUpperCase()}: wrote ${out.length} real questions to ${task.output}`);
}

async function main() {
  const selectedTasks = TASK_FILTER ? TASKS.filter((task) => task.key === TASK_FILTER) : TASKS;
  for (const task of selectedTasks) {
    await syncTask(task);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
