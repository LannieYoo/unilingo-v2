#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phrasal Verbs Service - RAG 서버 프록시 + 캐싱
"""

import os
import time
import logging
import hashlib
import requests
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# RAG 서버 URL
RAG_SERVER_URL = os.getenv("RAG_SERVER_URL", "http://192.168.1.150:8100")
RAG_TIMEOUT = 120  # seconds (LLM 응답이 20-30초 소요)

# In-memory cache (TTL: 24 hours)
_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 86400


class PhrasalVerbsService:
    """RAG 서버에서 구동사를 가져오는 서비스"""

    def get_phrasal_verbs(self, word: str, target_lang: str = "ko") -> Dict[str, Any]:
        """구동사 조회 (캐시 → RAG 서버)"""
        word = word.lower().strip()
        if not word:
            return {"word": word, "phrasal_verbs": [], "source": "none"}

        # Check cache
        cache_key = f"{word}:{target_lang}"
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < CACHE_TTL:
            result = cached["data"].copy()
            result["cached"] = True
            return result

        # Call RAG server
        try:
            url = f"{RAG_SERVER_URL}/api/phrasal-verbs"
            resp = requests.get(
                url,
                params={"word": word, "target_lang": target_lang},
                timeout=RAG_TIMEOUT,
            )

            if resp.status_code == 200:
                data = resp.json()
                # Only cache if we got actual results (don't cache empty/failed)
                if data.get("phrasal_verbs"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            else:
                logger.warning(f"RAG server returned {resp.status_code} for '{word}'")
                return {"word": word, "phrasal_verbs": [], "source": "error"}

        except requests.exceptions.ConnectionError:
            logger.warning(f"RAG server not reachable at {RAG_SERVER_URL}")
            return {"word": word, "phrasal_verbs": [], "source": "unreachable"}
        except requests.exceptions.Timeout:
            logger.warning(f"RAG server timeout for '{word}'")
            return {"word": word, "phrasal_verbs": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG server error for '{word}': {e}")
            return {"word": word, "phrasal_verbs": [], "source": "error"}

    def get_context_suggestions(self, word: str) -> Dict[str, Any]:
        """문맥 연관어 조회 (캐시 → RAG 서버)"""
        word = word.lower().strip()
        if not word:
            return {"word": word, "suggestions": [], "source": "none"}

        cache_key = f"ctx:{word}"
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < CACHE_TTL:
            result = cached["data"].copy()
            result["cached"] = True
            return result

        try:
            url = f"{RAG_SERVER_URL}/api/context-suggestions"
            resp = requests.get(url, params={"word": word}, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("suggestions"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            else:
                logger.warning(f"RAG context returned {resp.status_code} for '{word}'")
                return {"word": word, "suggestions": [], "source": "error"}

        except requests.exceptions.Timeout:
            logger.warning(f"RAG context timeout for '{word}'")
            return {"word": word, "suggestions": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG context error for '{word}': {e}")
            return {"word": word, "suggestions": [], "source": "error"}

    def get_alternative_translations(self, original: str, translated: str,
                                      source_lang: str = "ko", target_lang: str = "en") -> Dict[str, Any]:
        """유사 번역 표현 조회 (RAG 서버)"""
        if not original or not translated:
            return {"alternatives": [], "source": "none"}

        try:
            url = f"{RAG_SERVER_URL}/api/alternative-translations"
            resp = requests.post(url, json={
                "original": original,
                "translated": translated,
                "source_lang": source_lang,
                "target_lang": target_lang,
            }, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                return resp.json()
            else:
                logger.warning(f"RAG alt-translations returned {resp.status_code}")
                return {"alternatives": [], "source": "error"}

        except requests.exceptions.Timeout:
            logger.warning("RAG alt-translations timeout")
            return {"alternatives": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG alt-translations error: {e}")
            return {"alternatives": [], "source": "error"}

    def summarize_text(self, text: str, target_lang: str = "ko") -> Dict[str, Any]:
        """Summarize text using RAG server's Qwen model"""
        text = text.strip()
        if not text:
            return {"summary": "", "source": "none"}

        # Cache key: hash of text + target_lang
        hash_input = f"{text}:{target_lang}"
        cache_key = f"sum:{hashlib.sha256(hash_input.encode()).hexdigest()[:16]}"
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < 3600:  # 1 hour TTL
            result = cached["data"].copy()
            result["cached"] = True
            return result

        try:
            url = f"{RAG_SERVER_URL}/api/summarize"
            resp = requests.post(url, json={
                "text": text,
                "target_lang": target_lang,
            }, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("summary"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            else:
                logger.warning(f"RAG summarize returned {resp.status_code}")
                return {"summary": "", "source": "error"}

        except requests.exceptions.ConnectionError:
            logger.warning(f"RAG server not reachable at {RAG_SERVER_URL}")
            return {"summary": "", "source": "unreachable"}
        except requests.exceptions.Timeout:
            logger.warning("RAG summarize timeout")
            return {"summary": "", "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG summarize error: {e}")
            return {"summary": "", "source": "error"}

    def get_news_study_points(self, title: str, text: str, target_lang: str = "ko") -> Dict[str, Any]:
        """뉴스 기사 핵심 표현/구문 학습 포인트 조회 (캐시 → RAG 서버)"""
        text = (text or "").strip()
        if len(text) < 50:
            return {"items": [], "source": "none"}

        hash_input = f"newsstudy:{title}:{text[:800]}:{target_lang}"
        cache_key = hashlib.sha256(hash_input.encode()).hexdigest()[:24]
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < CACHE_TTL:
            result = cached["data"].copy()
            result["cached"] = True
            return result

        try:
            url = f"{RAG_SERVER_URL}/api/news-study-points"
            resp = requests.post(url, json={
                "title": title,
                "text": text,
                "target_lang": target_lang,
            }, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("items"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            logger.warning(f"RAG news-study-points returned {resp.status_code}")
            return {"items": [], "source": "error"}

        except requests.exceptions.ConnectionError:
            logger.warning(f"RAG server not reachable at {RAG_SERVER_URL}")
            return {"items": [], "source": "unreachable"}
        except requests.exceptions.Timeout:
            logger.warning("RAG news-study-points timeout")
            return {"items": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG news-study-points error: {e}")
            return {"items": [], "source": "error"}

    def get_news_quiz(self, title: str, text: str, target_lang: str = "ko", count: int = 5) -> Dict[str, Any]:
        """뉴스 기사 기반 CELPIP 스타일 듣기 문제 조회 (캐시 → RAG 서버)"""
        text = (text or "").strip()
        if len(text) < 50:
            return {"questions": [], "source": "none"}

        hash_input = f"newsquiz:{title}:{text[:800]}:{target_lang}:{count}"
        cache_key = hashlib.sha256(hash_input.encode()).hexdigest()[:24]
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < CACHE_TTL:
            result = cached["data"].copy()
            result["cached"] = True
            return result

        try:
            url = f"{RAG_SERVER_URL}/api/news-quiz"
            resp = requests.post(url, json={
                "title": title,
                "text": text,
                "target_lang": target_lang,
                "count": count,
            }, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("questions"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            logger.warning(f"RAG news-quiz returned {resp.status_code}")
            return {"questions": [], "source": "error"}

        except requests.exceptions.ConnectionError:
            logger.warning(f"RAG server not reachable at {RAG_SERVER_URL}")
            return {"questions": [], "source": "unreachable"}
        except requests.exceptions.Timeout:
            logger.warning("RAG news-quiz timeout")
            return {"questions": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG news-quiz error: {e}")
            return {"questions": [], "source": "error"}

    def get_picture_model_answer(self, topic: str, prompt: str, alt_text: str,
                                 vocabulary_lines: List[str], template_id: str,
                                 template_description: str, target_lang: str = "ko") -> Dict[str, Any]:
        """사진 묘사 모범답안 조회 (캐시 → RAG 서버)"""
        if not topic and not vocabulary_lines:
            return {"sentences": [], "source": "none"}

        hash_input = f"picanswer:{topic}:{template_id}:{target_lang}:{'|'.join(vocabulary_lines)}"
        cache_key = hashlib.sha256(hash_input.encode()).hexdigest()[:24]
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < CACHE_TTL:
            result = cached["data"].copy()
            result["cached"] = True
            return result

        try:
            url = f"{RAG_SERVER_URL}/api/picture-model-answer"
            resp = requests.post(url, json={
                "topic": topic,
                "prompt": prompt,
                "alt_text": alt_text,
                "vocabulary": vocabulary_lines,
                "template_id": template_id,
                "template_description": template_description,
                "target_lang": target_lang,
            }, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("sentences"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            logger.warning(f"RAG picture-model-answer returned {resp.status_code}")
            return {"sentences": [], "source": "error"}

        except requests.exceptions.ConnectionError:
            logger.warning(f"RAG server not reachable at {RAG_SERVER_URL}")
            return {"sentences": [], "source": "unreachable"}
        except requests.exceptions.Timeout:
            logger.warning("RAG picture-model-answer timeout")
            return {"sentences": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG picture-model-answer error: {e}")
            return {"sentences": [], "source": "error"}

    def get_picture_strategy(self, topic: str, prompt: str, vocabulary_lines: List[str]) -> Dict[str, Any]:
        """사진 묘사 전략(단계별 흐름) 조회 (캐시 → RAG 서버)"""
        if not topic and not vocabulary_lines:
            return {"steps": [], "source": "none"}

        hash_input = f"picstrategy:{topic}:{'|'.join(vocabulary_lines)}"
        cache_key = hashlib.sha256(hash_input.encode()).hexdigest()[:24]
        cached = _cache.get(cache_key)
        if cached and time.time() - cached["ts"] < CACHE_TTL:
            result = cached["data"].copy()
            result["cached"] = True
            return result

        try:
            url = f"{RAG_SERVER_URL}/api/picture-strategy"
            resp = requests.post(url, json={
                "topic": topic,
                "prompt": prompt,
                "vocabulary": vocabulary_lines,
            }, timeout=RAG_TIMEOUT)

            if resp.status_code == 200:
                data = resp.json()
                if data.get("steps"):
                    _cache[cache_key] = {"data": data, "ts": time.time()}
                return data
            logger.warning(f"RAG picture-strategy returned {resp.status_code}")
            return {"steps": [], "source": "error"}

        except requests.exceptions.ConnectionError:
            logger.warning(f"RAG server not reachable at {RAG_SERVER_URL}")
            return {"steps": [], "source": "unreachable"}
        except requests.exceptions.Timeout:
            logger.warning("RAG picture-strategy timeout")
            return {"steps": [], "source": "timeout"}
        except Exception as e:
            logger.error(f"RAG picture-strategy error: {e}")
            return {"steps": [], "source": "error"}

    def health_check(self) -> Dict[str, Any]:
        """RAG 서버 상태 확인"""
        try:
            resp = requests.get(f"{RAG_SERVER_URL}/health", timeout=5)
            if resp.status_code == 200:
                return {"status": "connected", "detail": resp.json()}
            return {"status": "error", "detail": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"status": "unreachable", "detail": str(e)}


_service: Optional[PhrasalVerbsService] = None


def get_phrasal_verbs_service() -> PhrasalVerbsService:
    global _service
    if _service is None:
        _service = PhrasalVerbsService()
    return _service
