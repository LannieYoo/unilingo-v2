#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Auth Service

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode
import httpx
from jose import jwt, JWTError
from sqlalchemy.orm import Session, relationship
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Integer, Index, ForeignKey, Text, func, desc

from ..database import Base, get_db
from .dto import (
    DUser, DUserCreate, DGoogleUserInfo, DToken, DTokenPayload, DGoogleTokens,
    DLoginLog, DLoginLogCreate, DSttLog, DSttLogCreate, DSttLogSummary,
    ETokenType, GoogleOAuthError, TokenExpiredError, InvalidTokenError, DatabaseError,
)

ADMIN_USER = os.getenv('ADMIN_USER', '')
logger = logging.getLogger(__name__)

class UserModel(Base):
    __tablename__ = "users"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    user_level = Column(String(20), default='guest', nullable=False, index=True)  # guest, pro, pro_plus, admin
    is_approved = Column(Boolean, default=False, nullable=False, index=True)
    token_version = Column(Integer, default=1, nullable=False)
    native_language = Column(String(10), nullable=True, default='en')
    target_language = Column(String(10), nullable=True, default='ko')
    daily_gpu_limit_minutes = Column(Integer, nullable=True, default=None)  # NULL = use level default
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    __table_args__ = (
        Index("idx_users_google_id", "google_id"), 
        Index("idx_users_email", "email"),
        Index("idx_users_user_level", "user_level"),
        Index("idx_users_is_approved", "is_approved"),
    )
    dictionary_logs = relationship("DictionaryLogModel", back_populates="user", cascade="all, delete-orphan")


class LoginLogModel(Base):
    __tablename__ = "login_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    login_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (Index("idx_login_logs_user_id", "user_id"), Index("idx_login_logs_login_at", "login_at"),)


class SttLogModel(Base):
    __tablename__ = "stt_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    language = Column(String(10), nullable=False)
    duration_seconds = Column(Integer, nullable=False, default=0)
    word_count = Column(Integer, nullable=False, default=0)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (Index("idx_stt_logs_user_id", "user_id"), Index("idx_stt_logs_created_at", "created_at"),)


class TranslationLogModel(Base):
    __tablename__ = 'translation_logs'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False, index=True)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    provider = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class DictionaryLogModel(Base):
    __tablename__ = 'dictionary_logs'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False, index=True)
    search_word = Column(String(255), nullable=False)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    search_results = Column(Text, nullable=True)
    result_summary = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user = relationship("UserModel", back_populates="dictionary_logs")

