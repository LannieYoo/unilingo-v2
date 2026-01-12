#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary Log Model
사전 검색 로그 모델
"""

from sqlalchemy import Column, BigInteger, String, Text, Boolean, TIMESTAMP, func, ForeignKey
from sqlalchemy.orm import relationship

from ...database import Base


class DictionaryLogModel(Base):
    """사전 검색 로그 모델"""
    
    __tablename__ = 'dictionary_logs'
    
    # 기본키
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 외래키
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # 검색 정보
    search_word = Column(String(200), nullable=False, comment='검색한 단어')
    source_lang = Column(String(10), nullable=False, comment='원본 언어 코드')
    target_lang = Column(String(10), nullable=False, comment='대상 언어 코드')
    
    # 검색 결과 (JSON으로 저장)
    search_results = Column(Text, nullable=True, comment='검색 결과 JSON')
    
    # 메타데이터
    ip_address = Column(String(45), nullable=True, comment='사용자 IP 주소')
    created_at = Column(TIMESTAMP, nullable=False, default=func.current_timestamp(), comment='검색 일시')
    
    # 관계
    user = relationship("UserModel", back_populates="dictionary_logs")
    
    def __repr__(self):
        return f"<DictionaryLogModel(id={self.id}, user_id={self.user_id}, search_word='{self.search_word}')>"
    
    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'search_word': self.search_word,
            'source_lang': self.source_lang,
            'target_lang': self.target_lang,
            'search_results': self.search_results,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }