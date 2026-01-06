#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Service Implementation
번역 서비스 구현
"""

import requests
import json
import time
import logging
from typing import Dict, Any, Optional, List, Tuple

from .._01_contracts import ITranslationService, DTranslationResult, DProviderAttempt
from ...cache import get_cache_service
from ...exception import TranslationError

logger = logging.getLogger(__name__)


class TranslationService(ITranslationService):
    """다중 제공자 폴백을 지원하는 번역 서비스"""
    
    VALID_LANGS = ['ko', 'en', 'zh']
    
    def __init__(self, cache_enabled: bool = True, cache_ttl: int = 86400):
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl
        self.cache = get_cache_service() if cache_enabled else None
        
        # 점진적 타임아웃 전략
        self.timeout_strategy = [5.0, 3.0, 1.0]
        
        # 제공자 상태 추적
        self.provider_health = {
            'google_direct': {'failures': 0, 'last_success': None},
            'mymemory': {'failures': 0, 'last_success': None},
            'google_proxy': {'failures': 0, 'last_success': None}
        }
    
    def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """텍스트 번역"""
        start_time = time.time()
        provider_attempts = []
        
        logger.info(f"Translation: {source_lang}->{target_lang}, trace_id: {trace_id}")
        
        # 언어 검증
        if source_lang not in self.VALID_LANGS or target_lang not in self.VALID_LANGS:
            raise TranslationError(f"Invalid language. Must be one of: {self.VALID_LANGS}")
        
        # 동일 언어
        if source_lang == target_lang:
            return DTranslationResult(
                translated_text=text,
                source_lang=source_lang,
                target_lang=target_lang,
                provider='none',
                processing_time=time.time() - start_time
            ).to_dict()
        
        # 캐시 확인
        cache_key = None
        if self.cache_enabled:
            cache_key = self.cache.generate_key(
                'translate',
                source=source_lang,
                target=target_lang,
                text=text[:100]
            )
            cached_result = self.cache.get(cache_key)
            if cached_result:
                cached_result['cached'] = True
                cached_result['processing_time'] = time.time() - start_time
                return cached_result
        
        # 제공자 순서 (상태 기반)
        providers = self._get_ordered_providers()
        
        # 각 제공자 시도
        for provider_name, provider_func in providers:
            success, result, attempts = self._try_provider_with_retry(
                provider_func, provider_name, text, source_lang, target_lang, trace_id
            )
            provider_attempts.extend(attempts)
            
            if success and result:
                self._update_provider_health(provider_name, True)
                
                final_result = DTranslationResult(
                    translated_text=result,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    provider=provider_name,
                    retry_count=len(attempts) - 1,
                    provider_attempts=provider_attempts,
                    processing_time=time.time() - start_time
                ).to_dict()
                
                if self.cache_enabled and cache_key:
                    self.cache.set(cache_key, final_result, self.cache_ttl)
                
                return final_result
            else:
                self._update_provider_health(provider_name, False)
        
        # 모든 제공자 실패 - 원본 텍스트 반환
        logger.error(f"All providers failed, trace_id: {trace_id}")
        
        return DTranslationResult(
            translated_text=text,
            source_lang=source_lang,
            target_lang=target_lang,
            provider='fallback',
            retry_count=sum(len(self.timeout_strategy) for _ in providers),
            provider_attempts=[
                DProviderAttempt(**a.__dict__) if hasattr(a, '__dict__') else a
                for a in provider_attempts
            ],
            processing_time=time.time() - start_time,
            error='All providers failed'
        ).to_dict()
    
    def health_check_providers(self) -> Dict[str, Dict[str, Any]]:
        """번역 제공자 상태 확인"""
        health_status = {}
        test_text = "Hello"
        
        for provider_name in self.provider_health.keys():
            provider_func = getattr(self, f'_translate_{provider_name}')
            
            try:
                start_time = time.time()
                result = provider_func(test_text, 'en', 'ko', 2.0)
                response_time = time.time() - start_time
                
                health_status[provider_name] = {
                    'available': result is not None,
                    'response_time': response_time,
                    'failures': self.provider_health[provider_name]['failures'],
                    'last_success': self.provider_health[provider_name]['last_success'],
                    'error': None
                }
            except Exception as e:
                health_status[provider_name] = {
                    'available': False,
                    'response_time': None,
                    'failures': self.provider_health[provider_name]['failures'],
                    'last_success': self.provider_health[provider_name]['last_success'],
                    'error': str(e)
                }
        
        return health_status
    
    def _get_ordered_providers(self) -> List[Tuple[str, callable]]:
        """상태 기반 제공자 순서"""
        providers = [
            ('google_direct', self._translate_google_direct),
            ('mymemory', self._translate_mymemory),
            ('google_proxy', self._translate_google_proxy)
        ]
        
        def sort_key(provider_tuple):
            name = provider_tuple[0]
            health = self.provider_health[name]
            return (health['failures'], -(health['last_success'] or 0))
        
        return sorted(providers, key=sort_key)
    
    def _update_provider_health(self, provider_name: str, success: bool):
        """제공자 상태 갱신"""
        if provider_name in self.provider_health:
            if success:
                self.provider_health[provider_name]['failures'] = 0
                self.provider_health[provider_name]['last_success'] = time.time()
            else:
                self.provider_health[provider_name]['failures'] += 1
    
    def _try_provider_with_retry(
        self,
        provider_func: callable,
        provider_name: str,
        text: str,
        source_lang: str,
        target_lang: str,
        trace_id: Optional[str]
    ) -> Tuple[bool, Optional[str], List[DProviderAttempt]]:
        """재시도 로직으로 제공자 시도"""
        attempts = []
        
        for timeout in self.timeout_strategy:
            attempt_start = time.time()
            
            try:
                translated_text = provider_func(text, source_lang, target_lang, timeout)
                response_time = time.time() - attempt_start
                
                if translated_text and translated_text.strip() and translated_text != text:
                    attempts.append(DProviderAttempt(
                        provider_name=provider_name,
                        success=True,
                        response_time=response_time,
                        timeout_used=timeout
                    ))
                    return True, translated_text, attempts
                else:
                    attempts.append(DProviderAttempt(
                        provider_name=provider_name,
                        success=False,
                        error_message="Empty or unchanged",
                        response_time=response_time,
                        timeout_used=timeout
                    ))
                    
            except requests.exceptions.Timeout:
                response_time = time.time() - attempt_start
                attempts.append(DProviderAttempt(
                    provider_name=provider_name,
                    success=False,
                    error_message=f"Timeout after {timeout}s",
                    response_time=response_time,
                    timeout_used=timeout
                ))
                
            except Exception as e:
                response_time = time.time() - attempt_start
                attempts.append(DProviderAttempt(
                    provider_name=provider_name,
                    success=False,
                    error_message=str(e),
                    response_time=response_time,
                    timeout_used=timeout
                ))
                break
        
        return False, None, attempts
    
    def _translate_google_direct(
        self, text: str, source_lang: str, target_lang: str, timeout: float = 5.0
    ) -> Optional[str]:
        """Google Translate 직접 호출"""
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            'client': 'gtx',
            'sl': source_lang,
            'tl': target_lang,
            'dt': 't',
            'q': text
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, params=params, timeout=timeout, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if data and data[0] and isinstance(data[0], list):
            translated = ''.join(
                item[0] for item in data[0]
                if item and isinstance(item, list) and len(item) > 0
            ).strip()
            return translated if translated else None
        
        return None
    
    def _translate_mymemory(
        self, text: str, source_lang: str, target_lang: str, timeout: float = 5.0
    ) -> Optional[str]:
        """MyMemory API 호출"""
        import re
        
        url = "https://api.mymemory.translated.net/get"
        params = {
            'q': text,
            'langpair': f"{source_lang}|{target_lang}"
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, params=params, timeout=timeout, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if data.get('responseStatus') == 200 and data.get('responseData'):
            translated = data['responseData'].get('translatedText', '')
            translated = re.sub(r'<[^>]*>', '', translated).strip()
            return translated if translated and translated.upper() != text.upper() else None
        
        return None
    
    def _translate_google_proxy(
        self, text: str, source_lang: str, target_lang: str, timeout: float = 5.0
    ) -> Optional[str]:
        """Google Translate 프록시 호출"""
        google_url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={requests.utils.quote(text)}"
        proxy_url = f"https://api.allorigins.win/get?url={requests.utils.quote(google_url)}"
        
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(proxy_url, timeout=timeout, headers=headers)
        response.raise_for_status()
        
        proxy_data = response.json()
        if proxy_data.get('contents'):
            try:
                data = json.loads(proxy_data['contents'])
                if data and data[0] and isinstance(data[0], list):
                    translated = ''.join(
                        item[0] for item in data[0]
                        if item and isinstance(item, list) and len(item) > 0
                    ).strip()
                    return translated if translated else None
            except json.JSONDecodeError:
                return None
        
        return None


# 전역 서비스 인스턴스
_translation_service: Optional[TranslationService] = None


def get_translation_service(
    cache_enabled: bool = True,
    cache_ttl: int = 86400
) -> TranslationService:
    """전역 번역 서비스 인스턴스 반환"""
    global _translation_service
    
    if _translation_service is None:
        _translation_service = TranslationService(cache_enabled, cache_ttl)
    
    return _translation_service
