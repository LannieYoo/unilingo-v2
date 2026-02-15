#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# DeepL Translation Service

import os
import requests
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class DeepLService:
    """DeepL 번역 서비스 (사전 전용, 월 500,000자 무료)"""
    
    def __init__(self):
        self.api_key = os.getenv('DEEPL_API_KEY')
        self.api_url = 'https://api-free.deepl.com/v2/translate'  # Free API
        self.usage_url = 'https://api-free.deepl.com/v2/usage'
        self.timeout = 10
        self.monthly_limit = 500000  # 월 500,000자
        
        if not self.api_key:
            logger.warning("DeepL API key not configured")
    
    def is_available(self) -> bool:
        """API 사용 가능 여부"""
        return bool(self.api_key)
    
    def get_usage(self) -> Optional[Dict[str, Any]]:
        """현재 사용량 조회"""
        if not self.is_available():
            return None
        
        try:
            headers = {'Authorization': f'DeepL-Auth-Key {self.api_key}'}
            response = requests.get(self.usage_url, headers=headers, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'character_count': data.get('character_count', 0),
                    'character_limit': data.get('character_limit', self.monthly_limit),
                    'remaining': data.get('character_limit', self.monthly_limit) - data.get('character_count', 0)
                }
            else:
                logger.error(f"DeepL usage API error: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"DeepL usage check failed: {e}")
            return None
    
    def has_quota(self) -> bool:
        """사용 가능한 할당량이 있는지 확인"""
        usage = self.get_usage()
        if not usage:
            # Usage API 실패 시에도 번역 시도 (API 호출 시 quota exceeded 에러로 확인 가능)
            logger.warning("DeepL usage check failed, will attempt translation anyway")
            return True
        return usage['remaining'] > 0
    
    def translate(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
        """
        DeepL 번역
        source_lang: 'en', 'ko', 'zh', etc.
        target_lang: 'ko', 'zh', 'en', etc.
        """
        if not self.is_available():
            return None
        
        # 할당량 확인
        if not self.has_quota():
            logger.warning("DeepL quota exceeded")
            return None
        
        # 언어 코드 변환
        source = self._convert_lang_code(source_lang)
        target = self._convert_lang_code(target_lang)
        
        if not source or not target:
            return None
        
        try:
            headers = {
                'Authorization': f'DeepL-Auth-Key {self.api_key}',
                'Content-Type': 'application/json'
            }
            payload = {
                'text': [text],
                'source_lang': source,
                'target_lang': target
            }
            
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=self.timeout)
            
            if response.status_code == 200:
                result = response.json()
                translations = result.get('translations', [])
                if translations:
                    return translations[0].get('text')
            elif response.status_code == 456:
                logger.warning("DeepL quota exceeded (456)")
                return None
            else:
                logger.error(f"DeepL API error: {response.status_code}, {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"DeepL API request failed: {e}")
            return None
    
    def _convert_lang_code(self, lang: str) -> Optional[str]:
        """언어 코드 변환 (우리 시스템 → DeepL)"""
        mapping = {
            'en': 'EN',
            'ko': 'KO',
            'zh': 'ZH',
            'zh-CN': 'ZH',
            'zh-TW': 'ZH'
        }
        return mapping.get(lang)


_deepl_service: Optional[DeepLService] = None


def get_deepl_service() -> DeepLService:
    """전역 DeepL 서비스 인스턴스 반환"""
    global _deepl_service
    if _deepl_service is None:
        _deepl_service = DeepLService()
    return _deepl_service