class UserRepository:
    def __init__(self, db: Session):
        self._db = db
    
    def _to_domain(self, model: UserModel) -> DUser:
        return DUser(
            id=model.id, 
            google_id=model.google_id, 
            email=model.email, 
            name=model.name, 
            avatar_url=model.avatar_url, 
            is_active=model.is_active, 
            user_level=model.user_level or 'guest',
            is_approved=model.is_approved or False,
            created_at=model.created_at, 
            updated_at=model.updated_at, 
            last_login_at=model.last_login_at, 
            approved_at=model.approved_at,
            approved_by=model.approved_by,
            token_version=model.token_version or 1, 
            native_language=model.native_language or 'en', 
            target_language=model.target_language or 'ko',
            daily_gpu_limit_minutes=model.daily_gpu_limit_minutes
        )
    
    def get_by_id(self, user_id: int) -> Optional[DUser]:
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        return self._to_domain(model) if model else None
    
    def get_by_google_id(self, google_id: str) -> Optional[DUser]:
        model = self._db.query(UserModel).filter(UserModel.google_id == google_id).first()
        return self._to_domain(model) if model else None
    
    def get_by_email(self, email: str) -> Optional[DUser]:
        model = self._db.query(UserModel).filter(UserModel.email == email).first()
        return self._to_domain(model) if model else None
    
    def create(self, user_data: DUserCreate) -> DUser:
        # Check if user is admin
        is_admin = ADMIN_USER and user_data.email == ADMIN_USER
        
        # Admin users get admin level (approved), others get pro level (unapproved)
        model = UserModel(
            google_id=user_data.google_id, 
            email=user_data.email, 
            name=user_data.name, 
            avatar_url=user_data.avatar_url, 
            token_version=1,
            user_level='admin' if is_admin else 'pro',
            is_approved=True if is_admin else False
        )
        self._db.add(model)
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def update_login(self, user_id: int, increment_token_version: bool = False) -> Optional[DUser]:
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
    
    def get_all(self, page: int = 1, limit: int = 20, search: str = None) -> list[DUser]:
        offset = (page - 1) * limit
        query = self._db.query(UserModel)
        
        # Add search filter if provided
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (UserModel.email.ilike(search_pattern)) | 
                (UserModel.name.ilike(search_pattern))
            )
        
        models = query.order_by(UserModel.created_at.desc()).offset(offset).limit(limit).all()
        return [self._to_domain(m) for m in models]
    
    def count(self, search: str = None) -> int:
        query = self._db.query(UserModel)
        
        # Add search filter if provided
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (UserModel.email.ilike(search_pattern)) | 
                (UserModel.name.ilike(search_pattern))
            )
        
        return query.count()
    
    def update_active(self, user_id: int, is_active: bool) -> Optional[DUser]:
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if not model:
            return None
        model.is_active = is_active
        model.updated_at = datetime.utcnow()
        if not is_active:
            model.token_version = (model.token_version or 0) + 1
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def update_language_preferences(self, user_id: int, native_language: str, target_language: str) -> Optional[DUser]:
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if not model:
            return None
        model.native_language = native_language
        model.target_language = target_language
        model.updated_at = datetime.utcnow()
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def update_user_level(self, user_id: int, user_level: str, approved_by: int = None) -> Optional[DUser]:
        """Update user level and approval status"""
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if not model:
            return None
        
        # Validate user_level
        valid_levels = ['guest', 'pro', 'pro_plus', 'admin']
        if user_level not in valid_levels:
            raise ValueError(f"Invalid user_level: {user_level}. Must be one of {valid_levels}")
        
        model.user_level = user_level
        model.updated_at = datetime.utcnow()
        
        # Admin users are always auto-approved
        if user_level == 'admin':
            model.is_approved = True
            model.approved_at = datetime.utcnow()
            model.approved_by = approved_by
        # If upgrading from guest to any other level, mark as approved
        elif user_level != 'guest' and not model.is_approved:
            model.is_approved = True
            model.approved_at = datetime.utcnow()
            model.approved_by = approved_by
        
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)

    def update_gpu_limit(self, user_id: int, daily_gpu_limit_minutes: int = None) -> Optional[DUser]:
        """Update per-user daily GPU usage limit in minutes. None = use level default."""
        model = self._db.query(UserModel).filter(UserModel.id == user_id).first()
        if not model:
            return None
        model.daily_gpu_limit_minutes = daily_gpu_limit_minutes
        model.updated_at = datetime.utcnow()
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)

class LoginLogRepository:
    def __init__(self, db: Session):
        self._db = db
    
    def create(self, data: DLoginLogCreate) -> DLoginLog:
        log = LoginLogModel(user_id=data.user_id, ip_address=data.ip_address, user_agent=data.user_agent, login_at=datetime.utcnow())
        self._db.add(log)
        self._db.commit()
        self._db.refresh(log)
        return DLoginLog(id=log.id, user_id=log.user_id, ip_address=log.ip_address, user_agent=log.user_agent, login_at=log.login_at)
    
    def get_by_user_id(self, user_id: int, limit: int = 10, offset: int = 0) -> List[DLoginLog]:
        logs = self._db.query(LoginLogModel).filter(LoginLogModel.user_id == user_id).order_by(LoginLogModel.login_at.desc()).offset(offset).limit(limit).all()
        return [DLoginLog(id=l.id, user_id=l.user_id, ip_address=l.ip_address, user_agent=l.user_agent, login_at=l.login_at) for l in logs]
    
    def get_recent(self, limit: int = 100, offset: int = 0, search: str = None) -> List[DLoginLog]:
        query = self._db.query(LoginLogModel)
        
        # Add search filter if provided - search by user email or name
        if search:
            search_pattern = f"%{search}%"
            query = query.join(UserModel, LoginLogModel.user_id == UserModel.id).filter(
                (UserModel.email.ilike(search_pattern)) | 
                (UserModel.name.ilike(search_pattern))
            )
        
        logs = query.order_by(LoginLogModel.login_at.desc()).offset(offset).limit(limit).all()
        return [DLoginLog(id=l.id, user_id=l.user_id, ip_address=l.ip_address, user_agent=l.user_agent, login_at=l.login_at) for l in logs]
    
    def count_all(self, search: str = None) -> int:
        query = self._db.query(LoginLogModel)
        
        # Add search filter if provided
        if search:
            search_pattern = f"%{search}%"
            query = query.join(UserModel, LoginLogModel.user_id == UserModel.id).filter(
                (UserModel.email.ilike(search_pattern)) | 
                (UserModel.name.ilike(search_pattern))
            )
        
        return query.count()
    
    def count_by_user_id(self, user_id: int) -> int:
        return self._db.query(LoginLogModel).filter(LoginLogModel.user_id == user_id).count()


