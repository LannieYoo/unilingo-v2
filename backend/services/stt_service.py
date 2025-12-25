#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Speech-to-Text Service
Handles audio transcription using Faster-Whisper with enhanced FFmpeg detection and fallback
"""

import os
import sys
import tempfile
import subprocess
import shutil
import platform
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from werkzeug.datastructures import FileStorage
from dataclasses import dataclass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.middleware.error_handler import STTError

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class DependencyStatus:
    """Status of a system dependency"""
    name: str
    required: bool
    available: bool
    version: Optional[str] = None
    installation_guide: Optional[str] = None
    error_details: Optional[str] = None

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    WhisperModel = None


class STTService:
    """Speech-to-Text service using Faster-Whisper with enhanced error handling"""
    
    def __init__(
        self,
        model_name: str = 'medium',
        device: str = 'cpu',
        compute_type: str = 'int8'
    ):
        """
        Initialize STT service
        
        Args:
            model_name: Whisper model size (tiny, base, small, medium, large)
            device: Device to use (cpu, cuda)
            compute_type: Compute type (int8, float16, float32)
        """
        if not FASTER_WHISPER_AVAILABLE:
            raise STTError("faster-whisper library not installed")
        
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self.ffmpeg_path = None
        self.dependency_status = {}
        
        # Verify dependencies on initialization
        self.verify_dependencies()
        self._load_model()
    
    def verify_dependencies(self) -> Dict[str, DependencyStatus]:
        """
        Verify all required dependencies and return their status
        
        Returns:
            Dictionary of dependency statuses
        """
        dependencies = {}
        
        # Check FFmpeg
        ffmpeg_status = self._check_ffmpeg()
        dependencies['ffmpeg'] = ffmpeg_status
        
        # Check Faster-Whisper
        whisper_status = self._check_faster_whisper()
        dependencies['faster_whisper'] = whisper_status
        
        self.dependency_status = dependencies
        return dependencies
    
    def _check_ffmpeg(self) -> DependencyStatus:
        """Check FFmpeg availability and version"""
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
                    logger.info(f"FFmpeg found at {path}, version: {version}")
                    return DependencyStatus(
                        name='ffmpeg',
                        required=False,  # Optional for better quality
                        available=True,
                        version=version
                    )
            except Exception as e:
                logger.debug(f"FFmpeg check failed for {path}: {e}")
                continue
        
        # FFmpeg not found - provide installation guidance
        installation_guide = self._get_ffmpeg_installation_guide()
        logger.warning("FFmpeg not found - audio conversion will be limited")
        
        return DependencyStatus(
            name='ffmpeg',
            required=False,
            available=False,
            installation_guide=installation_guide,
            error_details="FFmpeg not found in system PATH or common locations"
        )
    
    def _find_ffmpeg_paths(self) -> List[str]:
        """Find potential FFmpeg installation paths"""
        paths = []
        
        # Check system PATH first
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            paths.append(ffmpeg_path)
        
        # Platform-specific additional paths
        system = platform.system().lower()
        
        if system == 'windows':
            # Windows-specific paths
            username = os.getenv('USERNAME', '')
            windows_paths = [
                r'C:\ffmpeg\bin\ffmpeg.exe',
                r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
                r'C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe',
                rf'C:\Users\{username}\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe',
                rf'C:\Users\{username}\scoop\apps\ffmpeg\current\bin\ffmpeg.exe',
                rf'C:\Users\{username}\AppData\Local\Programs\ffmpeg\bin\ffmpeg.exe'
            ]
            
            # Try where.exe command
            try:
                result = subprocess.run(
                    ['where.exe', 'ffmpeg'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if line.strip():
                            windows_paths.insert(0, line.strip())
            except Exception:
                pass
            
            paths.extend(windows_paths)
            
        elif system == 'darwin':  # macOS
            macos_paths = [
                '/usr/local/bin/ffmpeg',
                '/opt/homebrew/bin/ffmpeg',
                '/usr/bin/ffmpeg'
            ]
            paths.extend(macos_paths)
            
        elif system == 'linux':
            linux_paths = [
                '/usr/bin/ffmpeg',
                '/usr/local/bin/ffmpeg',
                '/snap/bin/ffmpeg'
            ]
            paths.extend(linux_paths)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_paths = []
        for path in paths:
            if path and path not in seen:
                seen.add(path)
                unique_paths.append(path)
        
        return unique_paths
    
    def _get_ffmpeg_installation_guide(self) -> str:
        """Get platform-specific FFmpeg installation instructions"""
        system = platform.system().lower()
        
        if system == 'windows':
            return """
