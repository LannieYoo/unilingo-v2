#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health DTO - 요청/응답 데이터 구조 정의

from typing import TypedDict, Optional, Dict


class CheckResult(TypedDict, total=False):
    """단일 헬스 체크 결과"""
    ok: bool
    latency_ms: int
    error: Optional[str]


class HealthCheckResponse(TypedDict):
    """전체 헬스 체크 응답"""
    status: str
    time: str
    checks: Dict[str, CheckResult]
    trace_id: str
