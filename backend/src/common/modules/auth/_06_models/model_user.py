"""
User SQLAlchemy ORM model.
"""
from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Integer, Index
from sqlalchemy.orm import relationship
from ...database import Base


class UserModel(Base):
    """User database model."""
    
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    token_version = Column(Integer, default=1, nullable=False)  # For single session enforcement
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_users_google_id", "google_id"),
        Index("idx_users_email", "email"),
    )
    
    # 관계
    dictionary_logs = relationship("DictionaryLogModel", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<UserModel(id={self.id}, email={self.email})>"
