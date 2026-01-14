#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# STT DTO - 요청/응답 데이터 구조 정의

from pydantic import BaseModel
from typing import Optional, Dict, Any


class STTResultDTO(BaseModel):
    text: str
    language: str
    filtered: bool = False
    confidence: float = 0.0
    fallback_used: bool = False
    processing_details: Dict[str, Any] = {}
    trace_id: str = ''


class DependencyStatusDTO(BaseModel):
    name: str
    required: bool
    available: bool
    version: Optional[str] = None
    installation_guide: Optional[str] = None
    error_details: Optional[str] = None


class STTStatusResponse(BaseModel):
    service_available: bool
    dependencies: Dict[str, Any]
    trace_id: str
