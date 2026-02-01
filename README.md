# UniLingo - Multilingual Translation & Speech Recognition Platform

A comprehensive multilingual platform featuring real-time speech recognition, translation, dictionary services, and user authentication. Built with React frontend and FastAPI backend following modular architecture principles.

## Features

### Core Features

- **Real-time Speech to Text (STT)**: Hybrid STT system combining Web Speech API and Vosk for continuous speech recognition

  - Supports 15+ languages with multiple English accents (US, UK, India, Australia)
  - Automatic language detection
  - Real-time transcript display with word highlighting
  - Inline dictionary tooltip for word lookup during transcription
- **Text to Speech (TTS)**: Multi-accent voice synthesis with translation

  - 15+ languages with accent-specific voices
  - Automatic voice installation guidance for missing language packs
  - Speed control (0.5x - 2.5x)
  - Repeat mode for language learning
  - Real-time word highlighting during playback
- **Instant Translation**: Real-time text translation between 15+ languages

  - Google Translate API integration with MyMemory fallback
  - Translation history tracking with favorite bookmarks
  - Character limit management for authenticated users
- **Dictionary**: Multi-language dictionary search with history

  - Korean-English, Korean-Chinese, English-Chinese
  - Autocomplete suggestions
  - Search history tracking for authenticated users
  - Inline dictionary tooltip in STT view

### User Management

- **Authentication**: Google OAuth 2.0 integration

  - Secure JWT-based session management
  - User profile management
  - Login history tracking
  - Language preference settings (native & target language)
- **Personal Data Management**: Save and organize your learning materials

  - Translation history with favorite bookmarks
  - Dictionary search history
  - STT usage logs and statistics
- **Usage Tracking**: Character limit management

  - Free tier: 10,000 characters/month
  - Real-time character counter
  - Usage reset on monthly basis
- **Admin Panel**: User management and analytics

  - User list with search and filtering
  - Usage statistics and logs
  - Login history monitoring

## Tech Stack

### Frontend

- React 18 + Vite
- Zustand (State Management)
- Tailwind CSS
- Web Speech API (STT/TTS)
- Vosk-browser (Offline STT fallback)
- Google OAuth 2.0

### Backend

- FastAPI (Python)
- SQLAlchemy + Supabase (PostgreSQL)
- JWT Authentication
- Modular layered architecture
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
│   │   ├── config/              # Centralized configuration
│   │   │   └── languages.js     # Language settings for all modules
│   │   ├── modules/             # Feature modules (layered)
│   │   │   ├── admin/           # Admin panel
│   │   │   ├── auth/            # Authentication & user management
│   │   │   ├── dictionary/      # Dictionary search & history
│   │   │   ├── recording/       # Voice recording
│   │   │   ├── stt_stream/      # Speech-to-Text streaming
│   │   │   └── translator/      # Translation & history
│   │   ├── pages/               # Page components
│   │   │   ├── dictionary/
│   │   │   ├── home/
│   │   │   ├── speech-to-text/
│   │   │   └── text-to-speech/
│   │   ├── shared/              # Shared modules
│   │   │   └── modules/
│   │   │       └── glossary/    # Glossary management
│   │   └── styles/              # Global styles
│   └── package.json
│
├── backend/                     # FastAPI Backend
│   ├── src/
│   │   └── common/
│   │       └── modules/         # Backend modules
│   │           ├── auth/        # Authentication & JWT
│   │           ├── cache/       # Caching layer
│   │           ├── database/    # Database connection
│   │           ├── dictionary/  # Dictionary API
│   │           ├── exception/   # Error handling
│   │           ├── health/      # Health check
│   │           ├── middleware/  # Request/Response middleware
│   │           ├── stt/         # Speech-to-Text API
│   │           └── translation/ # Translation API
│   ├── app.py
│   ├── config.py
│   └── requirements.txt
│
├── .kiro/
│   ├── specs/                   # Feature specifications
│   │   ├── backend-api-integration/
│   │   ├── dictionary-history-auth/
│   │   ├── google-auth-stt-limit/
│   │   ├── hybrid-stt-english-high/
│   │   ├── inline-dictionary-tooltip/
│   │   └── speech-translation-fixes/
│   └── steering/                # Development guidelines
│       ├── 00-readme.md
│       ├── code-style.md
│       ├── coding-standards.md
│       ├── database-management.md
│       ├── stack.md
│       ├── stt-requirements.md
│       ├── testing-and-logs.md
│       ├── workflow-bugfix.md
│       └── workflow-feature.md
│
├── doc/                         # Documentation
│   ├── database-schema.md       # Database schema documentation
│   └── supabase-schema.sql      # Supabase SQL schema
│
├── logs/                        # Application logs
└── run_all.bat                  # Windows startup script
```

## Module Architecture

### Frontend Module Structure

```
module_name/
├── _01_router/      # Route configuration
├── _02_views/       # Page view components
├── _03_components/  # Reusable UI components
├── _04_hooks/       # Business logic hooks
├── _05_stores/      # State management (Zustand)
├── _06_services/    # API calls
├── _07_utils/       # Utility functions
├── _08_constants/   # Constants & enums
├── _09_locales/     # i18n translation files
├── _10_styles/      # Module-specific styles
└── index.js         # Module exports
```

### Backend Module Structure

```
module_name/
├── dto.py           # Data Transfer Objects (Pydantic)
├── service.py       # Business logic
├── router.py        # API endpoints (FastAPI)
└── __init__.py      # Module exports
```

## Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or pnpm
- Supabase account (for database and authentication)

### 1. Environment Setup

#### Backend Environment Variables

Create `backend/.env` file:

```env
# Flask Configuration
FLASK_ENV=development
FLASK_HOST=127.0.0.1
FLASK_PORT=8000
LOG_LEVEL=DEBUG

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URI=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Feature Flags
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TRANSLATION=1000/minute
```

#### Frontend Environment Variables

Create `frontend/.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Database Setup

