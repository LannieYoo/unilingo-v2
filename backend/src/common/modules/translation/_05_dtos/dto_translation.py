#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation DTOs
번역 요청/응답 DTO
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class TranslateRequest:
    """번역 요청 DTO"""
    text: str
    source_lang: str
    target_lang: str
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TranslateRequest':
        return cls(
            text=data.get('text', ''),
            source_lang=data.get('source_lang', ''),
            target_lang=data.get('target_lang', '')
        )


@dataclass
class TranslateResponse:
    """번역 응답 DTO"""
    translated_text: str
    source_lang: str
    target_lang: str
    provider: str
    cached: bool
    trace_id: str
    retry_count: int = 0
    processing_time: float = 0.0
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            'translated_text': self.translated_text,
            'source_lang': self.source_lang,
            'target_lang': self.target_lang,
            'provider': self.provider,
            'cached': self.cached,
            'trace_id': self.trace_id
        }
        if self.error:
            result['error'] = self.error
        return result
