#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Service Interface
번역 서비스 인터페이스
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class ITranslationService(ABC):
    """번역 서비스 인터페이스"""
    
    @abstractmethod
    def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """텍스트 번역"""
        pass
    
    @abstractmethod
    def health_check_providers(self) -> Dict[str, Dict[str, Any]]:
        """번역 제공자 상태 확인"""
        pass
