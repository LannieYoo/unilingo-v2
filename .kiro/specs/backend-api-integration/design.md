# Backend API Integration - Design Document

## Overview

This design document outlines the architecture for a unified Flask-based backend API server that consolidates all external API interactions, provides secure API key management, implements rate limiting, and integrates the existing Whisper service. The backend will serve as an API Gateway between the React frontend and external services (Google Translate, MyMemory, Datamuse, Dictionary API, etc.).

### Goals
- Centralize all external API calls in a secure backend layer
- Protect API keys and sensitive configuration
- Implement rate limiting to prevent abuse
- Provide consistent error handling and logging
- Enable caching for improved performance
- Maintain modularity for easy testing and extension

### Non-Goals
- Real-time WebSocket communication (future consideration)
- User authentication/authorization (future consideration)
- Database integration (future consideration)
- Frontend modifications (separate concern)

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  React Frontend │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────────────────────────────┐
│         Flask Backend Server            │
│  ┌───────────────────────────────────┐  │
│  │      Middleware Layer             │  │
│  │  - CORS Handler                   │  │
│  │  - Rate Limiter                   │  │
│  │  - Request Logger                 │  │
│  │  - Error Handler                  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │       Route Layer                 │  │
│  │  - /api/translate                 │  │
│  │  - /api/dictionary/*              │  │
│  │  - /api/whisper/*                 │  │
│  │  - /api/health                    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Service Layer                │  │
│  │  - TranslationService             │  │
│  │  - DictionaryService              │  │
│  │  - WhisperService                 │  │
│  │  - CacheService                   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │      Utility Layer                │  │
│  │  - LoggingService (existing)      │  │
│  │  - ExceptionService (existing)    │  │
│  │  - ConfigManager                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│       External Services                 │
│  - Google Translate API                 │
│  - MyMemory Translation API             │
│  - Datamuse API                         │
│  - Dictionary API                       │
│  - OpenAI Whisper (local)               │
└─────────────────────────────────────────┘
```


### Directory Structure

```
backend/
├── app.py                      # Flask application entry point
├── config.py                   # Configuration management
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── routes/
│   ├── __init__.py
│   ├── translation.py         # Translation endpoints
│   ├── dictionary.py          # Dictionary endpoints
│   ├── whisper.py             # Whisper endpoints
│   └── health.py              # Health check endpoints
├── services/
│   ├── __init__.py
│   ├── translation_service.py # Translation business logic
│   ├── dictionary_service.py  # Dictionary business logic
│   ├── whisper_service.py     # Whisper business logic
│   └── cache_service.py       # Caching logic
├── middleware/
│   ├── __init__.py
│   ├── cors_handler.py        # CORS configuration
│   ├── rate_limiter.py        # Rate limiting
│   ├── request_logger.py      # Request logging
│   └── error_handler.py       # Global error handling
├── utils/
│   ├── __init__.py
│   ├── config_manager.py      # Configuration utilities
│   └── validators.py          # Input validation
└── common/                     # Existing common modules
    └── modules/
        ├── logger/
        └── exception/
```

## Components and Interfaces

### 1. Flask Application (app.py)

**Responsibility**: Initialize and configure the Flask application, register blueprints, and apply middleware.

**Interface**:
```python
def create_app(config_name: str = 'development') -> Flask:
    """
    Create and configure Flask application
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application instance
    """
```

**Key Methods**:
- `create_app()`: Factory function to create Flask app
- `register_blueprints()`: Register all route blueprints
- `register_middleware()`: Apply middleware layers
- `register_error_handlers()`: Register global error handlers


### 2. Configuration Manager (config.py)

**Responsibility**: Load and manage environment-specific configuration.

**Interface**:
```python
class Config:
    """Base configuration"""
    SECRET_KEY: str
    CORS_ORIGINS: List[str]
    LOG_LEVEL: str
    CACHE_TTL: int
    RATE_LIMIT_ENABLED: bool

class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG: bool = True
    
class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG: bool = False

def get_config(config_name: str) -> Config:
    """Get configuration by name"""
```

**Configuration Sources**:
1. Environment variables (.env file)
2. Default values (fallback)
3. Environment-specific overrides

### 3. Translation Service

**Responsibility**: Handle translation requests with fallback mechanism.

**Interface**:
```python
class TranslationService:
    def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Translate text from source to target language
        
        Args:
            text: Text to translate
            source_lang: Source language code (ko, en, zh)
            target_lang: Target language code
            trace_id: Request trace ID
            
        Returns:
            {
                'translated_text': str,
                'source_lang': str,
                'target_lang': str,
                'provider': str  # Which API was used
            }
            
        Raises:
            TranslationError: If all providers fail
        """
```

**Translation Providers** (in order of priority):
1. Google Translate API (direct)
2. MyMemory Translation API
3. Google Translate API (via proxy)


### 4. Dictionary Service

**Responsibility**: Provide word definitions, translations, and autocomplete suggestions.

**Interface**:
```python
class DictionaryService:
    def search(
        self,
        word: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search word definition and translation
        
        Args:
            word: Word to search
            target_lang: Target language for translation
            trace_id: Request trace ID
            
        Returns:
            {
                'word': str,
                'detected_lang': str,
                'pronunciation': {'uk': str, 'us': str},
                'meanings': [
                    {
                        'number': int,
                        'definition': str,
                        'translation': str,
                        'example': Optional[str],
                        'example_translation': Optional[str]
                    }
                ]
            }
        """
    
    def autocomplete(
        self,
        query: str,
        language: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get autocomplete suggestions
        
        Args:
            query: Search query
            language: Detected language of query
            target_lang: Target language for translations
            trace_id: Request trace ID
            
        Returns:
            [
                {
                    'word': str,
                    'translation': Optional[str],
                    'type': str,  # 'suggest', 'spell', 'related', 'synonym'
                    'score': int
                }
            ]
        """
```

**External APIs Used**:
- Dictionary API (for English definitions)
- Datamuse API (for autocomplete and related words)
- Google Translate API (for translations)


### 5. Whisper Service

**Responsibility**: Integrate existing Whisper functionality into unified backend.

**Interface**:
```python
class WhisperService:
    def __init__(self, model_name: str = 'medium'):
        """Initialize Whisper service with specified model"""
        
    def transcribe(
        self,
        audio_file: FileStorage,
        language: Optional[str] = None,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio to text
        
        Args:
            audio_file: Audio file (webm, wav, etc.)
            language: Language code or 'auto' for detection
            trace_id: Request trace ID
            
        Returns:
            {
                'text': str,
                'language': str,
                'filtered': bool  # Whether hallucination was filtered
            }
        """
```

**Integration Notes**:
- Reuse existing Whisper model loading logic from `whisper_server.py`
- Maintain hallucination filtering
- Support FFmpeg conversion for audio formats

### 6. Cache Service

**Responsibility**: Cache API responses to reduce external API calls and improve performance.

**Interface**:
```python
class CacheService:
    def get(self, key: str) -> Optional[Any]:
        """Get cached value by key"""
        
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set cached value with optional TTL"""
        
    def delete(self, key: str):
        """Delete cached value"""
        
    def clear(self):
        """Clear all cached values"""
        
    def generate_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
```

**Cache Strategy**:
- In-memory caching using Python dictionary (simple implementation)
- TTL-based expiration
- Cache keys based on request parameters
- Future: Redis integration for distributed caching

**Cacheable Endpoints**:
- Translation: `translate:{source_lang}:{target_lang}:{hash(text)}`
- Dictionary: `dict:{word}:{target_lang}`
- Autocomplete: `autocomplete:{query}:{language}:{target_lang}`


### 7. Rate Limiter Middleware

**Responsibility**: Limit API request rates per IP address to prevent abuse.

**Interface**:
```python
class RateLimiter:
    def __init__(self, limits: Dict[str, str]):
        """
        Initialize rate limiter
        
        Args:
            limits: Dictionary of endpoint patterns to rate limits
                   e.g., {'/api/translate': '100/hour', '/api/dictionary/*': '200/hour'}
        """
        
    def check_rate_limit(self, ip: str, endpoint: str) -> Tuple[bool, Optional[int]]:
        """
        Check if request is within rate limit
        
        Returns:
            (is_allowed, retry_after_seconds)
        """
```

**Rate Limit Configuration**:
- `/api/translate`: 100 requests/hour per IP
- `/api/dictionary/search`: 200 requests/hour per IP
- `/api/dictionary/autocomplete`: 500 requests/hour per IP
- `/api/whisper/transcribe`: 50 requests/hour per IP
- `/api/health`: Unlimited

**Implementation**:
- Store request counts in memory with timestamps
- Clean up expired entries periodically
- Return HTTP 429 with `Retry-After` header when limit exceeded

### 8. Request Logger Middleware

**Responsibility**: Log all incoming requests and outgoing responses.

**Interface**:
```python
def log_request(request: Request, response: Response, duration_ms: float):
    """
    Log request and response details
    
    Args:
        request: Flask request object
        response: Flask response object
        duration_ms: Request processing duration in milliseconds
    """
```

**Logged Information**:
- Timestamp
- Trace ID
- HTTP method and path
- Request IP address
- Response status code
- Processing duration
- Error details (if any)


### 9. Error Handler Middleware

**Responsibility**: Catch and format all errors consistently.

**Interface**:
```python
def handle_error(error: Exception, trace_id: str) -> Tuple[Dict, int]:
    """
    Handle error and return standardized response
    
    Returns:
        (error_response_dict, http_status_code)
    """
```

**Error Response Format**:
```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "trace_id": "uuid-trace-id",
        "details": {}  // Optional additional details
    }
}
```

**Error Types**:
- `VALIDATION_ERROR` (400): Invalid input parameters
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `TRANSLATION_FAILED` (500): All translation providers failed
- `WHISPER_ERROR` (500): Whisper transcription failed
- `INTERNAL_ERROR` (500): Unexpected server error

## Data Models

### Request/Response Models

#### Translation Request
```python
{
    "text": str,              # Required, 1-5000 characters
    "source_lang": str,       # Required, one of: ko, en, zh
    "target_lang": str        # Required, one of: ko, en, zh
}
```

#### Translation Response
```python
{
    "translated_text": str,
    "source_lang": str,
    "target_lang": str,
    "provider": str,          # Which API was used
    "cached": bool,           # Whether result was from cache
    "trace_id": str
}
```

#### Dictionary Search Request
```python
{
    "word": str,              # Required, 1-100 characters
    "target_lang": str        # Required, one of: ko, en, zh
}
```

#### Dictionary Search Response
```python
{
    "word": str,
    "detected_lang": str,
    "pronunciation": {
        "uk": str,
        "us": str
    },
    "meanings": [
        {
            "number": int,
            "definition": str,
            "translation": str,
            "example": Optional[str],
            "example_translation": Optional[str]
        }
    ],
    "cached": bool,
    "trace_id": str
}
```


#### Autocomplete Request
```python
{
    "query": str,             # Required, 1-50 characters
    "language": str,          # Optional, detected if not provided
    "target_lang": str        # Required, one of: ko, en, zh
}
```

#### Autocomplete Response
```python
{
    "suggestions": [
        {
            "word": str,
            "translation": Optional[str],
            "type": str,      # 'suggest', 'spell', 'related', 'synonym'
            "score": int
        }
    ],
    "cached": bool,
    "trace_id": str
}
```

#### Whisper Transcribe Request
```python
{
    "audio": File,            # Required, audio file (webm, wav, mp3)
    "language": str           # Optional, language code or 'auto'
}
```

#### Whisper Transcribe Response
```python
{
    "text": str,
    "language": str,
    "filtered": bool,
    "trace_id": str
}
```

#### Health Check Response
```python
{
    "status": str,            # 'healthy' or 'unhealthy'
    "services": {
        "translation": str,   # 'operational', 'degraded', 'down'
        "dictionary": str,
        "whisper": str
    },
    "timestamp": str,
    "trace_id": str
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: CORS Origin Validation
*For any* HTTP request with an Origin header, the system should accept the request only if the origin is in the allowed CORS origins list, otherwise reject with appropriate CORS error.
**Validates: Requirements 1.2**

### Property 2: Request Logging Completeness
*For any* API request, the system should create log entries that include trace_id at request start, completion (with status and duration), and error occurrence (with stack trace if applicable).
**Validates: Requirements 1.3, 8.1, 8.2, 8.3**

### Property 3: Standardized Error Response Format
*For any* error that occurs during request processing, the system should return a response containing error.code, error.message, and error.trace_id fields in JSON format.
**Validates: Requirements 1.4, 11.1, 11.2**

### Property 4: Configuration Fallback Behavior
*For any* missing environment variable, the system should either use a predefined default value or raise a configuration error, never proceeding with undefined/null values.
**Validates: Requirements 2.2**

### Property 5: Translation API Contract
*For any* POST request to /api/translate with valid JSON body, the system should accept requests containing text, source_lang, and target_lang fields, and reject requests missing any of these fields with HTTP 400.
**Validates: Requirements 3.1**

### Property 6: Translation Provider Fallback
*For any* translation request where the primary provider fails, the system should attempt the secondary provider before returning an error, ensuring at least two providers are tried.
**Validates: Requirements 3.2, 3.3**

### Property 7: Translation Response Completeness
*For any* successful translation, the response should include translated_text, source_lang, target_lang, and provider fields.
**Validates: Requirements 3.4**

### Property 8: Translation Error Handling
*For any* translation request where all providers fail, the system should return an error response with error code TRANSLATION_FAILED and HTTP status 500.
**Validates: Requirements 3.5**

### Property 9: Dictionary API Contract
*For any* GET request to /api/dictionary/search, the system should accept requests with word and target_lang query parameters, and reject requests missing these parameters with HTTP 400.
**Validates: Requirements 4.1**

### Property 10: English Word Dictionary Lookup
*For any* dictionary search where the word contains only English characters, the system should fetch definitions from Dictionary API before attempting translations.
**Validates: Requirements 4.2**

### Property 11: Non-English Word Translation Flow
*For any* dictionary search where the word is detected as Korean or Chinese, the system should translate the word to English before fetching dictionary definitions.
**Validates: Requirements 4.3**

### Property 12: Dictionary Definition Translation
*For any* dictionary result where target_lang differs from the definition language, the system should translate all definitions and examples to the target language.
**Validates: Requirements 4.4**


### Property 13: Autocomplete API Contract
*For any* GET request to /api/dictionary/autocomplete, the system should accept requests with query, language, and target_lang parameters, and reject incomplete requests with HTTP 400.
**Validates: Requirements 5.1**

### Property 14: English Autocomplete Routing
*For any* autocomplete query containing only English characters, the system should fetch suggestions from Datamuse API.
**Validates: Requirements 5.2**

### Property 15: Non-English Autocomplete Translation
*For any* autocomplete query detected as Korean or Chinese, the system should translate to English and fetch related words before returning suggestions.
**Validates: Requirements 5.3**

### Property 16: Autocomplete Result Limit
*For any* autocomplete request, the system should return at most 10 suggestions, even if more are available from external APIs.
**Validates: Requirements 5.4**

### Property 17: Rate Limiting Lifecycle
*For any* IP address making requests to a rate-limited endpoint, the system should track request count, return HTTP 429 when limit is exceeded within the time window, and reset the count when the window expires.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 18: Endpoint-Specific Rate Limits
*For any* two different endpoints with different rate limit configurations, requests to each endpoint should be counted separately and enforced according to their respective limits.
**Validates: Requirements 6.4**

### Property 19: Rate Limit Response Headers
*For any* request that exceeds the rate limit, the response should include HTTP status 429 and a Retry-After header indicating when the client can retry.
**Validates: Requirements 6.5**

### Property 20: Whisper API Contract
*For any* POST request to /api/whisper/transcribe, the system should accept requests with an audio file and optional language parameter, and reject requests without audio file with HTTP 400.
**Validates: Requirements 7.2**

### Property 21: Whisper Response Format
*For any* successful audio transcription, the response should include text, language, and filtered fields.
**Validates: Requirements 7.3**

### Property 22: Log Level Filtering
*For any* log message with a severity level, the system should write the log only if its level is equal to or higher than the configured log level (e.g., if level is WARNING, only WARNING, ERROR, and CRITICAL are logged).
**Validates: Requirements 8.4**

### Property 23: Structured Log Format
*For any* log entry written by the system, the log should be in valid JSON format with consistent field names.
**Validates: Requirements 8.5**

### Property 24: Service Failure Isolation
*For any* service that encounters an error, other services should continue to function normally and return successful responses for their respective endpoints.
**Validates: Requirements 9.4**

### Property 25: Validation Error Response
*For any* request with invalid parameters (wrong type, missing required field, out of range), the system should return HTTP 400 with validation error details specifying which fields are invalid.
**Validates: Requirements 11.3**

### Property 26: Internal Error Security
*For any* internal server error (HTTP 500), the error response should not expose internal implementation details such as file paths, stack traces, or database queries to the client.
**Validates: Requirements 11.5**

### Property 27: Cache-First Strategy
*For any* cacheable request (translation, dictionary, autocomplete), the system should check the cache first, return cached result if present and not expired, otherwise call external API and store the result in cache with appropriate TTL.
**Validates: Requirements 12.1, 12.2, 12.3**

### Property 28: Cache Expiration
*For any* cached entry with a TTL, the system should not return the cached value after the TTL has expired, and should remove expired entries from the cache.
**Validates: Requirements 12.4**

### Property 29: Configurable Cache TTL
*For any* two different endpoints with different cache TTL configurations, cached results should expire according to their respective TTL values independently.
**Validates: Requirements 12.5**


## Error Handling

### Error Categories

1. **Client Errors (4xx)**
   - `400 Bad Request`: Invalid input parameters, missing required fields
   - `404 Not Found`: Endpoint or resource not found
   - `429 Too Many Requests`: Rate limit exceeded

2. **Server Errors (5xx)**
   - `500 Internal Server Error`: Unexpected server errors
   - `503 Service Unavailable`: Service temporarily unavailable (e.g., Whisper disabled)

### Error Response Structure

All errors follow this standardized format:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "trace_id": "uuid-v4-string",
        "details": {
            // Optional additional context
        }
    }
}
```

### Error Handling Strategy

1. **Validation Errors**: Caught at route layer, return 400 with field-specific details
2. **External API Failures**: Implement retry with exponential backoff, fallback to alternative providers
3. **Service Unavailable**: Return 503 with clear message about which service is down
4. **Unexpected Errors**: Log full stack trace, return generic 500 to client without internal details
5. **Rate Limit Errors**: Return 429 with Retry-After header

### Logging Strategy

All errors are logged with:
- Full stack trace
- Request context (method, path, parameters)
- Trace ID for correlation
- Timestamp
- User context (if available)

## Testing Strategy

### Unit Testing

**Framework**: pytest

**Coverage Areas**:
- Configuration loading and validation
- Service layer business logic (translation, dictionary, whisper)
- Cache operations (get, set, expiration)
- Rate limiter logic
- Error response formatting
- Input validation

**Example Unit Tests**:
```python
def test_translation_service_fallback():
    """Test that translation service falls back to secondary provider"""
    # Mock primary provider to fail
    # Verify secondary provider is called
    
def test_rate_limiter_enforces_limit():
    """Test that rate limiter blocks requests after limit"""
    # Make requests up to limit
    # Verify next request returns 429
    
def test_cache_expiration():
    """Test that expired cache entries are not returned"""
    # Set cache entry with short TTL
    # Wait for expiration
    # Verify cache miss
```


### Property-Based Testing

**Framework**: Hypothesis (Python property-based testing library)

**Configuration**: Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Test Tagging**: Each property-based test must include a comment with the format:
```python
# Feature: backend-api-integration, Property {number}: {property_text}
```

**Coverage Areas**:

1. **CORS Validation (Property 1)**
   - Generate random origin headers (valid and invalid)
   - Verify only allowed origins are accepted

2. **Error Response Format (Property 3)**
   - Generate various error conditions
   - Verify all error responses contain required fields

3. **Translation Provider Fallback (Property 6)**
   - Simulate primary provider failures
   - Verify secondary provider is always attempted

4. **Rate Limiting (Property 17)**
   - Generate request sequences with varying rates
   - Verify rate limits are enforced correctly

5. **Cache Behavior (Property 27)**
   - Generate random cache keys and values
   - Verify cache-first strategy is followed

**Example Property-Based Tests**:
```python
from hypothesis import given, strategies as st

# Feature: backend-api-integration, Property 3: Standardized Error Response Format
@given(error_type=st.sampled_from(['ValueError', 'KeyError', 'RuntimeError']))
def test_error_response_format(error_type):
    """For any error type, response should have standard format"""
    # Trigger error of given type
    # Verify response has error.code, error.message, error.trace_id
    
# Feature: backend-api-integration, Property 16: Autocomplete Result Limit
@given(num_results=st.integers(min_value=0, max_value=100))
def test_autocomplete_limit(num_results):
    """For any number of API results, return at most 10"""
    # Mock API to return num_results suggestions
    # Verify response contains at most 10 items
    
# Feature: backend-api-integration, Property 27: Cache-First Strategy
@given(
    cache_key=st.text(min_size=1, max_size=50),
    cache_value=st.text(min_size=1, max_size=1000),
    is_cached=st.booleans()
)
def test_cache_first_strategy(cache_key, cache_value, is_cached):
    """For any request, cache should be checked before external API"""
    # Setup cache state based on is_cached
    # Make request
    # Verify external API called only if not cached
```

### Integration Testing

**Framework**: pytest with Flask test client

**Coverage Areas**:
- End-to-end API flows (request → response)
- Middleware integration (CORS, rate limiting, logging)
- Service integration with external APIs (using mocks)
- Error handling across layers

**Example Integration Tests**:
```python
def test_translation_endpoint_success(client):
    """Test successful translation request"""
    response = client.post('/api/translate', json={
        'text': 'Hello',
        'source_lang': 'en',
        'target_lang': 'ko'
    })
    assert response.status_code == 200
    assert 'translated_text' in response.json
    
def test_rate_limit_integration(client):
    """Test rate limiting across multiple requests"""
    # Make requests up to limit
    # Verify 429 response with Retry-After header
```

### Test Data Generators

**Smart Generators for Property-Based Testing**:

1. **Language Code Generator**: Only generates valid language codes (ko, en, zh)
2. **Text Generator**: Generates text in specific languages based on Unicode ranges
3. **Audio File Generator**: Generates valid audio file objects for Whisper testing
4. **Request Generator**: Generates valid HTTP request objects with proper headers

**Example Generators**:
```python
from hypothesis import strategies as st

# Generate valid language codes
lang_codes = st.sampled_from(['ko', 'en', 'zh'])

# Generate Korean text
korean_text = st.text(
    alphabet=st.characters(
        whitelist_categories=['Lo'],
        whitelist_characters='가-힣'
    ),
    min_size=1,
    max_size=100
)

# Generate translation requests
translation_requests = st.fixed_dictionaries({
    'text': st.text(min_size=1, max_size=5000),
    'source_lang': lang_codes,
    'target_lang': lang_codes
})
```

## Performance Considerations

### Caching Strategy
- Cache translation results for 24 hours
- Cache dictionary results for 7 days
- Cache autocomplete results for 1 hour
- Use LRU eviction when cache size exceeds limit

### Rate Limiting
- Implement sliding window algorithm for accurate rate limiting
- Store rate limit data in memory (future: Redis for distributed systems)

### External API Timeouts
- Set 5-second timeout for all external API calls
- Implement circuit breaker pattern for failing services (future enhancement)

### Async Processing
- Consider async/await for concurrent external API calls (future enhancement)
- Use connection pooling for HTTP requests

## Security Considerations

1. **API Key Protection**: Never expose API keys in responses or logs
2. **CORS Configuration**: Restrict to specific frontend origins in production
3. **Input Validation**: Sanitize all user inputs to prevent injection attacks
4. **Error Messages**: Don't expose internal system details in error responses
5. **Rate Limiting**: Prevent DoS attacks through aggressive rate limiting
6. **Logging**: Filter sensitive data (passwords, tokens) from logs

## Deployment Considerations

### Environment Variables
```bash
# Flask Configuration
FLASK_ENV=production
FLASK_PORT=8000
SECRET_KEY=your-secret-key

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging Configuration
LOG_LEVEL=INFO
LOG_DIR=/var/log/app

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_TRANSLATION=86400
CACHE_TTL_DICTIONARY=604800
CACHE_TTL_AUTOCOMPLETE=3600

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TRANSLATION=100/hour
RATE_LIMIT_DICTIONARY=200/hour
RATE_LIMIT_AUTOCOMPLETE=500/hour
RATE_LIMIT_WHISPER=50/hour

# Whisper Configuration
WHISPER_ENABLED=true
WHISPER_MODEL=medium

# External API Configuration (if needed)
GOOGLE_TRANSLATE_API_KEY=your-api-key
```

### Docker Deployment
- Use multi-stage build for smaller image size
- Run as non-root user
- Use environment-specific .env files
- Health check endpoint for container orchestration

### Monitoring
- Log all requests with trace_id for debugging
- Monitor external API response times
- Track rate limit violations
- Alert on high error rates

## Migration Strategy

### Phase 1: Backend Setup
1. Create backend directory structure
2. Implement configuration management
3. Set up logging and error handling
4. Create health check endpoint

### Phase 2: Service Implementation
1. Implement Translation Service with fallback
2. Implement Dictionary Service
3. Implement Cache Service
4. Integrate existing Whisper Service

### Phase 3: Middleware & Security
1. Implement CORS handler
2. Implement Rate Limiter
3. Implement Request Logger
4. Add input validation

### Phase 4: Frontend Integration
1. Update frontend API calls to use backend endpoints
2. Remove direct external API calls from frontend
3. Update error handling in frontend
4. Test end-to-end flows

### Phase 5: Testing & Deployment
1. Write unit tests for all services
2. Write property-based tests for correctness properties
3. Write integration tests
4. Deploy to staging environment
5. Perform load testing
6. Deploy to production

## Future Enhancements

1. **Redis Integration**: Distributed caching for multi-instance deployments
2. **Database Integration**: Store user preferences, search history
3. **Authentication**: User accounts and API key management
4. **WebSocket Support**: Real-time translation and transcription
5. **Circuit Breaker**: Automatic failover for external services
6. **Metrics Dashboard**: Real-time monitoring and analytics
7. **API Versioning**: Support multiple API versions
8. **GraphQL API**: Alternative to REST for flexible queries

## Alternative Speech-to-Text Models

### Current Issue with Whisper
Whisper는 정확도는 높지만 실시간 스트리밍에 최적화되어 있지 않아 다음과 같은 문제가 있습니다:
- 10초 세그먼트 처리로 인한 지연
- CPU에서 느린 처리 속도
- 환각(hallucination) 필터링 필요
- 실시간 타이핑 느낌 부족

### Recommended Alternative: Faster-Whisper

**Faster-Whisper**는 Whisper의 최적화 버전으로 다음 장점이 있습니다:

**장점**:
- Whisper 대비 4배 빠른 속도
- 메모리 사용량 절반
- 동일한 정확도 유지
- CTranslate2 기반 최적화
- 실시간 스트리밍 지원

**설치**:
```bash
pip install faster-whisper
```

**사용 예시**:
```python
from faster_whisper import WhisperModel

model = WhisperModel("medium", device="cpu", compute_type="int8")
segments, info = model.transcribe("audio.mp3", beam_size=5)

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

### Alternative Option: Vosk

**Vosk**는 오프라인 음성 인식 라이브러리로 실시간 스트리밍에 최적화되어 있습니다:

**장점**:
- 매우 빠른 실시간 처리
- 낮은 메모리 사용량
- 완전 오프라인 동작
- WebSocket 스트리밍 지원
- 다국어 모델 지원 (영어, 한국어, 중국어)

**단점**:
- Whisper보다 낮은 정확도
- 모델 크기가 큼 (영어: 1.8GB)

**설치**:
```bash
pip install vosk
# 모델 다운로드 필요: https://alphacephei.com/vosk/models
```

**사용 예시**:
```python
from vosk import Model, KaldiRecognizer
import json

model = Model("model-en")
rec = KaldiRecognizer(model, 16000)

# 실시간 스트리밍
while True:
    data = stream.read(4000)
    if rec.AcceptWaveform(data):
        result = json.loads(rec.Result())
        print(result['text'])
```

### Alternative Option: Google Cloud Speech-to-Text API

**Google Cloud Speech-to-Text**는 클라우드 기반 솔루션으로 최고의 정확도를 제공합니다:

**장점**:
- 매우 높은 정확도
- 실시간 스트리밍 지원
- 자동 구두점 추가
- 화자 분리 (diarization)
- 다양한 언어 및 방언 지원

**단점**:
- 비용 발생 (월 60분 무료, 이후 $0.006/15초)
- 인터넷 연결 필요
- API 키 관리 필요

**설치**:
```bash
pip install google-cloud-speech
```

### Alternative Option: AssemblyAI

**AssemblyAI**는 최신 AI 기반 음성 인식 API입니다:

**장점**:
- 실시간 스트리밍 지원
- 높은 정확도
- 자동 구두점 및 대문자 처리
- 감정 분석, 주제 감지 등 추가 기능
- WebSocket 기반 실시간 처리

**단점**:
- 비용 발생 (월 5시간 무료, 이후 $0.00025/초)
- 인터넷 연결 필요

### Recommendation: Hybrid Approach

**최적의 솔루션**: Faster-Whisper + Vosk 하이브리드

```python
class HybridSTTService:
    def __init__(self):
        # 실시간 스트리밍용 (빠른 응답)
        self.vosk_model = VoskModel("model-en")
        
        # 최종 정확도 향상용 (후처리)
        self.whisper_model = WhisperModel("medium", device="cpu", compute_type="int8")
    
    def transcribe_realtime(self, audio_stream):
        """실시간 스트리밍: Vosk 사용"""
        # Vosk로 빠른 실시간 텍스트 생성
        # 사용자에게 즉시 표시
        
    def transcribe_final(self, audio_file):
        """최종 정확도: Faster-Whisper 사용"""
        # 녹음 완료 후 Faster-Whisper로 재처리
        # 더 정확한 결과로 업데이트
```

**구현 전략**:
1. **Phase 1**: Faster-Whisper로 교체 (빠른 개선)
2. **Phase 2**: Vosk 추가 (실시간 스트리밍)
3. **Phase 3**: 하이브리드 모드 (최고의 UX)

### Updated Whisper Service Interface

```python
class STTService:
    """Speech-to-Text Service with multiple engine support"""
    
    def __init__(self, engine: str = 'faster-whisper'):
        """
        Initialize STT service
        
        Args:
            engine: 'whisper', 'faster-whisper', 'vosk', 'google', 'assemblyai', 'hybrid'
        """
        self.engine = engine
        self._initialize_engine()
    
    def transcribe(
        self,
        audio_file: FileStorage,
        language: Optional[str] = None,
        realtime: bool = False,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio to text
        
        Args:
            audio_file: Audio file
            language: Language code or 'auto'
            realtime: Use realtime engine (Vosk) vs accuracy engine (Faster-Whisper)
            trace_id: Request trace ID
            
        Returns:
            {
                'text': str,
                'language': str,
                'confidence': float,
                'engine': str,
                'segments': List[Dict]  # For realtime streaming
            }
        """
    
    def transcribe_stream(
        self,
        audio_stream: Iterator[bytes],
        language: Optional[str] = None,
        callback: Callable[[str], None] = None
    ):
        """
        Transcribe audio stream in real-time
        
        Args:
            audio_stream: Iterator of audio chunks
            language: Language code
            callback: Function called with each transcribed segment
        """
```

### Performance Comparison

| Engine | Speed | Accuracy | Realtime | Offline | Cost |
|--------|-------|----------|----------|---------|------|
| Whisper | ⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ✅ | Free |
| Faster-Whisper | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ | ✅ | Free |
| Vosk | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | ✅ | Free |
| Google Cloud | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ❌ | Paid |
| AssemblyAI | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ❌ | Paid |
| Hybrid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ✅ | Free |

### Implementation Priority

**Immediate (Week 1)**:
- Replace Whisper with Faster-Whisper (4배 속도 향상)
- 동일한 API 유지, 내부 엔진만 교체

**Short-term (Week 2-3)**:
- Vosk 통합 (실시간 스트리밍)
- WebSocket 엔드포인트 추가

**Long-term (Month 2+)**:
- 하이브리드 모드 구현
- 사용자가 엔진 선택 가능하도록 UI 추가
- Google Cloud STT 옵션 추가 (유료 사용자용)
