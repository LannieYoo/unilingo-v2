# Implementation Plan

- [x] 1. Set up project structure and core configuration



  - Create backend/ directory with proper structure (routes/, services/, middleware/, utils/)
  - Create requirements.txt with all dependencies (Flask, faster-whisper, vosk, hypothesis, pytest)
  - Create .env.example file with all configuration variables
  - Create config.py with Config classes (DevelopmentConfig, ProductionConfig)
  - _Requirements: 2.1, 2.5_

- [ ]* 1.1 Write property test for configuration fallback
  - **Property 4: Configuration Fallback Behavior**



  - **Validates: Requirements 2.2**

- [ ] 2. Implement Flask application factory and middleware
  - Create app.py with create_app() factory function
  - Implement CORS handler middleware with origin validation
  - Implement request logger middleware
  - Implement global error handler middleware
  - Register all middleware in correct order
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 2.1 Write property test for CORS origin validation
  - **Property 1: CORS Origin Validation**
  - **Validates: Requirements 1.2**

- [ ]* 2.2 Write property test for request logging completeness
  - **Property 2: Request Logging Completeness**
  - **Validates: Requirements 1.3, 8.1, 8.2, 8.3**




- [ ]* 2.3 Write property test for standardized error response format
  - **Property 3: Standardized Error Response Format**
  - **Validates: Requirements 1.4, 11.1, 11.2**

- [ ] 3. Implement Cache Service
  - Create cache_service.py with CacheService class
  - Implement get(), set(), delete(), clear() methods
  - Implement generate_key() for consistent cache key generation
  - Implement TTL-based expiration logic
  - Add periodic cleanup of expired entries
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 3.1 Write property test for cache-first strategy
  - **Property 27: Cache-First Strategy**
  - **Validates: Requirements 12.1, 12.2, 12.3**

- [x]* 3.2 Write property test for cache expiration



  - **Property 28: Cache Expiration**
  - **Validates: Requirements 12.4**

- [ ]* 3.3 Write property test for configurable cache TTL
  - **Property 29: Configurable Cache TTL**
  - **Validates: Requirements 12.5**


- [ ] 4. Implement Rate Limiter middleware
  - Create rate_limiter.py with RateLimiter class
  - Implement request tracking per IP address
  - Implement rate limit checking with sliding window algorithm
  - Implement automatic cleanup of expired tracking data
  - Add Retry-After header to 429 responses
  - Support endpoint-specific rate limits from configuration
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x]* 4.1 Write property test for rate limiting lifecycle


  - **Property 17: Rate Limiting Lifecycle**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ]* 4.2 Write property test for endpoint-specific rate limits
  - **Property 18: Endpoint-Specific Rate Limits**
  - **Validates: Requirements 6.4**

- [ ]* 4.3 Write property test for rate limit response headers
  - **Property 19: Rate Limit Response Headers**
  - **Validates: Requirements 6.5**

- [ ] 5. Implement Translation Service
  - Create translation_service.py with TranslationService class
  - Implement translate() method with primary provider (Google Translate direct)
  - Implement fallback to secondary provider (MyMemory)
  - Implement fallback to tertiary provider (Google Translate via proxy)
  - Add timeout handling (5 seconds per provider)
  - Integrate with CacheService for caching translations
  - Add language code validation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 5.1 Write property test for translation API contract
  - **Property 5: Translation API Contract**
  - **Validates: Requirements 3.1**



- [ ]* 5.2 Write property test for translation provider fallback
  - **Property 6: Translation Provider Fallback**
  - **Validates: Requirements 3.2, 3.3**

- [ ]* 5.3 Write property test for translation response completeness
  - **Property 7: Translation Response Completeness**
  - **Validates: Requirements 3.4**

- [ ]* 5.4 Write property test for translation error handling
  - **Property 8: Translation Error Handling**
  - **Validates: Requirements 3.5**

