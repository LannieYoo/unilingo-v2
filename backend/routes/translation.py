#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translation API Routes
"""

from flask import Blueprint, request, jsonify, g
from ..services.translation_service import get_translation_service
from ..middleware.error_handler import ValidationError, TranslationError

bp = Blueprint('translation', __name__, url_prefix='/api')

translation_service = get_translation_service()


@bp.route('/translate', methods=['POST'])
def translate():
    """
    Translate text
    
    Request body:
        {
            "text": str,
            "source_lang": str,
            "target_lang": str
        }
    
    Response:
        {
            "translated_text": str,
            "source_lang": str,
            "target_lang": str,
            "provider": str,
            "cached": bool,
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # Validate request
        data = request.get_json()
        if not data:
            raise ValidationError("Request body must be JSON")
        
        text = data.get('text')
        source_lang = data.get('source_lang')
        target_lang = data.get('target_lang')
        
        # Validate required fields
        if not text:
            raise ValidationError("Missing required field: text")
        if not source_lang:
            raise ValidationError("Missing required field: source_lang")
        if not target_lang:
            raise ValidationError("Missing required field: target_lang")
        
        # Validate text length
        if len(text) > 5000:
            raise ValidationError("Text too long. Maximum 5000 characters")
        if len(text) < 1:
            raise ValidationError("Text too short. Minimum 1 character")
        
        # Validate language codes
        valid_langs = ['ko', 'en', 'zh']
        if source_lang not in valid_langs:
            raise ValidationError(f"Invalid source_lang. Must be one of: {valid_langs}")
        if target_lang not in valid_langs:
            raise ValidationError(f"Invalid target_lang. Must be one of: {valid_langs}")
        
        # Translate
        result = translation_service.translate(
            text=text,
            source_lang=source_lang,
            target_lang=target_lang,
            trace_id=trace_id
        )
        
        # Add trace_id to response
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


@bp.route('/translate/health', methods=['GET'])
def translation_health():
    """
    Check translation service health
    
    Response:
        {
            "service_available": bool,
            "providers": {
                "provider_name": {
                    "available": bool,
                    "response_time": float,
                    "failures": int,
                    "last_success": float,
                    "error": str
                }
            },
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # Get provider health status
        provider_health = translation_service.health_check_providers()
        
        # Determine overall service availability
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
