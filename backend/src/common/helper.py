#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Helper Functions
모든 유틸리티 함수 정의
"""

import re
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, TypeVar, Callable
from functools import wraps
import time


T = TypeVar('T')


def generate_uuid() -> str:
    """UUID 생성"""
    return str(uuid.uuid4())


def generate_trace_id() -> str:
    """트레이스 ID 생성"""
    return f"trace-{uuid.uuid4().hex[:16]}"


def get_utc_now() -> datetime:
    """현재 UTC 시간 반환"""
    return datetime.now(timezone.utc)


def to_iso_format(dt: datetime) -> str:
    """datetime을 ISO 형식 문자열로 변환"""
    return dt.isoformat() + 'Z' if dt else None


def hash_string(value: str, algorithm: str = 'sha256') -> str:
    """문자열 해시 생성"""
    return hashlib.new(algorithm, value.encode()).hexdigest()


def truncate_string(value: str, max_length: int, suffix: str = '...') -> str:
    """문자열 자르기"""
    if len(value) <= max_length:
        return value
    return value[:max_length - len(suffix)] + suffix


def snake_to_camel(name: str) -> str:
    """snake_case를 camelCase로 변환"""
    components = name.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def camel_to_snake(name: str) -> str:
    """camelCase를 snake_case로 변환"""
    return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()


def keys_to_camel(data: Any) -> Any:
    """딕셔너리 키를 camelCase로 변환 (재귀)"""
    if isinstance(data, dict):
        return {snake_to_camel(k): keys_to_camel(v) for k, v in data.items()}
    if isinstance(data, list):
        return [keys_to_camel(item) for item in data]
    return data


def keys_to_snake(data: Any) -> Any:
    """딕셔너리 키를 snake_case로 변환 (재귀)"""
    if isinstance(data, dict):
        return {camel_to_snake(k): keys_to_snake(v) for k, v in data.items()}
    if isinstance(data, list):
        return [keys_to_snake(item) for item in data]
    return data


def safe_get(data: Dict, *keys, default: Any = None) -> Any:
    """중첩 딕셔너리에서 안전하게 값 가져오기"""
    for key in keys:
        if isinstance(data, dict):
            data = data.get(key, default)
        else:
            return default
    return data


def chunk_list(lst: List[T], size: int) -> List[List[T]]:
    """리스트를 지정된 크기로 분할"""
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """재시도 데코레이터"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_delay = delay
            last_exception = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_attempts - 1:
                        time.sleep(current_delay)
                        current_delay *= backoff
            raise last_exception
        return wrapper
    return decorator


def timing(func: Callable) -> Callable:
    """함수 실행 시간 측정 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        return result, elapsed
    return wrapper


def paginate(items: List[T], page: int, limit: int) -> Dict[str, Any]:
    """리스트 페이지네이션"""
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return {
        'items': items[start:end],
        'pagination': {
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    }


def validate_email(email: str) -> bool:
    """이메일 형식 검증"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def sanitize_string(value: str) -> str:
    """문자열 정리 (앞뒤 공백 제거, 연속 공백 단일화)"""
    return ' '.join(value.split())


def mask_sensitive(value: str, visible_chars: int = 4) -> str:
    """민감 정보 마스킹"""
    if len(value) <= visible_chars:
        return '*' * len(value)
    return value[:visible_chars] + '*' * (len(value) - visible_chars)
