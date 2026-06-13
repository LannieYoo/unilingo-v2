#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phrasal Verbs Service - RAG 서버 프록시 + 캐싱
"""

import os
import time
import logging
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
