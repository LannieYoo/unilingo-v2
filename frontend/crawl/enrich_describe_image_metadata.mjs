import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'modules', 'pte', '_01_data');

const targets = [
  path.join(DATA_DIR, 'describe_image_questions.json'),
  path.join(DATA_DIR, 'similar_describe_image_questions.json'),
];

function detectVisualCategory(question = {}) {
  if (question.visualCategory) return question.visualCategory;
  const text = `${question.promptTitle || ''} ${question.answer || ''}`.toLowerCase();
  if (/(chart|graph|table|bar|line|pie|data|percentage|figure|trend)/.test(text)) return 'chart';
  if (/(map|floor plan|plan|layout|route|location|area)/.test(text)) return 'map';
  if (/(process|cycle|stage|steps|diagram|flow)/.test(text)) return 'process';
  return 'scene';
}

function detectChartType(question = {}) {
  if (question.chartType) return question.chartType;
  const renderType = question?.render?.chartType;
  if (renderType) return renderType;
  const text = `${question.promptTitle || ''} ${question.answer || ''}`.toLowerCase();
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

for (const target of targets) {
  const json = JSON.parse(fs.readFileSync(target, 'utf8'));
  const updated = json.map((question) => {
    const visualCategory = detectVisualCategory(question);
    const chartType = visualCategory === 'chart' ? detectChartType(question) : (question.chartType || '');
    return {
      ...question,
      visualCategory,
      ...(chartType ? { chartType } : {}),
      templateHintId: detectTemplateHintId(visualCategory, chartType),
    };
  });

  fs.writeFileSync(target, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`Updated ${path.basename(target)} (${updated.length} questions)`);
}
