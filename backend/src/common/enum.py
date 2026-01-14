#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Enums and Constants
모든 열거형과 상수 정의
"""

# Auth related constants
AUTH_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
AUTH_REFRESH_TOKEN_EXPIRE_DAYS = 30

# Language codes
SUPPORTED_LANGUAGES = {
    'ko': '한국어',
    'en': 'English',
    'ja': '日本語',
    'zh': '中文',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
}

# STT related constants
STT_MAX_DURATION_SECONDS = 300  # 5 minutes
STT_SUPPORTED_FORMATS = ['wav', 'mp3', 'webm', 'ogg']

# Translation related constants
TRANSLATION_MAX_LENGTH = 5000

# Dictionary related constants
DICTIONARY_CACHE_TTL = 3600  # 1 hour

# HTTP Status codes
HTTP_OK = 200
HTTP_CREATED = 201
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403
HTTP_NOT_FOUND = 404
HTTP_INTERNAL_ERROR = 500
HTTP_SERVICE_UNAVAILABLE = 503
