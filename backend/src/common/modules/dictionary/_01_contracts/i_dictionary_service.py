#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary Service Interface
사전 서비스 인터페이스
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class IDictionaryService(ABC):
    """사전 서비스 인터페이스"""
    
    @abstractmethod
    def search(
        self,
        word: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """단어 검색"""
        pass
    
    @abstractmethod
    def autocomplete(
        self,
        query: str,
        language: Optional[str],
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """자동완성 제안"""
        pass
    
    @abstractmethod
    def detect_language(self, text: str) -> Optional[str]:
        """언어 감지"""
        pass
