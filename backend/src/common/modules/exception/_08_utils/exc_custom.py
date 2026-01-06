#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Custom Exceptions
애플리케이션 전용 예외 클래스
"""

from typing import Optional, Dict, Any


class BaseAppException(Exception):
    """애플리케이션 기본 예외"""
    
    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)
    
    def get_code(self) -> str:
        return self.code
    
    def get_message(self) -> str:
        return self.message
    
    def get_details(self) -> Dict[str, Any]:
        return self.details


class ValidationError(BaseAppException):
    """입력 검증 오류"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", details)


class TranslationError(BaseAppException):
    """번역 서비스 오류"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "TRANSLATION_ERROR", details)


class DictionaryError(BaseAppException):
    """사전 서비스 오류"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "DICTIONARY_ERROR", details)


class STTError(BaseAppException):
    """음성인식 서비스 오류"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "STT_ERROR", details)


class CacheError(BaseAppException):
    """캐시 서비스 오류"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CACHE_ERROR", details)


class ConfigError(BaseAppException):
    """설정 오류"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CONFIG_ERROR", details)
