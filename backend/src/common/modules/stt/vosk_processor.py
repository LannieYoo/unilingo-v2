#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vosk Processor - Vosk Small 모델을 사용한 오디오 처리
"""

import os
import json
import wave
import logging
from pathlib import Path
from typing import Optional
from vosk import Model, KaldiRecognizer


logger = logging.getLogger(__name__)


class VoskProcessor:
    """
    Vosk Small 모델을 사용한 오디오 처리 클래스
    
    Missing segment 처리를 위해 백엔드에서 Vosk 모델을 로드하고
    짧은 오디오 세그먼트를 텍스트로 변환
    """
    
    def __init__(self, model_path: Optional[str] = None, sample_rate: int = 16000):
        """
        VoskProcessor 초기화
        
        Args:
            model_path: Vosk 모델 경로 (None이면 환경변수에서 로드)
            sample_rate: 오디오 샘플레이트 (기본: 16000Hz)
        """
        self.sample_rate = sample_rate
        self.model = None
        self.model_path = model_path or os.getenv('VOSK_MODEL_PATH')
        
        if not self.model_path:
            raise ValueError("VOSK_MODEL_PATH not configured")
        
        # 모델 경로 검증
        model_path_obj = Path(self.model_path)
        if not model_path_obj.exists():
            raise FileNotFoundError(f"Vosk model not found at: {self.model_path}")
        
        # 모델 로드
        try:
            logger.info(f"Loading Vosk model from: {self.model_path}")
            self.model = Model(str(model_path_obj))
            logger.info("Vosk model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Vosk model: {e}")
            raise RuntimeError(f"Failed to load Vosk model: {e}")
    
    def is_loaded(self) -> bool:
        """
        모델이 로드되었는지 확인
        
        Returns:
            모델 로드 여부
        """
        return self.model is not None
    
    def process_audio(self, audio_data: bytes, sample_rate: Optional[int] = None) -> str:
        """
        오디오 데이터를 텍스트로 변환
        
        Args:
            audio_data: WAV 형식의 오디오 바이트 데이터
            sample_rate: 오디오 샘플레이트 (None이면 기본값 사용)
        
        Returns:
            인식된 텍스트
        
        Raises:
            RuntimeError: 모델이 로드되지 않았거나 처리 실패
            ValueError: 잘못된 오디오 형식
        """
        if not self.is_loaded():
            raise RuntimeError("Vosk model not loaded")
        
        # 샘플레이트 검증
        rate = sample_rate or self.sample_rate
        if rate != self.sample_rate:
            logger.warning(f"Sample rate mismatch: expected {self.sample_rate}, got {rate}")
        
        try:
            # Recognizer 생성
            recognizer = KaldiRecognizer(self.model, rate)
            recognizer.SetWords(True)
            
            # 오디오 데이터 처리
            # audio_data는 WAV 파일 전체 (헤더 포함)
            # WAV 헤더를 파싱하여 실제 오디오 데이터만 추출
            audio_bytes = self._extract_audio_from_wav(audio_data)
            
            # 오디오 데이터를 청크로 나누어 처리
            chunk_size = 4000
            for i in range(0, len(audio_bytes), chunk_size):
                chunk = audio_bytes[i:i + chunk_size]
                recognizer.AcceptWaveform(chunk)
            
            # 최종 결과 가져오기
            final_result = recognizer.FinalResult()
            result_dict = json.loads(final_result)
            
            # 텍스트 추출
            text = result_dict.get('text', '').strip()
            
            logger.info(f"Vosk transcription result: '{text}'")
            return text
            
        except Exception as e:
            logger.error(f"Vosk processing failed: {e}")
            raise RuntimeError(f"Vosk processing failed: {e}")
    
    def _extract_audio_from_wav(self, wav_data: bytes) -> bytes:
        """
        WAV 파일에서 실제 오디오 데이터 추출
        
        Args:
            wav_data: WAV 파일 전체 바이트 데이터
        
        Returns:
            오디오 데이터 (헤더 제외)
        
        Raises:
            ValueError: 잘못된 WAV 형식
        """
        try:
            # WAV 헤더는 44바이트
            # 간단한 검증: RIFF 헤더 확인
            if len(wav_data) < 44:
                raise ValueError("Invalid WAV file: too short")
            
            if wav_data[:4] != b'RIFF':
                raise ValueError("Invalid WAV file: missing RIFF header")
            
            if wav_data[8:12] != b'WAVE':
                raise ValueError("Invalid WAV file: missing WAVE header")
            
            # 오디오 데이터는 44바이트 이후부터
            return wav_data[44:]
            
        except Exception as e:
            logger.error(f"Failed to extract audio from WAV: {e}")
            raise ValueError(f"Invalid WAV format: {e}")


# 싱글톤 인스턴스 (메모리 효율성)
_vosk_processor_instance: Optional[VoskProcessor] = None


def get_vosk_processor() -> VoskProcessor:
    """
    VoskProcessor 싱글톤 인스턴스 반환
    
    Returns:
        VoskProcessor 인스턴스
    """
    global _vosk_processor_instance
    
    if _vosk_processor_instance is None:
        sample_rate = int(os.getenv('VOSK_SAMPLE_RATE', '16000'))
        _vosk_processor_instance = VoskProcessor(sample_rate=sample_rate)
    
    return _vosk_processor_instance
