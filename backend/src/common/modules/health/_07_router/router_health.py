#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Health Router
헬스체크 API 라우터
"""

import requests
from flask import Blueprint, jsonify, g, current_app
from datetime import datetime

router = Blueprint('health', __name__, url_prefix='/api')


@router.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    services_status = {
        'translation': _check_translation_service(),
        'dictionary': _check_dictionary_service(),
        'stt': _check_stt_service()
    }
    
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


def _check_translation_service() -> str:
    """번역 서비스 상태 확인"""
    try:
        response = requests.get(
            'https://translate.googleapis.com/translate_a/single',
            params={'client': 'gtx', 'sl': 'en', 'tl': 'ko', 'dt': 't', 'q': 'test'},
            timeout=3
        )
        return 'operational' if response.status_code == 200 else 'degraded'
    except Exception:
        return 'degraded'


def _check_dictionary_service() -> str:
    """사전 서비스 상태 확인"""
    try:
        response = requests.get(
            'https://api.dictionaryapi.dev/api/v2/entries/en/test',
            timeout=3
        )
        return 'operational' if response.status_code == 200 else 'degraded'
    except Exception:
        return 'degraded'


def _check_stt_service() -> str:
    """STT 서비스 상태 확인"""
    try:
        if not current_app.config.get('STT_ENABLED', True):
            return 'down'
        
        try:
            from faster_whisper import WhisperModel
            return 'operational'
        except ImportError:
            return 'down'
    except Exception:
        return 'down'
