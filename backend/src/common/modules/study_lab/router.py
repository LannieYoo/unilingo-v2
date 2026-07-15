import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Blueprint, jsonify, request, g, send_from_directory

from ..auth import admin_required, token_required
from ..database import get_db
from .service import (
    get_article,
    get_article_count,
    get_latest_date,
    get_sections,
    get_user_state,
    query_articles,
    upsert_articles,
    upsert_user_state,
)


router = Blueprint('study_lab', __name__, url_prefix='/api/study-lab')

DAILY_NEWS_CATEGORY_ID = '0225ae09-5d63-41c2-bd75-693985d07d78'
ENGOO_API_BASE = 'https://api.engoo.com/api'
ENGOO_NEWS_DATA_FILE = Path(os.getenv(
    'ENGOO_NEWS_DATA_FILE',
    Path(__file__).resolve().parent / 'data' / 'engooDailyNewsData.json',
))
ENGOO_NEWS_IMAGE_DIR = ENGOO_NEWS_DATA_FILE.parent / 'engoo_images'
_NEWS_FILE_CACHE = {
    'mtime': None,
    'articles': [],
}
_DB_SYNC_CACHE = {
    'mtime': None,
    'count': 0,
}
VALID_USER_STATE_KEYS = {'phrasalVerbFavorites', 'celpipVocabularyFavorites', 'pteVocabularyFavorites'}

# When set (e.g. on Render where the image files are not served), article/picture
# payloads swap local image paths for the original Engoo asset URLs.
USE_REMOTE_ENGOO_IMAGES = str(os.getenv('USE_REMOTE_ENGOO_IMAGES', '')).lower() in ('1', 'true', 'yes')
_REMOTE_IMAGE_MAP_CACHE = {
    'mtime': None,
    'map': {},
}

DESCRIBING_PICTURES_DATA_FILE = ENGOO_NEWS_DATA_FILE.parent / 'describingPicturesData.json'
DESCRIBING_PICTURES_HEADERS_FILE = ENGOO_NEWS_DATA_FILE.parent / 'describingPicturesHeaders.json'
DESCRIBING_PICTURES_TEMPLATES = {
    'overview': 'General scene description: what/where overview, main subject, actions, background details, overall impression.',
    'people': 'People-focused description: who is in the picture, appearance and clothing, what they are doing, their feelings or relationship.',
    'place': 'Place and objects description: what kind of place it is, objects you can see, their positions (foreground/background/left/right), what the place is used for.',
    'story': 'Speculation and storytelling: what is happening now, what probably happened before, what might happen next, and why you think so.',
}


def clean_text(value=''):
    text = str(value or '')
    text = re.sub(r'\{\{prn:([^|{}]+)\|([^{}]+)\}\}', r'\1', text)
    text = re.sub(r'\{\{([^|{}]+)\|([^{}]+)\}\}', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    return re.sub(r'\s+', ' ', text).strip()


def fetch_json(url):
    req = Request(url, headers={
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
    })
    with urlopen(req, timeout=12) as response:
        return json.loads(response.read().decode('utf-8'))


def fetch_binary(url):
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0',
    })
    with urlopen(req, timeout=20) as response:
        return response.read(), response.headers.get('Content-Type', '')


def slugify(value=''):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', clean_text(value).lower())).strip('-')


def guess_image_extension(image_url='', content_type=''):
    image_url = str(image_url or '').lower()
    content_type = str(content_type or '').lower()
    for ext in ('.jpg', '.jpeg', '.png', '.webp'):
        if ext in image_url:
            return '.jpg' if ext == '.jpeg' else ext
    if 'png' in content_type:
        return '.png'
    if 'webp' in content_type:
        return '.webp'
    return '.jpg'


def build_local_image_web_path(section_name, article_id, image_url=''):
    section_slug = slugify(section_name) or 'general'
    article_slug = slugify(article_id) or 'article'
    extension = guess_image_extension(image_url)
    return f'/api/study-lab/engoo-news-images/{section_slug}/{article_slug}{extension}'


def download_article_image(section_name, article_id, image_url=''):
    if not image_url:
        return ''

    relative_web_path = build_local_image_web_path(section_name, article_id, image_url)
    relative_file_path = relative_web_path.replace('/api/study-lab/engoo-news-images/', '')
    target_file = ENGOO_NEWS_IMAGE_DIR / relative_file_path
    target_file.parent.mkdir(parents=True, exist_ok=True)

    if not target_file.exists() or target_file.stat().st_size == 0:
        try:
            binary, content_type = fetch_binary(image_url)
            extension = guess_image_extension(image_url, content_type)
            corrected_web_path = re.sub(r'\.[a-z0-9]+$', extension, relative_web_path)
            corrected_file_path = corrected_web_path.replace('/api/study-lab/engoo-news-images/', '')
            corrected_target = ENGOO_NEWS_IMAGE_DIR / corrected_file_path
            corrected_target.parent.mkdir(parents=True, exist_ok=True)
            corrected_target.write_bytes(binary)
            if corrected_target != target_file and target_file.exists():
                target_file.unlink(missing_ok=True)
            target_file = corrected_target
            relative_web_path = corrected_web_path
        except Exception:
            return image_url

    return relative_web_path


def normalize_article_assets(article):
    normalized = dict(article or {})
    normalized['imageUrl'] = download_article_image(
        normalized.get('section') or '',
        normalized.get('id') or '',
        normalized.get('imageUrl') or normalized.get('image_url') or '',
    )
    return normalized


