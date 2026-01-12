#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Logging Configuration
로깅 설정 - 로그 로테이션, JSON 포맷, 레벨별 분리
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from flask import Flask, request, g, has_request_context, has_app_context


class JSONFormatter(logging.Formatter):
    """JSON 형식 로그 포매터"""
    
    def format(self, record: logging.LogRecord) -> str:
        """로그 레코드를 JSON 형식으로 변환"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'source': 'backend',
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.name,
            'function': record.funcName,
            'line': record.lineno,
            'trace_id': None,
            'user_id': None,
        }
        
        # 요청 컨텍스트 정보 추가 (Flask 내장 함수 사용)
        if has_request_context():
            log_data['trace_id'] = getattr(g, 'trace_id', None)
            log_data['user_id'] = getattr(g, 'user_id', None)
            log_data['request_path'] = request.path
            log_data['request_method'] = request.method
            log_data['remote_addr'] = request.remote_addr
        
        # 예외 정보 추가
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # 추가 데이터
        if hasattr(record, 'extra_data'):
            log_data['extra_data'] = record.extra_data
        
        return json.dumps(log_data, ensure_ascii=False, default=str)


class ConsoleFormatter(logging.Formatter):
    """콘솔용 컬러 포매터"""
    
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        
        # trace_id 가져오기 (Flask 내장 함수 사용)
        trace_id = ''
        if has_request_context():
            tid = getattr(g, 'trace_id', None)
            if tid:
                trace_id = f" [{tid[:8]}]"
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return f"{color}{timestamp} - {record.levelname:8}{self.RESET}{trace_id} - {record.getMessage()}"


def init_logging(app: Flask):
    """
    로깅 시스템 초기화
    
    Features:
    - 로그 로테이션 (파일 크기 기반 + 날짜 기반)
    - JSON 구조화 로깅 (파일)
    - 컬러 콘솔 출력 (개발 환경)
    - 레벨별 파일 분리 (일반 로그 / 에러 로그)
    
    Args:
        app: Flask 애플리케이션 인스턴스
    """
    # 로그 디렉토리 설정
    log_dir = Path(app.config.get('LOG_DIR', '../logs'))
    if not log_dir.is_absolute():
        log_dir = Path(__file__).parent.parent.parent.parent.parent.parent / log_dir.name
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # 로그 레벨 설정
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO').upper(), logging.INFO)
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 기존 핸들러 제거
    root_logger.handlers.clear()
    
    # 1. 콘솔 핸들러 (개발 환경용)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(ConsoleFormatter())
    root_logger.addHandler(console_handler)
    
    # 2. 일반 로그 파일 핸들러 (로테이션: 10MB, 최대 10개 파일)
    app_log_file = log_dir / 'application_logs.log'
    app_file_handler = RotatingFileHandler(
        filename=str(app_log_file),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    app_file_handler.setLevel(log_level)
    app_file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(app_file_handler)
    
    # 3. 에러 로그 파일 핸들러 (로테이션: 10MB, 최대 10개 파일)
    error_log_file = log_dir / 'application_exceptions.log'
    error_file_handler = RotatingFileHandler(
        filename=str(error_log_file),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding='utf-8'
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(error_file_handler)
    
    # 4. 일별 로그 파일 핸들러 (날짜별 로테이션, 30일 보관)
    daily_log_file = log_dir / 'daily.log'
    daily_file_handler = TimedRotatingFileHandler(
        filename=str(daily_log_file),
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    daily_file_handler.setLevel(log_level)
    daily_file_handler.setFormatter(JSONFormatter())
    daily_file_handler.suffix = '%Y-%m-%d'
    root_logger.addHandler(daily_file_handler)
    
    # Flask 앱 로거 설정
    app.logger.handlers.clear()
    app.logger.setLevel(log_level)
    app.logger.propagate = True
    
    # Werkzeug 로거 레벨 조정 (너무 많은 로그 방지)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    
    # 초기화 완료 로그
    root_logger.info(
        f"Logging initialized: level={app.config.get('LOG_LEVEL', 'INFO')}, "
        f"log_dir={log_dir}"
    )


def get_logger(name: str) -> logging.Logger:
    """
    모듈별 로거 가져오기
    
    Args:
        name: 로거 이름 (보통 __name__ 사용)
    
    Returns:
        설정된 로거 인스턴스
    """
    return logging.getLogger(name)
