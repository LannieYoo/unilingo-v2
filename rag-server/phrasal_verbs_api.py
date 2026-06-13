#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phrasal Verbs API - Ollama 기반 구동사 생성 서비스
RAG 서버 (192.168.1.150)에서 실행
"""

import os
import json
import time
import hashlib
import logging
import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Phrasal Verbs API",
    description="Ollama 기반 영어 구동사 생성 API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ──────────────────────────────────────────────
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434")  # Docker 내부 통신
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.6")  # 설치된 Qwen 모델
OLLAMA_TIMEOUT = 180  # seconds (첫 로딩 시 모델이 크면 오래 걸림)
CACHE_TTL = 86400 * 7  # 7 days

# ── In-memory cache ─────────────────────────────────────
_cache: Dict[str, Dict[str, Any]] = {}


def _cache_key(word: str, target_lang: str) -> str:
    return hashlib.md5(f"{word.lower().strip()}:{target_lang}".encode()).hexdigest()


def _get_cached(word: str, target_lang: str) -> Optional[Dict]:
    key = _cache_key(word, target_lang)
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        return entry["data"]
    return None


def _set_cached(word: str, target_lang: str, data: Dict):
    key = _cache_key(word, target_lang)
    _cache[key] = {"data": data, "ts": time.time()}


# ── Request / Response models ───────────────────────────
class PhrasalVerbRequest(BaseModel):
    word: str
    target_lang: str = "ko"


class PhrasalVerbItem(BaseModel):
    phrase: str
    phrase_translated: Optional[str] = None
    meaning: str
    meaning_translated: Optional[str] = None
    example: str
    example_translated: Optional[str] = None


class PhrasalVerbResponse(BaseModel):
    word: str
    phrasal_verbs: List[PhrasalVerbItem]
    source: str = "ollama"
    cached: bool = False
    processing_time: float = 0


# ── Ollama prompt ───────────────────────────────────────
def _build_prompt(word: str, target_lang: str) -> str:
    lang_name = {"ko": "Korean", "zh": "Chinese", "en": "English"}.get(target_lang, "Korean")

    return f"""/no_think
You are an English language expert. Given the English word "{word}", list all common phrasal verbs and idiomatic expressions that are synonymous with or closely related to "{word}".

For each phrasal verb, provide:
1. The phrasal verb itself
2. A short {lang_name} translation of the phrasal verb (1-2 words, e.g. "실망시키다" for "let down")
3. Its English meaning (one short sentence)
4. The meaning translated to {lang_name}
5. An example sentence in English
6. The example sentence translated to {lang_name}

Return ONLY a valid JSON array with no extra text. Each element must have exactly these keys:
- "phrase": the phrasal verb
- "phrase_translated": short {lang_name} translation (1-2 words)
- "meaning": English meaning
- "meaning_translated": {lang_name} translation of meaning
- "example": English example sentence
- "example_translated": {lang_name} translation of example

Return between 3 and 8 phrasal verbs. If the word has no related phrasal verbs, return an empty array [].

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


def _extract_json_array(text: str) -> List[Dict]:
    """LLM 응답에서 JSON 배열을 추출"""
    # Strip <think>...</think> tags (qwen3 thinking mode)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    # Try direct parse first
    text = text.strip()
    if text.startswith("["):
        # Find matching bracket
        bracket_count = 0
        end_idx = -1
        for i, ch in enumerate(text):
            if ch == "[":
                bracket_count += 1
            elif ch == "]":
                bracket_count -= 1
                if bracket_count == 0:
                    end_idx = i + 1
                    break
        if end_idx > 0:
            try:
                return json.loads(text[:end_idx])
            except json.JSONDecodeError:
                pass

    # Try to find JSON array in markdown code block
    match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find any JSON array
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return []


async def _call_ollama(word: str, target_lang: str) -> List[Dict]:
    """Ollama Chat API 호출"""
    prompt = _build_prompt(word, target_lang)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 4096,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            msg = data.get("message", {})
            raw_response = msg.get("content", "")
            thinking = msg.get("thinking", "")
            # If content is empty but thinking has data, try to extract JSON from thinking
            if not raw_response and thinking:
                logger.info(f"Content empty, checking thinking field (len={len(thinking)})")
                raw_response = thinking
            logger.info(f"Ollama RAW content for '{word}' (len={len(raw_response)}): {raw_response[:1000]}")

            items = _extract_json_array(raw_response)
            logger.info(f"Parsed items for '{word}': {len(items)} items")

            # Validate structure
            valid_items = []
            for item in items:
                if isinstance(item, dict) and "phrase" in item and "meaning" in item:
                    valid_items.append({
                        "phrase": item.get("phrase", ""),
                        "phrase_translated": item.get("phrase_translated"),
                        "meaning": item.get("meaning", ""),
                        "meaning_translated": item.get("meaning_translated"),
                        "example": item.get("example", ""),
                        "example_translated": item.get("example_translated"),
                    })

            return valid_items[:8]

    except httpx.TimeoutException:
        logger.error(f"Ollama timeout for word: {word}")
        return []
    except Exception as e:
        logger.error(f"Ollama error for word '{word}': {e}")
        return []


# ── API Endpoints ───────────────────────────────────────
@app.get("/health")
async def health():
    """Health check"""
    # Check if Ollama is reachable
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass

    return {
        "status": "healthy",
        "ollama_connected": ollama_ok,
        "ollama_url": OLLAMA_URL,
        "model": OLLAMA_MODEL,
        "cache_size": len(_cache),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/phrasal-verbs", response_model=PhrasalVerbResponse)
async def get_phrasal_verbs(req: PhrasalVerbRequest):
    """구동사 생성 API"""
    word = req.word.lower().strip()
    if not word:
        raise HTTPException(status_code=400, detail="word is required")

    start_time = time.time()

    # Check cache
    cached = _get_cached(word, req.target_lang)
    if cached:
        cached["cached"] = True
        cached["processing_time"] = time.time() - start_time
        return cached

    # Call Ollama
    phrasal_verbs = await _call_ollama(word, req.target_lang)

    result = {
        "word": word,
        "phrasal_verbs": phrasal_verbs,
        "source": "ollama",
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    # Cache result (even empty, to avoid repeated calls)
    _set_cached(word, req.target_lang, result)

    return result


@app.get("/api/phrasal-verbs")
async def get_phrasal_verbs_get(word: str, target_lang: str = "ko"):
    """GET 방식도 지원 (편의용)"""
    req = PhrasalVerbRequest(word=word, target_lang=target_lang)
    return await get_phrasal_verbs(req)


@app.delete("/api/cache")
async def clear_cache():
    """캐시 초기화"""
    count = len(_cache)
    _cache.clear()
    return {"cleared": count}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
