"""
User repository implementation.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from .._01_contracts import IUserRepository, DUser, DUserCreate
from .model_user import UserModel


class UserRepository(IUserRepository):
    """User repository implementation using SQLAlchemy."""
    
    def __init__(self, db: Session):
        self._db = db
    
    def _to_domain(self, model: UserModel) -> DUser:
        """Convert ORM model to domain object."""
        return DUser(
            id=model.id,
            google_id=model.google_id,
            email=model.email,
            name=model.name,
            avatar_url=model.avatar_url,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_login_at=model.last_login_at,
            token_version=model.token_version or 1,
        )
    
    def get_by_id(self, user_id: int) -> Optional[DUser]:
        """Get user by ID."""
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        return self._to_domain(model) if model else None
    
    def get_by_google_id(self, google_id: str) -> Optional[DUser]:
        """Get user by Google ID."""
        model = self._db.query(UserModel).filter(UserModel.google_id == google_id).first()
        return self._to_domain(model) if model else None
    
    def get_by_email(self, email: str) -> Optional[DUser]:
        """Get user by email."""
        model = self._db.query(UserModel).filter(UserModel.email == email).first()
        return self._to_domain(model) if model else None
    
    def create(self, user_data: DUserCreate) -> DUser:
        """Create new user."""
        model = UserModel(
            google_id=user_data.google_id,
            email=user_data.email,
            name=user_data.name,
            avatar_url=user_data.avatar_url,
            token_version=1,
        )
        self._db.add(model)
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def update_login(self, user_id: int, increment_token_version: bool = False) -> Optional[DUser]:
        """Update user's last login timestamp and optionally increment token version."""
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if not model:
            return None
        model.last_login_at = datetime.utcnow()
        model.updated_at = datetime.utcnow()
        if increment_token_version:
            model.token_version = (model.token_version or 0) + 1
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def get_all(self, page: int = 1, limit: int = 20) -> list[DUser]:
        """Get all users with pagination."""
        offset = (page - 1) * limit
        models = (
            self._db.query(UserModel)
            .order_by(UserModel.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [self._to_domain(m) for m in models]
    
    def count(self) -> int:
        """Count total users."""
        return self._db.query(UserModel).count()
    
    def update_active(self, user_id: int, is_active: bool) -> Optional[DUser]:
        """Update user's active status."""
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if not model:
            return None
        model.is_active = is_active
        model.updated_at = datetime.utcnow()
        # Increment token_version to invalidate existing sessions when deactivating
        if not is_active:
            model.token_version = (model.token_version or 0) + 1
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
