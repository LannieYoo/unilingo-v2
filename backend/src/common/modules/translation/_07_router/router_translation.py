#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation Router
번역 API 라우터
"""

from flask import Blueprint, request, jsonify, g

from .._04_services import get_translation_service
from .._05_dtos import TranslateRequest
from ...exception import ValidationError, TranslationError

router = Blueprint('translation', __name__, url_prefix='/api')

translation_service = get_translation_service()


@router.route('/translate', methods=['POST'])
def translate():
    """텍스트 번역 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # 요청 검증
        data = request.get_json()
        if not data:
            raise ValidationError("Request body must be JSON")
        
        req = TranslateRequest.from_dict(data)
        
        # 필수 필드 검증
        if not req.text:
            raise ValidationError("Missing required field: text")
        if not req.source_lang:
            raise ValidationError("Missing required field: source_lang")
        if not req.target_lang:
            raise ValidationError("Missing required field: target_lang")
        
        # 텍스트 길이 검증
        if len(req.text) > 5000:
            raise ValidationError("Text too long. Maximum 5000 characters")
        if len(req.text) < 1:
            raise ValidationError("Text too short. Minimum 1 character")
        
        # 언어 코드 검증
        valid_langs = ['ko', 'en', 'zh']
        if req.source_lang not in valid_langs:
            raise ValidationError(f"Invalid source_lang. Must be one of: {valid_langs}")
        if req.target_lang not in valid_langs:
            raise ValidationError(f"Invalid target_lang. Must be one of: {valid_langs}")
        
        # 번역 실행
        result = translation_service.translate(
            text=req.text,
            source_lang=req.source_lang,
            target_lang=req.target_lang,
            trace_id=trace_id
        )
        
        result['trace_id'] = trace_id
        return jsonify(result), 200
    
    except ValidationError as e:
        return jsonify({
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': str(e),
                'trace_id': trace_id,
                'details': e.details if hasattr(e, 'details') else {}
            }
        }), 400
    
    except TranslationError as e:
        return jsonify({
            'error': {
                'code': 'TRANSLATION_FAILED',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 500
    
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
                'trace_id': trace_id
            }
        }), 500


@router.route('/translate/health', methods=['GET'])
def translation_health():
    """번역 서비스 상태 확인 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        provider_health = translation_service.health_check_providers()
        service_available = any(
            provider['available'] for provider in provider_health.values()
        )
        
        return jsonify({
            'service_available': service_available,
            'providers': provider_health,
            'trace_id': trace_id
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'HEALTH_CHECK_ERROR',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 500
