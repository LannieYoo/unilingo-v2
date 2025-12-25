#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary Service
Handles word definitions and translations
"""

import requests
import re
from typing import Dict, Any, Optional, List
from backend.services.cache_service import get_cache_service
from backend.services.translation_service import get_translation_service
from backend.middleware.error_handler import DictionaryError


class DictionaryService:
    """Dictionary service with language detection and translation"""
    
    def __init__(self, cache_enabled: bool = True, cache_ttl: int = 604800):
        """
        Initialize dictionary service
        
        Args:
            cache_enabled: Enable caching
            cache_ttl: Cache TTL in seconds (default: 7 days)
        """
        self.cache_enabled = cache_enabled
        self.cache_ttl = cache_ttl
        self.cache = get_cache_service() if cache_enabled else None
        self.translation_service = get_translation_service()
        self.timeout = 5
    
    def detect_language(self, text: str) -> Optional[str]:
        """
        Detect language of text
        
        Args:
            text: Text to detect
            
        Returns:
            Language code ('ko', 'en', 'zh') or None
        """
        if not text.strip():
            return None
        
        # Korean detection
        if re.search(r'[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]', text):
            return 'ko'
        
        # Chinese detection
        if re.search(r'[\u4E00-\u9FFF]', text):
            return 'zh'
        
        # English detection
        if re.search(r'[A-Za-z]', text):
            return 'en'
        
        return None
    
    def search(
        self,
        word: str,
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search word definition and translation
        
        Args:
            word: Word to search
            target_lang: Target language for translation
            trace_id: Request trace ID
            
        Returns:
            {
                'word': str,
                'detected_lang': str,
                'pronunciation': {'uk': str, 'us': str},
                'meanings': [...]
            }
        """
        # Check cache
        if self.cache_enabled:
            cache_key = self.cache.generate_key('dict', word=word, target=target_lang)
            cached_result = self.cache.get(cache_key)
            if cached_result:
                cached_result['cached'] = True
                return cached_result
        
        # Detect language
        detected_lang = self.detect_language(word)
        
        result = {
            'word': word,
            'detected_lang': detected_lang,
            'pronunciation': {'uk': '', 'us': ''},
            'meanings': [],
            'cached': False
        }
        
        if detected_lang == 'en':
            # English word - fetch from dictionary API
            dict_data = self._fetch_dictionary_api(word)
            if dict_data:
                result['pronunciation'] = self._extract_pronunciation(dict_data)
                result['meanings'] = self._extract_meanings(dict_data, target_lang)
        
        elif detected_lang in ['ko', 'zh']:
            # Non-English - translate to English first
            try:
                translation_result = self.translation_service.translate(
                    word, detected_lang, 'en', trace_id
                )
                english_word = translation_result['translated_text']
                
                # Fetch English definition
                dict_data = self._fetch_dictionary_api(english_word)
                if dict_data:
                    result['meanings'] = self._extract_meanings(dict_data, target_lang)
            except Exception as e:
                pass  # Continue with empty meanings
        
        # Cache result
        if self.cache_enabled:
            self.cache.set(cache_key, result, self.cache_ttl)
        
        return result
    
    def _fetch_dictionary_api(self, word: str) -> Optional[Dict]:
        """Fetch definition from Dictionary API"""
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
            response = requests.get(url, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                return data[0] if isinstance(data, list) and len(data) > 0 else data
        except Exception:
            pass
        
        return None
    
    def _extract_pronunciation(self, dict_data: Dict) -> Dict[str, str]:
        """Extract pronunciation from dictionary data"""
        pronunciation = {'uk': '', 'us': ''}
        
        if 'phonetics' in dict_data and dict_data['phonetics']:
            for phonetic in dict_data['phonetics']:
                if phonetic.get('text'):
                    pronunciation['uk'] = phonetic['text']
                    pronunciation['us'] = phonetic['text']
                    break
        
        return pronunciation
    
    def _extract_meanings(self, dict_data: Dict, target_lang: str) -> List[Dict]:
        """Extract and translate meanings"""
        meanings = []
        
        if 'meanings' not in dict_data:
            return meanings
        
        meaning_number = 1
        
        # Sort meanings: verb first, then noun, adjective, etc.
        sorted_meanings = sorted(
            dict_data['meanings'],
            key=lambda m: {'verb': 0, 'noun': 1, 'adjective': 2, 'adverb': 3}.get(
                m.get('partOfSpeech', ''), 99
            )
        )
        
        for meaning in sorted_meanings:
            if 'definitions' not in meaning or not meaning['definitions']:
                continue
            
            # For verbs, take all definitions (up to 10)
            # For others, take first definition only
            definitions_to_process = (
                meaning['definitions'][:10]
                if meaning.get('partOfSpeech') == 'verb'
                else meaning['definitions'][:1]
            )
            
            for definition in definitions_to_process:
                if not definition.get('definition'):
                    continue
                
                def_text = definition['definition']
                example = definition.get('example', None)
                
                # Translate if target language is not English
                translation = None
                example_translation = None
                
                if target_lang != 'en':
                    try:
                        trans_result = self.translation_service.translate(
                            def_text, 'en', target_lang
                        )
                        translation = trans_result['translated_text']
                        
                        if example:
                            ex_result = self.translation_service.translate(
                                example, 'en', target_lang
                            )
                            example_translation = ex_result['translated_text']
                    except Exception:
                        pass
                
                meanings.append({
                    'number': meaning_number,
                    'definition': def_text,
                    'translation': translation,
                    'example': example,
                    'example_translation': example_translation
                })
                
                meaning_number += 1
        
        return meanings
    
    def autocomplete(
        self,
        query: str,
        language: Optional[str],
        target_lang: str,
        trace_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get autocomplete suggestions
        
        Args:
            query: Search query
            language: Detected language of query (optional)
            target_lang: Target language for translations
            trace_id: Request trace ID
            
        Returns:
            List of suggestions with translations
        """
        if not query or len(query) < 1:
            return []
        
        # Check cache
        if self.cache_enabled:
            cache_key = self.cache.generate_key(
                'autocomplete',
                query=query,
                lang=language or 'auto',
                target=target_lang
            )
            cached_result = self.cache.get(cache_key)
            if cached_result:
                return cached_result
        
        # Detect language if not provided
        if not language:
            language = self.detect_language(query)
        
        suggestions = []
        
        if language in ['ko', 'zh']:
            # Non-English query
            suggestions = self._autocomplete_non_english(query, language, target_lang)
        else:
            # English query
            suggestions = self._autocomplete_english(query, target_lang)
        
        # Limit to 10 suggestions
        suggestions = suggestions[:10]
        
        # Cache result
        if self.cache_enabled:
            self.cache.set(cache_key, suggestions, 3600)  # 1 hour TTL
        
        return suggestions
    
    def _autocomplete_english(self, query: str, target_lang: str) -> List[Dict]:
        """Get autocomplete suggestions for English query"""
        suggestions = []
        
        try:
            # Fetch from Datamuse API
            sug_url = f"https://api.datamuse.com/sug?s={query}&max=8"
            spell_url = f"https://api.datamuse.com/words?sp={query}*&max=5"
            
            sug_response = requests.get(sug_url, timeout=self.timeout)
            spell_response = requests.get(spell_url, timeout=self.timeout)
            
            sug_data = sug_response.json() if sug_response.ok else []
            spell_data = spell_response.json() if spell_response.ok else []
            
            # Combine results
            seen_words = set()
            
            for item in sug_data:
                word = item.get('word')
                if word and word not in seen_words:
                    suggestions.append({
                        'word': word,
                        'score': item.get('score', 1000),
                        'type': 'suggest',
                        'translation': None
                    })
                    seen_words.add(word)
            
            for item in spell_data:
                word = item.get('word')
                if word and word not in seen_words:
                    suggestions.append({
                        'word': word,
                        'score': item.get('score', 500),
                        'type': 'spell',
                        'translation': None
                    })
                    seen_words.add(word)
            
            # Sort by score
            suggestions.sort(key=lambda x: x['score'], reverse=True)
            
            # Add translations
            if target_lang != 'en':
                for suggestion in suggestions:
                    try:
                        trans_result = self.translation_service.translate(
                            suggestion['word'], 'en', target_lang
                        )
                        suggestion['translation'] = trans_result['translated_text']
                    except Exception:
                        pass
        
        except Exception:
            pass
        
        return suggestions
    
    def _autocomplete_non_english(
        self,
        query: str,
        source_lang: str,
        target_lang: str
    ) -> List[Dict]:
        """Get autocomplete suggestions for non-English query"""
        suggestions = []
        
        try:
            # Add original query as first suggestion
            suggestions.append({
                'word': query,
                'type': 'original',
                'translation': None,
                'is_non_english': True,
                'source_lang': source_lang
            })
            
            # Translate to English
            trans_result = self.translation_service.translate(query, source_lang, 'en')
            english_word = trans_result['translated_text']
            
            if english_word and english_word != query:
                # Fetch related words from Datamuse
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
                        suggestions.append({
                            'word': word,
                            'score': item.get('score', 1000),
                            'type': 'related',
                            'translation': None
                        })
                        seen_words.add(word)
                
                for item in syn_data:
                    word = item.get('word')
                    if word and word not in seen_words and word != english_word:
                        suggestions.append({
                            'word': word,
                            'score': item.get('score', 500),
                            'type': 'synonym',
                            'translation': None
                        })
                        seen_words.add(word)
                
                # Translate suggestions
                actual_target = target_lang if target_lang != source_lang else 'en'
                
                for suggestion in suggestions:
                    try:
                        if suggestion.get('is_non_english'):
                            # Translate original query
                            trans = self.translation_service.translate(
                                suggestion['word'], source_lang, actual_target
                            )
                            suggestion['translation'] = trans['translated_text']
                        else:
                            # Translate English words
                            # To source language (for display)
                            source_trans = self.translation_service.translate(
                                suggestion['word'], 'en', source_lang
                            )
                            suggestion['source_translation'] = source_trans['translated_text']
                            
                            # To target language
                            if actual_target != 'en':
                                target_trans = self.translation_service.translate(
                                    suggestion['word'], 'en', actual_target
                                )
                                suggestion['translation'] = target_trans['translated_text']
                            else:
                                suggestion['translation'] = suggestion['word']
                    except Exception:
                        pass
        
        except Exception:
            pass
        
        return suggestions


# Global service instance
_dictionary_service: Optional[DictionaryService] = None


def get_dictionary_service(cache_enabled: bool = True, cache_ttl: int = 604800) -> DictionaryService:
    """Get or create global dictionary service instance"""
    global _dictionary_service
    
    if _dictionary_service is None:
        _dictionary_service = DictionaryService(cache_enabled, cache_ttl)
    
    return _dictionary_service