def load_saved_engoo_news():
    """Load Engoo news from the server-side JSON file, with a simple mtime cache."""
    if not ENGOO_NEWS_DATA_FILE.exists():
        return []

    mtime = ENGOO_NEWS_DATA_FILE.stat().st_mtime
    if _NEWS_FILE_CACHE['mtime'] == mtime:
        return _NEWS_FILE_CACHE['articles']

    with ENGOO_NEWS_DATA_FILE.open('r', encoding='utf-8') as file:
        data = json.load(file)

    articles = data if isinstance(data, list) else data.get('articles', [])
    if not isinstance(articles, list):
        articles = []

    articles.sort(key=lambda item: (
        item.get('date') or '',
        item.get('section') or '',
        item.get('title') or '',
    ), reverse=True)
    _NEWS_FILE_CACHE['mtime'] = mtime
    _NEWS_FILE_CACHE['articles'] = articles
    return articles


def save_saved_engoo_news(articles):
    ENGOO_NEWS_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    ENGOO_NEWS_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    normalized_articles = [normalize_article_assets(article) for article in articles]
    normalized_articles.sort(key=lambda item: (
        item.get('date') or '',
        item.get('section') or '',
        item.get('title') or '',
    ), reverse=True)
    with ENGOO_NEWS_DATA_FILE.open('w', encoding='utf-8') as file:
        json.dump(normalized_articles, file, ensure_ascii=False, indent=2)
        file.write('\n')
    _NEWS_FILE_CACHE['mtime'] = ENGOO_NEWS_DATA_FILE.stat().st_mtime
    _NEWS_FILE_CACHE['articles'] = normalized_articles


def merge_articles(existing, incoming):
    article_map = {}
    for article in [*(existing or []), *(incoming or [])]:
        article_id = article.get('id')
        if article_id:
            article_map[article_id] = article
    return list(article_map.values())


def get_new_articles_after_saved_date(existing, incoming, latest_date=''):
    existing_ids = {article.get('id') for article in existing or [] if article.get('id')}
    if not latest_date:
        return [article for article in incoming or [] if article.get('id') not in existing_ids]
    return [
        article
        for article in incoming or []
        if (article.get('date') or '') > latest_date
        or ((article.get('date') or '') == latest_date and article.get('id') not in existing_ids)
    ]


def get_db_session():
    db_generator = get_db()
    db = next(db_generator)
    return db, db_generator


def close_db_session(db, db_generator):
    try:
        db.close()
    finally:
        try:
            db_generator.close()
        except Exception:
            pass


def current_user_id():
    current_user = g.get('current_user') or {}
    if isinstance(current_user, dict):
        return current_user.get('id')
    return getattr(current_user, 'id', None)


def normalize_phrasal_favorite_ids(value):
    if not isinstance(value, list):
        return None
    seen = set()
    favorite_ids = []
    for item in value:
        favorite_id = str(item or '').strip()
        if not favorite_id or favorite_id in seen:
            continue
        seen.add(favorite_id)
        favorite_ids.append(favorite_id)
    return favorite_ids[:1000]


def get_news_remote_image_map():
    """Lazy id -> remoteImageUrl map from the news JSON (covers DB-served articles)."""
    if not ENGOO_NEWS_DATA_FILE.exists():
        return {}
    mtime = ENGOO_NEWS_DATA_FILE.stat().st_mtime
    if _REMOTE_IMAGE_MAP_CACHE['mtime'] != mtime:
        _REMOTE_IMAGE_MAP_CACHE['map'] = {
            article.get('id'): article.get('remoteImageUrl')
            for article in load_saved_engoo_news()
            if article.get('id') and article.get('remoteImageUrl')
        }
        _REMOTE_IMAGE_MAP_CACHE['mtime'] = mtime
    return _REMOTE_IMAGE_MAP_CACHE['map']


def apply_remote_news_image(article):
    """In remote-image mode, swap the local image path for the original Engoo URL."""
    if not USE_REMOTE_ENGOO_IMAGES or not isinstance(article, dict):
        return article
    remote = article.get('remoteImageUrl') or get_news_remote_image_map().get(article.get('id'))
    if remote:
        article = dict(article)
        article['imageUrl'] = remote
    return article


def seed_db_from_json_if_empty(db):
    articles = load_saved_engoo_news()
    if not articles:
        return 0
    file_mtime = ENGOO_NEWS_DATA_FILE.stat().st_mtime if ENGOO_NEWS_DATA_FILE.exists() else None
    article_count = get_article_count(db)
    if (
        article_count >= len(articles)
        and _DB_SYNC_CACHE['mtime'] == file_mtime
        and _DB_SYNC_CACHE['count'] == len(articles)
    ):
        return 0
    saved_count = upsert_articles(db, articles)
    _DB_SYNC_CACHE['mtime'] = file_mtime
    _DB_SYNC_CACHE['count'] = len(articles)
    return saved_count


def summarize_article(article):
    return {
        key: value
        for key, value in article.items()
        if key not in {'body', 'discussion'}
    } | {
        'hasBody': bool(article.get('body')),
        'discussionCount': len(article.get('discussion') or []),
    }


