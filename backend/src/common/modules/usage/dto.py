#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Usage DTO (Data Transfer Objects)
Pydantic models for usage tracking requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional


class UsageResponse(BaseModel):
    """Response model for current usage query"""
    translator_chars: int
    translator_limit: Optional[int]
    translator_percentage: Optional[float]
    tts_chars: int
    tts_limit: Optional[int]
    tts_percentage: Optional[float]
    stt_stream_chars: int
    stt_stream_limit: Optional[int]
    stt_stream_percentage: Optional[float]
    dictionary_searches: int
    dictionary_limit: Optional[int]
    dictionary_percentage: Optional[float]
    month: str  # YYYY-MM format
    user_level: str
    approval_status: str


class TrackUsageRequest(BaseModel):
    """Request model for tracking usage"""
    char_count: int = Field(gt=0, description="Number of characters to track (or searches for dictionary)")
    usage_type: str = Field(pattern="^(translator|tts|stt_stream|dictionary|translation|stt)$", description="Type of usage: translator, tts, stt_stream, or dictionary (legacy: translation, stt)")
