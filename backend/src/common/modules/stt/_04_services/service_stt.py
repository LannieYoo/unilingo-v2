#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT Service Implementation
음성인식 서비스 구현
"""

import os
import tempfile
import subprocess
import shutil
import platform
import logging
from typing import Dict, Any, Optional, List
from werkzeug.datastructures import FileStorage

from .._01_contracts import ISTTService, DSTTResult, DDependencyStatus
from ...exception import STTError

logger = logging.getLogger(__name__)

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    WhisperModel = None


class STTService(ISTTService):
    """Faster-Whisper 기반 음성인식 서비스"""
    
    LANG_MAP = {
        'ko': 'ko',
        'en-CA': 'en',
        'en-US': 'en',
        'en-GB': 'en',
        'en-IN': 'en',
        'zh': 'zh',
        'auto': None,
        '': None
    }
    
    def __init__(
        self,
        model_name: str = 'medium',
        device: str = 'cpu',
        compute_type: str = 'int8'
    ):
        if not FASTER_WHISPER_AVAILABLE:
            raise STTError("faster-whisper library not installed")
        
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self.ffmpeg_path = None
        self.dependency_status = {}
        
        self.verify_dependencies()
        self._load_model()
    
    def verify_dependencies(self) -> Dict[str, DDependencyStatus]:
        """의존성 확인"""
        dependencies = {}
        
        # FFmpeg 확인
        dependencies['ffmpeg'] = self._check_ffmpeg()
        
        # Faster-Whisper 확인
        dependencies['faster_whisper'] = self._check_faster_whisper()
        
        self.dependency_status = dependencies
        return dependencies
    
    def transcribe(
        self,
        audio_file: FileStorage,
        language: Optional[str] = None,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """오디오를 텍스트로 변환"""
        if not self.model:
            raise STTError("STT model not loaded")
        
        processing_details = {
            'ffmpeg_available': self.ffmpeg_path is not None,
            'audio_conversion': 'none',
            'trace_id': trace_id
        }
        
        # 파일 크기 확인
        audio_file.seek(0, 2)
        file_size = audio_file.tell()
        audio_file.seek(0)
        
        if file_size < 200:
            logger.info(f"Skipping small audio: {file_size} bytes, trace_id: {trace_id}")
            return DSTTResult(
                text='',
                language=language or 'en',
                filtered=True,
                processing_details={
                    'skipped': 'file_too_small',
                    'file_size': file_size,
                    'trace_id': trace_id
                }
            ).to_dict()
        
        # 임시 파일 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        wav_path = tmp_path
        
        try:
            logger.info(f"Processing audio: {file_size} bytes, trace_id: {trace_id}")
            
            # WAV 변환
            wav_path = self._convert_to_wav(tmp_path)
            
            if wav_path != tmp_path:
                processing_details['audio_conversion'] = 'ffmpeg_success'
            else:
                processing_details['audio_conversion'] = 'ffmpeg_fallback' if self.ffmpeg_path else 'no_ffmpeg'
            
            # 음성인식
            result = self._transcribe_audio(wav_path, language, trace_id)
            
            result['fallback_used'] = wav_path == tmp_path and self.ffmpeg_path is not None
            result['processing_details'] = processing_details
            
            logger.info(f"Transcription: '{result['text'][:50]}...', trace_id: {trace_id}")
            
            return result
            
        except Exception as e:
            error_msg = f"Transcription failed: {e}"
            logger.error(f"{error_msg}, trace_id: {trace_id}")
            raise STTError(error_msg)
            
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                if wav_path != tmp_path and os.path.exists(wav_path):
                    os.unlink(wav_path)
            except Exception as cleanup_error:
                logger.warning(f"Cleanup error: {cleanup_error}")
    
    def _load_model(self):
        """모델 로드"""
        try:
            logger.info(f"Loading Faster-Whisper model: {self.model_name}")
            self.model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type
            )
            logger.info("Model loaded successfully")
        except Exception as e:
            raise STTError(f"Failed to load model: {e}")
    
    def _check_ffmpeg(self) -> DDependencyStatus:
        """FFmpeg 확인"""
        ffmpeg_paths = self._find_ffmpeg_paths()
        
        for path in ffmpeg_paths:
            try:
                result = subprocess.run(
                    [path, '-version'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    version_line = result.stdout.split('\n')[0]
                    version = version_line.split(' ')[2] if len(version_line.split(' ')) > 2 else 'unknown'
                    self.ffmpeg_path = path
                    return DDependencyStatus(
                        name='ffmpeg',
                        required=False,
                        available=True,
                        version=version
                    )
            except Exception:
                continue
        
        return DDependencyStatus(
            name='ffmpeg',
            required=False,
            available=False,
            installation_guide=self._get_ffmpeg_installation_guide(),
            error_details="FFmpeg not found"
        )
    
    def _find_ffmpeg_paths(self) -> List[str]:
        """FFmpeg 경로 찾기"""
        paths = []
        
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            paths.append(ffmpeg_path)
        
        system = platform.system().lower()
        
        if system == 'windows':
            username = os.getenv('USERNAME', '')
            windows_paths = [
                r'C:\ffmpeg\bin\ffmpeg.exe',
                r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
                rf'C:\Users\{username}\scoop\apps\ffmpeg\current\bin\ffmpeg.exe',
            ]
            paths.extend(windows_paths)
            
        elif system == 'darwin':
            paths.extend(['/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'])
            
        elif system == 'linux':
            paths.extend(['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'])
        
        return list(dict.fromkeys(paths))
    
    def _get_ffmpeg_installation_guide(self) -> str:
        """FFmpeg 설치 가이드"""
        system = platform.system().lower()
        
        if system == 'windows':
            return "winget install ffmpeg"
        elif system == 'darwin':
            return "brew install ffmpeg"
        elif system == 'linux':
            return "sudo apt-get install ffmpeg"
        return "https://ffmpeg.org/download.html"
    
    def _check_faster_whisper(self) -> DDependencyStatus:
        """Faster-Whisper 확인"""
        if FASTER_WHISPER_AVAILABLE:
            try:
                import faster_whisper
                version = getattr(faster_whisper, '__version__', 'unknown')
                return DDependencyStatus(
                    name='faster_whisper',
                    required=True,
                    available=True,
                    version=version
                )
            except Exception as e:
                return DDependencyStatus(
                    name='faster_whisper',
                    required=True,
                    available=False,
                    error_details=str(e),
                    installation_guide="pip install faster-whisper"
                )
        
        return DDependencyStatus(
            name='faster_whisper',
            required=True,
            available=False,
            error_details="Not imported",
            installation_guide="pip install faster-whisper"
        )
    
    def _convert_to_wav(self, input_path: str) -> str:
        """WAV 변환"""
        wav_path = input_path.replace('.webm', '.wav')
        
        if not self.ffmpeg_path:
            return input_path
        
        try:
            cmd = [
                self.ffmpeg_path, '-i', input_path,
                '-ar', '16000', '-ac', '1',
                '-acodec', 'pcm_s16le', '-y',
                wav_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and os.path.exists(wav_path):
                if os.path.getsize(wav_path) > 0:
                    if os.path.exists(input_path):
                        os.unlink(input_path)
                    return wav_path
        
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
        
        return input_path
    
    def _transcribe_audio(
        self,
        audio_path: str,
        language: Optional[str],
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """음성인식 실행"""
        transcribe_options = {
            'beam_size': 5,
            'best_of': 5,
            'temperature': 0.0,
            'condition_on_previous_text': False,
            'vad_filter': True,
            'vad_parameters': {
                'threshold': 0.5,
                'min_speech_duration_ms': 250,
                'min_silence_duration_ms': 500
            },
            'no_speech_threshold': 0.6,
            'word_timestamps': False
        }
        
        whisper_lang = self.LANG_MAP.get(language, None)
        if whisper_lang:
            transcribe_options['language'] = whisper_lang
        
        segments, info = self.model.transcribe(audio_path, **transcribe_options)
        
        text_segments = []
        for segment in segments:
            logger.debug(f"Segment: '{segment.text}', trace_id: {trace_id}")
            text_segments.append(segment.text)
        
        text = ' '.join(text_segments).strip()
        detected_language = info.language if hasattr(info, 'language') else (whisper_lang or 'en')
        
        is_hallucination = self._is_hallucination(text)
        
        if is_hallucination:
            logger.info(f"Filtered hallucination: '{text}', trace_id: {trace_id}")
            text = ''
        
        return DSTTResult(
            text=text,
            language=detected_language,
            filtered=is_hallucination,
            confidence=info.language_probability if hasattr(info, 'language_probability') else 0.0
        ).to_dict()
    
    def _is_hallucination(self, text: str) -> bool:
        """환각 감지"""
        if not text or len(text) == 0:
            return True
        
        if not any(c.isalnum() for c in text):
            return True
        
        text_lower = text.lower().strip()
        words = text_lower.split()
        
        if len(words) > 2:
            unique_words = set(words)
            if len(unique_words) == 1 and len(words) > 3:
                return True
        
        return False


# 전역 서비스 인스턴스
_stt_service: Optional[STTService] = None


def get_stt_service(
    model_name: str = 'medium',
    device: str = 'cpu',
    compute_type: str = 'int8'
) -> STTService:
    """전역 STT 서비스 인스턴스 반환"""
    global _stt_service
    
    if _stt_service is None:
        _stt_service = STTService(model_name, device, compute_type)
    
    return _stt_service


def get_dependency_status() -> Dict[str, DDependencyStatus]:
    """의존성 상태 확인 (서비스 초기화 없이)"""
    try:
        temp_service = STTService.__new__(STTService)
        temp_service.ffmpeg_path = None
        temp_service.dependency_status = {}
        return temp_service.verify_dependencies()
    except Exception as e:
        logger.error(f"Failed to check dependencies: {e}")
        return {
            'error': DDependencyStatus(
                name='system',
                required=True,
                available=False,
                error_details=str(e)
            )
        }
