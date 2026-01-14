#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health DTO - 요청/응답 데이터 구조 정의

from pydantic import BaseModel
from typing import Dict


class ServiceStatusResponse(BaseModel):
    status: str
    services: Dict[str, str]
    timestamp: str
    trace_id: str
