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
import random
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
        "think": False,
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


# ── Context Suggestions ─────────────────────────────────
def _build_context_prompt(word: str) -> str:
    return f"""/no_think
You are an English vocabulary expert. Given the English word "{word}", suggest 5-8 words that are commonly used in the SAME CONTEXT or situation as "{word}".

These should NOT be synonyms — they should be words that a learner would encounter alongside "{word}" in real-world usage (collocations, related actions, associated concepts).

For example:
- "cook" → ["recipe", "ingredient", "stir", "boil", "kitchen"]
- "invest" → ["portfolio", "dividend", "stock", "compound", "return"]

Return ONLY a valid JSON array of objects. Each object must have:
- "word": the suggested English word
- "word_ko": Korean translation (1-2 words)
- "relation": very short description of the contextual relationship (in English, max 5 words)

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


async def _call_ollama_context(word: str) -> List[Dict]:
    """Ollama로 context suggestions 생성"""
    prompt = _build_context_prompt(word)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 2048,
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
            # If content is empty or very short, use thinking field
            if not raw_response or (len(raw_response) < 50 and thinking):
                logger.info(f"Context content too short ({len(raw_response)}), checking thinking (len={len(thinking)})")
                raw_response = thinking if thinking else raw_response
            logger.info(f"Context RAW for '{word}' (len={len(raw_response)}): {raw_response[:500]}")

            items = _extract_json_array(raw_response)
            # Fallback: if content failed, also try thinking
            if not items and thinking and thinking != raw_response:
                logger.info(f"Trying thinking field for JSON extraction")
                items = _extract_json_array(thinking)
            valid = []
            for item in items:
                if isinstance(item, dict) and "word" in item:
                    valid.append({
                        "word": item.get("word", ""),
                        "word_ko": item.get("word_ko", ""),
                        "relation": item.get("relation", ""),
                    })
            return valid[:8]

    except Exception as e:
        logger.error(f"Context suggestions error for '{word}': {e}")
        return []


@app.get("/api/context-suggestions")
async def get_context_suggestions(word: str):
    """문맥 연관어 생성 API"""
    word = word.lower().strip()
    if not word:
        raise HTTPException(status_code=400, detail="word is required")

    start_time = time.time()

    # Check cache (use 'ctx:' prefix to avoid collision with phrasal verbs)
    cache_key = _cache_key(f"ctx:{word}", "en")
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    suggestions = await _call_ollama_context(word)

    result = {
        "word": word,
        "suggestions": suggestions,
        "source": "ollama",
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if suggestions:  # Only cache non-empty results
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result


# ── Alternative Translations ────────────────────────────
def _build_alt_translation_prompt(original: str, translated: str, source_lang: str, target_lang: str) -> str:
    lang_names = {"ko": "Korean", "zh": "Chinese", "en": "English", "ja": "Japanese", "es": "Spanish", "fr": "French", "de": "German"}
    src_name = lang_names.get(source_lang, source_lang)
    tgt_name = lang_names.get(target_lang, target_lang)

    return f"""/no_think
You are a professional translator. The following sentence was translated from {src_name} to {tgt_name}:

Original ({src_name}): "{original}"
Translation ({tgt_name}): "{translated}"

Provide 3-5 alternative translations that convey the same meaning but use different wording, tone, or style. Each alternative should feel natural in {tgt_name}.

Return ONLY a valid JSON array of objects. Each object must have:
- "text": the alternative translation in {tgt_name}
- "nuance": a very short label (1-3 words) describing the style difference (e.g. "격식체", "구어체", "간결", "Formal", "Casual", "Concise", "Literary")

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


async def _call_ollama_alternatives(original: str, translated: str, source_lang: str, target_lang: str) -> List[Dict]:
    """Ollama로 유사 번역 표현 생성"""
    prompt = _build_alt_translation_prompt(original, translated, source_lang, target_lang)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.6,
            "num_predict": 2048,
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
            if not raw_response or (len(raw_response) < 50 and thinking):
                raw_response = thinking if thinking else raw_response
            logger.info(f"Alt translation RAW (len={len(raw_response)}): {raw_response[:500]}")

            items = _extract_json_array(raw_response)
            if not items and thinking and thinking != raw_response:
                items = _extract_json_array(thinking)
            valid = []
            for item in items:
                if isinstance(item, dict) and "text" in item:
                    valid.append({
                        "text": item.get("text", ""),
                        "nuance": item.get("nuance", ""),
                    })
            return valid[:5]

    except Exception as e:
        logger.error(f"Alternative translations error: {e}")
        return []


