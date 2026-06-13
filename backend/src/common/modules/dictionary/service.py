#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary Service - 비즈니스 로직

import re
import requests
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..cache import get_cache_service
from ..translation import get_translation_service
from ..naver_dict import get_naver_dict_service
from ..deepl import get_deepl_service
from ..wordnet import get_wordnet_service

logger = logging.getLogger(__name__)


class DictionaryService:
    """사전 서비스"""
    
    def __init__(self, cache_enabled: bool = True, cache_ttl: int = 604800):
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl  # 7 days
        self.cache = get_cache_service() if cache_enabled else None
        self.translation_service = get_translation_service()
        self.naver_papago = get_naver_dict_service()
        self.deepl = get_deepl_service()
        self.wordnet = get_wordnet_service()
        self.timeout = 10  # Increased timeout for multiple API calls
    
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
        """단어 검색 - WordNet 사용 (병렬 처리 최적화)"""
        try:
            detected_lang = self.detect_language(word)

            result = {
                'term': word,
                'lang': detected_lang or 'en',
                'simple_translation': None,
                'pronunciation': {'ipa': None, 'phonetic': None, 'audio_url': None},
                'meanings': [],
                'synonyms': [],
                'antonyms': [],
                'source': 'wordnet',
                'cached': False,
                'trace_id': trace_id
            }

            if detected_lang == 'en':
                with ThreadPoolExecutor(max_workers=4) as executor:
                    futures = {
                        'wordnet': executor.submit(self.wordnet.search_word, word, target_lang),
                        'pronunciation': executor.submit(self._fetch_free_dictionary_api, word),
                        'synonyms': executor.submit(self.wordnet.get_synonyms, word),
                        'antonyms': executor.submit(self.wordnet.get_antonyms, word)
                    }

                    wordnet_result = futures['wordnet'].result()
                    pronunciation_data = futures['pronunciation'].result()
                    result['synonyms'] = futures['synonyms'].result()[:10]
                    result['antonyms'] = futures['antonyms'].result()[:10]

                    if wordnet_result:
                        result['meanings'] = self._translate_meanings_fast(
                            wordnet_result.get('meanings', []), target_lang
                        )

                    if pronunciation_data:
                        result['pronunciation'] = self._extract_pronunciation_v2(pronunciation_data[0])

                if target_lang != 'en':
                    try:
                        if self.deepl.is_available() and self.deepl.has_quota():
                            result['simple_translation'] = self.deepl.translate(word, 'en', target_lang)
                    except Exception:
                        pass
                    
                    if not result['simple_translation']:
                        try:
                            trans_result = self.translation_service.translate(word, 'en', target_lang)
                            result['simple_translation'] = trans_result.get('translated_text')
                        except Exception:
                            pass

            elif detected_lang in ['ko', 'zh']:
                try:
                    translation_result = self.translation_service.translate(word, detected_lang, 'en', trace_id)
                    english_word = translation_result.get('translated_text')
                    if english_word:
                        # Normalize translated word for WordNet lookup
                        english_word = self._normalize_translated_word(english_word)
                        if english_word:
                            return self.search(english_word, target_lang, trace_id)
                except Exception as e:
                    logger.error(f"Translation error: {e}")

            return result
        except Exception as e:
            logger.error(f"Search error: {e}", exc_info=True)
            raise

    
    def _normalize_translated_word(self, english_word: str) -> Optional[str]:
        """Normalize translated English word for WordNet lookup.
        
        Handles common translation artifacts:
        - "to endure" → "endure" (infinitive prefix)
        - "a book" / "the book" → "book" (articles)
        - "very happy" → "happy" (common adverbs)
        - "I endure" → "endure" (subject pronouns)
        - Multi-word: try last word, then first content word
        """
        if not english_word:
            return None
        
        word = english_word.lower().strip()
        
        # Remove common prefixes
        prefixes_to_strip = [
            'to ', 'a ', 'an ', 'the ',
            'be ', 'being ', 'been ',
            'very ', 'really ', 'quite ', 'so ',
            'i ', 'you ', 'he ', 'she ', 'it ', 'we ', 'they ',
            'not ', "don't ", "doesn't ", "didn't ",
        ]
        
        for prefix in prefixes_to_strip:
            if word.startswith(prefix):
                word = word[len(prefix):].strip()
        
        # Remove trailing particles/words like "something", "oneself"
        suffixes_to_strip = [' oneself', ' something', ' someone', ' somebody', ' up', ' out', ' down', ' off']
        for suffix in suffixes_to_strip:
            if word.endswith(suffix):
                candidate = word[:-len(suffix)].strip()
                if candidate:
                    word = candidate
        
        # If still multi-word, try to find a WordNet-recognized word
        if ' ' in word:
            _ensure_nltk()
            from nltk.corpus import wordnet as wn
            
            words = word.split()
            
            # Try the full phrase with underscores (WordNet compound words)
            compound = '_'.join(words)
            if wn.synsets(compound):
                return compound
            
            # Try each word individually, prefer longer words (more likely to be content words)
            for w in sorted(words, key=len, reverse=True):
                if len(w) > 2 and wn.synsets(w):
                    return w
            
            # Fallback: return the last word (usually the main verb/noun)
            word = words[-1] if words else word
        
        return word if word else None

    def _translate_word(self, word: str, source_lang: str, target_lang: str) -> Optional[str]:
        """단어 번역 (DeepL > LibreTranslate > Google)"""
        try:
            if self.deepl.is_available() and self.deepl.has_quota():
                translation = self.deepl.translate(word, source_lang, target_lang)
                if translation:
                    return translation
        except Exception as e:
            logger.warning(f"DeepL failed: {e}")
        
        try:
            if self.naver_papago.is_available():
                translation = self.naver_papago.translate(word, source_lang, target_lang)
                if translation:
                    return translation
        except Exception as e:
            logger.warning(f"LibreTranslate failed: {e}")
        
        try:
            result = self.translation_service.translate(word, source_lang, target_lang)
            return result.get('translated_text')
        except Exception as e:
            logger.error(f"All translation failed: {e}")
        
        return None
    
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
    
    def _fetch_free_dictionary_api(self, word: str) -> Optional[List[Dict]]:
        """Free Dictionary API 호출 - 모든 항목 반환"""
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
            response = requests.get(url, timeout=self.timeout)
            if response.status_code == 200:
                data = response.json()
                # 배열 전체를 반환 (여러 품사가 별도 객체로 올 수 있음)
                return data if isinstance(data, list) else [data]
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
            
            # 각 품사별로 최대 2개 정의 추출
            for definition in meaning['definitions'][:2]:
                if not definition.get('definition'):
                    continue
                
                def_text = definition['definition']
                examples = []
                
                # 예문 추출 (최대 2개)
                if definition.get('example'):
                    examples.append(definition['example'])
                
                # 번역 (target_lang이 en이 아닐 때만)
                # 우선순위: DeepL > LibreTranslate > Google Translate
                translation = None
                if target_lang != 'en':
                    # 1. DeepL 시도 (최고 품질, 사전 전용)
                    try:
                        if self.deepl.is_available() and self.deepl.has_quota():
                            deepl_trans = self.deepl.translate(def_text, 'en', target_lang)
                            if deepl_trans:
                                translation = deepl_trans
                    except Exception as e:
                        logger.warning(f"DeepL translation failed: {e}")
                    
                    # 2. LibreTranslate 시도
                    if not translation:
                        try:
                            if self.naver_papago.is_available():
                                libre_trans = self.naver_papago.translate(def_text, 'en', target_lang)
                                if libre_trans:
                                    translation = libre_trans
                        except Exception as e:
                            logger.warning(f"LibreTranslate failed: {e}")
                    
                    # 3. Google Translate 폴백
                    if not translation:
                        try:
                            trans_result = self.translation_service.translate(def_text, 'en', target_lang)
                            translation = trans_result.get('translated_text')
                        except Exception as e:
                            logger.error(f"All translation methods failed: {e}")
                
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
    
    def _translate_wordnet_meanings(self, meanings: List[Dict], target_lang: str) -> List[Dict]:
        """WordNet meanings 번역"""
        translated_meanings = []
        
        for meaning in meanings:
            part_of_speech = meaning.get('part_of_speech', 'unknown')
            definitions = meaning.get('definitions', [])
            
            translated_definitions = []
            for def_item in definitions:
                def_text = def_item.get('definition', '')
                examples = def_item.get('examples', [])
                synonyms = def_item.get('synonyms', [])
                
                # 번역 (target_lang이 en이 아닐 때만)
                translation = None
                if target_lang != 'en' and def_text:
                    # 1. DeepL 시도
                    try:
                        if self.deepl.is_available() and self.deepl.has_quota():
                            deepl_trans = self.deepl.translate(def_text, 'en', target_lang)
                            if deepl_trans:
                                translation = deepl_trans
                    except Exception as e:
                        logger.warning(f"DeepL translation failed: {e}")
                    
                    # 2. LibreTranslate 시도
                    if not translation:
                        try:
                            if self.naver_papago.is_available():
                                libre_trans = self.naver_papago.translate(def_text, 'en', target_lang)
                                if libre_trans:
                                    translation = libre_trans
                        except Exception as e:
                            logger.warning(f"LibreTranslate failed: {e}")
                    
                    # 3. Google Translate 폴백
                    if not translation:
                        try:
                            trans_result = self.translation_service.translate(def_text, 'en', target_lang)
                            translation = trans_result.get('translated_text')
                        except Exception as e:
                            logger.error(f"All translation methods failed: {e}")
                
                translated_definitions.append({
                    'definition': def_text,
                    'translation': translation,
                    'examples': examples,
                    'synonyms': synonyms
                })
            
            if translated_definitions:
                translated_meanings.append({
                    'part_of_speech': part_of_speech,
                    'definitions': translated_definitions
                })
        
        return translated_meanings
    
    def _translate_meanings_fast(self, meanings: List[Dict], target_lang: str) -> List[Dict]:
        """WordNet meanings 빠른 번역 (DeepL만, 첫 3개 정의만)"""
        if target_lang == 'en':
            return meanings[:3]  # 영어는 번역 불필요, 최대 3개 품사
        
        translated_meanings = []
        for meaning in meanings[:3]:  # 최대 3개 품사만
            part_of_speech = meaning.get('part_of_speech', 'unknown')
            definitions = meaning.get('definitions', [])[:3]  # 최대 3개 정의로 증가
            
            translated_definitions = []
            for def_item in definitions:
                def_text = def_item.get('definition', '')
                examples = def_item.get('examples', [])[:2]
                synonyms = def_item.get('synonyms', [])[:5]
                
                translation = None
                if def_text and self.deepl.is_available():
                    try:
                        translation = self.deepl.translate(def_text, 'en', target_lang)
                    except Exception:
                        pass
                
                translated_definitions.append({
                    'definition': def_text,
                    'translation': translation,
                    'examples': examples,
                    'synonyms': synonyms
                })
            
            if translated_definitions:
                translated_meanings.append({
                    'part_of_speech': part_of_speech,
                    'definitions': translated_definitions
                })
        
        return translated_meanings
    
    def _translate_wordnet_meanings_optimized(self, meanings: List[Dict], target_lang: str, max_definitions: int = 2) -> List[Dict]:
        """WordNet meanings 번역 (최적화: 병렬 처리 + 정의 개수 제한)"""
        if target_lang == 'en':
            return meanings
        
        translated_meanings = []
        
        # 번역할 텍스트 수집
        texts_to_translate = []
        for meaning in meanings:
            definitions = meaning.get('definitions', [])[:max_definitions]
            for def_item in definitions:
                def_text = def_item.get('definition', '')
                if def_text:
                    texts_to_translate.append(def_text)
        
        # 병렬 번역
        translations = {}
        if texts_to_translate:
            with ThreadPoolExecutor(max_workers=5) as executor:
                future_to_text = {
                    executor.submit(self._translate_word, text, 'en', target_lang): text
                    for text in texts_to_translate
                }
                for future in as_completed(future_to_text):
                    text = future_to_text[future]
                    try:
                        translations[text] = future.result()
                    except Exception as e:
                        logger.error(f"Translation failed for '{text}': {e}")
                        translations[text] = None
        
        # 결과 조합
        for meaning in meanings:
            part_of_speech = meaning.get('part_of_speech', 'unknown')
            definitions = meaning.get('definitions', [])[:max_definitions]
            
            translated_definitions = []
            for def_item in definitions:
                def_text = def_item.get('definition', '')
                examples = def_item.get('examples', [])[:2]  # 예문도 최대 2개
                synonyms = def_item.get('synonyms', [])[:5]  # 동의어 최대 5개
                
                translated_definitions.append({
                    'definition': def_text,
                    'translation': translations.get(def_text),
                    'examples': examples,
                    'synonyms': synonyms
                })
            
            if translated_definitions:
                translated_meanings.append({
                    'part_of_speech': part_of_speech,
                    'definitions': translated_definitions
                })
        
        return translated_meanings
    
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
    
    def save(self, word: str, source_lang: str, target_lang: str, search_results: Optional[str], source: str, result_summary: Optional[str] = None, trace_id: Optional[str] = None) -> Dict[str, Any]:
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
                'result_summary': result_summary,
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
