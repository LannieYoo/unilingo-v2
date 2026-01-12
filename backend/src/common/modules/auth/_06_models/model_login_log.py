"""
Login log SQLAlchemy ORM model.
"""
from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Index
from ...database import Base


class LoginLogModel(Base):
    """Login log database model."""
    
    __tablename__ = "login_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    user_agent = Column(String(500), nullable=True)
    login_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_login_logs_user_id", "user_id"),
        Index("idx_login_logs_login_at", "login_at"),
    )
    
    def __repr__(self):
        return f"<LoginLogModel(id={self.id}, user_id={self.user_id}, login_at={self.login_at})>"
