#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configuration Management
Loads and manages environment-specific configuration
"""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv


# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)


class Config:
    """Base configuration"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Server Configuration
    HOST = os.getenv('FLASK_HOST', '127.0.0.1')
    PORT = int(os.getenv('FLASK_PORT', 8000))
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5173').split(',')
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_DIR = os.getenv('LOG_DIR', '../logs')
    
    # Cache Configuration
    CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
    CACHE_TTL_TRANSLATION = int(os.getenv('CACHE_TTL_TRANSLATION', 86400))  # 24 hours
    CACHE_TTL_DICTIONARY = int(os.getenv('CACHE_TTL_DICTIONARY', 604800))  # 7 days
    CACHE_TTL_AUTOCOMPLETE = int(os.getenv('CACHE_TTL_AUTOCOMPLETE', 3600))  # 1 hour
    
    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_TRANSLATION = os.getenv('RATE_LIMIT_TRANSLATION', '1000/minute')  # 실시간 번역용 높은 제한
    RATE_LIMIT_DICTIONARY = os.getenv('RATE_LIMIT_DICTIONARY', '500/minute')
    RATE_LIMIT_AUTOCOMPLETE = os.getenv('RATE_LIMIT_AUTOCOMPLETE', '1000/minute')
    RATE_LIMIT_STT = os.getenv('RATE_LIMIT_STT', '200/minute')
    
    # STT Configuration
    STT_ENABLED = os.getenv('STT_ENABLED', 'true').lower() == 'true'
    STT_ENGINE = os.getenv('STT_ENGINE', 'faster-whisper')  # 'faster-whisper', 'vosk', 'hybrid'
    STT_MODEL = os.getenv('STT_MODEL', 'medium')
    STT_DEVICE = os.getenv('STT_DEVICE', 'cpu')
    STT_COMPUTE_TYPE = os.getenv('STT_COMPUTE_TYPE', 'int8')
    
    # External API Keys (if needed)
    GOOGLE_TRANSLATE_API_KEY = os.getenv('GOOGLE_TRANSLATE_API_KEY', None)
    MYMEMORY_API_KEY = os.getenv('MYMEMORY_API_KEY', None)


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    LOG_LEVEL = 'INFO'
    
    # Validate required configuration in production
    @classmethod
    def validate(cls):
        """Validate production configuration"""
        if cls.SECRET_KEY == 'dev-secret-key-change-in-production':
            raise ValueError("SECRET_KEY must be set in production environment")


class TestingConfig(Config):
    """Testing environment configuration"""
    TESTING = True
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    CACHE_ENABLED = False
    RATE_LIMIT_ENABLED = False


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name: str = None) -> Config:
    """
    Get configuration by name
    
    Args:
        config_name: Configuration environment name (development, production, testing)
                    If None, uses FLASK_ENV environment variable
    
    Returns:
        Configuration class
    """
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    return config.get(config_name, config['default'])