class SttLogRepository:
    def __init__(self, db: Session):
        self._db = db
    
    def _to_domain(self, model: SttLogModel) -> DSttLog:
        return DSttLog(id=model.id, user_id=model.user_id, language=model.language, duration_seconds=model.duration_seconds, word_count=model.word_count, ip_address=model.ip_address, created_at=model.created_at)
    
    def create(self, log_data: DSttLogCreate) -> DSttLog:
        model = SttLogModel(user_id=log_data.user_id, language=log_data.language, duration_seconds=log_data.duration_seconds, word_count=log_data.word_count, ip_address=log_data.ip_address)
        self._db.add(model)
        self._db.commit()
        self._db.refresh(model)
        return self._to_domain(model)
    
    def get_by_user_id(self, user_id: int, limit: int = 100, offset: int = 0) -> list[DSttLog]:
        models = self._db.query(SttLogModel).filter(SttLogModel.user_id == user_id).order_by(SttLogModel.created_at.desc()).offset(offset).limit(limit).all()
        return [self._to_domain(m) for m in models]
    
    def get_recent(self, limit: int = 100, offset: int = 0) -> list[DSttLog]:
        models = self._db.query(SttLogModel).order_by(SttLogModel.created_at.desc()).offset(offset).limit(limit).all()
        return [self._to_domain(m) for m in models]
    
    def count_all(self) -> int:
        return self._db.query(SttLogModel).count()
    
    def count_by_user_id(self, user_id: int) -> int:
        return self._db.query(SttLogModel).filter(SttLogModel.user_id == user_id).count()
    
    def get_all_users_summary(self, limit: int = 100, offset: int = 0, search: str = None) -> list[dict]:
        query = self._db.query(
            SttLogModel.user_id, 
            func.sum(SttLogModel.duration_seconds).label('total_duration'), 
            func.sum(SttLogModel.word_count).label('total_words'), 
            func.count(SttLogModel.id).label('session_count')
        ).group_by(SttLogModel.user_id)
        
        # Add search filter if provided - search by user email or name
        if search:
            search_pattern = f"%{search}%"
            query = query.join(UserModel, SttLogModel.user_id == UserModel.id).filter(
                (UserModel.email.ilike(search_pattern)) | 
                (UserModel.name.ilike(search_pattern))
            )
        
        results = query.offset(offset).limit(limit).all()
        return [{'user_id': r.user_id, 'total_duration_seconds': r.total_duration or 0, 'total_word_count': r.total_words or 0, 'session_count': r.session_count or 0} for r in results]
    
    def count_users_with_logs(self, search: str = None) -> int:
        query = self._db.query(func.count(func.distinct(SttLogModel.user_id)))
        
        # Add search filter if provided
        if search:
            search_pattern = f"%{search}%"
            query = query.join(UserModel, SttLogModel.user_id == UserModel.id).filter(
                (UserModel.email.ilike(search_pattern)) | 
                (UserModel.name.ilike(search_pattern))
            )
        
        return query.scalar()

class TranslationLogRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, user_id: int, source_text: str, translated_text: str, source_lang: str, target_lang: str, provider: str = None, ip_address: str = None) -> TranslationLogModel:
        log = TranslationLogModel(user_id=user_id, source_text=source_text, translated_text=translated_text, source_lang=source_lang, target_lang=target_lang, provider=provider, ip_address=ip_address)
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log
    
    def get_by_user_id(self, user_id: int, limit: int = 100, offset: int = 0) -> List[TranslationLogModel]:
        return self.db.query(TranslationLogModel).filter(TranslationLogModel.user_id == user_id).order_by(TranslationLogModel.created_at.desc()).offset(offset).limit(limit).all()
    
    def get_all_with_user_info(self, limit: int = 100) -> List[Dict[str, Any]]:
        logs = self.db.query(TranslationLogModel, UserModel).join(UserModel, TranslationLogModel.user_id == UserModel.id).order_by(TranslationLogModel.created_at.desc()).limit(limit).all()
        return [{'id': log.id, 'user_id': log.user_id, 'source_text': log.source_text, 'translated_text': log.translated_text, 'source_lang': log.source_lang, 'target_lang': log.target_lang, 'provider': log.provider, 'ip_address': log.ip_address, 'created_at': log.created_at.isoformat() if log.created_at else None, 'user_name': user.name, 'user_email': user.email} for log, user in logs]
    
    def delete_by_id(self, log_id: int, user_id: int) -> bool:
        log = self.db.query(TranslationLogModel).filter(TranslationLogModel.id == log_id, TranslationLogModel.user_id == user_id).first()
        if log:
            self.db.delete(log)
            self.db.commit()
            return True
        return False
    
    def toggle_favorite(self, log_id: int, user_id: int) -> Optional[TranslationLogModel]:
        log = self.db.query(TranslationLogModel).filter(TranslationLogModel.id == log_id, TranslationLogModel.user_id == user_id).first()
        if log:
            log.is_favorite = not log.is_favorite
            self.db.commit()
            self.db.refresh(log)
            return log
        return None
    
    def get_favorites_by_user(self, user_id: int, limit: int = 100) -> List[TranslationLogModel]:
        return self.db.query(TranslationLogModel).filter(TranslationLogModel.user_id == user_id, TranslationLogModel.is_favorite == True).order_by(TranslationLogModel.created_at.desc()).limit(limit).all()


class DictionaryLogRepository:
    def __init__(self, db_session: Session):
        self.db_session = db_session
    
    def get_user_logs(self, user_id: int, limit: int = 50, offset: int = 0, favorites_only: bool = False) -> List[DictionaryLogModel]:
        query = self.db_session.query(DictionaryLogModel).filter(DictionaryLogModel.user_id == user_id)
        if favorites_only:
            query = query.filter(DictionaryLogModel.is_favorite == True)
        return query.order_by(desc(DictionaryLogModel.created_at)).limit(limit).offset(offset).all()
    
    def get_recent_logs(self, user_id: int, limit: int = 10) -> List[DictionaryLogModel]:
        return self.db_session.query(DictionaryLogModel).filter(DictionaryLogModel.user_id == user_id).order_by(desc(DictionaryLogModel.created_at)).limit(limit).all()
    
    def delete_log(self, log_id: int, user_id: int) -> bool:
        log = self.db_session.query(DictionaryLogModel).filter(DictionaryLogModel.id == log_id, DictionaryLogModel.user_id == user_id).first()
        if log:
            self.db_session.delete(log)
            self.db_session.commit()
            return True
        return False
    
    def clear_user_logs(self, user_id: int) -> int:
        deleted_count = self.db_session.query(DictionaryLogModel).filter(DictionaryLogModel.user_id == user_id).delete()
        self.db_session.commit()
        return deleted_count
    
    def find_by_word_and_user(self, user_id: int, search_word: str) -> Optional[DictionaryLogModel]:
        return self.db_session.query(DictionaryLogModel).filter(DictionaryLogModel.user_id == user_id, DictionaryLogModel.search_word == search_word).first()
    
    def upsert_log(self, user_id: int, search_word: str, source_lang: str, target_lang: str, search_results: Optional[Dict[str, Any]] = None, result_summary: Optional[str] = None, ip_address: Optional[str] = None) -> DictionaryLogModel:
        existing_log = self.find_by_word_and_user(user_id, search_word)
        if existing_log:
            self.db_session.delete(existing_log)
            self.db_session.flush()
        log = DictionaryLogModel(user_id=user_id, search_word=search_word, source_lang=source_lang, target_lang=target_lang, search_results=json.dumps(search_results, ensure_ascii=False) if search_results else None, result_summary=result_summary, ip_address=ip_address)
        self.db_session.add(log)
        self.db_session.commit()
        self.db_session.refresh(log)
        return log
    
    def toggle_favorite(self, log_id: int, user_id: int) -> Optional[DictionaryLogModel]:
        log = self.db_session.query(DictionaryLogModel).filter(DictionaryLogModel.id == log_id, DictionaryLogModel.user_id == user_id).first()
        if log:
            log.is_favorite = not log.is_favorite
            self.db_session.commit()
            self.db_session.refresh(log)
            return log
        return None


