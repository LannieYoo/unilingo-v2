# UniLingo - Multilingual Translation & Speech Recognition Platform

A comprehensive multilingual platform featuring real-time speech recognition, translation, and dictionary services. Built with React frontend and Flask backend following modular architecture principles.

## Features

- **Instant Translation**: Real-time text translation between Korean, English, and Chinese
- **Speech to Text (STT)**: Browser-based real-time speech recognition using Vosk (offline capable)
- **Dictionary**: Multi-language dictionary search (Korean-English, Korean-Chinese, English-Chinese)
- **Text to Speech (TTS)**: Convert text to speech using Web Speech API
- **Voice Recording**: Record and save audio files

## Tech Stack

### Frontend
- React 18 + Vite
- Zustand (State Management)
- Tailwind CSS
- Vosk-browser (Offline STT)

### Backend
- Flask (Python)
- Modular 8-layer architecture
- Rate limiting & caching middleware

## Project Structure

```
UniLingo/
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── components/          # Shared components
│   │   │   ├── header/
│   │   │   ├── footer/
│   │   │   └── layout/
│   │   ├── modules/             # Feature modules (layered)
│   │   │   ├── dictionary/
│   │   │   ├── recording/
│   │   │   ├── stt_stream/
│   │   │   └── translator/
│   │   ├── pages/               # Page components
│   │   └── styles/              # Global styles
│   └── package.json
│
├── backend/                     # Flask Backend
│   ├── src/
│   │   └── common/
│   │       └── modules/         # Backend modules (8-layer)
│   │           ├── cache/
│   │           ├── dictionary/
│   │           ├── exception/
│   │           ├── health/
│   │           ├── middleware/
│   │           ├── stt/
│   │           └── translation/
│   ├── app.py
│   ├── config.py
│   └── requirements.txt
│
├── .kiro/
│   └── steering/                # Development guidelines
│       ├── backend-module-layering-standard.md
│       ├── frontend-module-layering-standard.md
│       ├── software-design-principles.md
│       └── task.md
│
├── scripts/                     # Utility scripts
├── logs/                        # Application logs
└── doc/                         # Documentation
```

## Module Architecture

### Frontend Module Structure (11 layers)
```
module_name/
├── _01_router/      # Route configuration
├── _02_views/       # Page view components
├── _03_components/  # Reusable components
├── _04_hooks/       # Business logic hooks
├── _05_stores/      # State management (Zustand)
├── _06_services/    # API calls
├── _07_utils/       # Utility functions
├── _08_constants/   # Constants
├── _09_locales/     # i18n files
├── _10_styles/      # Module styles
└── index.js         # Module exports
```

### Backend Module Structure (8 layers)
```
module_name/
├── _01_contracts/   # Interfaces & data contracts
├── _02_abstracts/   # Abstract base classes
├── _03_impls/       # Concrete implementations
├── _04_services/    # Service entry points
├── _05_dtos/        # Data transfer objects
├── _06_models/      # Database models
├── _07_router/      # API endpoints
└── _08_utils/       # Utilities
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at `http://localhost:8000`

### 3. Run Both (Windows)

```bash
run_all.bat
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/translate` | POST | Text translation |
| `/api/dictionary/search` | GET | Dictionary search |
| `/api/dictionary/autocomplete` | GET | Autocomplete suggestions |
| `/api/stt/transcribe` | POST | Speech to text |
| `/api/health` | GET | Health check |

## Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
FLASK_ENV=development
FLASK_HOST=127.0.0.1
FLASK_PORT=8000
LOG_LEVEL=DEBUG
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TRANSLATION=1000/minute
```

### Frontend Vite Proxy

Configured in `frontend/vite.config.js`:
- `/api` → Backend server
- `/vosk-models` → Vosk model CDN (CORS bypass)

## Supported Languages

| Feature | Languages |
|---------|-----------|
| Translation | Korean, English, Chinese |
| STT (Vosk) | English, Korean, Chinese, Japanese, Spanish, French, German |
| Dictionary | Korean-English, Korean-Chinese, English-Chinese |

## Development Guidelines

See `.kiro/steering/` for detailed development standards:
- `software-design-principles.md` - SOLID, DRY, KISS principles
- `backend-module-layering-standard.md` - Backend architecture
- `frontend-module-layering-standard.md` - Frontend architecture
- `task.md` - Vosk STT implementation spec

## License

Private project

## Author

- **Name**: Lannie (HyeRan Yoo)
- **GitHub**: [LannieYoo](https://github.com/LannieYoo)