- [ ] 6. Implement Dictionary Service
  - Create dictionary_service.py with DictionaryService class
  - Implement search() method with language detection
  - Implement English word lookup using Dictionary API
  - Implement non-English word translation to English before lookup
  - Implement definition translation to target language
  - Integrate with CacheService for caching dictionary results
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 Write property test for dictionary API contract
  - **Property 9: Dictionary API Contract**


  - **Validates: Requirements 4.1**

- [ ]* 6.2 Write property test for English word dictionary lookup
  - **Property 10: English Word Dictionary Lookup**
  - **Validates: Requirements 4.2**

- [ ]* 6.3 Write property test for non-English word translation flow
  - **Property 11: Non-English Word Translation Flow**
  - **Validates: Requirements 4.3**

- [ ]* 6.4 Write property test for dictionary definition translation
  - **Property 12: Dictionary Definition Translation**
  - **Validates: Requirements 4.4**


- [ ] 7. Implement Autocomplete functionality in Dictionary Service
  - Add autocomplete() method to DictionaryService
  - Implement English autocomplete using Datamuse API
  - Implement non-English autocomplete with translation
  - Implement result limit (max 10 suggestions)
  - Add translation for all suggestions
  - Integrate with CacheService for caching autocomplete results
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_



- [ ]* 7.1 Write property test for autocomplete API contract
  - **Property 13: Autocomplete API Contract**
  - **Validates: Requirements 5.1**

- [ ]* 7.2 Write property test for English autocomplete routing
  - **Property 14: English Autocomplete Routing**
  - **Validates: Requirements 5.2**

- [ ]* 7.3 Write property test for non-English autocomplete translation
  - **Property 15: Non-English Autocomplete Translation**
  - **Validates: Requirements 5.3**

- [ ]* 7.4 Write property test for autocomplete result limit
  - **Property 16: Autocomplete Result Limit**
  - **Validates: Requirements 5.4**

- [ ] 8. Implement Faster-Whisper STT Service
  - Create stt_service.py with STTService class
  - Install faster-whisper library
  - Implement model loading with faster-whisper (medium model, int8 quantization)
  - Implement transcribe() method with audio file handling
  - Implement FFmpeg audio conversion (webm to wav)
  - Implement hallucination filtering logic
  - Add language detection and manual language selection


  - Integrate with existing logging and exception services
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 8.1 Write property test for Whisper API contract
  - **Property 20: Whisper API Contract**
  - **Validates: Requirements 7.2**

- [ ]* 8.2 Write property test for Whisper response format
  - **Property 21: Whisper Response Format**
  - **Validates: Requirements 7.3**

- [ ] 9. Implement Vosk real-time STT Service (optional enhancement)
  - Download and configure Vosk models (English, Korean, Chinese)
  - Add Vosk engine support to STTService


  - Implement transcribe_stream() method for real-time streaming
  - Implement WebSocket endpoint for streaming audio
  - Add engine selection parameter (faster-whisper vs vosk)
  - _Requirements: 7.2, 7.3_

- [ ] 10. Create Translation API routes
  - Create routes/translation.py with Blueprint
  - Implement POST /api/translate endpoint
  - Add input validation (text length, language codes)
  - Integrate with TranslationService
  - Add error handling and logging
  - Return standardized response format
  - _Requirements: 3.1, 3.4, 3.5_

- [x]* 10.1 Write integration test for translation endpoint


  - Test successful translation request
  - Test invalid parameters (400 error)
  - Test translation failure (500 error)
  - _Requirements: 3.1, 3.4, 3.5_


- [ ] 11. Create Dictionary API routes
  - Create routes/dictionary.py with Blueprint
  - Implement GET /api/dictionary/search endpoint
  - Implement GET /api/dictionary/autocomplete endpoint
  - Add input validation (word length, query length)
  - Integrate with DictionaryService
  - Add error handling and logging


  - Return standardized response format
  - _Requirements: 4.1, 4.5, 5.1, 5.5_

- [ ]* 11.1 Write integration test for dictionary endpoints
  - Test dictionary search with English word
  - Test dictionary search with Korean word
  - Test autocomplete with various queries


  - Test validation errors
  - _Requirements: 4.1, 5.1_