def get_dictionary_log_repository(db_session: Session) -> DictionaryLogRepository:
    return DictionaryLogRepository(db_session)

class JWTHelper:
    def __init__(self):
        self._secret_key = os.getenv("JWT_SECRET_KEY", "default_secret_key_change_me")
        self._algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self._access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
        self._refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    def create_access_token(self, user_id: int, email: str, token_version: int = 1, user_level: str = 'guest', is_approved: bool = False) -> str:
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self._access_token_expire_minutes)
        payload = {
            "sub": str(user_id), 
            "email": email, 
            "exp": expire, 
            "iat": now, 
            "token_type": ETokenType.ACCESS.value, 
            "token_version": token_version,
            "user_level": user_level,
            "is_approved": is_approved
        }
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)
    
    def create_refresh_token(self, user_id: int, email: str, token_version: int = 1, user_level: str = 'guest', is_approved: bool = False) -> str:
        now = datetime.utcnow()
        expire = now + timedelta(days=self._refresh_token_expire_days)
        payload = {
            "sub": str(user_id), 
            "email": email, 
            "exp": expire, 
            "iat": now, 
            "token_type": ETokenType.REFRESH.value, 
            "token_version": token_version,
            "user_level": user_level,
            "is_approved": is_approved
        }
        return jwt.encode(payload, self._secret_key, algorithm=self._algorithm)
    
    def create_tokens(self, user_id: int, email: str, token_version: int = 1, user_level: str = 'guest', is_approved: bool = False) -> DToken:
        access_token = self.create_access_token(user_id, email, token_version, user_level, is_approved)
        refresh_token = self.create_refresh_token(user_id, email, token_version, user_level, is_approved)
        return DToken(access_token=access_token, refresh_token=refresh_token, token_type="bearer", expires_in=self._access_token_expire_minutes * 60)
    
    def decode_token(self, token: str) -> Optional[DTokenPayload]:
        try:
            payload = jwt.decode(token, self._secret_key, algorithms=[self._algorithm])
            return DTokenPayload(sub=payload["sub"], email=payload["email"], exp=datetime.fromtimestamp(payload["exp"]), iat=datetime.fromtimestamp(payload["iat"]), token_type=payload.get("token_type", ETokenType.ACCESS.value), token_version=payload.get("token_version", 1))
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()
        except JWTError:
            raise InvalidTokenError()
    
    def verify_access_token(self, token: str) -> Optional[DTokenPayload]:
        payload = self.decode_token(token)
        if payload.token_type != ETokenType.ACCESS.value:
            raise InvalidTokenError("Invalid access token")
        return payload
    
    def verify_refresh_token(self, token: str) -> Optional[DTokenPayload]:
        payload = self.decode_token(token)
        if payload.token_type != ETokenType.REFRESH.value:
            raise InvalidTokenError("Invalid refresh token")
        return payload

class GoogleOAuthClient:
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def __init__(self):
        self._client_id = os.getenv("GOOGLE_CLIENT_ID")
        self._client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        if not self._client_id or not self._client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
    
    def get_authorization_url(self, redirect_uri: str, state: str = None) -> str:
        params = {"client_id": self._client_id, "redirect_uri": redirect_uri, "response_type": "code", "scope": "openid email profile", "access_type": "offline", "prompt": "consent"}
        if state:
            params["state"] = state
        return f"{self.GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> DGoogleTokens:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.GOOGLE_TOKEN_URL, data={"client_id": self._client_id, "client_secret": self._client_secret, "code": code, "grant_type": "authorization_code", "redirect_uri": redirect_uri})
                if response.status_code != 200:
                    raise GoogleOAuthError(f"Token exchange failed: {response.text}")
                data = response.json()
                return DGoogleTokens(access_token=data["access_token"], refresh_token=data.get("refresh_token"), expires_in=data.get("expires_in", 3600), token_type=data.get("token_type", "Bearer"), scope=data.get("scope", ""), id_token=data.get("id_token"))
            except httpx.RequestError as e:
                raise GoogleOAuthError(f"Network error: {str(e)}")
    
    async def get_user_info(self, access_token: str) -> DGoogleUserInfo:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
                if response.status_code != 200:
                    raise GoogleOAuthError(f"User info request failed: {response.text}")
                data = response.json()
                return DGoogleUserInfo(google_id=data["id"], email=data["email"], name=data.get("name", data["email"].split("@")[0]), picture=data.get("picture"))
            except httpx.RequestError as e:
                raise GoogleOAuthError(f"Network error: {str(e)}")


