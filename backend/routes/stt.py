#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Speech-to-Text API Routes
"""

from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.exceptions import ServiceUnavailable
from backend.services.stt_service import get_stt_service, get_dependency_status
from backend.middleware.error_handler import ValidationError, STTError

bp = Blueprint('stt', __name__, url_prefix='/api/stt')

# Initialize STT service (will be done when first accessed)
_stt_service = None


def get_service():
    """Get or initialize STT service"""
    global _stt_service
    
    if _stt_service is None:
        if not current_app.config.get('STT_ENABLED', True):
            raise ServiceUnavailable("Speech-to-text service is disabled")
        
        try:
            _stt_service = get_stt_service(
                model_name=current_app.config.get('STT_MODEL', 'medium'),
                device=current_app.config.get('STT_DEVICE', 'cpu'),
                compute_type=current_app.config.get('STT_COMPUTE_TYPE', 'int8')
            )
        except Exception as e:
            raise ServiceUnavailable(f"Failed to initialize STT service: {e}")
    
    return _stt_service


@bp.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio to text
    
    Form data:
        audio: file (required)
        language: str (optional)
    
    Response:
        {
            "text": str,
            "language": str,
            "filtered": bool,
            "confidence": float,
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # Check if STT is enabled
        if not current_app.config.get('STT_ENABLED', True):
            raise ServiceUnavailable("Speech-to-text service is disabled")
        
        # Validate audio file
        if 'audio' not in request.files:
            raise ValidationError("Missing required file: audio")
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            raise ValidationError("No file selected")
        
        # Validate file size (max 10MB)
        audio_file.seek(0, 2)  # Seek to end
        file_size = audio_file.tell()
        audio_file.seek(0)  # Seek back to start
        
        if file_size > 10 * 1024 * 1024:  # 10MB
            raise ValidationError("File too large. Maximum 10MB")
        
        if file_size < 100:  # Minimum 100 bytes
            raise ValidationError("File too small. Minimum 100 bytes")
        
        # Get language parameter
        language = request.form.get('language', 'auto')
        # Convert empty string or 'auto' to None for auto-detection
        if not language or language == '' or language == 'auto':
            language = None
        
        # Get STT service
        stt_service = get_service()
        
        # Transcribe
        result = stt_service.transcribe(
            audio_file=audio_file,
            language=language,
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


@bp.route('/status', methods=['GET'])
def status():
    """
    Get STT service status and dependency information
    
    Response:
        {
            "service_available": bool,
            "dependencies": {
                "dependency_name": {
                    "name": str,
                    "required": bool,
                    "available": bool,
                    "version": str,
                    "installation_guide": str,
                    "error_details": str
                }
            },
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # Check dependencies
        dependencies = get_dependency_status()
        
        # Determine if service is available
        service_available = all(
            dep.available for dep in dependencies.values() 
            if dep.required
        )
        
        # Convert dependencies to dict format
        deps_dict = {}
        for name, dep in dependencies.items():
            deps_dict[name] = {
                'name': dep.name,
                'required': dep.required,
                'available': dep.available,
                'version': dep.version,
                'installation_guide': dep.installation_guide,
                'error_details': dep.error_details
            }
        
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
