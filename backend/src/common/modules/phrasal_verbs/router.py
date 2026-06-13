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


@phrasal_verbs_bp.route("/api/dictionary/phrasal-verbs/health", methods=["GET"])
def phrasal_verbs_health():
    """RAG 서버 상태 확인"""
    service = get_phrasal_verbs_service()
    result = service.health_check()
    return jsonify(result)