_google_oauth_client = None

def get_google_oauth_client() -> GoogleOAuthClient:
    global _google_oauth_client
    if _google_oauth_client is None:
        _google_oauth_client = GoogleOAuthClient()
    return _google_oauth_client

class AuthService:
    def __init__(self, db: Session, google_client: GoogleOAuthClient = None, jwt_helper: JWTHelper = None):
        self._db = db
        self._google_client = google_client or get_google_oauth_client()
        self._jwt_helper = jwt_helper or JWTHelper()
        self._user_repo = UserRepository(db)
        self._login_log_repo = LoginLogRepository(db)
    
    def _is_admin(self, email: str) -> bool:
        return ADMIN_USER and email == ADMIN_USER
    
    def get_google_auth_url(self, redirect_uri: str) -> str:
        return self._google_client.get_authorization_url(redirect_uri)
    
    async def authenticate_google(self, code: str, redirect_uri: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> tuple[DUser, DToken]:
        try:
            google_tokens = await self._google_client.exchange_code_for_tokens(code, redirect_uri)
            google_user = await self._google_client.get_user_info(google_tokens.access_token)
            user = self._user_repo.get_by_google_id(google_user.google_id)
            is_admin = self._is_admin(google_user.email)
            if user:
                if not user.is_active and not is_admin:
                    raise GoogleOAuthError("Your account has been deactivated.")
                # Increment token_version for all users to invalidate previous sessions
                user = self._user_repo.update_login(user.id, increment_token_version=True)
            else:
                user_data = DUserCreate(google_id=google_user.google_id, email=google_user.email, name=google_user.name, avatar_url=google_user.picture)
                user = self._user_repo.create(user_data)
            self._log_login(user.id, ip_address, user_agent)
            tokens = self.create_tokens(user)
            return user, tokens
        except GoogleOAuthError:
            raise
        except Exception as e:
            raise DatabaseError(f"Database error: {str(e)}")
    
    def _log_login(self, user_id: int, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> None:
        try:
            log_data = DLoginLogCreate(user_id=user_id, ip_address=ip_address, user_agent=user_agent)
            self._login_log_repo.create(log_data)
        except Exception as e:
            logger.warning(f"Failed to log login: {e}")
    
    def create_tokens(self, user: DUser) -> DToken:
        return self._jwt_helper.create_tokens(user.id, user.email, user.token_version, user.user_level, user.is_approved)
    
    def verify_token(self, token: str) -> Optional[DTokenPayload]:
        return self._jwt_helper.verify_access_token(token)
    
    def refresh_access_token(self, refresh_token: str) -> Optional[DToken]:
        payload = self._jwt_helper.verify_refresh_token(refresh_token)
        user = self._user_repo.get_by_id(payload.user_id)
        if not user or not user.is_active:
            return None
        # Check token_version for all users to enforce single session
        if payload.token_version != user.token_version:
            return None
        return self.create_tokens(user)
    
    def get_user_by_id(self, user_id: int) -> Optional[DUser]:
        return self._user_repo.get_by_id(user_id)


def get_auth_service(db: Session) -> AuthService:
    return AuthService(db)


__all__ = [
    'UserModel', 'LoginLogModel', 'SttLogModel', 'TranslationLogModel', 'DictionaryLogModel',
    'UserRepository', 'LoginLogRepository', 'SttLogRepository', 'TranslationLogRepository', 'DictionaryLogRepository',
    'get_dictionary_log_repository', 'JWTHelper', 'GoogleOAuthClient', 'get_google_oauth_client',
    'AuthService', 'get_auth_service', 'ADMIN_USER',
]
