#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Package
공통 패키지
"""

from .enum import (
    AUTH_TOKEN_EXPIRE_MINUTES,
    AUTH_REFRESH_TOKEN_EXPIRE_DAYS,
    SUPPORTED_LANGUAGES,
    STT_MAX_DURATION_SECONDS,
    STT_SUPPORTED_FORMATS,
    TRANSLATION_MAX_LENGTH,
    DICTIONARY_CACHE_TTL,
    HTTP_OK,
    HTTP_CREATED,
    HTTP_BAD_REQUEST,
    HTTP_UNAUTHORIZED,
    HTTP_FORBIDDEN,
    HTTP_NOT_FOUND,
    HTTP_INTERNAL_ERROR,
    HTTP_SERVICE_UNAVAILABLE,
)

from .errors import (
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    SessionExpiredError,
    TokenExpiredError,
    ExternalServiceError,
)

from .response import (
    success_response,
    error_response,
    paginate_response,
)

from .helper import (
    generate_uuid,
    generate_trace_id,
    get_utc_now,
    to_iso_format,
    hash_string,
    truncate_string,
    snake_to_camel,
    camel_to_snake,
    keys_to_camel,
    keys_to_snake,
    safe_get,
    chunk_list,
    retry,
    timing,
    paginate,
    validate_email,
    sanitize_string,
    mask_sensitive,
)

from .auth import (
    get_token_from_header,
    get_current_user_id,
    get_current_user,
    is_authenticated,
    require_auth,
    require_admin,
)

from .config import (
    Config,
    DevelopmentConfig,
    ProductionConfig,
    TestingConfig,
    get_config,
)

from .supabase import (
    get_db,
    get_supabase,
    supabase_client,
    check_connection,
    Base,
)

from .modules import (
    init_cors,
    init_request_logger,
    init_error_handler,
    init_rate_limiter,
    init_logging,
    get_logger,
    ICustomException,
    TranslationError,
    DictionaryError,
    STTError,
    CacheError,
    CacheService,
    TranslationService,
    translation_bp,
    DictionaryService,
    dictionary_bp,
    STTService,
    stt_bp,
    health_bp,
    auth_bp,
    admin_bp,
    login_required,
    get_optional_user,
    admin_required,
    is_admin,
)

__all__ = [
    # Enum
    'AUTH_TOKEN_EXPIRE_MINUTES',
    'AUTH_REFRESH_TOKEN_EXPIRE_DAYS',
    'SUPPORTED_LANGUAGES',
    'STT_MAX_DURATION_SECONDS',
    'STT_SUPPORTED_FORMATS',
    'TRANSLATION_MAX_LENGTH',
    'DICTIONARY_CACHE_TTL',
    'HTTP_OK',
    'HTTP_CREATED',
    'HTTP_BAD_REQUEST',
    'HTTP_UNAUTHORIZED',
    'HTTP_FORBIDDEN',
    'HTTP_NOT_FOUND',
    'HTTP_INTERNAL_ERROR',
    'HTTP_SERVICE_UNAVAILABLE',
    # Errors
    'AppError',
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'NotFoundError',
    'SessionExpiredError',
    'TokenExpiredError',
    'ExternalServiceError',
    # Response
    'success_response',
    'error_response',
    'paginate_response',
    # Helper
    'generate_uuid',
    'generate_trace_id',
    'get_utc_now',
    'to_iso_format',
    'hash_string',
    'truncate_string',
    'snake_to_camel',
    'camel_to_snake',
    'keys_to_camel',
    'keys_to_snake',
    'safe_get',
    'chunk_list',
    'retry',
    'timing',
    'paginate',
    'validate_email',
    'sanitize_string',
    'mask_sensitive',
    # Auth
    'get_token_from_header',
    'get_current_user_id',
    'get_current_user',
    'is_authenticated',
    'require_auth',
    'require_admin',
    # Config
    'Config',
    'DevelopmentConfig',
    'ProductionConfig',
    'TestingConfig',
    'get_config',
    # Supabase (Database)
    'get_db',
    'get_supabase',
    'supabase_client',
    'check_connection',
    'Base',
    # Middleware
    'init_cors',
    'init_request_logger',
    'init_error_handler',
    'init_rate_limiter',
    'init_logging',
    'get_logger',
    # Exception
    'ICustomException',
    'TranslationError',
    'DictionaryError',
    'STTError',
    'CacheError',
    # Cache
    'CacheService',
    # Translation
    'TranslationService',
    'translation_bp',
    # Dictionary
    'DictionaryService',
    'dictionary_bp',
    # STT
    'STTService',
    'stt_bp',
    # Health
    'health_bp',
    # Auth blueprints
    'auth_bp',
    'admin_bp',
    'login_required',
    'get_optional_user',
    'admin_required',
    'is_admin',
]
