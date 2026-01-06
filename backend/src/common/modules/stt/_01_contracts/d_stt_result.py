#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT Result Data Contract
음성인식 결과 데이터 계약
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class DSTTResult:
    """음성인식 결과 데이터"""
    text: str
    language: str
    filtered: bool = False
    confidence: float = 0.0
    fallback_used: bool = False
    processing_details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'text': self.text,
            'language': self.language,
            'filtered': self.filtered,
            'confidence': self.confidence,
            'fallback_used': self.fallback_used,
            'processing_details': self.processing_details
        }
