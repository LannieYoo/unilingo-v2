#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Health Check API Routes
"""

import requests
from flask import Blueprint, jsonify, g, current_app
from datetime import datetime

bp = Blueprint('health', __name__, url_prefix='/api')


@bp.route('/health', methods=['GET'])
def health_check():
    """
    Check server health status
    
    Response:
        {
            "status": str,  # "healthy" or "unhealthy"
            "services": {
                "translation": str,  # "operational", "degraded", "down"
                "dictionary": str,
                "stt": str
            },
            "timestamp": str,
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    services_status = {
        'translation': check_translation_service(),
        'dictionary': check_dictionary_service(),
        'stt': check_stt_service()
    }
    
    # Determine overall status
    # If any critical service is down, overall status is unhealthy
    critical_services = ['translation', 'dictionary']
    overall_status = 'healthy'
    
    for service in critical_services:
        if services_status[service] == 'down':
            overall_status = 'unhealthy'
            break
    
    response = {
        'status': overall_status,
        'services': services_status,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'trace_id': trace_id
    }
    
    status_code = 200 if overall_status == 'healthy' else 503
    
    return jsonify(response), status_code


def check_translation_service() -> str:
    """Check translation service availability"""
    try:
        # Try to access Google Translate API
        response = requests.get(
            'https://translate.googleapis.com/translate_a/single',
            params={'client': 'gtx', 'sl': 'en', 'tl': 'ko', 'dt': 't', 'q': 'test'},
            timeout=3
        )
        
        if response.status_code == 200:
            return 'operational'
        else:
            return 'degraded'
    
    except Exception:
        return 'degraded'  # Translation has fallback providers


def check_dictionary_service() -> str:
    """Check dictionary service availability"""
    try:
        # Try to access Dictionary API
        response = requests.get(
            'https://api.dictionaryapi.dev/api/v2/entries/en/test',
            timeout=3
        )
        
        if response.status_code == 200:
            return 'operational'
        else:
            return 'degraded'
    
    except Exception:
        return 'degraded'


def check_stt_service() -> str:
    """Check STT service availability"""
    try:
        # Check if STT is enabled
        if not current_app.config.get('STT_ENABLED', True):
            return 'down'
        
        # Check if model is loaded (import check)
        try:
            from faster_whisper import WhisperModel
            return 'operational'
        except ImportError:
            return 'down'
    
    except Exception:
        return 'down'
