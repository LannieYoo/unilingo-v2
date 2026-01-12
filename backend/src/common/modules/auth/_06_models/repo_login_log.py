"""
Login log repository implementation.
"""
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
from .._01_contracts import ILoginLogRepository, DLoginLog, DLoginLogCreate
from .model_login_log import LoginLogModel


class LoginLogRepository(ILoginLogRepository):
    """Login log repository implementation."""
    
    def __init__(self, db: Session):
        self._db = db
    
    def create(self, data: DLoginLogCreate) -> DLoginLog:
        """Create a new login log entry."""
        log = LoginLogModel(
            user_id=data.user_id,
            ip_address=data.ip_address,
            user_agent=data.user_agent,
            login_at=datetime.utcnow(),
        )
        self._db.add(log)
        self._db.commit()
        self._db.refresh(log)
        return self._to_domain(log)
    
    def get_by_user_id(self, user_id: int, limit: int = 10) -> List[DLoginLog]:
        """Get login logs by user ID."""
        logs = (
            self._db.query(LoginLogModel)
            .filter(LoginLogModel.user_id == user_id)
            .order_by(LoginLogModel.login_at.desc())
            .limit(limit)
            .all()
        )
        return [self._to_domain(log) for log in logs]
    
    def get_recent(self, limit: int = 100) -> List[DLoginLog]:
        """Get recent login logs."""
        logs = (
            self._db.query(LoginLogModel)
            .order_by(LoginLogModel.login_at.desc())
            .limit(limit)
            .all()
        )
        return [self._to_domain(log) for log in logs]
    
    def _to_domain(self, model: LoginLogModel) -> DLoginLog:
        """Convert ORM model to domain object."""
        return DLoginLog(
            id=model.id,
            user_id=model.user_id,
            ip_address=model.ip_address,
            user_agent=model.user_agent,
            login_at=model.login_at,
        )
