#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary Service - 비즈니스 로직

import re
import requests
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from ..cache import get_cache_service
from ..translation import get_translation_service

logger = logging.getLogger(__name__)


class DictionaryService:
    """사전 서비스"""
    
    def __init__(self, cache_enabled: bool = True, cache_ttl: int = 604800):
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl  # 7 days
        self.cache = get_cache_service() if cache_enabled else None
        self.translation_service = get_translation_service()
        self.timeout = 5
    
    def detect_language(self, text: str) -> Optional[str]:
        """언어 감지"""
        if not text.strip():
            return None
        if re.search(r'[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]', text):
            return 'ko'
        if re.search(r'[\u4E00-\u9FFF]', text):
            return 'zh'
        if re.search(r'[A-Za-z]', text):
            return 'en'
        return None
    
    def search(self, word: str, target_lang: str, trace_id: Optional[str] = None) -> Dict[str, Any]:
        """단어 검색 - Free Dictionary API 사용"""
        try:
            detected_lang = self.detect_language(word)
            
            # 캐시 임시 비활성화 (에러 방지)
            # cached_result = self._get_from_db_cache(detected_lang or 'en', word)
            # if cached_result:
            #     cached_result['cached'] = True
            #     cached_result['trace_id'] = trace_id
            #     return cached_result
            
            # API 호출
            result = {
                'term': word,
                'lang': detected_lang or 'en',
                'pronunciation': {
                    'ipa': None,
                    'phonetic': None,
                    'audio_url': None
                },
                'meanings': [],
                'source': 'free_dictionary_api',
                'cached': False,
                'trace_id': trace_id
            }
            
            # Dictionary API 호출
            if detected_lang == 'en':
                dict_data = self._fetch_free_dictionary_api(word)
                if dict_data:
                    result['pronunciation'] = self._extract_pronunciation_v2(dict_data)
                    result['meanings'] = self._extract_meanings_v2(dict_data, target_lang)
            elif detected_lang in ['ko', 'zh']:
                try:
                    translation_result = self.translation_service.translate(word, detected_lang, 'en', trace_id)
                    english_word = translation_result.get('translated_text')
                    if english_word:
                        dict_data = self._fetch_free_dictionary_api(english_word)
                        if dict_data:
                            result['term'] = english_word
                            result['pronunciation'] = self._extract_pronunciation_v2(dict_data)
                            result['meanings'] = self._extract_meanings_v2(dict_data, target_lang)
                except Exception as e:
                    logger.error(f"Translation error: {e}")
            
            # 캐시 저장 임시 비활성화
            # self._save_to_db_cache(result['lang'], word, result)
            
            return result
        except Exception as e:
            logger.error(f"Search error: {e}", exc_info=True)
            raise
    
    def _get_from_db_cache(self, lang: str, term: str) -> Optional[Dict[str, Any]]:
        """DB 캐시에서 조회"""
        try:
            from ...supabase import get_supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
            from supabase import create_client
            
            if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
                return None
            
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            result = supabase.table('dictionary_cache')\
                .select('*')\
                .eq('lang', lang)\
                .eq('term', term.lower())\
                .gte('expires_at', datetime.utcnow().isoformat())\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]['payload']
            
        except Exception as e:
            logger.error(f"DB cache read error: {e}")
        
        return None
    
    def _save_to_db_cache(self, lang: str, term: str, payload: Dict[str, Any]) -> None:
        """DB 캐시에 저장"""
        try:
            from ...supabase import get_supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
            from supabase import create_client
            
            if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
                return
            
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            expires_at = datetime.utcnow() + timedelta(seconds=self.cache_ttl)
            
            # payload에서 trace_id 제거 (캐시에 저장하지 않음)
            cache_payload = {k: v for k, v in payload.items() if k != 'trace_id'}
            
            # UPSERT (INSERT or UPDATE)
            supabase.table('dictionary_cache').upsert({
                'lang': lang,
                'term': term.lower(),
                'payload': json.dumps(cache_payload),
                'expires_at': expires_at.isoformat()
            }, on_conflict='lang,term').execute()
            
        except Exception as e:
            logger.error(f"DB cache write error: {e}")
    
    def _fetch_free_dictionary_api(self, word: str) -> Optional[Dict]:
        """Free Dictionary API 호출"""
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
            response = requests.get(url, timeout=self.timeout)
            if response.status_code == 200:
                data = response.json()
                return data[0] if isinstance(data, list) and len(data) > 0 else data
        except Exception as e:
            logger.error(f"Dictionary API error: {e}")
        return None
    
    def _extract_pronunciation_v2(self, dict_data: Dict) -> Dict[str, Optional[str]]:
        """발음 추출 - IPA, phonetic, audio_url"""
        pronunciation = {
            'ipa': None,
            'phonetic': None,
            'audio_url': None
        }
        
        if 'phonetics' in dict_data and dict_data['phonetics']:
            for phonetic in dict_data['phonetics']:
                # IPA 또는 phonetic text
                if phonetic.get('text') and not pronunciation['ipa']:
                    pronunciation['ipa'] = phonetic['text']
                
                # Audio URL
                if phonetic.get('audio') and not pronunciation['audio_url']:
                    pronunciation['audio_url'] = phonetic['audio']
        
        # phonetic 필드는 간단 발음 표기 (IPA와 동일하게 처리)
        if pronunciation['ipa']:
            pronunciation['phonetic'] = pronunciation['ipa']
        
        return pronunciation
    
    def _extract_meanings_v2(self, dict_data: Dict, target_lang: str) -> List[Dict]:
        """의미 추출 - part_of_speech, definitions, examples"""
        meanings = []
        
        if 'meanings' not in dict_data:
            return meanings
        
        for meaning in dict_data['meanings']:
            part_of_speech = meaning.get('partOfSpeech', 'unknown')
            definitions = []
            
            if 'definitions' not in meaning or not meaning['definitions']:
                continue
            
            # 최대 2개 정의만 추출 (속도 개선)
            for definition in meaning['definitions'][:2]:
                if not definition.get('definition'):
                    continue
                
                def_text = definition['definition']
                examples = []
                
                # 예문 추출 (최대 2개)
                if definition.get('example'):
                    examples.append(definition['example'])
                
                # 번역 (target_lang이 en이 아닐 때만)
                translation = None
                if target_lang != 'en':
                    try:
                        trans_result = self.translation_service.translate(def_text, 'en', target_lang)
                        translation = trans_result.get('translated_text')
                    except Exception as e:
                        logger.error(f"Translation error: {e}")
                        translation = None
                
                definitions.append({
                    'definition': def_text,
                    'translation': translation,
                    'examples': examples
                })
            
            if definitions:
                meanings.append({
                    'part_of_speech': part_of_speech,
                    'definitions': definitions
                })
        
        return meanings
    
    def autocomplete(self, query: str, language: Optional[str], target_lang: str, trace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """자동완성 제안"""
        if not query or len(query) < 1:
            return []
        
        if self.cache_enabled:
            cache_key = self.cache.generate_key('autocomplete', query=query, lang=language or 'auto', target=target_lang)
            cached_result = self.cache.get(cache_key)
            if cached_result:
                return cached_result
        
        if not language:
            language = self.detect_language(query)
        
        if language in ['ko', 'zh']:
            suggestions = self._autocomplete_non_english(query, language, target_lang)
        else:
            suggestions = self._autocomplete_english(query, target_lang)
        
        suggestions = suggestions[:10]
        
        if self.cache_enabled:
            self.cache.set(cache_key, suggestions, 3600)
        return suggestions
    
    def _autocomplete_english(self, query: str, target_lang: str) -> List[Dict]:
        """영어 자동완성"""
        suggestions = []
        try:
            sug_url = f"https://api.datamuse.com/sug?s={query}&max=8"
            spell_url = f"https://api.datamuse.com/words?sp={query}*&max=5"
            
            sug_response = requests.get(sug_url, timeout=self.timeout)
            spell_response = requests.get(spell_url, timeout=self.timeout)
            
            sug_data = sug_response.json() if sug_response.ok else []
            spell_data = spell_response.json() if spell_response.ok else []
            
            seen_words = set()
            for item in sug_data:
                word = item.get('word')
                if word and word not in seen_words:
                    suggestions.append({'word': word, 'score': item.get('score', 1000), 'type': 'suggest', 'translation': None})
                    seen_words.add(word)
            
            for item in spell_data:
                word = item.get('word')
                if word and word not in seen_words:
                    suggestions.append({'word': word, 'score': item.get('score', 500), 'type': 'spell', 'translation': None})
                    seen_words.add(word)
            
            suggestions.sort(key=lambda x: x['score'], reverse=True)
            
            if target_lang != 'en':
                for suggestion in suggestions:
                    try:
                        trans_result = self.translation_service.translate(suggestion['word'], 'en', target_lang)
                        suggestion['translation'] = trans_result['translated_text']
                    except Exception:
                        pass
        except Exception:
            pass
        return suggestions
    
    def _autocomplete_non_english(self, query: str, source_lang: str, target_lang: str) -> List[Dict]:
        """비영어 자동완성"""
        suggestions = []
        try:
            suggestions.append({'word': query, 'type': 'original', 'translation': None, 'is_non_english': True, 'source_lang': source_lang})
            
            trans_result = self.translation_service.translate(query, source_lang, 'en')
            english_word = trans_result['translated_text']
            
            if english_word and english_word != query:
                ml_url = f"https://api.datamuse.com/words?ml={english_word}&max=8"
                syn_url = f"https://api.datamuse.com/words?rel_syn={english_word}&max=5"
                
                ml_response = requests.get(ml_url, timeout=self.timeout)
                syn_response = requests.get(syn_url, timeout=self.timeout)
                
                ml_data = ml_response.json() if ml_response.ok else []
                syn_data = syn_response.json() if syn_response.ok else []
                
                seen_words = {query}
                for item in ml_data:
                    word = item.get('word')
                    if word and word not in seen_words and word != english_word:
                        suggestions.append({'word': word, 'score': item.get('score', 1000), 'type': 'related', 'translation': None})
                        seen_words.add(word)
                
                for item in syn_data:
                    word = item.get('word')
                    if word and word not in seen_words and word != english_word:
                        suggestions.append({'word': word, 'score': item.get('score', 500), 'type': 'synonym', 'translation': None})
                        seen_words.add(word)
                
                actual_target = target_lang if target_lang != source_lang else 'en'
                for suggestion in suggestions:
                    try:
                        if suggestion.get('is_non_english'):
                            trans = self.translation_service.translate(suggestion['word'], source_lang, actual_target)
                            suggestion['translation'] = trans['translated_text']
                        else:
                            source_trans = self.translation_service.translate(suggestion['word'], 'en', source_lang)
                            suggestion['source_translation'] = source_trans['translated_text']
                            if actual_target != 'en':
                                target_trans = self.translation_service.translate(suggestion['word'], 'en', actual_target)
                                suggestion['translation'] = target_trans['translated_text']
                            else:
                                suggestion['translation'] = suggestion['word']
                    except Exception:
                        pass
        except Exception:
            pass
        return suggestions
    
    def save(self, word: str, source_lang: str, target_lang: str, search_results: Optional[str], source: str, trace_id: Optional[str] = None) -> Dict[str, Any]:
        """사전 검색 결과 저장"""
        from flask import g, request
        from ...supabase import get_supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
        from supabase import create_client
        
        user_id = g.get('user_id')
        if not user_id:
            raise Exception('User not authenticated')
        
        ip_address = request.remote_addr if request else None
        
        # dictionary_logs 테이블에 저장
        try:
            # SERVICE_ROLE_KEY로 새 클라이언트 생성 (백엔드 작업용)
            if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
                raise Exception('Supabase configuration not available')
            
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            result = supabase.table('dictionary_logs').insert({
                'user_id': user_id,
                'search_word': word,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'search_results': search_results,
                'source': source,
                'ip_address': ip_address
            }).execute()
            
            if result.data and len(result.data) > 0:
                return {
                    'success': True,
                    'id': result.data[0]['id'],
                    'created_at': result.data[0]['created_at']
                }
            else:
                raise Exception('Failed to save dictionary log')
        except Exception as e:
            logger.error(f"Error saving dictionary log: {e}")
            raise Exception(f'Failed to save dictionary log: {str(e)}')


_dictionary_service: Optional[DictionaryService] = None


def get_dictionary_service(cache_enabled: bool = True, cache_ttl: int = 604800) -> DictionaryService:
    """전역 사전 서비스 인스턴스 반환"""
    global _dictionary_service
    if _dictionary_service is None:
        _dictionary_service = DictionaryService(cache_enabled, cache_ttl)
    return _dictionary_service