Run the SQL schema in Supabase SQL Editor:

```bash
# See doc/supabase-schema.sql for complete schema
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at `http://localhost:8000`

### 5. Run Both (Windows)

```bash
run_all.bat
```

## API Endpoints

### Authentication

| Endpoint              | Method | Description           |
| --------------------- | ------ | --------------------- |
| `/api/auth/google`  | POST   | Google OAuth login    |
| `/api/auth/refresh` | POST   | Refresh JWT token     |
| `/api/auth/logout`  | POST   | User logout           |
| `/api/auth/me`      | GET    | Get current user info |

### Translation

| Endpoint                                 | Method | Description              |
| ---------------------------------------- | ------ | ------------------------ |
| `/api/translate`                       | POST   | Text translation         |
| `/api/translate/history`               | GET    | Get translation history  |
| `/api/translate/history/{id}/favorite` | PUT    | Toggle favorite bookmark |

### Dictionary

| Endpoint                         | Method | Description              |
| -------------------------------- | ------ | ------------------------ |
| `/api/dictionary/search`       | GET    | Dictionary search        |
| `/api/dictionary/autocomplete` | GET    | Autocomplete suggestions |
| `/api/dictionary/history`      | GET    | Get search history       |

### Speech-to-Text

| Endpoint                | Method | Description                  |
| ----------------------- | ------ | ---------------------------- |
| `/api/stt/transcribe` | POST   | Speech to text transcription |
| `/api/stt/logs`       | GET    | Get STT usage logs           |

### System

| Endpoint             | Method | Description          |
| -------------------- | ------ | -------------------- |
| `/api/health`      | GET    | Health check         |
| `/api/admin/users` | GET    | Admin: Get user list |

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

### Translation & TTS
English (US, UK, India, Australia), Korean, Chinese (Simplified), Japanese, Spanish, French, German, Arabic, Hindi, Portuguese, Russian, Italian

### STT (Speech Recognition)
English (US, UK, India, Australia), Korean, Chinese, Japanese, Spanish, French, German, Arabic, Hindi, Portuguese, Russian, Italian

### Dictionary
- Korean ↔ English
- Korean ↔ Chinese
- English ↔ Chinese

## Key Features for Language Learners

1. **Multi-accent Support**: Practice listening to different English accents (US, UK, India, Australia)
2. **Translation History with Bookmarks**: Save and favorite important translations for later review
3. **Dictionary Integration**: Look up words instantly while using STT
4. **Repeat Mode**: Loop TTS playback for pronunciation practice
5. **Speed Control**: Adjust playback speed (0.5x - 2.5x) for better comprehension
6. **Usage Tracking**: Monitor your learning progress with detailed logs

## Development Guidelines

See `.kiro/steering/` for detailed development standards:

- `coding-standards.md` - Frontend/Backend coding rules and import guidelines
- `code-style.md` - Code style and safety guidelines
- `database-management.md` - Database schema and log management rules
- `stack.md` - Project tech stack and basic rules
- `stt-requirements.md` - STT system requirements and constraints
- `testing-and-logs.md` - Testing and logging best practices
- `workflow-bugfix.md` - Bug fixing workflow
- `workflow-feature.md` - Feature development workflow

## Database Schema

See `doc/database-schema.md` for complete database documentation including:
- Users table with Google OAuth integration
- Login logs for security tracking
- STT logs for usage analytics
- Translation logs with favorite bookmarks
- Dictionary logs for search history

## License

Private project

## Author

- **Name**: Lannie (HyeRan Yoo)
- **GitHub**: [LannieYoo](https://github.com/LannieYoo)