- [ ] 12. Create STT API routes
  - Create routes/stt.py with Blueprint
  - Implement POST /api/stt/transcribe endpoint
  - Add audio file validation (format, size)
  - Integrate with STTService
  - Add error handling and logging
  - Return standardized response format
  - _Requirements: 7.2, 7.3, 7.4_

- [ ]* 12.1 Write integration test for STT endpoint
  - Test transcription with valid audio file
  - Test with invalid audio file (400 error)
  - Test with disabled service (503 error)
  - _Requirements: 7.2, 7.4_

- [ ] 13. Create Health Check API routes
  - Create routes/health.py with Blueprint
  - Implement GET /api/health endpoint
  - Check Translation Service availability
  - Check Dictionary Service availability
  - Check STT Service availability
  - Return overall health status and individual service statuses
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14. Implement input validation utilities
  - Create utils/validators.py
  - Implement validate_language_code() function
  - Implement validate_text_length() function
  - Implement validate_audio_file() function
  - Add custom validation exceptions
  - _Requirements: 11.3_

- [ ]* 14.1 Write property test for validation error response
  - **Property 25: Validation Error Response**
  - **Validates: Requirements 11.3**

- [ ] 15. Implement logging enhancements
  - Add log level filtering to existing LoggingService
  - Ensure all logs are in JSON format
  - Add request/response logging to all endpoints
  - Add execution time tracking
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 15.1 Write property test for log level filtering
  - **Property 22: Log Level Filtering**


  - **Validates: Requirements 8.4**

- [ ]* 15.2 Write property test for structured log format
  - **Property 23: Structured Log Format**
  - **Validates: Requirements 8.5**


- [ ] 16. Implement error handling enhancements
  - Ensure all errors return standardized format
  - Add specific error codes for different error types
  - Implement security filtering (no internal details in 500 errors)
  - Add trace_id to all error responses
  - _Requirements: 11.1, 11.2, 11.4, 11.5_

- [ ]* 16.1 Write property test for internal error security
  - **Property 26: Internal Error Security**
  - **Validates: Requirements 11.5**

- [ ] 17. Implement service failure isolation
  - Add try-catch blocks around each service initialization
  - Ensure other services continue if one fails
  - Add graceful degradation for optional services
  - Log service failures without crashing application
  - _Requirements: 9.4_

- [ ]* 17.1 Write property test for service failure isolation
  - **Property 24: Service Failure Isolation**



  - **Validates: Requirements 9.4**

- [ ] 18. Register all blueprints and finalize app.py
  - Register translation routes blueprint
  - Register dictionary routes blueprint
  - Register STT routes blueprint
  - Register health check routes blueprint
  - Apply rate limiter middleware to all routes
  - Configure CORS with production origins
  - _Requirements: 1.1, 1.2_

- [ ] 19. Create Docker configuration
  - Create Dockerfile with multi-stage build
  - Create docker-compose.yml for local development
  - Add .dockerignore file
  - Configure environment variables for Docker
  - Add health check to Docker configuration
  - _Requirements: 1.1_

- [ ] 20. Update frontend to use backend API
  - Update translator.jsx to call /api/translate
  - Update dictionary.jsx to call /api/dictionary/search and /api/dictionary/autocomplete
  - Update speech-to-text.jsx to call /api/stt/transcribe
  - Remove direct external API calls from frontend
  - Update error handling to use standardized error format
  - Add trace_id to frontend error logging
  - _Requirements: 3.1, 4.1, 5.1, 7.2_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Create deployment documentation
  - Document environment variables in README
  - Document API endpoints and request/response formats
  - Document deployment steps (Docker, manual)
  - Document monitoring and logging setup
  - Add troubleshooting guide
  - _Requirements: 2.1, 2.5_

- [ ] 23. Performance testing and optimization
  - Test cache hit rates and adjust TTL values
  - Test rate limiting under load
  - Measure API response times
  - Optimize external API timeout values
  - Test with concurrent requests
  - _Requirements: 6.1, 12.1_

- [ ] 24. Final Checkpoint - Production readiness check
  - Ensure all tests pass, ask the user if questions arise.