def filter_articles(articles):
    section = request.args.get('section') or ''
    difficulty = request.args.get('difficulty') or ''
    date_from = request.args.get('from') or ''
    date_to = request.args.get('to') or ''
    filtered = articles
    if section:
        filtered = [article for article in filtered if article.get('section') == section]
    if difficulty and difficulty != 'all':
        filtered = [article for article in filtered if article.get('difficulty') == difficulty]
    if date_from:
        filtered = [article for article in filtered if (article.get('date') or '') >= date_from]
    if date_to:
        filtered = [article for article in filtered if (article.get('date') or '') <= date_to]
    return filtered


def resolve_ref(value, references):
    if isinstance(value, dict) and value.get('_ref'):
        return references.get(value['_ref'])
    return value


def text_of(value, references=None):
    resolved = resolve_ref(value, references or {})
    if not isinstance(resolved, dict):
        return ''
    return clean_text(resolved.get('text', ''))


def collect_article_paragraphs(detail):
    references = detail.get('references') or {}
    paragraphs = []
    for exercise in detail.get('data', {}).get('exercises', []):
        for section in exercise.get('sections', []):
            if section.get('_type') != 'ArticleSection':
                continue
            for paragraph in section.get('paragraphs', []):
                sentences = []
                for paragraph_sentence in paragraph.get('paragraph_sentences', []):
                    sentence = text_of(paragraph_sentence.get('text'), references)
                    if sentence:
                        sentences.append(sentence)
                if sentences:
                    paragraphs.append(' '.join(sentences))
    return paragraphs


def collect_discussion_topics(detail):
    references = detail.get('references') or {}
    topics = []

    def walk(value, allowed=False):
        resolved = resolve_ref(value, references)
        if not isinstance(resolved, dict):
            return
        section_type = resolved.get('_type', '')
        next_allowed = allowed or bool(re.search(r'Discussion|Question', section_type, re.I))
        text = clean_text(resolved.get('text', ''))
        if next_allowed and text.endswith('?') and len(text) > 12 and '<<<' not in text:
            topics.append(text)
        for child in resolved.values():
            if isinstance(child, list):
                for item in child:
                    walk(item, next_allowed)
            elif isinstance(child, dict):
                walk(child, next_allowed)

    for exercise in detail.get('data', {}).get('exercises', []):
        for section in exercise.get('sections', []):
            if re.search(r'Discussion|Question', section.get('_type', ''), re.I):
                walk(section, True)

    seen = []
    for topic in topics:
        if topic not in seen:
            seen.append(topic)
    return seen[:8]


def normalize_header(header, section_name):
    title = text_of(header.get('title_text'))
    published_at = (
        header.get('published_release_date')
        or header.get('last_published_at')
        or header.get('first_published_at')
        or header.get('updated_at')
        or ''
    )
    image = header.get('image') or {}
    normalized = {
        'id': f"engoo-{header.get('master_id') or header.get('id')}",
        'masterId': header.get('master_id'),
        'title': title,
        'section': section_name,
        'difficulty': f"Level {header.get('content_level') or 'Mixed'}",
        'date': published_at[:10],
        'publishedAt': published_at,
        'source': 'Engoo Daily News',
        'sourceUrl': 'https://engoo.com/app/daily-news',
        'imageUrl': image.get('url') or '',
        'remoteImageUrl': image.get('url') or '',
        'imageAttribution': clean_text(image.get('attribution', '')),
        'excerpt': text_of(header.get('introduction_text')),
    }
    normalized['imageUrl'] = download_article_image(
        normalized.get('section') or '',
        normalized.get('id') or '',
        normalized.get('imageUrl') or '',
    )
    return normalized


@router.route('/engoo-news', methods=['GET'])
def get_engoo_news():
    include_body = request.args.get('include_body') == '1'
    limit = request.args.get('limit', type=int)
    offset = max(0, request.args.get('offset', default=0, type=int))
    if limit:
        limit = max(1, min(limit, 500))

    try:
        db, db_generator = get_db_session()
        try:
            seeded_count = seed_db_from_json_if_empty(db)
            articles, total = query_articles(
                db,
                section=request.args.get('section') or '',
                difficulty=request.args.get('difficulty') or '',
                date_from=request.args.get('from') or '',
                date_to=request.args.get('to') or '',
                limit=limit,
                offset=offset,
                include_body=include_body,
            )
            return jsonify({
                'articles': [apply_remote_news_image(article) for article in articles],
                'total': total,
                'latest_date': get_latest_date(db),
                'sections': get_sections(db),
                'storage': 'database',
                'seeded_count': seeded_count,
            }), 200
        finally:
            close_db_session(db, db_generator)
    except Exception as exc:
        articles = filter_articles(load_saved_engoo_news())
        total = len(articles)
        if limit:
            articles = articles[offset:offset + limit]
        elif offset:
            articles = articles[offset:]
        payload_articles = articles if include_body else [summarize_article(article) for article in articles]
        payload_articles = [apply_remote_news_image(article) for article in payload_articles]
        return jsonify({
            'articles': payload_articles,
            'total': total,
            'latest_date': max((article.get('date') or '' for article in articles), default=''),
            'sections': sorted({article.get('section') for article in load_saved_engoo_news() if article.get('section')}),
            'storage': 'json_fallback',
            'warning': str(exc),
        }), 200


