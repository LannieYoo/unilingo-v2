#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# LibreTranslate Service for Dictionary

import os
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LibreTranslateService:
    """LibreTranslate 번역 서비스 (사전용)"""
    
    def __init__(self):
        # 공개 API 또는 자체 호스팅 URL
        self.api_url = os.getenv('LIBRETRANSLATE_URL', 'https://libretranslate.com/translate')
        self.api_key = os.getenv('LIBRETRANSLATE_API_KEY')  # 선택사항
        self.timeout = 10
    
    def is_available(self) -> bool:
        """API 사용 가능 여부"""
        return True  # 공개 API는 항상 사용 가능
    
    def translate(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
        """
        LibreTranslate 번역
        source_lang: 'en', 'ko', 'zh', etc.
        target_lang: 'ko', 'zh', 'en', etc.
        """
        # 언어 코드 변환
        source = self._convert_lang_code(source_lang)
        target = self._convert_lang_code(target_lang)
        
        if not source or not target:
            return None
        
        try:
            payload = {
                'q': text,
                'source': source,
                'target': target,
                'format': 'text'
            }
            
            # API 키가 있으면 추가
            if self.api_key:
                payload['api_key'] = self.api_key
            
            response = requests.post(self.api_url, json=payload, timeout=self.timeout)
            
            if response.status_code == 200:
                result = response.json()
                translated_text = result.get('translatedText')
                return translated_text
            else:
                logger.error(f"LibreTranslate API error: {response.status_code}, {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"LibreTranslate API request failed: {e}")
            return None
    
    def _convert_lang_code(self, lang: str) -> Optional[str]:
        """언어 코드 변환 (우리 시스템 → LibreTranslate)"""
        mapping = {
            'en': 'en',
            'ko': 'ko',
            'zh': 'zh',
            'zh-CN': 'zh',
            'zh-TW': 'zh'
        }
        return mapping.get(lang)


_libretranslate_service: Optional[LibreTranslateService] = None


def get_naver_dict_service() -> LibreTranslateService:
    """전역 LibreTranslate 서비스 인스턴스 반환"""
    global _libretranslate_service
    if _libretranslate_service is None:
        _libretranslate_service = LibreTranslateService()
    return _libretranslate_service
