"""
Translation Log Model - 번역 히스토리 저장
"""
from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ...database import Base


class TranslationLogModel(Base):
    """번역 로그 모델"""
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
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'source_text': self.source_text,
            'translated_text': self.translated_text,
            'source_lang': self.source_lang,
            'target_lang': self.target_lang,
            'provider': self.provider,
            'ip_address': self.ip_address,
            'is_favorite': self.is_favorite,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
