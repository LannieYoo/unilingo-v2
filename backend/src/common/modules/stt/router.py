#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# STT Router - 라우터 정의와 파라미터 해석

import base64
import time
import wave
import io
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.exceptions import ServiceUnavailable
from pydantic import ValidationError
from .service import get_stt_service, get_dependency_status
from .dto import MissingSegmentRequest, MissingSegmentResponse
from .vosk_processor import get_vosk_processor
from ...decorators import require_approval
from ..auth.router import token_required

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
@token_required
@require_approval
def transcribe():
    """음성인식 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    if not current_app.config.get('STT_ENABLED', True):
        return jsonify({'error': {'code': 'SERVICE_UNAVAILABLE', 'message': 'STT service is disabled', 'trace_id': trace_id}}), 503
    
    if 'audio' not in request.files:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required file: audio', 'trace_id': trace_id}}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'No file selected', 'trace_id': trace_id}}), 400
    
    audio_file.seek(0, 2)
    file_size = audio_file.tell()
    audio_file.seek(0)
    
    if file_size > 10 * 1024 * 1024:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'File too large. Maximum 10MB', 'trace_id': trace_id}}), 400
    if file_size < 100:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'File too small. Minimum 100 bytes', 'trace_id': trace_id}}), 400
    
    language = request.form.get('language', 'auto')
    if not language or language == '' or language == 'auto':
        language = None
    
    try:
        stt_service = get_service()
        result = stt_service.transcribe(audio_file=audio_file, language=language, trace_id=trace_id)
        result['trace_id'] = trace_id
        return jsonify(result), 200
    except ServiceUnavailable as e:
        return jsonify({'error': {'code': 'SERVICE_UNAVAILABLE', 'message': str(e), 'trace_id': trace_id}}), 503
    except Exception:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': 'An unexpected error occurred', 'trace_id': trace_id}}), 500


@router.route('/status', methods=['GET'])
def status():
    """STT 서비스 상태 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        dependencies = get_dependency_status()
        service_available = all(dep.get('available', False) for dep in dependencies.values() if dep.get('required', False))
        return jsonify({'service_available': service_available, 'dependencies': dependencies, 'trace_id': trace_id}), 200
    except Exception:
        return jsonify({'error': {'code': 'STATUS_CHECK_ERROR', 'message': 'Status check failed', 'trace_id': trace_id}}), 500


@router.route('/process-missing', methods=['POST'])
@token_required
@require_approval
def process_missing():
    """
    Missing segment 처리 API (Hybrid STT용)
    
    Web Speech API가 재시작될 때 누락된 오디오 세그먼트를
    Vosk Small 모델로 처리하여 텍스트로 변환
    """
    trace_id = g.get('trace_id', 'unknown')
    start_time = time.time()
    
    try:
        # 요청 데이터 파싱 및 검증
        try:
            request_data = request.get_json()
            if not request_data:
                return jsonify({
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': 'Request body is required',
                        'trace_id': trace_id
                    }
                }), 400
            
            req = MissingSegmentRequest(**request_data)
        except ValidationError as e:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': str(e),
                    'trace_id': trace_id
                }
            }), 400
        
        # Base64 디코딩
        try:
            audio_bytes = base64.b64decode(req.audio)
        except Exception as e:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': f'Invalid base64 audio data: {str(e)}',
                    'trace_id': trace_id
                }
            }), 400
        
        # WAV 형식 검증
        if not _validate_wav_format(audio_bytes):
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': 'Invalid WAV format. Expected 16kHz mono WAV',
                    'trace_id': trace_id
                }
            }), 400
        
        # 오디오 크기 제한 (최대 5초 = ~160KB)
        max_size = 200 * 1024  # 200KB
        if len(audio_bytes) > max_size:
            return jsonify({
                'error': {
                    'code': 'VALIDATION_ERROR',
                    'message': f'Audio too large. Maximum {max_size} bytes',
                    'trace_id': trace_id
                }
            }), 400
        
        # Vosk 처리
        try:
            vosk_processor = get_vosk_processor()
            text = vosk_processor.process_audio(audio_bytes)
        except Exception as e:
            current_app.logger.error(f"Vosk processing failed: {e}")
            return jsonify({
                'error': {
                    'code': 'PROCESSING_ERROR',
                    'message': 'Failed to process audio with Vosk',
                    'trace_id': trace_id
                }
            }), 500
        
        # 처리 시간 계산
        processing_time = time.time() - start_time
        
        # 응답 생성
        response = MissingSegmentResponse(
            success=True,
            text=text,
            start_time=req.start_time,
            end_time=req.end_time,
            processing_time=processing_time
        )
        
        return jsonify(response.dict()), 200
        
    except Exception as e:
        current_app.logger.error(f"Unexpected error in process_missing: {e}")
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
                'trace_id': trace_id
            }
        }), 500


def _validate_wav_format(audio_bytes: bytes) -> bool:
    """
    WAV 형식 검증 (16kHz, mono)
    
    Args:
        audio_bytes: WAV 파일 바이트 데이터
    
    Returns:
        검증 성공 여부
    """
    try:
        # WAV 헤더 검증
        if len(audio_bytes) < 44:
            return False
        
        if audio_bytes[:4] != b'RIFF':
            return False
        
        if audio_bytes[8:12] != b'WAVE':
            return False
        
        # WAV 파일 파싱
        wav_io = io.BytesIO(audio_bytes)
        with wave.open(wav_io, 'rb') as wav_file:
            channels = wav_file.getnchannels()
            sample_rate = wav_file.getframerate()
            
            # 16kHz mono 검증
            if channels != 1:
                current_app.logger.warning(f"Invalid channels: {channels} (expected 1)")
                return False
            
            if sample_rate != 16000:
                current_app.logger.warning(f"Invalid sample rate: {sample_rate} (expected 16000)")
                return False
        
        return True
        
    except Exception as e:
        current_app.logger.error(f"WAV validation failed: {e}")
        return False
