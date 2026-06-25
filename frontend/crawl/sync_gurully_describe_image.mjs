import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'modules', 'pte', '_01_data')
const OUTPUT = path.join(DATA_DIR, 'describe_image_questions.json')
const BLOG_HTML = path.join(__dirname, 'tmp_gurully_di_blog.html')
const BLOG_URL = 'https://www.gurully.com/blog/pte-describe-image/'

function normalizeText(text = '') {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/\n{2,}/g, '\n\n')
    .trim()
}

function toTitleCase(text = '') {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function stripPromoText(text = '') {
  return normalizeText(
    text
      .replace(/Get precise scores that match real exam standards/gi, ' ')
      .replace(/Improve faster with targeted, AI-driven feedback/gi, ' ')
      .replace(/Eliminate guesswork with detailed performance analysis/gi, ' ')
      .replace(/Check your Preparation Level Now!?/gi, ' ')
  )
}

function detectVisualCategory(title = '', answer = '') {
  const text = `${title} ${answer}`.toLowerCase()
  if (/(map|floor plan|plan|layout|route|location|area|globe|continents)/.test(text)) return 'map'
  if (/(process|cycle|stage|steps|flow|convert|transforms? .* into)/.test(text)) return 'process'
  if (/(photo|picture|scene|people|person|object|indoor|outdoor|portrait)/.test(text)) return 'scene'
  if (/(chart|graph|table|bar|line|pie|data|percentage|figure|trend|distribution)/.test(text)) return 'chart'
  return 'scene'
}

function detectChartType(title = '', answer = '') {
  const text = `${title} ${answer}`.toLowerCase()
  if (/(bar graph|bar chart|column chart|\bbars?\b)/.test(text)) return 'bar'
  if (/(line graph|line chart|trend over time|increases over time|decreases over time)/.test(text)) return 'line'
  if (/(pie chart|percentage share|composition|distribution)/.test(text)) return 'pie'
  if (/(table|tabular)/.test(text)) return 'table'
  return ''
}

function detectTemplateHintId(visualCategory, chartType) {
  if (visualCategory === 'process') return 'di-process'
  if (visualCategory === 'map') return 'di-map'
  if (visualCategory === 'scene') return 'di-photo'
  if (chartType === 'bar') return 'di-bar-chart'
  if (chartType === 'line') return 'di-line-chart'
  if (chartType === 'pie') return 'di-pie-chart'
  return 'di-graph-core'
}

function inferPromptTitle(answer = '', fallback = '') {
  const firstSentence = normalizeText(answer.split(/[.?!]/)[0] || '')
  let topic = firstSentence
    .replace(/^(?:the|this)\s+(?:provided|given)?\s*(?:image|picture|graph|bar graph|bar chart|line graph|line chart|pie chart|map|diagram|process|chart)\s+(?:illustrates|shows|compares|represents|presents|depicts|displays|gives information about|offers a glimpse of|offers insights into|provides information about|provides insights into|provides details about)\s+/i, '')
    .replace(/^information about\s+/i, '')
    .replace(/^details regarding\s+/i, '')
    .replace(/^data regarding\s+/i, '')
    .replace(/^the\s+/i, '')
    .trim()

  if (!topic || topic.length < 4) {
    topic = fallback || 'Describe Image'
  }

  topic = topic
    .replace(/\s+/g, ' ')
    .replace(/[,;:]\s*$/, '')
    .trim()

  if (topic.length > 72) {
    topic = topic.slice(0, 72).replace(/\s+\S*$/, '').trim()
  }

  return toTitleCase(topic)
}

function extractBlogPosting(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of matches) {
    const raw = match[1].trim()
    try {
      const parsed = JSON.parse(raw)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      const blogPosting = items.find((item) => item?.['@type'] === 'BlogPosting' && typeof item?.articleBody === 'string')
      if (blogPosting) return blogPosting
    } catch {
      // ignore malformed blocks
    }
  }
  return null
}

function extractExamples(articleBody = '') {
  const cleanBody = articleBody.replace(/\u00a0/g, ' ').replace(/&nbsp;/gi, ' ')
  const regex = /Example\s+(\d+)\s+Sample Answer\s+([\s\S]*?)(?=\s+Example\s+\d+\s+Sample Answer|\s+Frequently Asked Questions|\s*$)/gi
  const output = []
  for (const match of cleanBody.matchAll(regex)) {
    const number = Number(match[1])
    const answer = stripPromoText(match[2])
    if (!number || !answer) continue
    output.push({ number, answer })
  }
  return output
}

function extractExampleImageUrls(blogPosting) {
  const rawImages = Array.isArray(blogPosting?.image) ? blogPosting.image : []
  const urls = rawImages
    .map((entry) => (typeof entry === 'string' ? entry : entry?.url))
    .filter(Boolean)

  return urls.filter((url) => !/PTE-Describe-Image-Template|Untitled-design/i.test(url))
}

function buildGurullyQuestions(existingQuestions, examples, imageUrls) {
  const baseQuestions = existingQuestions.filter((question) => !(question?.source || '').includes('gurully.com/blog/pte-describe-image'))
  const mapped = []

  for (let i = 0; i < examples.length; i += 1) {
    const example = examples[i]
    const imageUrl = imageUrls[i]
    if (!imageUrl) continue

    const promptTitle = inferPromptTitle(example.answer, `Gurully Example ${example.number}`)
    const visualCategory = detectVisualCategory(promptTitle, example.answer)
    const chartType = visualCategory === 'chart' ? detectChartType(promptTitle, example.answer) : ''

    mapped.push({
      id: 0,
      title: '',
      promptTitle,
      source: BLOG_URL,
      sourceLabel: `Gurully · Example ${example.number}`,
      answer: example.answer,
      imageUrl,
      visualCategory,
      ...(chartType ? { chartType } : {}),
      templateHintId: detectTemplateHintId(visualCategory, chartType),
      preparationTime: 25,
      answerTime: 40,
    })
  }

  const combined = [...baseQuestions, ...mapped].map((question, index) => ({
    ...question,
    id: index + 1,
    title: `Describe Image Real Question ${index + 1}`,
  }))

  return combined
}

function main() {
  const html = fs.readFileSync(BLOG_HTML, 'utf8')
  const blogPosting = extractBlogPosting(html)
  if (!blogPosting) {
    throw new Error('Could not find Gurully BlogPosting JSON-LD with articleBody.')
  }

  const examples = extractExamples(blogPosting.articleBody)
  const imageUrls = extractExampleImageUrls(blogPosting)

  if (!examples.length) {
    throw new Error('No Gurully DI examples were parsed from articleBody.')
  }

  if (imageUrls.length < examples.length) {
    console.warn(`[Gurully DI] Parsed ${examples.length} answers but only ${imageUrls.length} example images.`)
  }

  const existingQuestions = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'))
  const merged = buildGurullyQuestions(existingQuestions, examples, imageUrls)

  fs.writeFileSync(OUTPUT, JSON.stringify(merged, null, 2) + '\n', 'utf8')
  console.log(`DI: merged ${Math.min(examples.length, imageUrls.length)} Gurully public examples into ${path.basename(OUTPUT)} (${merged.length} total)`)
}

main()
