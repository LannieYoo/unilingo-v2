#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Service
Handles text translation with multiple provider fallback and enhanced error handling
"""

import requests
import json
import time
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from .cache_service import get_cache_service
from ..middleware.error_handler import TranslationError

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class ProviderAttempt:
    """Record of a translation provider attempt"""
    provider_name: str
    success: bool
    error_message: Optional[str] = None
    response_time: Optional[float] = None
    timeout_used: Optional[float] = None


class TranslationService:
    """Translation service with multiple provider fallback and retry logic"""
    
    def __init__(self, cache_enabled: bool = True, cache_ttl: int = 86400):
        """
        Initialize translation service
        
        Args:
            cache_enabled: Enable caching
            cache_ttl: Cache TTL in seconds (default: 24 hours)
        """
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl
        self.cache = get_cache_service() if cache_enabled else None
        
        # Progressive timeout strategy: start with 5s, then 3s, then 1s
        self.timeout_strategy = [5.0, 3.0, 1.0]
        self.max_retries = 2  # Maximum retries per provider
        
        # Provider health tracking
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
        """
        Translate text from source to target language with retry logic
        
        Args:
            text: Text to translate
            source_lang: Source language code (ko, en, zh)
            target_lang: Target language code
            trace_id: Request trace ID
            
        Returns:
            {
                'translated_text': str,
                'source_lang': str,
                'target_lang': str,
                'provider': str,
                'cached': bool,
                'retry_count': int,
                'provider_attempts': list,
                'processing_time': float
            }
            
        Raises:
            TranslationError: If all providers fail
        """
        start_time = time.time()
        provider_attempts = []
        
        logger.info(f"Translation request: {source_lang}->{target_lang}, trace_id: {trace_id}")
        
        # Validate languages
        valid_langs = ['ko', 'en', 'zh']
        if source_lang not in valid_langs or target_lang not in valid_langs:
            raise TranslationError(f"Invalid language code. Must be one of: {valid_langs}")
        
        # Same language - no translation needed
        if source_lang == target_lang:
            return {
                'translated_text': text,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'provider': 'none',
                'cached': False,
                'retry_count': 0,
                'provider_attempts': [],
                'processing_time': time.time() - start_time
            }
        
        # Check cache
        cache_key = None
        if self.cache_enabled:
            cache_key = self.cache.generate_key(
                'translate',
                source=source_lang,
                target=target_lang,
                text=text[:100]  # Use first 100 chars for key
            )
            cached_result = self.cache.get(cache_key)
            if cached_result:
                cached_result['cached'] = True
                cached_result['processing_time'] = time.time() - start_time
                logger.info(f"Cache hit for translation, trace_id: {trace_id}")
                return cached_result
        
        # Get providers ordered by health (best first)
        providers = self._get_ordered_providers()
        
        # Try each provider with retry logic
        for provider_name, provider_func in providers:
            success, result, attempts = self._try_provider_with_retry(
                provider_func, provider_name, text, source_lang, target_lang, trace_id
            )
            provider_attempts.extend(attempts)
            
            if success and result:
                # Update provider health
                self._update_provider_health(provider_name, True)
                
                final_result = {
                    'translated_text': result,
                    'source_lang': source_lang,
                    'target_lang': target_lang,
                    'provider': provider_name,
                    'cached': False,
                    'retry_count': len(attempts) - 1,
                    'provider_attempts': [attempt.__dict__ for attempt in provider_attempts],
                    'processing_time': time.time() - start_time
                }
                
                # Cache successful result
                if self.cache_enabled and cache_key:
                    self.cache.set(cache_key, final_result, self.cache_ttl)
                
                logger.info(f"Translation successful with {provider_name}, trace_id: {trace_id}")
                return final_result
            else:
                # Update provider health
                self._update_provider_health(provider_name, False)
        
        # All providers failed - return original text with error indicator
        logger.error(f"All translation providers failed, trace_id: {trace_id}")
        
        # Return original text as fallback
        return {
            'translated_text': text,
            'source_lang': source_lang,
            'target_lang': target_lang,
            'provider': 'fallback',
            'cached': False,
            'retry_count': sum(len(self.timeout_strategy) for _ in providers),
            'provider_attempts': [attempt.__dict__ for attempt in provider_attempts],
            'processing_time': time.time() - start_time,
            'error': 'All providers failed - returned original text'
        }
    
    def _get_ordered_providers(self) -> List[Tuple[str, callable]]:
        """Get providers ordered by health (least failures first)"""
        providers = [
            ('google_direct', self._translate_google_direct),
            ('mymemory', self._translate_mymemory),
            ('google_proxy', self._translate_google_proxy)
        ]
        
        # Sort by failure count (ascending) and last success (descending)
        def sort_key(provider_tuple):
            name = provider_tuple[0]
            health = self.provider_health[name]
            return (health['failures'], -(health['last_success'] or 0))
        
        return sorted(providers, key=sort_key)
    
    def _update_provider_health(self, provider_name: str, success: bool):
        """Update provider health tracking"""
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
    ) -> Tuple[bool, Optional[str], List[ProviderAttempt]]:
        """
        Try a provider with progressive timeout retry logic
        
        Returns:
            (success, translated_text, attempts_list)
        """
        attempts = []
        
        for timeout in self.timeout_strategy:
            attempt_start = time.time()
            
            try:
                logger.debug(f"Trying {provider_name} with {timeout}s timeout, trace_id: {trace_id}")
                
                translated_text = provider_func(text, source_lang, target_lang, timeout)
                response_time = time.time() - attempt_start
                
                if translated_text and translated_text.strip() and translated_text != text:
                    attempts.append(ProviderAttempt(
                        provider_name=provider_name,
                        success=True,
                        response_time=response_time,
                        timeout_used=timeout
                    ))
                    return True, translated_text, attempts
                else:
                    attempts.append(ProviderAttempt(
                        provider_name=provider_name,
                        success=False,
                        error_message="Empty or unchanged translation",
                        response_time=response_time,
                        timeout_used=timeout
                    ))
                    
            except requests.exceptions.Timeout:
                response_time = time.time() - attempt_start
                attempts.append(ProviderAttempt(
                    provider_name=provider_name,
                    success=False,
                    error_message=f"Timeout after {timeout}s",
                    response_time=response_time,
                    timeout_used=timeout
                ))
                logger.debug(f"{provider_name} timeout after {timeout}s, trace_id: {trace_id}")
                
            except Exception as e:
                response_time = time.time() - attempt_start
                attempts.append(ProviderAttempt(
                    provider_name=provider_name,
                    success=False,
                    error_message=str(e),
                    response_time=response_time,
                    timeout_used=timeout
                ))
                logger.debug(f"{provider_name} error: {e}, trace_id: {trace_id}")
                break  # Don't retry on non-timeout errors
        
        return False, None, attempts
    
    def health_check_providers(self) -> Dict[str, Dict[str, Any]]:
        """
        Check health of all translation providers
        
        Returns:
            Dictionary with provider health information
        """
        health_status = {}
        test_text = "Hello"
        
        for provider_name in self.provider_health.keys():
            provider_func = getattr(self, f'_translate_{provider_name}')
            
            try:
                start_time = time.time()
                result = provider_func(test_text, 'en', 'ko', 2.0)  # 2 second timeout for health check
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

    def _translate_google_direct(self, text: str, source_lang: str, target_lang: str, timeout: float = 5.0) -> Optional[str]:
        """Translate using Google Translate API (direct)"""
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
    
    def _translate_mymemory(self, text: str, source_lang: str, target_lang: str, timeout: float = 5.0) -> Optional[str]:
        """Translate using MyMemory API"""
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
            # Clean up MyMemory artifacts
            import re
            translated = re.sub(r'<[^>]*>', '', translated).strip()
            return translated if translated and translated.upper() != text.upper() else None
        
        return None
    
    def _translate_google_proxy(self, text: str, source_lang: str, target_lang: str, timeout: float = 5.0) -> Optional[str]:
        """Translate using Google Translate via proxy"""
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


# Global service instance
_translation_service: Optional[TranslationService] = None


def get_translation_service(cache_enabled: bool = True, cache_ttl: int = 86400) -> TranslationService:
    """Get or create global translation service instance"""
    global _translation_service
    
    if _translation_service is None:
        _translation_service = TranslationService(cache_enabled, cache_ttl)
    
    return _translation_service
