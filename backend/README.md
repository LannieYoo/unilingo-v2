# Backend API Server

Flask-based unified backend API server for the Speaking to Text application.

## Features

- **Translation API**: Translate text between Korean, English, and Chinese
- **Dictionary API**: Search word definitions and get autocomplete suggestions
- **Speech-to-Text API**: Convert audio to text using Faster-Whisper or Vosk
- **Rate Limiting**: Protect against abuse with configurable rate limits
- **Caching**: Improve performance with intelligent caching
- **Logging**: Comprehensive logging with trace IDs for debugging

## Project Structure

```
backend/
├── app.py                      # Flask application entry point
├── config.py                   # Configuration management
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── routes/                     # API route blueprints
├── services/                   # Business logic services
├── middleware/                 # Middleware components
└── utils/                      # Utility functions
```

## Installation

### Prerequisites

- Python 3.9 or higher
- FFmpeg (for audio processing)

**Install FFmpeg:**
- Windows: `winget install ffmpeg`
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`

### Setup

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
```

2. **Activate virtual environment:**
- Windows: `venv\Scripts\activate`
- macOS/Linux: `source venv/bin/activate`

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env file with your configuration
```

## Running the Server

### Development Mode

```bash
python app.py
```

The server will start at `http://127.0.0.1:8000`

### Production Mode

```bash
export FLASK_ENV=production
python app.py
```

## API Endpoints

### Translation

- `POST /api/translate` - Translate text
  ```json
  Request:
  {
    "text": "Hello",
    "source_lang": "en",
    "target_lang": "ko"
  }
  
  Response:
  {
    "translated_text": "안녕하세요",
    "source_lang": "en",
    "target_lang": "ko",
    "provider": "google_direct",
    "cached": false,
    "trace_id": "uuid"
  }
  ```

### Dictionary

- `GET /api/dictionary/search?word=hello&target_lang=ko` - Search word definition
  ```json
  Response:
  {
    "word": "hello",
    "detected_lang": "en",
    "pronunciation": {"uk": "/həˈləʊ/", "us": "/həˈloʊ/"},
    "meanings": [
      {
        "number": 1,
        "definition": "used as a greeting",
        "translation": "인사로 사용됨",
        "example": "Hello, how are you?",
        "example_translation": "안녕하세요, 어떻게 지내세요?"
      }
    ],
    "cached": false,
    "trace_id": "uuid"
  }
  ```

- `GET /api/dictionary/autocomplete?query=hel&language=en&target_lang=ko` - Get autocomplete suggestions
  ```json
  Response:
  {
    "suggestions": [
      {
        "word": "hello",
        "translation": "안녕하세요",
        "type": "suggest",
        "score": 1000
      }
    ],
    "trace_id": "uuid"
  }
  ```

### Speech-to-Text

- `POST /api/stt/transcribe` - Transcribe audio file
  - Form data: `audio` (file), `language` (optional: ko, en, zh, auto)
  ```json
  Response:
  {
    "text": "Hello world",
    "language": "en",
    "filtered": false,
    "confidence": 0.95,
    "trace_id": "uuid"
  }
  ```

### Health Check

- `GET /api/health` - Check server health status
  ```json
  Response:
  {
    "status": "healthy",
    "services": {
      "translation": "operational",
      "dictionary": "operational",
      "stt": "operational"
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "trace_id": "uuid"
  }
  ```

## Configuration

All configuration is managed through environment variables. See `.env.example` for available options.

### Key Configuration Options

