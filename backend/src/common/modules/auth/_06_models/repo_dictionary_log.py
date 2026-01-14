#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary Log Repository
사전 검색 로그 저장소
"""

import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .model_dictionary_log import DictionaryLogModel
from ...database import get_db


class DictionaryLogRepository:
    """사전 검색 로그 저장소"""
    
    def __init__(self, db_session: Optional[Session] = None):
        self.db_session = db_session or next(get_db())
    
    def create_log(
        self,
        user_id: int,
        search_word: str,
        source_lang: str,
        target_lang: str,
        search_results: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> DictionaryLogModel:
        """사전 검색 로그 생성"""
        log = DictionaryLogModel(
            user_id=user_id,
            search_word=search_word,
            source_lang=source_lang,
            target_lang=target_lang,
            search_results=json.dumps(search_results, ensure_ascii=False) if search_results else None,
            ip_address=ip_address
        )
        
        self.db_session.add(log)
        self.db_session.commit()
        self.db_session.refresh(log)
        
        return log
    
    def get_user_logs(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[DictionaryLogModel]:
        """사용자의 사전 검색 로그 조회"""
        return (
            self.db_session.query(DictionaryLogModel)
            .filter(DictionaryLogModel.user_id == user_id)
            .order_by(desc(DictionaryLogModel.created_at))
            .limit(limit)
            .offset(offset)
            .all()
        )
    
    def get_recent_logs(
        self,
        user_id: int,
        limit: int = 10
    ) -> List[DictionaryLogModel]:
        """사용자의 최근 사전 검색 로그 조회"""
        return (
            self.db_session.query(DictionaryLogModel)
            .filter(DictionaryLogModel.user_id == user_id)
            .order_by(desc(DictionaryLogModel.created_at))
            .limit(limit)
            .all()
        )
    
    def delete_log(self, log_id: int, user_id: int) -> bool:
        """사전 검색 로그 삭제 (사용자 본인만 가능)"""
        log = (
            self.db_session.query(DictionaryLogModel)
            .filter(
                DictionaryLogModel.id == log_id,
                DictionaryLogModel.user_id == user_id
            )
            .first()
        )
        
        if log:
            self.db_session.delete(log)
            self.db_session.commit()
            return True
        
        return False
    
    def clear_user_logs(self, user_id: int) -> int:
        """사용자의 모든 사전 검색 로그 삭제"""
        deleted_count = (
            self.db_session.query(DictionaryLogModel)
            .filter(DictionaryLogModel.user_id == user_id)
            .delete()
        )
        
        self.db_session.commit()
        return deleted_count
    
    def get_log_by_id(self, log_id: int, user_id: int) -> Optional[DictionaryLogModel]:
        """ID로 사전 검색 로그 조회 (사용자 본인만 가능)"""
        return (
            self.db_session.query(DictionaryLogModel)
            .filter(
                DictionaryLogModel.id == log_id,
                DictionaryLogModel.user_id == user_id
            )
            .first()
        )
    
    def find_by_word_and_user(self, user_id: int, search_word: str) -> Optional[DictionaryLogModel]:
        """사용자의 특정 검색어 로그 조회"""
        return (
            self.db_session.query(DictionaryLogModel)
            .filter(
                DictionaryLogModel.user_id == user_id,
                DictionaryLogModel.search_word == search_word
            )
            .first()
        )
    
    def upsert_log(
        self,
        user_id: int,
        search_word: str,
        source_lang: str,
        target_lang: str,
        search_results: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> DictionaryLogModel:
        """사전 검색 로그 생성 또는 업데이트 (기존 항목 삭제 후 새로 생성)"""
        # 기존 동일 단어 로그가 있으면 삭제
        existing_log = self.find_by_word_and_user(user_id, search_word)
        if existing_log:
            self.db_session.delete(existing_log)
            self.db_session.flush()
        
        # 새 로그 생성
        log = DictionaryLogModel(
            user_id=user_id,
            search_word=search_word,
            source_lang=source_lang,
            target_lang=target_lang,
            search_results=json.dumps(search_results, ensure_ascii=False) if search_results else None,
            ip_address=ip_address
        )
        
        self.db_session.add(log)
        self.db_session.commit()
        self.db_session.refresh(log)
        
        return log


# 전역 저장소 인스턴스
_dictionary_log_repository: Optional[DictionaryLogRepository] = None


def get_dictionary_log_repository(db_session: Optional[Session] = None) -> DictionaryLogRepository:
    """전역 사전 검색 로그 저장소 인스턴스 반환"""
    global _dictionary_log_repository
    
    if _dictionary_log_repository is None or db_session is not None:
        _dictionary_log_repository = DictionaryLogRepository(db_session)
    
    return _dictionary_log_repository