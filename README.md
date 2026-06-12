# UniLingo v2 — Multilingual Translation & Speech Platform

A browser-based multilingual platform with **local WASM speech recognition**, real-time translation, dictionary, and text-to-speech. Fully responsive — works on desktop and mobile browsers.

## Key Features

### 🎤 Speech-to-Text (WASM SenseVoice)
- **Local processing** — no audio leaves the browser (privacy-first)
- **sherpa-onnx WASM** with SenseVoice model for Korean, English, Chinese, Japanese, Cantonese
- **VAD (Voice Activity Detection)** with Silero VAD for accurate sentence segmentation
- Auto-fallback to Web Speech API if WASM is unavailable
- Real-time Korean post-processing (spacing fix, non-Hangul filter)

### 🌐 Translation
- **DeepL API** (primary, highest quality) via backend proxy
- **Google Translate** fallback (client-side, no API key needed)
- Real-time auto-translation with 500ms debounce
- Translation history with favorite bookmarks
- Glossary-based term protection during translation

### 📖 Dictionary
- Multi-language dictionary: Korean ↔ English, Korean ↔ Chinese, English ↔ Chinese
- Autocomplete suggestions
- Search history tracking

### 🔊 Text-to-Speech
- Browser-native TTS with 15+ languages
- Speed control (0.5x–2.5x)
- Multi-accent support (US, UK, India, Australia English)

### 🖼️ OCR (Image Translation)
- **Tesseract.js** for on-device text extraction from images
- Supports Korean, English, Chinese, Japanese
- Extracted text flows directly into translation

