#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health Service - 비즈니스 로직

import time
import logging
import requests
from flask import g
from typing import Dict
from sqlalchemy import text
from .dto import CheckResult, HealthCheckResponse

logger = logging.getLogger(__name__)


def safe_check(check_func, check_name: str) -> CheckResult:
    """
    헬스 체크 래퍼 - 에러가 발생해도 엔드포인트가 중단되지 않도록 보장
    """
    start_time = time.time()
    try:
        result = check_func()
        latency_ms = int((time.time() - start_time) * 1000)
        
        if isinstance(result, dict) and 'ok' in result:
            return result
        
        return CheckResult(ok=True, latency_ms=latency_ms)
    except TimeoutError as e:
        latency_ms = int((time.time() - start_time) * 1000)
        trace_id = g.get('trace_id', 'unknown')
        logger.warning(f"{check_name} check timed out: {e}", extra={'trace_id': trace_id})
        return CheckResult(ok=False, latency_ms=latency_ms, error=f"Timeout: {str(e)}")
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        trace_id = g.get('trace_id', 'unknown')
        logger.error(f"{check_name} check failed: {e}", extra={'trace_id': trace_id})
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def check_database() -> CheckResult:
    """데이터베이스 연결 확인 - SELECT 1 쿼리"""
    from src.common.supabase import SUPABASE_DB_URI
    from sqlalchemy import create_engine
    
    if not SUPABASE_DB_URI:
        return CheckResult(ok=False, latency_ms=0, error="SUPABASE_DB_URI not configured")
    
    start_time = time.time()
    try:
        engine = create_engine(SUPABASE_DB_URI, pool_pre_ping=True, connect_args={'connect_timeout': 5})
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=True, latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def check_translation_api() -> CheckResult:
    """번역 API 상태 확인 - 경량 요청"""
    start_time = time.time()
    try:
        response = requests.head(
            'https://translate.googleapis.com',
            timeout=3
        )
        latency_ms = int((time.time() - start_time) * 1000)
        
        if response.status_code < 500:
            return CheckResult(ok=True, latency_ms=latency_ms)
        else:
            return CheckResult(ok=False, latency_ms=latency_ms, error=f"HTTP {response.status_code}")
    except requests.Timeout:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error="Request timeout")
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def check_dictionary_api() -> CheckResult:
    """사전 API 상태 확인 - 경량 요청"""
    start_time = time.time()
    try:
        response = requests.head(
            'https://api.dictionaryapi.dev',
            timeout=3
        )
        latency_ms = int((time.time() - start_time) * 1000)
        
        if response.status_code < 500:
            return CheckResult(ok=True, latency_ms=latency_ms)
        else:
            return CheckResult(ok=False, latency_ms=latency_ms, error=f"HTTP {response.status_code}")
    except requests.Timeout:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error="Request timeout")
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def check_cache() -> CheckResult:
    """캐시 시스템 확인 - Redis 또는 dictionary_cache 테이블"""
    start_time = time.time()
    
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, socket_connect_timeout=3)
        r.ping()
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=True, latency_ms=latency_ms)
    except Exception:
        pass
    
    try:
        from src.common.supabase import SUPABASE_DB_URI
        from sqlalchemy import create_engine
        
        if not SUPABASE_DB_URI:
            return CheckResult(ok=False, latency_ms=0, error="No cache system configured")
        
        engine = create_engine(SUPABASE_DB_URI, pool_pre_ping=True, connect_args={'connect_timeout': 3})
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM dictionary_cache LIMIT 1"))
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=True, latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def check_usage_tracking() -> CheckResult:
    """사용량 추적 시스템 확인 - usage_logs 테이블 쿼리"""
    from src.common.supabase import SUPABASE_DB_URI
    from sqlalchemy import create_engine
    
    if not SUPABASE_DB_URI:
        return CheckResult(ok=False, latency_ms=0, error="SUPABASE_DB_URI not configured")
    
    start_time = time.time()
    try:
        engine = create_engine(SUPABASE_DB_URI, pool_pre_ping=True, connect_args={'connect_timeout': 3})
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM usage_logs LIMIT 1"))
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=True, latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def check_deepl_usage() -> CheckResult:
    """DeepL API 사용량 확인 (사전 전용)"""
    from src.common.modules.deepl import get_deepl_service
    
    start_time = time.time()
    try:
        deepl = get_deepl_service()
        
        if not deepl.is_available():
            return CheckResult(ok=True, latency_ms=0, info="DeepL not configured (optional)")
        
        usage = deepl.get_usage()
        latency_ms = int((time.time() - start_time) * 1000)
        
        if not usage:
            return CheckResult(ok=False, latency_ms=latency_ms, error="Failed to get usage")
        
        # 사용량 정보 추가
        info = f"Used: {usage['character_count']:,} / {usage['character_limit']:,} chars (Remaining: {usage['remaining']:,})"
        
        # 90% 이상 사용 시 경고
        usage_percent = (usage['character_count'] / usage['character_limit']) * 100
        if usage_percent >= 90:
            return CheckResult(ok=True, latency_ms=latency_ms, info=info, warning=f"Usage at {usage_percent:.1f}%")
        
        return CheckResult(ok=True, latency_ms=latency_ms, info=info)
    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        return CheckResult(ok=False, latency_ms=latency_ms, error=str(e))


def determine_overall_status(checks: Dict[str, CheckResult]) -> str:
    """전체 상태 판단"""
    if not checks.get('db', {}).get('ok', False):
        return 'down'
    
    all_ok = all(check.get('ok', False) for check in checks.values())
    if all_ok:
        return 'ok'
    else:
        return 'degraded'


def perform_health_check() -> HealthCheckResponse:
    """모든 헬스 체크 실행 및 결과 집계"""
    from datetime import datetime
    
    checks = {
        'db': safe_check(check_database, 'database'),
        'translation_api': safe_check(check_translation_api, 'translation_api'),
        'dictionary_api': safe_check(check_dictionary_api, 'dictionary_api'),
        'cache': safe_check(check_cache, 'cache'),
        'usage_tracking': safe_check(check_usage_tracking, 'usage_tracking'),
        'deepl_usage': safe_check(check_deepl_usage, 'deepl_usage')
    }
    
    status = determine_overall_status(checks)
    trace_id = g.get('trace_id', 'unknown')
    
    trace_id_str = g.get('trace_id', 'unknown')
    logger.info(f"Health check completed: {status}", extra={'trace_id': trace_id_str})
    
    if status != 'ok':
        failed_checks = [name for name, check in checks.items() if not check.get('ok', False)]
        logger.warning(f"Health check degraded/down. Failed checks: {failed_checks}", extra={'trace_id': trace_id_str})
    
    return HealthCheckResponse(
        status=status,
        time=datetime.utcnow().isoformat() + 'Z',
        checks=checks,
        trace_id=trace_id
    )
