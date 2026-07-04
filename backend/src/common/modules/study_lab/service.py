# -*- coding: utf-8 -*-
"""Study Lab persistence services."""

import json
from datetime import datetime
from typing import Iterable, Optional

from sqlalchemy import BigInteger, Column, DateTime, Index, String, Text, func
from sqlalchemy.orm import Session

from ..database import Base


class EngooNewsArticleModel(Base):
    """Server-side storage for Engoo Daily News articles."""

    __tablename__ = 'engoo_news_articles'
    __table_args__ = (
        Index('idx_engoo_news_section_date', 'section', 'published_date'),
        Index('idx_engoo_news_difficulty_date', 'difficulty', 'published_date'),
        {'extend_existing': True},
    )

    id = Column(String(140), primary_key=True)
    master_id = Column(String(140), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    section = Column(String(160), nullable=True, index=True)
    difficulty = Column(String(50), nullable=True, index=True)
    published_date = Column(String(10), nullable=True, index=True)
    published_at = Column(String(40), nullable=True, index=True)
    source = Column(String(120), nullable=True)
    source_url = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    image_attribution = Column(Text, nullable=True)
    excerpt = Column(Text, nullable=True)
    body = Column(Text, nullable=True)
    discussion = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class StudyLabUserStateModel(Base):
    """Account-level Study Lab UI/practice state."""

    __tablename__ = 'study_lab_user_state'
    __table_args__ = (
        Index('idx_study_lab_user_state_user_key', 'user_id', 'state_key', unique=True),
        {'extend_existing': True},
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    state_key = Column(String(120), nullable=False)
    state_value = Column(Text, nullable=False, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def _json_dump(value) -> str:
    return json.dumps(value or [], ensure_ascii=False)


def _json_load(value):
    if not value:
        return []
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return []


def _json_load_default(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return default


def _json_dump_state(value) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def article_to_model_values(article: dict) -> dict:
    return {
        'id': article.get('id'),
        'master_id': article.get('masterId') or article.get('master_id'),
        'title': article.get('title') or 'Untitled Engoo Article',
        'section': article.get('section'),
        'difficulty': article.get('difficulty'),
        'published_date': article.get('date') or article.get('published_date'),
        'published_at': article.get('publishedAt') or article.get('published_at'),
        'source': article.get('source') or 'Engoo Daily News',
        'source_url': article.get('sourceUrl') or article.get('source_url'),
        'image_url': article.get('imageUrl') or article.get('image_url'),
        'image_attribution': article.get('imageAttribution') or article.get('image_attribution'),
        'excerpt': article.get('excerpt'),
        'body': _json_dump(article.get('body')),
        'discussion': _json_dump(article.get('discussion')),
    }


def serialize_article(model: EngooNewsArticleModel, include_body: bool = True) -> dict:
    article = {
        'id': model.id,
        'masterId': model.master_id,
        'title': model.title,
        'section': model.section,
        'difficulty': model.difficulty,
        'date': model.published_date,
        'publishedAt': model.published_at,
        'source': model.source or 'Engoo Daily News',
        'sourceUrl': model.source_url,
        'imageUrl': model.image_url,
        'imageAttribution': model.image_attribution,
        'excerpt': model.excerpt,
    }
    if include_body:
        article['body'] = _json_load(model.body)
        article['discussion'] = _json_load(model.discussion)
    else:
        article['hasBody'] = bool(model.body)
        article['discussionCount'] = len(_json_load(model.discussion))
    return article


def upsert_articles(db: Session, articles: Iterable[dict]) -> int:
    articles = list(articles or [])
    article_ids = [
        article.get('id')
        for article in articles
        if article.get('id')
    ]
    existing_by_id = {}
    if article_ids:
        existing_rows = (
            db.query(EngooNewsArticleModel)
            .filter(EngooNewsArticleModel.id.in_(article_ids))
            .all()
        )
        existing_by_id = {row.id: row for row in existing_rows}

    saved_count = 0
    for article in articles:
        values = article_to_model_values(article)
        article_id = values.get('id')
        if not article_id:
            continue

        existing = existing_by_id.get(article_id)
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
        else:
            db.add(EngooNewsArticleModel(**values))
        saved_count += 1
    db.commit()
    return saved_count


def query_articles(
    db: Session,
    section: str = '',
    difficulty: str = '',
    date_from: str = '',
    date_to: str = '',
    limit: Optional[int] = None,
    offset: int = 0,
    include_body: bool = False,
) -> tuple[list[dict], int]:
    query = db.query(EngooNewsArticleModel)
    if section:
        query = query.filter(EngooNewsArticleModel.section == section)
    if difficulty and difficulty != 'all':
        query = query.filter(EngooNewsArticleModel.difficulty == difficulty)
    if date_from:
        query = query.filter(EngooNewsArticleModel.published_date >= date_from)
    if date_to:
        query = query.filter(EngooNewsArticleModel.published_date <= date_to)

    total = query.count()
    query = query.order_by(
        EngooNewsArticleModel.published_date.desc(),
        EngooNewsArticleModel.section.asc(),
        EngooNewsArticleModel.title.asc(),
    )
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)
    return [serialize_article(model, include_body=include_body) for model in query.all()], total


def get_article(db: Session, article_id: str) -> Optional[dict]:
    model = db.query(EngooNewsArticleModel).filter(EngooNewsArticleModel.id == article_id).first()
    return serialize_article(model, include_body=True) if model else None


def get_article_count(db: Session) -> int:
    return db.query(func.count(EngooNewsArticleModel.id)).scalar() or 0


def get_sections(db: Session) -> list[str]:
    rows = (
        db.query(EngooNewsArticleModel.section)
        .filter(EngooNewsArticleModel.section.isnot(None))
        .distinct()
        .order_by(EngooNewsArticleModel.section.asc())
        .all()
    )
    return [row[0] for row in rows if row[0]]


def get_latest_date(db: Session) -> str:
    return db.query(func.max(EngooNewsArticleModel.published_date)).scalar() or ''


def get_user_state(db: Session, user_id: int, state_key: str, default=None):
    model = (
        db.query(StudyLabUserStateModel)
        .filter(
            StudyLabUserStateModel.user_id == user_id,
            StudyLabUserStateModel.state_key == state_key,
        )
        .first()
    )
    return _json_load_default(model.state_value, default) if model else default


def upsert_user_state(db: Session, user_id: int, state_key: str, state_value):
    model = (
        db.query(StudyLabUserStateModel)
        .filter(
            StudyLabUserStateModel.user_id == user_id,
            StudyLabUserStateModel.state_key == state_key,
        )
        .first()
    )
    serialized = _json_dump_state(state_value)
    if model:
        model.state_value = serialized
        model.updated_at = datetime.utcnow()
    else:
        model = StudyLabUserStateModel(
            user_id=user_id,
            state_key=state_key,
            state_value=serialized,
        )
        db.add(model)
    db.commit()
    return _json_load_default(model.state_value, state_value)