### 👤 User Management
- Google OAuth 2.0 authentication
- JWT session with single-session enforcement
- Usage tracking per user (character limits)
- Admin panel with user management, logs, health check

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│                                                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │ React 18 │  │ WASM STT  │  │ Tesseract.js OCR │ │
│  │ + Vite   │  │ SenseVoice│  │ (on-device)      │ │
│  │ + Zustand│  │ + VAD     │  └──────────────────┘ │
│  └────┬─────┘  └───────────┘                        │
│       │                                             │
│       │  /api/*                                     │
└───────┼─────────────────────────────────────────────┘
        │
┌───────▼─────────────────────────────────────────────┐
│                  Backend (FastAPI)                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ DeepL    │  │ Auth     │  │ Dictionary        │ │
│  │ Translate│  │ (Google  │  │ (WordNet + Naver)  │ │
│  │ API      │  │  OAuth)  │  └───────────────────┘ │
│  └──────────┘  └──────────┘                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Supabase (PostgreSQL)                        │   │
│  │ Users, Logs, History, Errors                 │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | UI framework & build |
| **State** | Zustand | Global state management |
| **Styling** | Tailwind CSS | Responsive design |
| **STT** | sherpa-onnx WASM (SenseVoice) | Local speech recognition |
| **VAD** | Silero VAD (WASM) | Voice activity detection |
| **OCR** | Tesseract.js | On-device image text extraction |
| **Translation** | DeepL Free API + Google Translate | Multi-engine translation |
| **TTS** | Web Speech API | Browser-native text-to-speech |
| **Backend** | FastAPI (Python) | REST API server |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **Auth** | Google OAuth 2.0 + JWT | Authentication |

## STT Engine Details

The app uses **sherpa-onnx WASM** with the **SenseVoice Small** model for speech recognition:

| Component | File | Size |
|-----------|------|------|
| WASM binary | `sherpa-onnx-wasm-main-vad-asr.wasm` | ~11 MB |
| Model bundle | `sherpa-onnx-wasm-main-vad-asr.data` | ~241 MB |
| WASM glue | `sherpa-onnx-wasm-main-vad-asr.js` | ~95 KB |
| ASR JS wrapper | `sherpa-onnx-asr.js` | ~31 KB |
| VAD JS wrapper | `sherpa-onnx-vad.js` | ~6 KB |

**How it works:**
1. Browser captures microphone audio via Web Audio API (16kHz mono)
2. Audio is sent to a Web Worker running the WASM engine
3. Silero VAD detects speech segments (minSilence: 1.2s, minSpeech: 0.5s)
4. SenseVoice model transcribes each segment offline
5. Korean results are post-processed (spacing fix, non-Hangul filter)

**Supported languages:** Korean, English, Chinese, Japanese, Cantonese

> The model bundle (~241 MB) is downloaded once and cached by the browser.
> Large binary files (`.data`, `.wasm`) are excluded from Git via `.gitignore`.

## Project Structure

```
unilingo-v2/
├── frontend/                     # React Web App
│   ├── public/                   # Static assets + WASM binaries
│   │   ├── sherpa-onnx-*.js      # WASM glue + JS wrappers
│   │   ├── sherpa-onnx-*.wasm    # WASM binary (gitignored)
│   │   └── sherpa-onnx-*.data    # Model bundle (gitignored)
│   ├── src/
│   │   ├── common/               # Shared utilities
│   │   │   ├── hooks/            # useSpeechInput, useWasmSpeechInput, etc.
│   │   │   ├── workers/          # sttWasmWorker.js (Web Worker)
│   │   │   ├── utils/            # platformUtils, etc.
│   │   │   ├── components/       # Shared UI components
│   │   │   └── contexts/         # React contexts (Usage, etc.)
│   │   ├── modules/              # Feature modules (layered architecture)
│   │   │   ├── translator/       # Translation view + history
│   │   │   ├── dictionary/       # Dictionary search + history
│   │   │   ├── recording/        # Voice recording
│   │   │   ├── stt_stream/       # STT streaming view
│   │   │   ├── auth/             # Authentication + settings
│   │   │   └── admin/            # Admin panel
│   │   ├── components/           # Layout (header, footer)
│   │   ├── pages/                # Legacy pages
│   │   └── shared/               # Shared modules (glossary)
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # FastAPI Backend
│   ├── src/common/modules/
│   │   ├── auth/                 # Google OAuth + JWT
│   │   ├── translation/          # DeepL API proxy
│   │   ├── dictionary/           # Dictionary service
│   │   ├── stt/                  # STT usage tracking
│   │   ├── usage/                # Usage limits
│   │   ├── errors/               # Error tracking
│   │   ├── health/               # Health check
│   │   └── ...
│   ├── app.py                    # FastAPI entry point
│   └── config.py
│
├── doc/                          # Documentation
│   ├── database-schema.md
│   └── supabase-schema.sql
│
├── docker/                       # Docker configs
├── docker-compose.yml
├── Dockerfile
├── render.yaml                   # Render.com deployment config
└── requirements.txt              # Python dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account

### 1. Clone & Setup

```bash
git clone https://github.com/LannieYoo/unilingo-v2.git
cd unilingo-v2
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt

# Create backend/.env (see .env.example)
python app.py
# → http://localhost:8001
```

### 3. Frontend

```bash
cd frontend
npm install

# Create frontend/.env (see .env.example)
npm run dev
# → http://localhost:3001
```

### 4. WASM STT Model Setup

Download the SenseVoice WASM build from [sherpa-onnx releases](https://github.com/k2-fsa/sherpa-onnx/releases):

```bash
# Download sherpa-onnx-wasm-simd-{version}-vad-asr-zh_en_ja_ko_cantonese-sense_voice_small.tar.bz2
# Extract and copy these files to frontend/public/:
#   - sherpa-onnx-wasm-main-vad-asr.data  (~241 MB)
#   - sherpa-onnx-wasm-main-vad-asr.wasm  (~11 MB)
```

> These files are too large for Git. They are downloaded once and cached by the browser at runtime.

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | POST | Google OAuth login |
| `/api/auth/refresh` | POST | Refresh JWT token |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Current user info |

### Translation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/translate` | POST | Translate text (DeepL → Google fallback) |
| `/api/translate/history` | GET | Translation history |
| `/api/translate/history/{id}/favorite` | PUT | Toggle favorite |

### Dictionary
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dictionary/search` | GET | Dictionary search |
| `/api/dictionary/autocomplete` | GET | Autocomplete |
| `/api/dictionary/history` | GET | Search history |

### System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/admin/users` | GET | User list (admin) |
| `/api/errors` | POST | Report frontend error |

## Supported Languages

| Feature | Languages |
|---------|-----------|
| **STT (SenseVoice)** | Korean, English, Chinese, Japanese, Cantonese |
| **Translation** | English, Korean, Chinese, Japanese, Spanish, French, German, Arabic, Hindi, Portuguese, Russian, Italian |
| **Dictionary** | Korean ↔ English, Korean ↔ Chinese, English ↔ Chinese |
| **TTS** | 15+ languages with accent variants |

## Security

- **Single Session Enforcement** — login from a new device invalidates previous sessions
- **JWT Token Versioning** — prevents unauthorized access from old tokens
- **CORS + COEP/COOP Headers** — required for SharedArrayBuffer (WASM)
- **No audio upload** — STT runs entirely in the browser

## License

Private project

## Author

- **Name**: Lannie (HyeRan Yoo)
- **GitHub**: [LannieYoo](https://github.com/LannieYoo)