@app.post("/api/alternative-translations")
async def get_alternative_translations(req: dict):
    """유사 번역 표현 생성 API"""
    original = req.get("original", "").strip()
    translated = req.get("translated", "").strip()
    source_lang = req.get("source_lang", "ko")
    target_lang = req.get("target_lang", "en")

    if not original or not translated:
        raise HTTPException(status_code=400, detail="original and translated are required")

    start_time = time.time()

    # Cache key based on original + translated
    cache_key = hashlib.md5(f"alt:{original}:{translated}".encode()).hexdigest()
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    alternatives = await _call_ollama_alternatives(original, translated, source_lang, target_lang)

    result = {
        "original": original,
        "translated": translated,
        "alternatives": alternatives,
        "source": "ollama",
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if alternatives:
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result

# ── Text Summarization ──────────────────────────────────
def _build_summarize_prompt(text: str, target_lang: str) -> str:
    lang_names = {"ko": "Korean", "zh": "Chinese", "en": "English", "ja": "Japanese", "es": "Spanish", "fr": "French", "de": "German"}
    tgt_name = lang_names.get(target_lang, target_lang)

    return f"""/no_think
You are an expert summarizer. Summarize the following text in {tgt_name}.

Rules:
1. Write the summary in {tgt_name} language only.
2. Keep the summary concise but cover all key points.
3. Wrap the most important sentences or phrases in double asterisks like **this is important**.
4. Use clear paragraph breaks for readability.
5. Do NOT include any JSON, code blocks, or markdown headers.
6. Write in natural, fluent {tgt_name}.

Text to summarize:
\"\"\"
{text}
\"\"\""""


async def _call_ollama_summarize(text: str, target_lang: str) -> str:
    """Ollama로 텍스트 요약 생성"""
    prompt = _build_summarize_prompt(text, target_lang)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": f"You are a professional text summarizer. Always respond in the requested language. Use **double asterisks** to highlight key points."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "think": False,
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
            if not raw_response and thinking:
                raw_response = thinking
            # Strip any <think> tags
            raw_response = re.sub(r'<think>.*?</think>', '', raw_response, flags=re.DOTALL).strip()
            logger.info(f"Summarize RAW (len={len(raw_response)}): {raw_response[:500]}")
            return raw_response

    except Exception as e:
        logger.error(f"Summarize error: {e}")
        return ""


@app.post("/api/summarize")
async def summarize_text(req: dict):
    """텍스트 요약 API"""
    text = req.get("text", "").strip()
    target_lang = req.get("target_lang", "ko")

    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    if len(text) < 20:
        raise HTTPException(status_code=400, detail="Text too short to summarize")

    start_time = time.time()

    # Cache key
    cache_key = hashlib.md5(f"sum:{text[:500]}:{target_lang}".encode()).hexdigest()
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    summary = await _call_ollama_summarize(text, target_lang)

    result = {
        "summary": summary,
        "source": "ollama",
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if summary:
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result


# ── News Study Points ───────────────────────────────────
def _build_news_study_prompt(title: str, text: str, target_lang: str) -> str:
    lang_names = {"ko": "Korean", "zh": "Chinese", "en": "English", "ja": "Japanese"}
    tgt_name = lang_names.get(target_lang, "Korean")

    return f"""/no_think
You are an English teacher preparing study notes for an intermediate ESL learner who just read this news article.

Article title: "{title}"

Article text:
\"\"\"
{text}
\"\"\"

From THIS article only, pick the 5-8 most valuable language points worth studying. Prioritize:
1. Phrasal verbs and idioms actually used in the article
2. Useful collocations or fixed expressions
3. Important sentence patterns or grammar structures (e.g. "It's almost as if ...", "up to six times more likely than ...")

Return ONLY a valid JSON array. Each element must have exactly these keys:
- "type": one of "phrasal_verb", "idiom", "collocation", "pattern"
- "text": the expression or pattern exactly as it appears (or the pattern skeleton)
- "meaning": short English explanation of what it means / how it is used
- "meaning_translated": the meaning translated to {tgt_name}
- "example": the sentence from the article that uses it (shortened is fine)
- "example_translated": that example translated to {tgt_name}

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


NEWS_STUDY_VALID_TYPES = {"phrasal_verb", "idiom", "collocation", "pattern"}


async def _call_ollama_news_study(title: str, text: str, target_lang: str) -> List[Dict]:
    """Ollama로 뉴스 기사 학습 포인트 생성"""
    prompt = _build_news_study_prompt(title, text, target_lang)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "think": False,
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
            if not raw_response and thinking:
                raw_response = thinking
            logger.info(f"News study RAW (len={len(raw_response)}): {raw_response[:500]}")

            items = _extract_json_array(raw_response)
            if not items and thinking and thinking != raw_response:
                items = _extract_json_array(thinking)
            valid = []
            for item in items:
                if isinstance(item, dict) and item.get("text") and item.get("meaning"):
                    item_type = item.get("type", "pattern")
                    valid.append({
                        "type": item_type if item_type in NEWS_STUDY_VALID_TYPES else "pattern",
                        "text": item.get("text", ""),
                        "meaning": item.get("meaning", ""),
                        "meaning_translated": item.get("meaning_translated", ""),
                        "example": item.get("example", ""),
                        "example_translated": item.get("example_translated", ""),
                    })
            return valid[:8]

    except Exception as e:
        logger.error(f"News study points error: {e}")
        return []


@app.post("/api/news-study-points")
async def get_news_study_points(req: dict):
    """뉴스 기사 핵심 표현/구문 학습 포인트 생성 API"""
    title = req.get("title", "").strip()
    text = req.get("text", "").strip()
    target_lang = req.get("target_lang", "ko")

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="text is required (min 50 chars)")

    start_time = time.time()

    cache_key = hashlib.md5(f"newsstudy:{title}:{text[:800]}:{target_lang}".encode()).hexdigest()
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    items = await _call_ollama_news_study(title, text, target_lang)

    result = {
        "title": title,
        "items": items,
        "source": "ollama",
        "model": OLLAMA_MODEL,
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if items:
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result


# ── News Listening Quiz (CELPIP style) ──────────────────
def _build_news_quiz_prompt(title: str, text: str, target_lang: str, count: int) -> str:
    lang_names = {"ko": "Korean", "zh": "Chinese", "en": "English", "ja": "Japanese"}
    tgt_name = lang_names.get(target_lang, "Korean")

    return f"""/no_think
You are a CELPIP listening test writer. The following news article will be read aloud to a test taker. Write {count} listening-comprehension questions in authentic CELPIP style, based ONLY on what the article actually says.

Article title: "{title}"

Article text:
\"\"\"
{text}
\"\"\"

Question style rules (CELPIP listening):
1. Mix question types: main idea, specific detail, inference, purpose, and paraphrase ("What does the speaker mean by ...").
2. Each question has exactly 4 answer options; only ONE is correct.
3. Wrong options must be plausible distractors that mention things from the article but are incorrect (wrong number, wrong cause, overstatement, not mentioned).
4. Do NOT ask about spelling or vocabulary definitions. Ask what a listener would need to understand.
5. Questions must be answerable from the article alone.

Return ONLY a valid JSON array with exactly {count} elements. Each element must have exactly these keys:
- "question": the question in English
- "options": array of exactly 4 English answer options
- "answer_index": integer 0-3, the index of the correct option
- "explanation": short English explanation of why the answer is correct and why the distractors are wrong
- "explanation_translated": the explanation translated to {tgt_name}

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


async def _call_ollama_news_quiz(title: str, text: str, target_lang: str, count: int) -> List[Dict]:
    """Ollama로 CELPIP 스타일 듣기 문제 생성"""
    prompt = _build_news_quiz_prompt(title, text, target_lang, count)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 6144,
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
            if not raw_response and thinking:
                raw_response = thinking
            logger.info(f"News quiz RAW (len={len(raw_response)}): {raw_response[:500]}")

            items = _extract_json_array(raw_response)
            if not items and thinking and thinking != raw_response:
                items = _extract_json_array(thinking)
            valid = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                options = item.get("options")
                answer_index = item.get("answer_index")
                if (
                    item.get("question")
                    and isinstance(options, list)
                    and len(options) == 4
                    and isinstance(answer_index, int)
                    and 0 <= answer_index <= 3
                ):
                    # Shuffle options to avoid LLM position bias (answers clustering on one letter)
                    options = [str(opt) for opt in options]
                    correct_option = options[answer_index]
                    random.shuffle(options)
                    valid.append({
                        "question": item.get("question", ""),
                        "options": options,
                        "answer_index": options.index(correct_option),
                        "explanation": item.get("explanation", ""),
                        "explanation_translated": item.get("explanation_translated", ""),
                    })
            return valid[:count]

    except Exception as e:
        logger.error(f"News quiz error: {e}")
        return []


@app.post("/api/news-quiz")
async def get_news_quiz(req: dict):
    """뉴스 기사 기반 CELPIP 스타일 듣기 문제 생성 API"""
    title = req.get("title", "").strip()
    text = req.get("text", "").strip()
    target_lang = req.get("target_lang", "ko")
    count = max(3, min(int(req.get("count", 5) or 5), 8))

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="text is required (min 50 chars)")

    start_time = time.time()

    cache_key = hashlib.md5(f"newsquiz:{title}:{text[:800]}:{target_lang}:{count}".encode()).hexdigest()
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    questions = await _call_ollama_news_quiz(title, text, target_lang, count)

    result = {
        "title": title,
        "questions": questions,
        "source": "ollama",
        "model": OLLAMA_MODEL,
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if questions:
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)



# ── Picture Description Model Answer ────────────────────
def _build_picture_answer_prompt(topic: str, prompt: str, alt_text: str,
                                 vocabulary: List[str], template_description: str,
                                 target_lang: str) -> str:
    lang_names = {"ko": "Korean", "zh": "Chinese", "en": "English", "ja": "Japanese"}
    tgt_name = lang_names.get(target_lang, "Korean")
    vocab_block = "\n".join(f"- {line}" for line in vocabulary) if vocabulary else "- (no vocabulary list)"
    alt_line = f'Image description hint: "{alt_text}"\n' if alt_text else ""

    return f"""/no_think
You are an English speaking coach. A student is practicing describing a photo out loud (like the CELPIP or OPIc speaking test).

Photo topic: "{topic}"
Task instruction: "{prompt}"
{alt_line}Helpful vocabulary from the lesson (the photo shows a scene related to these words):
{vocab_block}

Write a natural spoken-style MODEL ANSWER describing this photo. Requirements:
1. Follow this description structure: {template_description}
2. 6 to 9 sentences, CEFR B1-B2 spoken English (natural, not bookish).
3. Use at least 4 of the vocabulary words above naturally.
4. Since you cannot see the actual photo, describe the most typical scene for this topic and vocabulary. Stay plausible and generic enough to fit such a photo.
5. Start with an overview sentence, end with an impression or speculation sentence.

Return ONLY a valid JSON array. Each element must have exactly these keys:
- "en": one sentence of the model answer in English
- "translated": that sentence translated to {tgt_name}

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


async def _call_ollama_picture_answer(topic: str, prompt: str, alt_text: str,
                                      vocabulary: List[str], template_description: str,
                                      target_lang: str) -> List[Dict]:
    """Ollama로 사진 묘사 모범답안 생성"""
    user_prompt = _build_picture_answer_prompt(topic, prompt, alt_text, vocabulary, template_description, target_lang)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.5,
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
            if not raw_response and thinking:
                raw_response = thinking
            logger.info(f"Picture answer RAW (len={len(raw_response)}): {raw_response[:500]}")

            items = _extract_json_array(raw_response)
            if not items and thinking and thinking != raw_response:
                items = _extract_json_array(thinking)
            valid = []
            for item in items:
                if isinstance(item, dict) and item.get("en"):
                    valid.append({
                        "en": str(item.get("en", "")),
                        "translated": str(item.get("translated", "")),
                    })
            return valid[:10]

    except Exception as e:
        logger.error(f"Picture model answer error: {e}")
        return []


@app.post("/api/picture-model-answer")
async def get_picture_model_answer(req: dict):
    """사진 묘사 모범답안 생성 API"""
    topic = req.get("topic", "").strip()
    prompt = req.get("prompt", "").strip()
    alt_text = req.get("alt_text", "").strip()
    vocabulary = req.get("vocabulary") or []
    template_id = req.get("template_id", "overview")
    template_description = req.get("template_description", "General scene description.")
    target_lang = req.get("target_lang", "ko")

    if not topic and not vocabulary:
        raise HTTPException(status_code=400, detail="topic or vocabulary is required")

    start_time = time.time()

    cache_key = hashlib.md5(
        f"picanswer:{topic}:{template_id}:{target_lang}:{'|'.join(map(str, vocabulary))}".encode()
    ).hexdigest()
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    sentences = await _call_ollama_picture_answer(topic, prompt, alt_text, vocabulary, template_description, target_lang)

    result = {
        "topic": topic,
        "template_id": template_id,
        "sentences": sentences,
        "source": "ollama",
        "model": OLLAMA_MODEL,
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if sentences:
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result


# ── Picture Description Strategy ────────────────────────
def _build_picture_strategy_prompt(topic: str, prompt: str, vocabulary: List[str]) -> str:
    vocab_block = "\n".join(f"- {line}" for line in vocabulary) if vocabulary else "- (no vocabulary list)"

    return f"""/no_think
You are an English speaking coach. A student must describe a photo out loud (like the CELPIP or OPIc speaking test).

Photo topic: "{topic}"
Task instruction: "{prompt}"
Lesson vocabulary (the photo shows a scene related to these words):
{vocab_block}

Create a SHORT step-by-step speaking strategy for describing THIS specific photo: what to mention first, what to describe next, which of the vocabulary words fit each step, and how to wrap up with a guess or impression. Keep it practical and specific to this topic, not generic advice.

Return ONLY a valid JSON array of 4-6 steps in speaking order. Each element must have exactly these keys:
- "en": the step in English (one short sentence, may mention specific vocabulary words)
- "ko": the same step in natural Korean
- "zh": the same step in Simplified Chinese

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation."""


async def _call_ollama_picture_strategy(topic: str, prompt: str, vocabulary: List[str]) -> List[Dict]:
    """Ollama로 사진 묘사 전략 생성"""
    user_prompt = _build_picture_strategy_prompt(topic, prompt, vocabulary)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON-only responder. Never use thinking tags. Output raw JSON only."},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.4,
            "num_predict": 3072,
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
            if not raw_response and thinking:
                raw_response = thinking
            logger.info(f"Picture strategy RAW (len={len(raw_response)}): {raw_response[:500]}")

            items = _extract_json_array(raw_response)
            if not items and thinking and thinking != raw_response:
                items = _extract_json_array(thinking)
            valid = []
            for item in items:
                if isinstance(item, dict) and item.get("en"):
                    valid.append({
                        "en": str(item.get("en", "")),
                        "ko": str(item.get("ko", "")),
                        "zh": str(item.get("zh", "")),
                    })
            return valid[:6]

    except Exception as e:
        logger.error(f"Picture strategy error: {e}")
        return []


@app.post("/api/picture-strategy")
async def get_picture_strategy(req: dict):
    """사진 묘사 전략 생성 API"""
    topic = req.get("topic", "").strip()
    prompt = req.get("prompt", "").strip()
    vocabulary = req.get("vocabulary") or []

    if not topic and not vocabulary:
        raise HTTPException(status_code=400, detail="topic or vocabulary is required")

    start_time = time.time()

    cache_key = hashlib.md5(
        f"picstrategy:{topic}:{'|'.join(map(str, vocabulary))}".encode()
    ).hexdigest()
    entry = _cache.get(cache_key)
    if entry and time.time() - entry["ts"] < CACHE_TTL:
        result = entry["data"].copy()
        result["cached"] = True
        result["processing_time"] = time.time() - start_time
        return result

    steps = await _call_ollama_picture_strategy(topic, prompt, vocabulary)

    result = {
        "topic": topic,
        "steps": steps,
        "source": "ollama",
        "model": OLLAMA_MODEL,
        "cached": False,
        "processing_time": time.time() - start_time,
    }

    if steps:
        _cache[cache_key] = {"data": result, "ts": time.time()}

    return result


# ── Whisper STT Proxy ───────────────────────────────────
# Proxies STT requests to the local whisper-stt container (host network, port 8200)
# so that external clients can access Whisper through the same ngrok tunnel.

from starlette.requests import Request

WHISPER_URL = os.environ.get("WHISPER_URL", "http://192.168.1.150:8200")
WHISPER_TIMEOUT = 120  # seconds (large-v3 can be slow on long audio)


@app.get("/api/stt/health")
async def stt_health_proxy():
    """Proxy Whisper STT health check"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{WHISPER_URL}/api/stt/health")
            return resp.json()
    except Exception as e:
        logger.error(f"Whisper health proxy error: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/stt/transcribe")
async def stt_transcribe_proxy(request: Request):
    """Proxy Whisper STT transcription - forwards multipart form data"""
    try:
        body = await request.body()
        content_type = request.headers.get("content-type", "")

        async with httpx.AsyncClient(timeout=WHISPER_TIMEOUT) as client:
            resp = await client.post(
                f"{WHISPER_URL}/api/stt/transcribe",
                content=body,
                headers={"content-type": content_type},
            )
            return resp.json()
    except httpx.TimeoutException:
        logger.warning("Whisper transcribe proxy timeout")
        raise HTTPException(status_code=504, detail="Whisper server timeout")
    except Exception as e:
        logger.error(f"Whisper transcribe proxy error: {e}")
        raise HTTPException(status_code=502, detail=str(e))
