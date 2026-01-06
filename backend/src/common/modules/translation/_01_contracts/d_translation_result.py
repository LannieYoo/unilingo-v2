#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Result Data Contract
번역 결과 데이터 계약
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class DProviderAttempt:
    """번역 제공자 시도 기록"""
    provider_name: str
    success: bool
    error_message: Optional[str] = None
    response_time: Optional[float] = None
    timeout_used: Optional[float] = None


@dataclass
class DTranslationResult:
    """번역 결과 데이터"""
    translated_text: str
    source_lang: str
    target_lang: str
    provider: str
    cached: bool = False
    retry_count: int = 0
    provider_attempts: List[DProviderAttempt] = field(default_factory=list)
    processing_time: float = 0.0
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리로 변환"""
        return {
            'translated_text': self.translated_text,
            'source_lang': self.source_lang,
            'target_lang': self.target_lang,
            'provider': self.provider,
            'cached': self.cached,
            'retry_count': self.retry_count,
            'provider_attempts': [
                {
                    'provider_name': a.provider_name,
                    'success': a.success,
                    'error_message': a.error_message,
                    'response_time': a.response_time,
                    'timeout_used': a.timeout_used
                }
                for a in self.provider_attempts
            ],
            'processing_time': self.processing_time,
            'error': self.error
        }
