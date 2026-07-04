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
                'articles': articles,
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
    return jsonify({'article': article}), 200


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