FFmpeg Installation for Windows:
1. Using winget (recommended): winget install ffmpeg
2. Using Chocolatey: choco install ffmpeg
3. Using Scoop: scoop install ffmpeg
4. Manual: Download from https://ffmpeg.org/download.html and add to PATH
            """.strip()
        elif system == 'darwin':
            return """
FFmpeg Installation for macOS:
1. Using Homebrew: brew install ffmpeg
2. Using MacPorts: sudo port install ffmpeg
3. Manual: Download from https://ffmpeg.org/download.html
            """.strip()
        elif system == 'linux':
            return """
FFmpeg Installation for Linux:
1. Ubuntu/Debian: sudo apt-get install ffmpeg
2. CentOS/RHEL: sudo yum install ffmpeg
3. Fedora: sudo dnf install ffmpeg
4. Arch: sudo pacman -S ffmpeg
            """.strip()
        else:
            return "Please install FFmpeg from https://ffmpeg.org/download.html"
    
    def _check_faster_whisper(self) -> DependencyStatus:
        """Check Faster-Whisper availability"""
        if FASTER_WHISPER_AVAILABLE:
            try:
                # Try to get version info
                import faster_whisper
                version = getattr(faster_whisper, '__version__', 'unknown')
                return DependencyStatus(
                    name='faster_whisper',
                    required=True,
                    available=True,
                    version=version
                )
            except Exception as e:
                return DependencyStatus(
                    name='faster_whisper',
                    required=True,
                    available=False,
                    error_details=str(e),
                    installation_guide="pip install faster-whisper"
                )
        else:
            return DependencyStatus(
                name='faster_whisper',
                required=True,
                available=False,
                error_details="faster-whisper not imported",
                installation_guide="pip install faster-whisper"
            )

    def _load_model(self):
        """Load Faster-Whisper model"""
        try:
            logger.info(f"Loading Faster-Whisper model: {self.model_name}")
            self.model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type
            )
            logger.info("Faster-Whisper model loaded successfully")
        except Exception as e:
            error_msg = f"Failed to load Faster-Whisper model: {e}"
            logger.error(error_msg)
            raise STTError(error_msg)
    
    def transcribe(
        self,
        audio_file: FileStorage,
        language: Optional[str] = None,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio to text with enhanced error handling and fallback
        
        Args:
            audio_file: Audio file (webm, wav, mp3, etc.)
            language: Language code or None for auto-detection
            trace_id: Request trace ID
            
        Returns:
            {
                'text': str,
                'language': str,
                'filtered': bool,
                'confidence': float,
                'fallback_used': bool,
                'processing_details': dict
            }
        """
        if not self.model:
            raise STTError("STT model not loaded")
        
        processing_details = {
            'ffmpeg_available': self.ffmpeg_path is not None,
            'audio_conversion': 'none',
            'trace_id': trace_id
        }
        
        # Check file size first
        audio_file.seek(0, 2)  # Seek to end
        file_size = audio_file.tell()
        audio_file.seek(0)  # Seek back to start
        
        # Skip very small files (likely silence) - lowered threshold
        if file_size < 200:
            logger.info(f"Skipping small audio file: {file_size} bytes, trace_id: {trace_id}")
            return {
                'text': '',
                'language': language or 'en',
                'filtered': True,
                'confidence': 0.0,
                'fallback_used': False,
                'processing_details': {
                    'skipped': 'file_too_small',
                    'file_size': file_size,
                    'trace_id': trace_id
                }
            }

        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        wav_path = tmp_path
        
        try:
            # Log audio file details
            file_size = os.path.getsize(tmp_path)
            logger.info(f"Processing audio file: {file_size} bytes, trace_id: {trace_id}")
            
            # Convert to WAV using FFmpeg for better compatibility
            wav_path = self._convert_to_wav(tmp_path)
            
            if wav_path != tmp_path:
                processing_details['audio_conversion'] = 'ffmpeg_success'
            else:
                processing_details['audio_conversion'] = 'ffmpeg_fallback' if self.ffmpeg_path else 'no_ffmpeg'
            
            # Transcribe
            result = self._transcribe_audio(wav_path, language)
            
            # Add processing details
            result['fallback_used'] = wav_path == tmp_path and self.ffmpeg_path is not None
            result['processing_details'] = processing_details
            
            logger.info(f"Transcription completed: '{result['text'][:50]}...', trace_id: {trace_id}")
            
            return result
            
        except Exception as e:
            error_msg = f"Transcription failed: {e}"
            logger.error(f"{error_msg}, trace_id: {trace_id}")
            
            # Log detailed error information
            processing_details['error'] = str(e)
            processing_details['error_type'] = type(e).__name__
            
            raise STTError(error_msg)
            
        finally:
            # Clean up temporary files
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                if wav_path != tmp_path and os.path.exists(wav_path):
                    os.unlink(wav_path)
            except Exception as cleanup_error:
                logger.warning(f"Cleanup error: {cleanup_error}, trace_id: {trace_id}")
    
    def _convert_to_wav(self, input_path: str) -> str:
        """
        Convert audio file to WAV format using FFmpeg with comprehensive fallback
        
        Args:
            input_path: Path to input audio file
            
        Returns:
            Path to converted WAV file or original file if conversion fails
        """
        wav_path = input_path.replace('.webm', '.wav')
        
        # If FFmpeg is not available, return original file
        if not self.ffmpeg_path:
            logger.info("FFmpeg not available, using original audio format")
            return input_path
        
        try:
            # Attempt audio conversion with FFmpeg
            conversion_result = self._attempt_ffmpeg_conversion(input_path, wav_path)
            
            if conversion_result:
                logger.info(f"Successfully converted audio: {input_path} -> {wav_path}")
                # Delete original file after successful conversion
                if os.path.exists(input_path):
                    os.unlink(input_path)
                return wav_path
            else:
                logger.warning("FFmpeg conversion failed, using original format")
                return input_path
                
        except Exception as e:
            logger.error(f"Audio conversion error: {e}")
            return input_path
    
    def _attempt_ffmpeg_conversion(self, input_path: str, output_path: str) -> bool:
        """
        Attempt FFmpeg conversion with multiple strategies
        
        Args:
            input_path: Input audio file path
            output_path: Output WAV file path
            
        Returns:
            True if conversion successful, False otherwise
        """
        # Try different FFmpeg conversion strategies
        conversion_strategies = [
            # Strategy 1: Standard conversion with optimal settings
            [
                self.ffmpeg_path, '-i', input_path,
                '-ar', '16000',  # 16kHz sample rate
                '-ac', '1',      # Mono
                '-acodec', 'pcm_s16le',  # PCM 16-bit
                '-y',            # Overwrite
                output_path
            ],
            # Strategy 2: Simple conversion (fallback)
            [
                self.ffmpeg_path, '-i', input_path,
                '-y',
                output_path
            ],
            # Strategy 3: Force format detection
            [
                self.ffmpeg_path, '-f', 'webm', '-i', input_path,
                '-ar', '16000',
                '-ac', '1',
                '-y',
                output_path
            ]
        ]
        
        for i, cmd in enumerate(conversion_strategies, 1):
            try:
                logger.debug(f"Attempting FFmpeg conversion strategy {i}")
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0 and os.path.exists(output_path):
                    # Verify the output file is valid
                    if os.path.getsize(output_path) > 0:
                        logger.info(f"FFmpeg conversion successful with strategy {i}")
                        return True
                    else:
                        logger.warning(f"FFmpeg strategy {i} produced empty file")
                        if os.path.exists(output_path):
                            os.unlink(output_path)
                else:
                    logger.debug(f"FFmpeg strategy {i} failed: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                logger.warning(f"FFmpeg conversion strategy {i} timed out")
            except Exception as e:
                logger.debug(f"FFmpeg strategy {i} error: {e}")
        
        return False
    
    def _transcribe_audio(self, audio_path: str, language: Optional[str]) -> Dict[str, Any]:
        """Transcribe audio file using Faster-Whisper"""
        # Transcription options optimized for accuracy
        transcribe_options = {
            'beam_size': 5,  # Higher for better accuracy
            'best_of': 5,    # Higher for better accuracy
            'temperature': 0.0,
            'condition_on_previous_text': False,
            'vad_filter': True,  # Voice activity detection
            'vad_parameters': {
                'threshold': 0.5,  # Standard sensitivity
                'min_speech_duration_ms': 250,   # Standard minimum
                'min_silence_duration_ms': 500   # Standard silence
            },
            'no_speech_threshold': 0.6,  # Higher threshold for quality
            'logprob_threshold': -1.0,   # Standard threshold
            'compression_ratio_threshold': 2.4,  # Standard threshold
            'word_timestamps': False  # Disable for speed
        }
        
        # Language mapping
        lang_map = {
            'ko': 'ko',
            'en-CA': 'en',
            'en-US': 'en',
            'en-GB': 'en',
            'en-IN': 'en',
            'zh': 'zh',
            'auto': None,
            '': None
        }
        
        whisper_lang = lang_map.get(language, None)
        if whisper_lang:
            transcribe_options['language'] = whisper_lang
        
        # Transcribe
        segments, info = self.model.transcribe(audio_path, **transcribe_options)
        
        # Collect all segments
        text_segments = []
        for segment in segments:
            logger.debug(f"Segment: '{segment.text}', start: {segment.start}, end: {segment.end}, trace_id: {trace_id}")
            text_segments.append(segment.text)
        
        text = ' '.join(text_segments).strip()
        detected_language = info.language if hasattr(info, 'language') else (whisper_lang or 'en')
        
        logger.info(f"Raw transcription: '{text}', language: {detected_language}, trace_id: {trace_id}")
        
        # Hallucination filtering
        is_hallucination = self._is_hallucination(text)
        
        if is_hallucination:
            logger.info(f"Filtered hallucination: '{text}', trace_id: {trace_id}")
            text = ''
        else:
            logger.info(f"Accepted transcription: '{text}', trace_id: {trace_id}")
        
        return {
            'text': text,
            'language': detected_language,
            'filtered': is_hallucination,
            'confidence': info.language_probability if hasattr(info, 'language_probability') else 0.0
        }
    
    def _is_hallucination(self, text: str) -> bool:
        """Check if transcribed text is likely a hallucination (very permissive)"""
        if not text or len(text) == 0:
            return True
        
        # Check if only special characters (no letters or numbers)
        if not any(c.isalnum() for c in text):
            return True
        
        # Only filter extremely obvious repetitive patterns
        text_lower = text.lower().strip()
        words = text_lower.split()
        
        # Only filter if ALL words are exactly the same
        if len(words) > 2:
            unique_words = set(words)
            if len(unique_words) == 1 and len(words) > 3:
                return True
        
        # Let everything else through
        return False


# Global service instance
_stt_service: Optional[STTService] = None


def get_stt_service(
    model_name: str = 'medium',
    device: str = 'cpu',
    compute_type: str = 'int8'
) -> STTService:
    """Get or create global STT service instance"""
    global _stt_service
    
    if _stt_service is None:
        _stt_service = STTService(model_name, device, compute_type)
    
    return _stt_service


def get_dependency_status() -> Dict[str, DependencyStatus]:
    """Get current dependency status without initializing full service"""
    try:
        # Create temporary service instance just for dependency checking
        temp_service = STTService.__new__(STTService)
        temp_service.ffmpeg_path = None
        temp_service.dependency_status = {}
        return temp_service.verify_dependencies()
    except Exception as e:
        logger.error(f"Failed to check dependencies: {e}")
        return {
            'error': DependencyStatus(
                name='system',
                required=True,
                available=False,
                error_details=str(e)
            )
        }
