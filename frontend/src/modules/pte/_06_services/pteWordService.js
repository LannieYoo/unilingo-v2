/**
 * PTE Word Service
 * Fetches word details (IPA, meaning, audio) from Google Dictionary API
 * and saves words to user's dictionary with PTE source tag.
 */

import { translateText } from '../../dictionary/_06_services/service'

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch word detail from Google Free Dictionary API
 * Returns: { word, phonetic, phonetics: [{text, audio}], meanings: [{partOfSpeech, definitions}] }
 * Supports compound/hyphenated words by trying parts if full word fails.
 */
export async function fetchWordDetail(word) {
  try {
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    if (!cleanWord) return null

    // Try the full word first
    let result = await _fetchSingleWord(cleanWord)
    if (result) return result

    // If the browser cannot reach the public dictionary directly, use the
    // application's server-side dictionary proxy/cache before saying a word is
    // unavailable.  This also avoids a misleading "not found" for valid words.
    result = await _fetchBackendWord(cleanWord)
    if (result) return result

    // For hyphenated/compound words, try each part (longest first)
    if (cleanWord.includes('-')) {
      const parts = cleanWord.split('-').filter(p => p.length > 2)
      // Sort by length descending to try the most meaningful part first
      parts.sort((a, b) => b.length - a.length)
      for (const part of parts) {
        result = await _fetchSingleWord(part)
        if (result) {
          // Mark that we looked up a partial match
          result.originalWord = cleanWord
          result.partialMatch = true
          return result
        }
      }
    }

    return null
  } catch (err) {
    console.error('[PTE Word Service] Error fetching word:', err)
    return null
  }
}

async function _fetchSingleWord(word) {
  try {
    const response = await fetchWithTimeout(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      {},
      8000
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const entry = data[0]
    
    // Extract best phonetic with audio
    let bestPhonetic = entry.phonetic || ''
    let audioUrl = ''
    
    if (entry.phonetics && entry.phonetics.length > 0) {
      // Prefer US English pronunciation
      const usPhonetic = entry.phonetics.find(p => p.audio?.includes('-us'))
      const anyAudio = entry.phonetics.find(p => p.audio)
      const anyText = entry.phonetics.find(p => p.text)
      
      if (usPhonetic) {
        bestPhonetic = usPhonetic.text || bestPhonetic
        audioUrl = usPhonetic.audio || ''
      } else if (anyAudio) {
        bestPhonetic = anyAudio.text || bestPhonetic
        audioUrl = anyAudio.audio || ''
      } else if (anyText) {
        bestPhonetic = anyText.text || bestPhonetic
      }
    }

    // Extract meanings (first 2 parts of speech, first 2 definitions each)
    const meanings = (entry.meanings || []).slice(0, 2).map(m => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions || []).slice(0, 2).map(d => ({
        definition: d.definition,
        example: d.example || null,
      })),
    }))

    return {
      word: entry.word,
      phonetic: bestPhonetic,
      audioUrl,
      meanings,
      sourceUrl: entry.sourceUrls?.[0] || null,
    }
  } catch {
    return null
  }
}

async function _fetchBackendWord(word) {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/dictionary/search?word=${encodeURIComponent(word)}&target_lang=en`,
      {},
      5000
    )
    if (!response.ok) return null

    const data = await response.json()
    const meanings = (data.meanings || [])
      .map((meaning) => ({
        partOfSpeech: meaning.part_of_speech || meaning.partOfSpeech || 'definition',
        definitions: (meaning.definitions || [])
          .map((definition) => ({
            definition: definition.definition,
            example: definition.examples?.[0] || definition.example || null,
          }))
          .filter((definition) => definition.definition),
      }))
      .filter((meaning) => meaning.definitions.length > 0)

    if (meanings.length === 0) return null

    return {
      word: data.term || word,
      phonetic: data.pronunciation?.ipa || data.pronunciation?.phonetic || '',
      audioUrl: data.pronunciation?.audio_url || data.pronunciation?.audioUrl || '',
      meanings,
      sourceUrl: null,
    }
  } catch {
    return null
  }
}

/**
 * Translate a word using Google Translate free API.
 * @param {string} word - The word to translate
 * @param {string} targetLang - Target language code: 'ko' (Korean) or 'zh-CN' (Chinese)
 * @returns {Promise<string|null>} Translated text or null
 */
export async function translateWord(word, targetLang) {
  const normalizedTarget = targetLang.startsWith('zh') ? 'zh' : targetLang
  try {
    // Prefer the app backend: it can use configured providers and works when
    // direct third-party calls are blocked by the browser or a corporate proxy.
    const backendResponse = await fetchWithTimeout(
      `${API_BASE_URL}/api/translate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word, source_lang: 'en', target_lang: normalizedTarget }),
      },
      5000
    )
    if (backendResponse.ok) {
      const backendData = await backendResponse.json()
      const translation = backendData.translated_text?.trim()
      if (translation && translation.toLowerCase() !== word.trim().toLowerCase()) return translation
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${normalizedTarget}&dt=t&q=${encodeURIComponent(word)}`
    const response = await fetchWithTimeout(url, {}, 5000)
    if (response.ok) {
      const data = await response.json()
      const translation = data?.[0]
        ?.map((segment) => segment?.[0])
        .filter((segment) => typeof segment === 'string')
        .join('')
        .trim()
      if (translation && translation.toLowerCase() !== word.trim().toLowerCase()) return translation
    }

    // Google Translate may be blocked on some networks.  Reuse the existing
    // translator's MyMemory/proxy fallbacks so KO and ZH controls still work.
    return await translateText(word, 'en', normalizedTarget)
  } catch (err) {
    console.warn('[PTE Word Service] Direct translation failed; trying fallbacks:', err)
    return await translateText(word, 'en', normalizedTarget)
  }
}

/**
 * Save a word to user's dictionary with PTE source tag.
 * Requires authentication.
 */
export async function saveWordToPTE(word, definition, phonetic, accessToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/dictionary-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        search_word: word,
        source_lang: 'en',
        target_lang: 'en',
        search_source: 'pte',
        result_summary: definition,
        search_results: {
          phonetic,
          definition,
          source: 'pte_read_aloud',
        },
      }),
    })

    if (!response.ok) {
      console.error('[PTE Word Service] Save failed:', response.status)
      return null
    }

    const data = await response.json()
    return data.log
  } catch (err) {
    console.error('[PTE Word Service] Save error:', err)
    return null
  }
}

/**
 * Toggle favorite on a saved dictionary log
 */
export async function toggleWordFavorite(logId, accessToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/dictionary-logs/${logId}/favorite`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.log
  } catch (err) {
    console.error('[PTE Word Service] Toggle favorite error:', err)
    return null
  }
}
