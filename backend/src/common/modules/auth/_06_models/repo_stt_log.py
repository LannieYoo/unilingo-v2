"""
STT log repository implementation.
"""
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import func
from .model_stt_log import SttLogModel


@dataclass
class DSttLog:
    """STT log domain object."""
    id: int
    user_id: int
    language: str
    duration_seconds: int
    word_count: int
    ip_address: Optional[str]
    created_at: datetime


@dataclass
class DSttLogCreate:
    """STT log creation data."""
    user_id: int
    language: str
    duration_seconds: int
    word_count: int
    ip_address: Optional[str] = None


@dataclass
class DSttLogSummary:
    """STT usage summary for a user."""
    user_id: int
    total_duration_seconds: int
    total_word_count: int
    session_count: int


class SttLogRepository:
    """STT log repository implementation using SQLAlchemy."""
    
    def __init__(self, db: Session):
        self._db = db
    
    def _to_domain(self, model: SttLogModel) -> DSttLog:
        """Convert ORM model to domain object."""
        return DSttLog(
            id=model.id,
            user_id=model.user_id,
            language=model.language,
            duration_seconds=model.duration_seconds,
            word_count=model.word_count,
            ip_address=model.ip_address,
            created_at=model.created_at,
        )
    
    def create(self, log_data: DSttLogCreate) -> DSttLog:
        """Create new STT log entry."""
        model = SttLogModel(
            user_id=log_data.user_id,
            language=log_data.language,
            duration_seconds=log_data.duration_seconds,
            word_count=log_data.word_count,
            ip_address=log_data.ip_address,
        )
        self._db.add(model)
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def get_by_user_id(self, user_id: int, limit: int = 100) -> list[DSttLog]:
        """Get STT logs for a specific user."""
        models = (
            self._db.query(SttLogModel)
            .filter(SttLogModel.user_id == user_id)
            .order_by(SttLogModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return [self._to_domain(m) for m in models]
    
    def get_recent(self, limit: int = 100) -> list[DSttLog]:
        """Get recent STT logs."""
        models = (
            self._db.query(SttLogModel)
            .order_by(SttLogModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return [self._to_domain(m) for m in models]
    
    def get_user_summary(self, user_id: int) -> DSttLogSummary:
        """Get usage summary for a user."""
        result = (
            self._db.query(
                func.sum(SttLogModel.duration_seconds).label('total_duration'),
                func.sum(SttLogModel.word_count).label('total_words'),
                func.count(SttLogModel.id).label('session_count'),
            )
            .filter(SttLogModel.user_id == user_id)
            .first()
        )
        return DSttLogSummary(
            user_id=user_id,
            total_duration_seconds=result.total_duration or 0,
            total_word_count=result.total_words or 0,
            session_count=result.session_count or 0,
        )
    
    def get_all_users_summary(self) -> list[dict]:
        """Get usage summary for all users."""
        results = (
            self._db.query(
                SttLogModel.user_id,
                func.sum(SttLogModel.duration_seconds).label('total_duration'),
                func.sum(SttLogModel.word_count).label('total_words'),
                func.count(SttLogModel.id).label('session_count'),
            )
            .group_by(SttLogModel.user_id)
            .all()
        )
        return [
            {
                'user_id': r.user_id,
                'total_duration_seconds': r.total_duration or 0,
                'total_word_count': r.total_words or 0,
                'session_count': r.session_count or 0,
            }
            for r in results
        ]
