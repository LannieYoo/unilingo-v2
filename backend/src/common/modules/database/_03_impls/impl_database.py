"""
Database implementation using SQLAlchemy.
"""
import os
import logging
from pathlib import Path
from typing import Generator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env files
root_env = Path(__file__).parent.parent.parent.parent.parent.parent.parent / '.env'
backend_env = Path(__file__).parent.parent.parent.parent.parent / '.env'

if root_env.exists():
    load_dotenv(root_env)
if backend_env.exists():
    load_dotenv(backend_env, override=True)

# Load database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/unilingo")

# Create engine with lazy connection
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )
except Exception as e:
    logger.warning(f"Failed to create database engine: {e}")
    engine = None

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None

# Create base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Get database session.
    Use as dependency injection in Flask routes.
    """
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
        """Check if database is connected."""
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
        """Get database session."""
        return get_db()
    
    def create_tables(self) -> None:
        """Create all tables."""
        if self._engine:
            Base.metadata.create_all(bind=self._engine)
    
    @property
    def engine(self):
        """Get SQLAlchemy engine."""
        return self._engine
    
    @property
    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._is_connected