@router.route('/engoo-news-images/<path:image_path>', methods=['GET'])
def get_engoo_news_image(image_path):
    target_dir = ENGOO_NEWS_IMAGE_DIR.resolve()
    requested = (target_dir / image_path).resolve()
    if target_dir not in requested.parents and requested != target_dir:
        return jsonify({
            'error': {
                'code': 'INVALID_IMAGE_PATH',
                'message': 'Invalid Engoo image path.',
            }
        }), 400
    if not requested.exists() or not requested.is_file():
        return jsonify({
            'error': {
                'code': 'IMAGE_NOT_FOUND',
                'message': 'Engoo image was not found.',
            }
        }), 404
    return send_from_directory(target_dir, image_path)


@router.route('/state/<state_key>', methods=['GET'])
@token_required
def get_study_lab_state(state_key):
    if state_key not in VALID_USER_STATE_KEYS:
        return jsonify({
            'error': {
                'code': 'INVALID_STUDY_LAB_STATE_KEY',
                'message': 'Unsupported Study Lab state key.',
                'state_key': state_key,
            }
        }), 400

    user_id = current_user_id()
    if not user_id:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}}), 401

    db, db_generator = get_db_session()
    try:
        value = get_user_state(db, user_id, state_key, default=[])
        return jsonify({
            'state_key': state_key,
            'value': value if isinstance(value, list) else [],
            'storage': 'database',
        }), 200
    finally:
        close_db_session(db, db_generator)


@router.route('/state/<state_key>', methods=['PUT'])
@token_required
def update_study_lab_state(state_key):
    if state_key not in VALID_USER_STATE_KEYS:
        return jsonify({
            'error': {
                'code': 'INVALID_STUDY_LAB_STATE_KEY',
                'message': 'Unsupported Study Lab state key.',
                'state_key': state_key,
            }
        }), 400

    user_id = current_user_id()
    if not user_id:
        return jsonify({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}}), 401

    payload = request.get_json(silent=True) or {}
    favorite_ids = normalize_phrasal_favorite_ids(payload.get('value', []))
    if favorite_ids is None:
        return jsonify({
            'error': {
                'code': 'INVALID_STUDY_LAB_STATE_VALUE',
                'message': 'Study Lab state value must be a list.',
            }
        }), 400

    db, db_generator = get_db_session()
    try:
        value = upsert_user_state(db, user_id, state_key, favorite_ids)
        return jsonify({
            'state_key': state_key,
            'value': value,
            'storage': 'database',
        }), 200
    finally:
        close_db_session(db, db_generator)


@router.route('/engoo-news/<path:article_id>', methods=['GET'])
def get_engoo_news_article(article_id):
    article = None
    try:
        db, db_generator = get_db_session()
        try:
            seed_db_from_json_if_empty(db)
            article = get_article(db, article_id)
        finally:
            close_db_session(db, db_generator)
    except Exception:
        article = None

    if not article:
        article = next((item for item in load_saved_engoo_news() if item.get('id') == article_id), None)

    if not article:
        return jsonify({
            'error': {
                'code': 'ENGOO_ARTICLE_NOT_FOUND',
                'message': 'Engoo news article was not found.',
                'article_id': article_id,
            }
        }), 404
    return jsonify({'article': apply_remote_news_image(article)}), 200


def load_article_for_llm(article_id):
    """Load an article (DB first, JSON fallback) and build plain text for LLM prompts."""
    article = None
    try:
        db, db_generator = get_db_session()
        try:
            article = get_article(db, article_id)
        finally:
            close_db_session(db, db_generator)
    except Exception:
        article = None

    if not article:
        article = next((item for item in load_saved_engoo_news() if item.get('id') == article_id), None)

    if not article:
        return None, None

    body = article.get('body') or []
    if not isinstance(body, list):
        body = [str(body)]
    text = '\n\n'.join(str(paragraph) for paragraph in body if paragraph)
    return article, text


@router.route('/engoo-news/<path:article_id>/study-guide', methods=['GET'])
@token_required
def get_engoo_news_study_guide(article_id):
    """라니서버(RAG)로 기사 핵심 표현/구문 학습 포인트 생성."""
    from ..phrasal_verbs.service import get_phrasal_verbs_service

    target_lang = request.args.get('lang') or 'ko'
    article, text = load_article_for_llm(article_id)
    if not article:
        return jsonify({
            'error': {
                'code': 'ENGOO_ARTICLE_NOT_FOUND',
                'message': 'Engoo news article was not found.',
                'article_id': article_id,
            }
        }), 404
    if not text:
        return jsonify({
            'error': {
                'code': 'ENGOO_ARTICLE_BODY_EMPTY',
                'message': 'Article body is not available yet.',
                'article_id': article_id,
            }
        }), 409

    service = get_phrasal_verbs_service()
    result = service.get_news_study_points(article.get('title') or '', text, target_lang)
    return jsonify({
        'article_id': article_id,
        'items': result.get('items') or [],
        'source': result.get('source', 'unknown'),
        'model': result.get('model', ''),
        'cached': bool(result.get('cached')),
    }), 200


