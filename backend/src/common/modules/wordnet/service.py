#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# WordNet Dictionary Service

import logging
from typing import Dict, Any, List, Optional
logger = logging.getLogger(__name__)

_nltk_initialized = False

def _ensure_nltk():
    """Lazy-load NLTK WordNet data"""
    global _nltk_initialized
    if _nltk_initialized:
        return
    try:
        import nltk
        from nltk.corpus import wordnet as wn
        wn.synsets('test')
    except LookupError:
        import nltk
        logger.info("Downloading WordNet data...")
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
    _nltk_initialized = True


class WordNetService:
    """WordNet 기반 사전 서비스"""
    
    def search_word(self, word: str, target_lang: str = 'ko') -> Dict[str, Any]:
        """
        WordNet에서 단어 검색
        
        Args:
            word: 검색할 단어
            target_lang: 목표 언어 (번역용)
            
        Returns:
            사전 검색 결과
        """
        try:
            _ensure_nltk()
            from nltk.corpus import wordnet as wn
            word = word.lower().strip()
            synsets = wn.synsets(word)
            
            if not synsets:
                return None
            
            # 품사별로 그룹화
            meanings_by_pos = {}
            
            for synset in synsets:
                pos = self._get_pos_name(synset.pos())
                
                if pos not in meanings_by_pos:
                    meanings_by_pos[pos] = []
                
                # 정의 추출
                definition = synset.definition()
                
                # 예문 추출
                examples = synset.examples()
                
                # 동의어 추출
                lemmas = [lemma.name().replace('_', ' ') for lemma in synset.lemmas() if lemma.name().lower() != word]
                
                meanings_by_pos[pos].append({
                    'definition': definition,
                    'examples': examples[:3],  # 최대 3개 예문
                    'synonyms': list(set(lemmas))[:5]  # 최대 5개 동의어
                })
            
            # 결과 구조화
            meanings = []
            for pos, defs in meanings_by_pos.items():
                meanings.append({
                    'part_of_speech': pos,
                    'definitions': defs
                })
            
            return {
                'term': word,
                'lang': 'en',
                'meanings': meanings,
                'source': 'wordnet'
            }
            
        except Exception as e:
            logger.error(f"WordNet search error: {e}")
            return None
    
    def _get_pos_name(self, pos_code: str) -> str:
        """WordNet 품사 코드를 이름으로 변환"""
        pos_map = {
            'n': 'noun',
            'v': 'verb',
            'a': 'adjective',
            's': 'adjective satellite',
            'r': 'adverb'
        }
        return pos_map.get(pos_code, pos_code)
    
    def get_synonyms(self, word: str) -> List[str]:
        """단어의 동의어 목록 반환"""
        try:
            _ensure_nltk()
            from nltk.corpus import wordnet as wn
            synonyms = set()
            for synset in wn.synsets(word):
                for lemma in synset.lemmas():
                    synonym = lemma.name().replace('_', ' ')
                    if synonym.lower() != word.lower():
                        synonyms.add(synonym)
            return list(synonyms)[:10]
        except Exception as e:
            logger.error(f"Get synonyms error: {e}")
            return []
    
    def get_antonyms(self, word: str) -> List[str]:
        """단어의 반의어 목록 반환"""
        try:
            _ensure_nltk()
            from nltk.corpus import wordnet as wn
            antonyms = set()
            for synset in wn.synsets(word):
                for lemma in synset.lemmas():
                    if lemma.antonyms():
                        for antonym in lemma.antonyms():
                            antonyms.add(antonym.name().replace('_', ' '))
            return list(antonyms)[:10]
        except Exception as e:
            logger.error(f"Get antonyms error: {e}")
            return []


_wordnet_service: Optional[WordNetService] = None


def get_wordnet_service() -> WordNetService:
    """전역 WordNet 서비스 인스턴스 반환"""
    global _wordnet_service
    if _wordnet_service is None:
        _wordnet_service = WordNetService()
    return _wordnet_service
