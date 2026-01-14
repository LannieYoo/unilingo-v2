#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Translation DTO - 요청/응답 데이터 구조 정의

from pydantic import BaseModel, Field
from typing import List, Optional


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: str
    target_lang: str


class ProviderAttemptDTO(BaseModel):
    provider_name: str
    success: bool
    error_message: Optional[str] = None
    response_time: Optional[float] = None
    timeout_used: Optional[float] = None


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    provider: str
    cached: bool = False
    retry_count: int = 0
    provider_attempts: List[ProviderAttemptDTO] = []
    processing_time: float = 0.0
    error: Optional[str] = None
    trace_id: str = ''


class ProviderHealthDTO(BaseModel):
    available: bool
    response_time: Optional[float] = None
    failures: int = 0
    last_success: Optional[float] = None
    error: Optional[str] = None


class HealthCheckResponse(BaseModel):
    service_available: bool
    providers: dict
    trace_id: str
