#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Translation Router - 라우터 정의와 파라미터 해석

from flask import Blueprint, request, jsonify, g
from .service import get_translation_service
from ...decorators import require_approval
from ..auth.router import token_required

router = Blueprint('translation', __name__, url_prefix='/api')

translation_service = get_translation_service()

VALID_LANGS = ['ko', 'en', 'zh']


@router.route('/translate', methods=['POST'])
def translate():
    """텍스트 번역 API (비로그인 사용자 허용)"""
    from flask import request as flask_request
    from ..usage.service import UsageService
    
    trace_id = g.get('trace_id', 'unknown')
    
    data = request.get_json()
    if not data:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Request body must be JSON', 'trace_id': trace_id}}), 400
    
    text = data.get('text', '')
    source_lang = data.get('source_lang', '')
    target_lang = data.get('target_lang', '')
    preferred_provider = data.get('provider', None)  # Optional: 'madlad', 'deepl', etc.
    
    if not text:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required field: text', 'trace_id': trace_id}}), 400
    if not source_lang:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required field: source_lang', 'trace_id': trace_id}}), 400
    if not target_lang:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required field: target_lang', 'trace_id': trace_id}}), 400
    if len(text) > 5000:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Text too long. Maximum 5000 characters', 'trace_id': trace_id}}), 400
    if len(text) < 1:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Text too short. Minimum 1 character', 'trace_id': trace_id}}), 400
    if source_lang not in VALID_LANGS:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid source_lang. Must be one of: {VALID_LANGS}', 'trace_id': trace_id}}), 400
    if target_lang not in VALID_LANGS:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid target_lang. Must be one of: {VALID_LANGS}', 'trace_id': trace_id}}), 400
    
    try:
        result = translation_service.translate(text=text, source_lang=source_lang, target_lang=target_lang, trace_id=trace_id, preferred_provider=preferred_provider)
        result['trace_id'] = trace_id
        
        # Track usage - for authenticated users or guests (by IP)
        char_count = len(text)
        user_id = g.get('user_id')  # Will be None for guests
        
        if user_id:
            # Authenticated user
            UsageService.track_usage(user_id, char_count, 'translation')
        else:
            # Guest user - track by IP
            ip_address = flask_request.headers.get('X-Forwarded-For', flask_request.remote_addr)
            if ip_address:
                # Handle multiple IPs in X-Forwarded-For (take first one)
                ip_address = ip_address.split(',')[0].strip()
                UsageService.track_guest_usage(ip_address, char_count, 'translation')
        
        return jsonify(result), 200
    except Exception:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': 'An unexpected error occurred', 'trace_id': trace_id}}), 500


@router.route('/translate/health', methods=['GET'])
def translation_health():
    """번역 서비스 상태 확인 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        provider_health = translation_service.health_check_providers()
        service_available = any(provider['available'] for provider in provider_health.values())
        return jsonify({'service_available': service_available, 'providers': provider_health, 'trace_id': trace_id}), 200
    except Exception:
        return jsonify({'error': {'code': 'HEALTH_CHECK_ERROR', 'message': 'Health check failed', 'trace_id': trace_id}}), 500
