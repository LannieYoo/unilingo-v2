#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT Router
음성인식 API 라우터
"""

from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.exceptions import ServiceUnavailable

from .._04_services import get_stt_service, get_dependency_status
from ...exception import ValidationError, STTError

router = Blueprint('stt', __name__, url_prefix='/api/stt')

_stt_service = None


def get_service():
    """STT 서비스 인스턴스 반환"""
    global _stt_service
    
    if _stt_service is None:
        if not current_app.config.get('STT_ENABLED', True):
            raise ServiceUnavailable("STT service is disabled")
        
        try:
            _stt_service = get_stt_service(
                model_name=current_app.config.get('STT_MODEL', 'medium'),
                device=current_app.config.get('STT_DEVICE', 'cpu'),
                compute_type=current_app.config.get('STT_COMPUTE_TYPE', 'int8')
            )
        except Exception as e:
            raise ServiceUnavailable(f"Failed to initialize STT: {e}")
    
    return _stt_service


@router.route('/transcribe', methods=['POST'])
def transcribe():
    """음성인식 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        if not current_app.config.get('STT_ENABLED', True):
            raise ServiceUnavailable("STT service is disabled")
        
        if 'audio' not in request.files:
            raise ValidationError("Missing required file: audio")
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            raise ValidationError("No file selected")
        
        # 파일 크기 검증
        audio_file.seek(0, 2)
        file_size = audio_file.tell()
        audio_file.seek(0)
        
        if file_size > 10 * 1024 * 1024:
            raise ValidationError("File too large. Maximum 10MB")
        
        if file_size < 100:
            raise ValidationError("File too small. Minimum 100 bytes")
        
        # 언어 파라미터
        language = request.form.get('language', 'auto')
        if not language or language == '' or language == 'auto':
            language = None
        
        stt_service = get_service()
        
        result = stt_service.transcribe(
            audio_file=audio_file,
            language=language,
            trace_id=trace_id
        )
        
        result['trace_id'] = trace_id
        return jsonify(result), 200
    
    except ValidationError as e:
        return jsonify({
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 400
    
    except ServiceUnavailable as e:
        return jsonify({
            'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 503
    
    except STTError as e:
        return jsonify({
            'error': {
                'code': 'STT_ERROR',
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


@router.route('/status', methods=['GET'])
def status():
    """STT 서비스 상태 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        dependencies = get_dependency_status()
        
        service_available = all(
            dep.available for dep in dependencies.values()
            if dep.required
        )
        
        deps_dict = {}
        for name, dep in dependencies.items():
            deps_dict[name] = dep.to_dict()
        
        return jsonify({
            'service_available': service_available,
            'dependencies': deps_dict,
            'trace_id': trace_id
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'STATUS_CHECK_ERROR',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 500
