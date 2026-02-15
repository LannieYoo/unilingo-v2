# WordNet Migration Guide

## Overview

Migrated dictionary service from Free Dictionary API to WordNet for better quality definitions and more comprehensive coverage.

## Changes Made

### Backend

1. **Added WordNet Service** (`backend/src/common/modules/wordnet/service.py`)
   - `search_word()`: Search words in WordNet
   - `get_synonyms()`: Get word synonyms
   - `get_antonyms()`: Get word antonyms
   - Automatic WordNet data download on first use

2. **Updated Dictionary Service** (`backend/src/common/modules/dictionary/service.py`)
   - Integrated WordNet for definitions
   - Added `_translate_wordnet_meanings()` method
   - Keep Free Dictionary API for pronunciation only
   - Added synonyms and antonyms to response

3. **Updated Requirements** (`backend/requirements.txt`)
   - Added `nltk==3.9.1`

### Installation Steps

1. Install nltk package:
   ```bash
   cd backend
   pip install nltk==3.9.1
   ```

2. Download WordNet data (automatic on first use, or run manually):
   ```bash
   python install_nltk.py
   ```

3. Restart backend server:
   ```bash
   python app.py
   ```

### Features

- **Better Definitions**: WordNet provides academic-quality definitions
- **More Coverage**: Comprehensive English vocabulary database
- **Synonyms & Antonyms**: Automatically extracted from WordNet
- **Translation**: Still uses DeepL → LibreTranslate → Google Translate fallback
- **Pronunciation**: Still uses Free Dictionary API for IPA and audio

### Response Structure

```json
{
  "term": "example",
  "lang": "en",
  "simple_translation": "예시",
  "pronunciation": {
    "ipa": "/ɪɡˈzæmpəl/",
    "phonetic": "/ɪɡˈzæmpəl/",
    "audio_url": "https://..."
  },
  "meanings": [
    {
      "part_of_speech": "noun",
      "definitions": [
        {
          "definition": "a representative form or pattern",
          "translation": "대표적인 형태나 패턴",
          "examples": ["I followed his example"],
          "synonyms": ["instance", "case", "illustration"]
        }
      ]
    }
  ],
  "synonyms": ["instance", "case", "illustration", "sample"],
  "antonyms": [],
  "source": "wordnet"
}
```

### Frontend

No changes needed - frontend already handles the response structure correctly.

## Testing

Test with various words:
- Simple words: "run", "book", "happy"
- Complex words: "serendipity", "ephemeral", "ubiquitous"
- Multiple meanings: "bank", "light", "run"

## Rollback

If needed to rollback to Free Dictionary API:
1. Revert changes in `backend/src/common/modules/dictionary/service.py`
2. Remove WordNet import
3. Change `source` back to `'free_dictionary_api'`

## Notes

- WordNet is an academic lexical database (Princeton University)
- Covers general English vocabulary well
- May have less coverage for very new slang or technical jargon
- Definitions are more formal/academic than Free Dictionary API
- First run will download ~10MB of WordNet data