@router.route('/engoo-news/<path:article_id>/quiz', methods=['GET'])
@token_required
def get_engoo_news_quiz(article_id):
    """라니서버(RAG)로 기사 기반 CELPIP 스타일 듣기 문제 생성."""
    from ..phrasal_verbs.service import get_phrasal_verbs_service

    target_lang = request.args.get('lang') or 'ko'
    count = max(3, min(request.args.get('count', default=5, type=int) or 5, 8))
    article, text = load_article_for_llm(article_id)
    if not article:
        return jsonify({
            'error': {
                'code': 'ENGOO_ARTICLE_NOT_FOUND',
                'message': 'Engoo news article was not found.',
                'article_id': article_id,
            }
        }), 404
    if not text:
        return jsonify({
            'error': {
                'code': 'ENGOO_ARTICLE_BODY_EMPTY',
                'message': 'Article body is not available yet.',
                'article_id': article_id,
            }
        }), 409

    service = get_phrasal_verbs_service()
    result = service.get_news_quiz(article.get('title') or '', text, target_lang, count)
    return jsonify({
        'article_id': article_id,
        'questions': result.get('questions') or [],
        'source': result.get('source', 'unknown'),
        'model': result.get('model', ''),
        'cached': bool(result.get('cached')),
    }), 200


@router.route('/engoo-news/sync', methods=['POST'])
@admin_required
def sync_engoo_news():
    trace_id = g.get('trace_id', 'unknown')
    try:
        payload = request.get_json(silent=True) or {}
        course_count = max(1, min(int(payload.get('count', 12)), 30))
        max_per_section = max(1, min(int(payload.get('max_per_section', 6)), 12))
        latest_date = clean_text(payload.get('latest_date', ''))

        query = urlencode({
            'category': DAILY_NEWS_CATEGORY_ID,
            'type': 'Published',
            'published_latest': 'true',
            'count': course_count,
            'min_level': 4,
            'max_level': 10,
            'order': 'last_published_at',
            'direction': 'desc',
        })
        by_course = fetch_json(f'{ENGOO_API_BASE}/lesson_headers/by_course?{query}')
        references = by_course.get('references') or {}
        selected = []
        counts = {}

        for course_group in by_course.get('data', []):
            course = resolve_ref(course_group.get('course'), references)
            section_name = text_of((course or {}).get('name_text'))
            if not section_name:
                continue
            for lesson_ref in course_group.get('lessons', []):
                if counts.get(section_name, 0) >= max_per_section:
                    continue
                lesson = resolve_ref(lesson_ref, references)
                if not lesson or not lesson.get('master_id'):
                    continue
                selected.append(normalize_header(lesson, section_name))
                counts[section_name] = counts.get(section_name, 0) + 1

        articles = []
        for header in selected:
            detail = fetch_json(f"{ENGOO_API_BASE}/lessons/{header['masterId']}/current")
            body = collect_article_paragraphs(detail)
            if not body:
                continue
            header['body'] = body
            header['discussion'] = collect_discussion_topics(detail)
            articles.append(header)

        existing_articles = load_saved_engoo_news()
        new_articles = get_new_articles_after_saved_date(existing_articles, articles, latest_date)
        merged_articles = merge_articles(existing_articles, articles)
        save_saved_engoo_news(merged_articles)
        saved_count = 0
        storage = 'json'
        try:
            db, db_generator = get_db_session()
            try:
                saved_count = upsert_articles(db, articles) if articles else 0
                storage = 'database'
            finally:
                close_db_session(db, db_generator)
        except Exception:
            saved_count = len(articles)
            storage = 'json_fallback'

        summaries = [summarize_article(article) for article in new_articles]
        latest_date = max((article.get('date') or '' for article in merged_articles), default='')
        return jsonify({
            'articles': summaries,
            'total': len(merged_articles),
            'latest_date': latest_date,
            'sections': sorted({article.get('section') for article in merged_articles if article.get('section')}),
            'saved_count': saved_count,
            'updated_count': saved_count,
            'new_count': len(new_articles),
            'storage': storage,
            'data_file': str(ENGOO_NEWS_DATA_FILE),
            'trace_id': trace_id,
        }), 200
    except Exception as exc:
        return jsonify({
            'error': {
                'code': 'ENGOO_SYNC_FAILED',
                'message': str(exc),
                'trace_id': trace_id,
            }
        }), 500


# ── Engoo Describing Pictures ────────────────────────────

def clean_material_text(value=''):
    text = clean_text(value)
    return re.sub(r'\*([^*]+)\*', r'\1', text)


def load_describing_pictures():
    if not DESCRIBING_PICTURES_DATA_FILE.exists():
        return []
    try:
        with DESCRIBING_PICTURES_DATA_FILE.open('r', encoding='utf-8') as file:
            data = json.load(file)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_describing_pictures(entries):
    DESCRIBING_PICTURES_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DESCRIBING_PICTURES_DATA_FILE.open('w', encoding='utf-8') as file:
        json.dump(entries, file, ensure_ascii=False, indent=2)
        file.write('\n')


def load_describing_pictures_headers():
    if not DESCRIBING_PICTURES_HEADERS_FILE.exists():
        return {'courses': []}
    try:
        with DESCRIBING_PICTURES_HEADERS_FILE.open('r', encoding='utf-8') as file:
            data = json.load(file)
        if isinstance(data, dict) and isinstance(data.get('courses'), list):
            return data
        return {'courses': []}
    except (json.JSONDecodeError, OSError):
        return {'courses': []}


def detect_course_level(course_name=''):
    name = str(course_name or '').lower()
    if 'advanced' in name:
        return 'Advanced'
    return 'Intermediate'