- `FLASK_ENV`: Environment (development, production, testing)
- `FLASK_PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Allowed CORS origins (comma-separated)
- `STT_ENGINE`: Speech-to-text engine (faster-whisper, vosk, hybrid)
- `CACHE_ENABLED`: Enable/disable caching
- `RATE_LIMIT_ENABLED`: Enable/disable rate limiting

## Testing

```bash
pytest
```

Run with coverage:
```bash
pytest --cov=backend --cov-report=html
```

## Development

### Adding a New Service

1. Create service file in `services/`
2. Implement service class with business logic
3. Create route file in `routes/`
4. Register blueprint in `app.py`

### Adding Middleware

1. Create middleware file in `middleware/`
2. Implement middleware function or class
3. Register middleware in `app.py`

## Troubleshooting

### FFmpeg not found

Make sure FFmpeg is installed and available in your PATH:
```bash
ffmpeg -version
```

### Port already in use

Change the port in `.env`:
```
FLASK_PORT=8001
```

### CORS errors

Add your frontend URL to `CORS_ORIGINS` in `.env`:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## License

This project is part of the Speaking to Text application.


## Implementation Status

### ✅ Completed Features

1. **Project Structure** - Organized backend with routes, services, middleware, utils
2. **Configuration Management** - Environment-based config with .env support
3. **Middleware**
   - CORS Handler with origin validation
   - Request Logger with trace_id
   - Error Handler with standardized responses
   - Rate Limiter with sliding window algorithm
4. **Services**
   - Cache Service (in-memory with TTL)
   - Translation Service (3 provider fallback)
   - Dictionary Service (with language detection)
   - Autocomplete Service (Datamuse API integration)
   - STT Service (Faster-Whisper, 4x faster than original)
5. **API Routes**
   - Translation API
   - Dictionary API (search + autocomplete)
   - STT API
   - Health Check API
6. **Utilities**
   - Input validators
   - Cache key generation
   - Language detection

### 🚧 Optional Features (Not Implemented)

- Vosk real-time STT (optional alternative)
- Property-based tests (marked as optional)
- Integration tests (marked as optional)
- Docker configuration
- Frontend integration

## Performance Improvements

### Faster-Whisper vs Original Whisper

| Metric | Original Whisper | Faster-Whisper | Improvement |
|--------|------------------|----------------|-------------|
| Speed | 1x | 4x | 4x faster |
| Memory | 2GB | 1GB | 50% less |
| Accuracy | High | High | Same |
| Real-time | No | Better | Improved |

### Caching Strategy

- **Translation**: 24 hours TTL
- **Dictionary**: 7 days TTL
- **Autocomplete**: 1 hour TTL
- Automatic cleanup every 5 minutes

### Rate Limiting

- **Translation**: 100 requests/hour per IP
- **Dictionary**: 200 requests/hour per IP
- **Autocomplete**: 500 requests/hour per IP
- **STT**: 50 requests/hour per IP

## Error Handling

All errors follow standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "trace_id": "uuid",
    "details": {}
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Invalid input
- `NOT_FOUND` (404) - Resource not found
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `TRANSLATION_FAILED` (500) - Translation error
- `DICTIONARY_ERROR` (500) - Dictionary error
- `STT_ERROR` (500) - Speech-to-text error
- `SERVICE_UNAVAILABLE` (503) - Service disabled
- `INTERNAL_ERROR` (500) - Unexpected error

## Logging

All requests are logged with:
- Trace ID (for request tracking)
- Request method and path
- Response status and duration
- Error details (if any)

Logs are stored in `../logs/application_logs.log`

## Next Steps

1. **Frontend Integration**
   - Update frontend to call backend APIs
   - Remove direct external API calls
   - Add trace_id to frontend logging

2. **Testing**
   - Add unit tests for services
   - Add integration tests for API endpoints
   - Add property-based tests for correctness

3. **Deployment**
   - Create Docker configuration
   - Set up CI/CD pipeline
   - Deploy to production

4. **Monitoring**
   - Set up error tracking
   - Monitor API response times
   - Track cache hit rates

## Contributing

When adding new features:

1. Create service in `services/`
2. Create route in `routes/`
3. Register blueprint in `app.py`
4. Update README with API documentation
5. Add tests (optional but recommended)

## Support

For issues or questions, please check:
- Logs in `../logs/`
- Configuration in `.env`
- API documentation above
