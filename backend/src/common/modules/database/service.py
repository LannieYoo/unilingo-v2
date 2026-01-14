#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Database Service - 데이터베이스 연결

import os
import logging
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

root_env = Path(__file__).parent.parent.parent.parent.parent.parent / '.env'
backend_env = Path(__file__).parent.parent.parent.parent / '.env'

if root_env.exists():
    load_dotenv(root_env)
if backend_env.exists():
    load_dotenv(backend_env, override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/unilingo")

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10, echo=False)
except Exception as e:
    logger.warning(f"Failed to create database engine: {e}")
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    if SessionLocal is None:
        raise RuntimeError("Database is not available")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseImpl:
    """Database implementation."""
    
    def __init__(self):
        self._engine = engine
        self._session_factory = SessionLocal
        self._is_connected = False
    
    def check_connection(self) -> bool:
        if self._engine is None:
            return False
        try:
            with self._engine.connect() as conn:
                conn.execute("SELECT 1")
            self._is_connected = True
            return True
        except Exception:
            self._is_connected = False
            return False
    
    def get_session(self) -> Generator[Session, None, None]:
        return get_db()
    
    def create_tables(self) -> None:
        if self._engine:
            Base.metadata.create_all(bind=self._engine)
    
    @property
    def engine(self):
        return self._engine
    
    @property
    def is_connected(self) -> bool:
        return self._is_connected


database_service = DatabaseImpl()