def normalize_describing_pictures_headers(raw):
    """Normalize a raw Engoo lesson_headers/by_course payload into course/lesson id lists."""
    references = (raw or {}).get('references') or {}

    def deref(value):
        if isinstance(value, dict) and value.get('_ref'):
            return references.get(value['_ref'])
        return value

    courses = []
    for group in (raw or {}).get('data', []):
        course = deref(group.get('course')) or {}
        name_text = deref(course.get('name_text')) or {}
        course_name = clean_material_text(name_text.get('text', ''))
        lesson_ids = []
        lesson_titles = {}
        for lesson_ref in group.get('lessons', []):
            lesson = deref(lesson_ref) or {}
            lesson_id = lesson.get('master_id') or lesson.get('id')
            if not lesson_id or lesson_id in lesson_ids:
                continue
            lesson_ids.append(lesson_id)
            title_text = deref(lesson.get('title_text')) or {}
            title = clean_material_text(title_text.get('text', '')) if isinstance(title_text, dict) else ''
            if title:
                lesson_titles[lesson_id] = title
        if lesson_ids:
            courses.append({
                'courseName': course_name or 'Describing Pictures',
                'level': detect_course_level(course_name),
                'lessonIds': lesson_ids,
                'lessonTitles': lesson_titles,
            })
    return {'courses': courses}


def parse_describing_pictures_lesson(detail, lesson_id, level):
    """Parse one Engoo lesson payload into per-picture study entries."""
    references = detail.get('references') or {}

    def deref(value):
        if isinstance(value, dict) and value.get('_ref'):
            return references.get(value['_ref'])
        return value

    def text_field(container, key):
        obj = deref((container or {}).get(key)) or {}
        return clean_material_text(obj.get('text', '')) if isinstance(obj, dict) else ''

    def pick_translation(translations, *langs):
        for lang in langs:
            for item in translations or []:
                item = deref(item) or {}
                if item.get('language') == lang:
                    values = item.get('translations')
                    if isinstance(values, list) and values:
                        return clean_material_text(values[0])
                    value = item.get('translation')
                    if value:
                        return clean_material_text(value)
        return ''

    data = detail.get('data') or {}
    lesson_title = text_field(data, 'title_text')
    entries = []

    for index, exercise in enumerate(data.get('exercises', [])):
        exercise = deref(exercise) or {}
        exercise_title = text_field(exercise, 'title_text')
        prompt = ''
        image_url = ''
        image_attribution = ''
        alt_text = ''
        vocabulary = []

        for section in exercise.get('sections', []):
            section = deref(section) or {}
            section_type = section.get('_type')
            if section_type == 'AsideSection':
                prompt = prompt or text_field(section, 'aside_text')
            elif section_type == 'MediaSection':
                for media_entry in section.get('media_entries', []):
                    media_entry = deref(media_entry) or {}
                    image = deref(media_entry.get('image')) or {}
                    if image.get('url') and not image_url:
                        image_url = image.get('url')
                        image_attribution = clean_material_text(image.get('attribution', ''))
                        alt_text = clean_material_text(image.get('alt_text') or image.get('alt_text_generated') or '')
            elif section_type == 'VocabSection':
                for vocab_ref in section.get('vocab_section_words', []):
                    vocab_item = deref(vocab_ref) or {}
                    word = deref(vocab_item.get('word')) or deref(vocab_item.get('local_word')) or {}
                    word_text = clean_material_text(word.get('word', ''))
                    if not word_text:
                        continue
                    examples = []
                    for sentence_ref in (vocab_item.get('vocab_section_word_sentences') or [])[:2]:
                        sentence_item = deref(sentence_ref) or {}
                        word_sentence = deref(sentence_item.get('word_sentence')) or {}
                        sentence = deref(word_sentence.get('sentence')) or deref(sentence_item.get('local_sentence')) or {}
                        sentence_text = clean_material_text(sentence.get('text', ''))
                        if not sentence_text:
                            continue
                        sentence_translations = sentence.get('translations') or []
                        examples.append({
                            'text': sentence_text,
                            'ko': pick_translation(sentence_translations, 'ko'),
                            'zh': pick_translation(sentence_translations, 'zh-Hans', 'zh-Hant', 'zh'),
                        })
                    pronunciations = word.get('pronunciations') or []
                    vocabulary.append({
                        'word': word_text,
                        'definition': clean_material_text(word.get('definition', '')),
                        'partOfSpeech': word.get('part_of_speech') or '',
                        'pronunciation': pronunciations[0] if pronunciations else '',
                        'ko': pick_translation(word.get('translations'), 'ko'),
                        'zh': pick_translation(word.get('translations'), 'zh-Hans', 'zh-Hant', 'zh'),
                        'examples': examples,
                    })

        if not image_url:
            continue

        entry_id = 'dp-{0}-{1}'.format(lesson_id, index)
        section_slug = 'describing-pictures-{0}'.format(level.lower())
        local_image = download_article_image(section_slug, entry_id, image_url)
        ensure_picture_thumbnail(local_image)
        entries.append({
            'id': entry_id,
            'lessonId': lesson_id,
            'lessonTitle': lesson_title,
            'exerciseTitle': exercise_title or lesson_title,
            'level': level,
            'order': index,
            'prompt': prompt,
            'imageUrl': local_image,
            'remoteImageUrl': image_url,
            'imageAttribution': image_attribution,
            'altText': alt_text,
            'vocabulary': vocabulary,
        })

    return entries


