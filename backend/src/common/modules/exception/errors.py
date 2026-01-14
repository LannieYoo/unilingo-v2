#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Exception Errors - 에러 타입 정의

from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any


class IException(ABC):
    """예외 서비스 인터페이스"""
    
    @abstractmethod
    def get_code(self) -> str:
        pass
    
    @abstractmethod
    def get_message(self) -> str:
        pass
    
    @abstractmethod
    def get_details(self) -> Optional[Dict[str, Any]]:
        pass


class EExceptionLevel(str, Enum):
    """예외 심각도 레벨"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class DExceptionContext:
    """예외 컨텍스트 데이터"""
    trace_id: str
    source: str
    module: str
    function: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    user_id: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


class BaseAppException(Exception):
    """애플리케이션 기본 예외"""
    
    def __init__(self, message: str, code: str = "APP_ERROR", details: Optional[Dict[str, Any]] = None):
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
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", details)


class TranslationError(BaseAppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "TRANSLATION_ERROR", details)


class DictionaryError(BaseAppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "DICTIONARY_ERROR", details)


class STTError(BaseAppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "STT_ERROR", details)


class CacheError(BaseAppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CACHE_ERROR", details)


class ConfigError(BaseAppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CONFIG_ERROR", details)
