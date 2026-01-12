"""
Translation Log Repository
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from .model_translation_log import TranslationLogModel
from .model_user import UserModel


class TranslationLogRepository:
    """번역 로그 Repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(
        self,
        user_id: int,
        source_text: str,
        translated_text: str,
        source_lang: str,
        target_lang: str,
        provider: str = None,
        ip_address: str = None,
    ) -> TranslationLogModel:
        """번역 로그 생성"""
        log = TranslationLogModel(
            user_id=user_id,
            source_text=source_text,
            translated_text=translated_text,
            source_lang=source_lang,
            target_lang=target_lang,
            provider=provider,
            ip_address=ip_address,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log
    
    def get_by_user_id(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> List[TranslationLogModel]:
        """사용자별 번역 로그 조회"""
        return (
            self.db.query(TranslationLogModel)
            .filter(TranslationLogModel.user_id == user_id)
            .order_by(TranslationLogModel.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    def get_recent_by_user(self, user_id: int, limit: int = 10) -> List[TranslationLogModel]:
        """사용자별 최근 번역 로그 조회"""
        return self.get_by_user_id(user_id, limit=limit)
    
    def count_by_user(self, user_id: int) -> int:
        """사용자별 번역 로그 개수"""
        return self.db.query(TranslationLogModel).filter(TranslationLogModel.user_id == user_id).count()
    
    def get_all_with_user_info(self, limit: int = 100) -> List[Dict[str, Any]]:
        """모든 번역 로그 조회 (사용자 정보 포함)"""
        logs = (
            self.db.query(TranslationLogModel, UserModel)
            .join(UserModel, TranslationLogModel.user_id == UserModel.id)
            .order_by(TranslationLogModel.created_at.desc())
            .limit(limit)
            .all()
        )
        
        result = []
        for log, user in logs:
            result.append({
                'id': log.id,
                'user_id': log.user_id,
                'source_text': log.source_text,
                'translated_text': log.translated_text,
                'source_lang': log.source_lang,
                'target_lang': log.target_lang,
                'provider': log.provider,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat() if log.created_at else None,
                'user_name': user.name,
                'user_email': user.email,
            })
        
        return result
    
    def delete_by_id(self, log_id: int, user_id: int) -> bool:
        """번역 로그 삭제 (본인 것만)"""
        log = self.db.query(TranslationLogModel).filter(
            TranslationLogModel.id == log_id,
            TranslationLogModel.user_id == user_id
        ).first()
        if log:
            self.db.delete(log)
            self.db.commit()
            return True
        return False
    
    def toggle_favorite(self, log_id: int, user_id: int) -> Optional[TranslationLogModel]:
        """즐겨찾기 토글 (본인 것만)"""
        log = self.db.query(TranslationLogModel).filter(
            TranslationLogModel.id == log_id,
            TranslationLogModel.user_id == user_id
        ).first()
        if log:
            log.is_favorite = not log.is_favorite
            self.db.commit()
            self.db.refresh(log)
            return log
        return None
    
    def get_favorites_by_user(self, user_id: int, limit: int = 100) -> List[TranslationLogModel]:
        """사용자별 즐겨찾기 번역 로그 조회"""
        return (
            self.db.query(TranslationLogModel)
            .filter(
                TranslationLogModel.user_id == user_id,
                TranslationLogModel.is_favorite == True
            )
            .order_by(TranslationLogModel.created_at.desc())
            .limit(limit)
            .all()
        )


# Singleton
_translation_log_repository: Optional[TranslationLogRepository] = None


def get_translation_log_repository() -> TranslationLogRepository:
    global _translation_log_repository
    if _translation_log_repository is None:
        _translation_log_repository = TranslationLogRepository()
    return _translation_log_repository