ENGOO_IMAGE_WEB_PREFIX = '/api/study-lab/engoo-news-images/'
PICTURE_THUMB_MAX_WIDTH = 420
PICTURE_THUMB_QUALITY = 78


def build_picture_thumbnail_paths(image_web_path):
    """Map an engoo image web path to its thumbnail file path and web path."""
    if not image_web_path or not str(image_web_path).startswith(ENGOO_IMAGE_WEB_PREFIX):
        return None, ''
    relative = str(image_web_path)[len(ENGOO_IMAGE_WEB_PREFIX):]
    directory, _, filename = relative.rpartition('/')
    if not directory or not filename:
        return None, ''
    thumb_relative = f"{directory}/thumbs/{re.sub(r'[.][a-z0-9]+$', '.jpg', filename)}"
    return ENGOO_NEWS_IMAGE_DIR / thumb_relative, ENGOO_IMAGE_WEB_PREFIX + thumb_relative


def ensure_picture_thumbnail(image_web_path):
    """Create a lightweight list thumbnail for a locally stored picture. Returns thumb web path or ''."""
    thumb_file, thumb_web = build_picture_thumbnail_paths(image_web_path)
    if thumb_file is None:
        return ''
    if thumb_file.exists() and thumb_file.stat().st_size > 0:
        return thumb_web
    source_file = ENGOO_NEWS_IMAGE_DIR / str(image_web_path)[len(ENGOO_IMAGE_WEB_PREFIX):]
    if not source_file.exists():
        return ''
    try:
        from PIL import Image

        with Image.open(source_file) as image:
            image = image.convert('RGB')
            image.thumbnail((PICTURE_THUMB_MAX_WIDTH, PICTURE_THUMB_MAX_WIDTH * 2))
            thumb_file.parent.mkdir(parents=True, exist_ok=True)
            image.save(thumb_file, 'JPEG', quality=PICTURE_THUMB_QUALITY, optimize=True)
        return thumb_web
    except Exception:
        return ''


def existing_picture_thumbnail(image_web_path):
    thumb_file, thumb_web = build_picture_thumbnail_paths(image_web_path)
    if thumb_file is not None and thumb_file.exists() and thumb_file.stat().st_size > 0:
        return thumb_web
    return ''


def apply_remote_picture_image(entry):
    """In remote-image mode, swap local picture paths for the original Engoo URLs."""
    if not USE_REMOTE_ENGOO_IMAGES or not isinstance(entry, dict):
        return entry
    remote = entry.get('remoteImageUrl')
    if remote:
        entry = dict(entry)
        entry['imageUrl'] = remote
        if 'thumbUrl' in entry:
            entry['thumbUrl'] = ''
    return entry


def summarize_picture_entry(entry):
    return apply_remote_picture_image({
        'id': entry.get('id'),
        'lessonId': entry.get('lessonId'),
        'lessonTitle': entry.get('lessonTitle'),
        'exerciseTitle': entry.get('exerciseTitle'),
        'level': entry.get('level'),
        'order': entry.get('order'),
        'imageUrl': entry.get('imageUrl'),
        'remoteImageUrl': entry.get('remoteImageUrl'),
        'thumbUrl': existing_picture_thumbnail(entry.get('imageUrl')),
        'vocabCount': len(entry.get('vocabulary') or []),
    })


@router.route('/describing-pictures', methods=['GET'])
def get_describing_pictures():
    entries = load_describing_pictures()
    headers = load_describing_pictures_headers()
    imported_lessons = {entry.get('lessonId') for entry in entries}
    total_lessons = sum(len(course.get('lessonIds') or []) for course in headers.get('courses', []))
    level_counts = {}
    for entry in entries:
        level = entry.get('level') or 'Unknown'
        level_counts[level] = level_counts.get(level, 0) + 1
    return jsonify({
        'pictures': [summarize_picture_entry(entry) for entry in entries],
        'total': len(entries),
        'levels': level_counts,
        'imported_lessons': len(imported_lessons),
        'total_lessons': total_lessons,
        'headers_loaded': total_lessons > 0,
    }), 200


@router.route('/describing-pictures/<path:picture_id>', methods=['GET'])
def get_describing_picture(picture_id):
    entry = next((item for item in load_describing_pictures() if item.get('id') == picture_id), None)
    if not entry:
        return jsonify({
            'error': {
                'code': 'DESCRIBING_PICTURE_NOT_FOUND',
                'message': 'Describing picture entry was not found.',
                'picture_id': picture_id,
            }
        }), 404
    return jsonify({'picture': apply_remote_picture_image(entry)}), 200


@router.route('/describing-pictures/headers', methods=['PUT'])
@admin_required
def put_describing_pictures_headers():
    payload = request.get_json(silent=True) or {}
    raw = payload.get('raw') or payload
    normalized = normalize_describing_pictures_headers(raw)
    total_lessons = sum(len(course.get('lessonIds') or []) for course in normalized['courses'])
    if not total_lessons:
        return jsonify({
            'error': {
                'code': 'DESCRIBING_PICTURES_HEADERS_EMPTY',
                'message': 'No lessons found in the pasted JSON. Paste the full lesson_headers/by_course response.',
            }
        }), 400
    DESCRIBING_PICTURES_HEADERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DESCRIBING_PICTURES_HEADERS_FILE.open('w', encoding='utf-8') as file:
        json.dump(normalized, file, ensure_ascii=False, indent=2)
        file.write('\n')
    return jsonify({
        'courses': [
            {'courseName': course['courseName'], 'level': course['level'], 'lessons': len(course['lessonIds'])}
            for course in normalized['courses']
        ],
        'total_lessons': total_lessons,
    }), 200


