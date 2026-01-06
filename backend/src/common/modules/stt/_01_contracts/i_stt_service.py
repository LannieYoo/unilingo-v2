#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT Service Interface
음성인식 서비스 인터페이스
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from werkzeug.datastructures import FileStorage


class ISTTService(ABC):
    """음성인식 서비스 인터페이스"""
    
    @abstractmethod
    def transcribe(
        self,
        audio_file: FileStorage,
        language: Optional[str] = None,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """오디오를 텍스트로 변환"""
        pass
    
    @abstractmethod
    def verify_dependencies(self) -> Dict[str, Any]:
        """의존성 확인"""
        pass
