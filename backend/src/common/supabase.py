#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Common Supabase
데이터베이스 연결 (Supabase + SQLAlchemy 호환)
"""

import os
import logging
from pathlib import Path
from typing import Optional, Generator
from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base, Session

logger = logging.getLogger(__name__)

root_env = Path(__file__).parent.parent.parent.parent / '.env'
backend_env = Path(__file__).parent.parent.parent / '.env'

if root_env.exists():
    load_dotenv(root_env)
if backend_env.exists():
    load_dotenv(backend_env, override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
# Transaction Pooler 우선 사용, 없으면 기본 DB URI 사용
SUPABASE_DB_URI = os.getenv("Transaction_pooler", os.getenv("SUPABASE_DB_URI", ""))

supabase_client = None
Base = declarative_base()

try:
    from supabase import create_client, Client
    
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase client initialized successfully")
    else:
        logger.warning("Supabase URL or Service Role Key not configured")
except ImportError:
    logger.warning("supabase-py not installed. Run: pip install supabase")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")


def get_supabase() -> Optional["Client"]:
    """Supabase 클라이언트 반환"""
    return supabase_client


def check_connection() -> bool:
    """Supabase 연결 확인"""
    if supabase_client is None:
        return False
    try:
        supabase_client.table("users").select("id").limit(1).execute()
        return True
    except Exception as e:
        logger.warning(f"Supabase connection check: {e}")
        return False


def get_db() -> Generator[Session, None, None]:
    """SQLAlchemy 세션 반환 (Supabase PostgreSQL 직접 연결)"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from urllib.parse import quote_plus
    
    if not SUPABASE_DB_URI:
        logger.error("SUPABASE_DB_URI not configured in .env file")
        raise ValueError("SUPABASE_DB_URI not configured")
    
    try:
        # URL에 특수문자가 있으면 인코딩 처리
        db_uri = SUPABASE_DB_URI
        
        # 비밀번호 부분만 URL 인코딩 (이미 인코딩되어 있지 않은 경우)
        if '!' in db_uri and '%21' not in db_uri:
            # postgresql://user:password@host:port/db 형식에서 비밀번호 추출
            parts = db_uri.split('@')
            if len(parts) == 2:
                user_pass = parts[0].split('://')[-1]
                if ':' in user_pass:
                    user, password = user_pass.rsplit(':', 1)
                    encoded_password = quote_plus(password)
                    db_uri = f"postgresql://{user}:{encoded_password}@{parts[1]}"
        
        engine = create_engine(db_uri, pool_pre_ping=True, pool_size=5, max_overflow=10)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
