"""
STT usage log SQLAlchemy ORM model.
"""
from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Integer, DateTime, ForeignKey, Index
from ...database import Base


class SttLogModel(Base):
    """STT usage log database model."""
    
    __tablename__ = "stt_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    language = Column(String(10), nullable=False)  # e.g., 'en', 'ko', 'ja'
    duration_seconds = Column(Integer, nullable=False, default=0)  # Usage duration in seconds
    word_count = Column(Integer, nullable=False, default=0)  # Number of words transcribed
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_stt_logs_user_id", "user_id"),
        Index("idx_stt_logs_created_at", "created_at"),
        Index("idx_stt_logs_language", "language"),
    )
    
    def __repr__(self):
        return f"<SttLogModel(id={self.id}, user_id={self.user_id}, language={self.language}, duration={self.duration_seconds}s)>"
