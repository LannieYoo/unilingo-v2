import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'modules', 'pte', '_01_data');
const OUTPUT = path.join(DATA_DIR, 'describe_image_questions.json');
const PAGE_SIZE = 50;
const CATEGORY_ID = 4;
const LIMIT_ARG = process.argv[2] || 'all';
const LIMIT = LIMIT_ARG === 'all' ? Infinity : Number(LIMIT_ARG || 1000);

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
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function getDifficultyLabel(value) {
  if (value === 0) return 'Easy';
  if (value === 1) return 'Medium';
  if (value === 2) return 'Hard';
  return '';
}

function detectVisualCategory(title = '', answer = '') {
  const text = `${title} ${answer}`.toLowerCase();
  if (/(chart|graph|table|bar|line|pie|data|percentage|figure|trend)/.test(text)) return 'chart';
  if (/(map|floor plan|plan|layout|route|location|area)/.test(text)) return 'map';
  if (/(process|cycle|stage|steps|diagram|flow)/.test(text)) return 'process';
  return 'scene';
}

function detectChartType(title = '', answer = '') {
  const text = `${title} ${answer}`.toLowerCase();
  if (/(bar chart|column chart|\bbars?\b)/.test(text)) return 'bar';
  if (/(line graph|line chart|trend over time)/.test(text)) return 'line';
  if (/(pie chart|percentage share|distribution)/.test(text)) return 'pie';
  if (/(table|tabular)/.test(text)) return 'table';
  return '';
}

function detectTemplateHintId(visualCategory, chartType) {
  if (visualCategory === 'process') return 'di-process';
  if (visualCategory === 'map') return 'di-map';
  if (visualCategory === 'scene') return 'di-photo';
  if (chartType === 'bar') return 'di-bar-chart';
  if (chartType === 'line') return 'di-line-chart';
  if (chartType === 'pie') return 'di-pie-chart';
  return 'di-graph-core';
}

async function fetchQuestionList() {
  const questions = [];
  let page = 1;

  while (questions.length < LIMIT) {
    const url = `https://api.onepte.com/api/question-bank/public/v1/questions/?category=${CATEGORY_ID}&page=${page}&page_size=${PAGE_SIZE}`;
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

async function main() {
  const list = await fetchQuestionList();
  const output = [];

  for (const item of list) {
    const detail = await fetchDetail(item.id);
    const answer = normalizeText(
      detail.answer_details?.find((entry) => entry.label === 'Answer')?.text
      || detail.answer_details?.find((entry) => entry.label === 'Sample Answer')?.text
      || ''
    );
    const title = normalizeText(detail.title || item.title || `Describe Image ${item.id}`);
    const media = detail.media || null;
    const imageUrl = media?.type === 'image' ? media.url : '';

    if (!imageUrl) continue;

    const difficulty = typeof detail.difficulty === 'number' ? detail.difficulty : item.difficulty;
    const visualCategory = detectVisualCategory(title, answer);
    const chartType = visualCategory === 'chart' ? detectChartType(title, answer) : '';

    output.push({
      id: output.length + 1,
      onePteId: item.id,
      title: `Describe Image Real Question ${output.length + 1}`,
      promptTitle: title,
      source: `https://onepte.com/academic/pte-practice-test/speaking/describe-image/question/${item.id}`,
      difficulty,
      difficultyLabel: getDifficultyLabel(difficulty),
      imageUrl,
      answer,
      visualCategory,
      chartType,
      templateHintId: detectTemplateHintId(visualCategory, chartType),
      preparationTime: Number(detail.preparation_time) || 25,
      answerTime: Number(detail.answer_time) || 40,
    });
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`DI: wrote ${output.length} real questions to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
