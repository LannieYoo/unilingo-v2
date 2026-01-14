#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Cache DTO - 요청/응답 데이터 구조 정의

from pydantic import BaseModel
from typing import Any, Optional


class CacheEntryDTO(BaseModel):
    key: str
    value: Any
    ttl: Optional[int] = None


class CacheStatsDTO(BaseModel):
    total_entries: int
    active_entries: int
    expired_entries: int
