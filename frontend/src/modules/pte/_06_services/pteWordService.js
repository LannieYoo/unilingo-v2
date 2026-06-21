/**
 * PTE Word Service
 * Fetches word details (IPA, meaning, audio) from Google Dictionary API
 * and saves words to user's dictionary with PTE source tag.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

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
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(8000) }
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

/**
 * Translate a word using Google Translate free API.
 * @param {string} word - The word to translate
 * @param {string} targetLang - Target language code: 'ko' (Korean) or 'zh-CN' (Chinese)
 * @returns {Promise<string|null>} Translated text or null
 */
export async function translateWord(word, targetLang) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return data?.[0]?.[0]?.[0] || null
  } catch (err) {
    console.error('[PTE Word Service] Translation error:', err)
    return null
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
