#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STT DTO - 요청/응답 데이터 구조 정의
"""

from pydantic import BaseModel, Field, validator
from typing import Optional


class MissingSegmentRequest(BaseModel):
    """Missing segment 처리 요청"""
    
    audio: str = Field(..., description="Base64 encoded WAV audio data")
    start_time: float = Field(..., description="Start timestamp in seconds", ge=0)
    end_time: float = Field(..., description="End timestamp in seconds", ge=0)
    language: str = Field(default="en-us", description="Language code")
    
    @validator('end_time')
    def validate_end_time(cls, v, values):
        """end_time이 start_time보다 큰지 검증"""
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be greater than start_time')
        return v
    
    @validator('audio')
    def validate_audio(cls, v):
        """오디오 데이터가 비어있지 않은지 검증"""
        if not v or len(v) < 100:
            raise ValueError('audio data is too short')
        return v


class MissingSegmentResponse(BaseModel):
    """Missing segment 처리 응답"""
    
    success: bool = Field(..., description="Processing success status")
    text: str = Field(..., description="Transcribed text")
    start_time: float = Field(..., description="Start timestamp in seconds")
    end_time: float = Field(..., description="End timestamp in seconds")
    processing_time: float = Field(..., description="Processing time in seconds")
    error: Optional[str] = Field(None, description="Error message if failed")
