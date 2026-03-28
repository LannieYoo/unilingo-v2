#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Config
설정 관리
"""

import os
from pathlib import Path
from dotenv import load_dotenv


root_env = Path(__file__).parent.parent.parent.parent / '.env'
backend_env = Path(__file__).parent.parent.parent / '.env'

if root_env.exists():
    load_dotenv(root_env)
if backend_env.exists():
    load_dotenv(backend_env, override=True)


class Config:
    """기본 설정"""
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    HOST = os.getenv('FLASK_HOST', '127.0.0.1')
    PORT = int(os.getenv('FLASK_PORT', 8001))
    
    CORS_ORIGINS = os.getenv(
        'CORS_ORIGINS',
        'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173'
    ).split(',')
    
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_DIR = os.getenv('LOG_DIR', '../logs')
    
    CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
    CACHE_TTL_TRANSLATION = int(os.getenv('CACHE_TTL_TRANSLATION', 86400))
    CACHE_TTL_DICTIONARY = int(os.getenv('CACHE_TTL_DICTIONARY', 604800))
    CACHE_TTL_AUTOCOMPLETE = int(os.getenv('CACHE_TTL_AUTOCOMPLETE', 3600))
    
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_TRANSLATION = os.getenv('RATE_LIMIT_TRANSLATION', '1000/minute')
    RATE_LIMIT_DICTIONARY = os.getenv('RATE_LIMIT_DICTIONARY', '500/minute')
    RATE_LIMIT_AUTOCOMPLETE = os.getenv('RATE_LIMIT_AUTOCOMPLETE', '1000/minute')
    RATE_LIMIT_STT = os.getenv('RATE_LIMIT_STT', '200/minute')
    
    STT_ENABLED = os.getenv('STT_ENABLED', 'true').lower() == 'true'
    STT_ENGINE = os.getenv('STT_ENGINE', 'faster-whisper')
    STT_MODEL = os.getenv('STT_MODEL', 'medium')
    STT_DEVICE = os.getenv('STT_DEVICE', 'cpu')
    STT_COMPUTE_TYPE = os.getenv('STT_COMPUTE_TYPE', 'int8')
    
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/unilingo')
    
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_TRANSLATE_API_KEY = os.getenv('GOOGLE_TRANSLATE_API_KEY', None)
    MYMEMORY_API_KEY = os.getenv('MYMEMORY_API_KEY', None)
    
    ADMIN_USER = os.getenv('ADMIN_USER', '')


class DevelopmentConfig(Config):
    """개발 환경 설정"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """운영 환경 설정"""
    DEBUG = False
    LOG_LEVEL = 'INFO'


class TestingConfig(Config):
    """테스트 환경 설정"""
    TESTING = True
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    CACHE_ENABLED = False
    RATE_LIMIT_ENABLED = False


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name: str = None) -> Config:
    """설정 객체 반환"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    return config_map.get(config_name, config_map['default'])
