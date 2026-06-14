#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phrasal Verbs Router - 구동사 API 엔드포인트
"""

from flask import Blueprint, request, jsonify
from .service import get_phrasal_verbs_service
import logging

logger = logging.getLogger(__name__)

phrasal_verbs_bp = Blueprint("phrasal_verbs", __name__)


@phrasal_verbs_bp.route("/api/dictionary/phrasal-verbs", methods=["GET"])
def get_phrasal_verbs():
    """구동사 조회 API"""
    word = request.args.get("word", "").strip()
    target_lang = request.args.get("target_lang", "ko").strip()

    if not word:
        return jsonify({"error": "word parameter is required"}), 400

    service = get_phrasal_verbs_service()
    result = service.get_phrasal_verbs(word, target_lang)

    return jsonify(result)


@phrasal_verbs_bp.route("/api/dictionary/context-suggestions", methods=["GET"])
def get_context_suggestions():
    """문맥 연관어 API"""
    word = request.args.get("word", "").strip()

    if not word:
        return jsonify({"error": "word parameter is required"}), 400

    service = get_phrasal_verbs_service()
    result = service.get_context_suggestions(word)

    return jsonify(result)


@phrasal_verbs_bp.route("/api/dictionary/phrasal-verbs/health", methods=["GET"])
def phrasal_verbs_health():
    """RAG 서버 상태 확인"""
    service = get_phrasal_verbs_service()
    result = service.health_check()
    return jsonify(result)


@phrasal_verbs_bp.route("/api/translator/alternative-translations", methods=["POST"])
def get_alternative_translations():
    """유사 번역 표현 API"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    original = data.get("original", "").strip()
    translated = data.get("translated", "").strip()
    source_lang = data.get("source_lang", "ko")
    target_lang = data.get("target_lang", "en")

    if not original or not translated:
        return jsonify({"error": "original and translated are required"}), 400

    service = get_phrasal_verbs_service()
    result = service.get_alternative_translations(original, translated, source_lang, target_lang)
    return jsonify(result)

