/**
 * AI Web Worker
 * 
 * Runs Transformers.js model inference off the main thread.
 * Models are downloaded from HuggingFace CDN on first use and cached by the browser.
 * 
 * Supported tasks:
 *   - grammar: T5 grammar correction (English)
 *   - similar: MiniLM sentence embeddings for semantic similarity
 *   - fillmask: DistilBERT fill-mask word suggestions
 */

import { pipeline, env } from '@huggingface/transformers'

// Disable local model check (use HF CDN)
env.allowLocalModels = false

const pipelines = {}
const modelProgress = {}

/**
 * Get or initialize a pipeline, reporting download progress.
 */
async function getPipeline(task, model, options = {}) {
  const key = `${task}:${model}`
  if (pipelines[key]) return pipelines[key]

  self.postMessage({ type: 'model-loading', task, model, progress: 0 })

  pipelines[key] = await pipeline(task, model, {
    ...options,
    progress_callback: (data) => {
      if (data.status === 'progress') {
        const progress = Math.round(data.progress || 0)
        modelProgress[key] = progress
        self.postMessage({ type: 'model-progress', task, model, progress })
      } else if (data.status === 'ready') {
        self.postMessage({ type: 'model-ready', task, model, progress: 100 })
      }
    }
  })

  self.postMessage({ type: 'model-ready', task, model, progress: 100 })
  return pipelines[key]
}

// --- Task handlers ---

async function handleGrammar(text) {
  const generator = await getPipeline(
    'text2text-generation',
    'Xenova/t5-base-grammar-correction'
  )
  const result = await generator(`grammar: ${text}`, {
    max_new_tokens: 128,
  })
  return result[0]?.generated_text || text
}

async function handleSimilar(word, candidates) {
  const embedder = await getPipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { pooling: 'mean', normalize: true }
  )

  // Get embeddings for the word and all candidates
  const wordEmbedding = await embedder(word, { pooling: 'mean', normalize: true })
  const wordVec = Array.from(wordEmbedding.data)

  const results = []
  for (const candidate of candidates) {
    const candEmbedding = await embedder(candidate, { pooling: 'mean', normalize: true })
    const candVec = Array.from(candEmbedding.data)
    const similarity = cosineSimilarity(wordVec, candVec)
    results.push({ word: candidate, similarity })
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .filter(r => r.similarity > 0.3)
    .slice(0, 8)
}

async function handleFillMask(text) {
  const filler = await getPipeline(
    'fill-mask',
    'Xenova/distilbert-base-uncased'
  )
  const results = await filler(text, { topk: 5 })
  return results.map(r => ({
    word: r.token_str,
    score: r.score,
    sequence: r.sequence,
  }))
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// --- Message handler ---

self.onmessage = async (e) => {
  const { id, action, payload } = e.data

  try {
    let result
    switch (action) {
      case 'grammar':
        result = await handleGrammar(payload.text)
        break
      case 'similar':
        result = await handleSimilar(payload.word, payload.candidates)
        break
      case 'fillmask':
        result = await handleFillMask(payload.text)
        break
      case 'preload':
        // Preload a specific model
        if (payload.task === 'grammar') {
          await getPipeline('text2text-generation', 'Xenova/t5-base-grammar-correction')
        } else if (payload.task === 'similar') {
          await getPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { pooling: 'mean', normalize: true })
        } else if (payload.task === 'fillmask') {
          await getPipeline('fill-mask', 'Xenova/distilbert-base-uncased')
        }
        result = { loaded: true }
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    self.postMessage({ type: 'result', id, result })
  } catch (error) {
    self.postMessage({ type: 'error', id, error: error.message })
  }
}