@router.route('/describing-pictures/sync', methods=['POST'])
@admin_required
def sync_describing_pictures():
    trace_id = g.get('trace_id', 'unknown')
    payload = request.get_json(silent=True) or {}
    limit = max(1, min(int(payload.get('limit', 8) or 8), 20))

    headers = load_describing_pictures_headers()
    if not headers.get('courses'):
        return jsonify({
            'error': {
                'code': 'DESCRIBING_PICTURES_HEADERS_MISSING',
                'message': 'Lesson list has not been uploaded yet. Paste the course JSON first.',
            }
        }), 409

    entries = load_describing_pictures()
    imported_lessons = {entry.get('lessonId') for entry in entries}
    processed = 0
    new_pictures = 0
    errors = []

    for course in headers['courses']:
        level = course.get('level') or 'Intermediate'
        for lesson_id in course.get('lessonIds') or []:
            if processed >= limit:
                break
            if lesson_id in imported_lessons:
                continue
            try:
                detail = fetch_json('{0}/lessons/{1}/current'.format(ENGOO_API_BASE, lesson_id))
                lesson_entries = parse_describing_pictures_lesson(detail, lesson_id, level)
                entries.extend(lesson_entries)
                new_pictures += len(lesson_entries)
                imported_lessons.add(lesson_id)
                processed += 1
            except Exception as exc:
                errors.append({'lesson_id': lesson_id, 'error': str(exc)})
                processed += 1
        if processed >= limit:
            break

    entries.sort(key=lambda item: (item.get('level') or '', item.get('lessonTitle') or '', item.get('order') or 0))
    save_describing_pictures(entries)

    total_lessons = sum(len(course.get('lessonIds') or []) for course in headers['courses'])
    return jsonify({
        'processed_lessons': processed,
        'new_pictures': new_pictures,
        'imported_lessons': len(imported_lessons),
        'total_lessons': total_lessons,
        'total_pictures': len(entries),
        'done': len(imported_lessons) >= total_lessons,
        'errors': errors,
        'trace_id': trace_id,
    }), 200


@router.route('/describing-pictures/<path:picture_id>/strategy', methods=['GET'])
@token_required
def get_describing_picture_strategy(picture_id):
    """라니서버(RAG)로 사진별 말하기 전략 생성 (영/한/중 단계)."""
    from ..phrasal_verbs.service import get_phrasal_verbs_service

    entry = next((item for item in load_describing_pictures() if item.get('id') == picture_id), None)
    if not entry:
        return jsonify({
            'error': {
                'code': 'DESCRIBING_PICTURE_NOT_FOUND',
                'message': 'Describing picture entry was not found.',
                'picture_id': picture_id,
            }
        }), 404

    vocab_lines = [
        '{0} ({1}): {2}'.format(item.get('word', ''), item.get('partOfSpeech', ''), item.get('definition', ''))
        for item in (entry.get('vocabulary') or [])[:12]
    ]
    service = get_phrasal_verbs_service()
    result = service.get_picture_strategy(
        topic=entry.get('exerciseTitle') or entry.get('lessonTitle') or '',
        prompt=entry.get('prompt') or '',
        vocabulary_lines=vocab_lines,
    )
    return jsonify({
        'picture_id': picture_id,
        'steps': result.get('steps') or [],
        'source': result.get('source', 'unknown'),
        'model': result.get('model', ''),
        'cached': bool(result.get('cached')),
    }), 200


@router.route('/describing-pictures/<path:picture_id>/model-answer', methods=['GET'])
@token_required
def get_describing_picture_model_answer(picture_id):
    from ..phrasal_verbs.service import get_phrasal_verbs_service

    template = request.args.get('template') or 'overview'
    if template not in DESCRIBING_PICTURES_TEMPLATES:
        template = 'overview'
    target_lang = request.args.get('lang') or 'ko'

    entry = next((item for item in load_describing_pictures() if item.get('id') == picture_id), None)
    if not entry:
        return jsonify({
            'error': {
                'code': 'DESCRIBING_PICTURE_NOT_FOUND',
                'message': 'Describing picture entry was not found.',
                'picture_id': picture_id,
            }
        }), 404

    vocab_lines = [
        '{0} ({1}): {2}'.format(item.get('word', ''), item.get('partOfSpeech', ''), item.get('definition', ''))
        for item in (entry.get('vocabulary') or [])[:12]
    ]
    service = get_phrasal_verbs_service()
    result = service.get_picture_model_answer(
        topic=entry.get('exerciseTitle') or entry.get('lessonTitle') or '',
        prompt=entry.get('prompt') or '',
        alt_text=entry.get('altText') or '',
        vocabulary_lines=vocab_lines,
        template_id=template,
        template_description=DESCRIBING_PICTURES_TEMPLATES[template],
        target_lang=target_lang,
    )
    return jsonify({
        'picture_id': picture_id,
        'template': template,
        'sentences': result.get('sentences') or [],
        'source': result.get('source', 'unknown'),
        'model': result.get('model', ''),
        'cached': bool(result.get('cached')),
    }), 200
