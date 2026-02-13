#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary Router - 라우터 정의와 파라미터 해석

from flask import Blueprint, request, jsonify, g
from . import service
from ...decorators import require_approval
from ..auth.router import token_required

router = Blueprint('dictionary', __name__, url_prefix='/api/dictionary')

dictionary_service = service.get_dictionary_service()


@router.route('/search', methods=['GET'])
def search():
    """단어 검색 API (게스트 사용 가능)"""
    trace_id = g.get('trace_id', 'unknown')
    
    word = request.args.get('word')
    target_lang = request.args.get('target_lang')
    
    if not word:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required parameter: word', 'trace_id': trace_id}}), 400
    if not target_lang:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required parameter: target_lang', 'trace_id': trace_id}}), 400
    if len(word) > 100:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Word too long. Maximum 100 characters', 'trace_id': trace_id}}), 400
    if len(word) < 1:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Word too short. Minimum 1 character', 'trace_id': trace_id}}), 400
    
    valid_langs = ['ko', 'en', 'zh']
    if target_lang not in valid_langs:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid target_lang. Must be one of: {valid_langs}', 'trace_id': trace_id}}), 400
    
    try:
        result = dictionary_service.search(word=word, target_lang=target_lang, trace_id=trace_id)
        result['trace_id'] = trace_id
        return jsonify(result), 200
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Dictionary search error: {error_detail}")
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': str(e), 'trace_id': trace_id}}), 500


@router.route('/autocomplete', methods=['GET'])
def autocomplete():
    """자동완성 API (게스트 사용 가능)"""
    trace_id = g.get('trace_id', 'unknown')
    
    query = request.args.get('query')
    language = request.args.get('language')
    target_lang = request.args.get('target_lang')
    
    if not query:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required parameter: query', 'trace_id': trace_id}}), 400
    if not target_lang:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required parameter: target_lang', 'trace_id': trace_id}}), 400
    if len(query) > 50:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Query too long. Maximum 50 characters', 'trace_id': trace_id}}), 400
    if len(query) < 1:
        return jsonify({'suggestions': [], 'trace_id': trace_id}), 200
    
    valid_langs = ['ko', 'en', 'zh']
    if target_lang not in valid_langs:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid target_lang. Must be one of: {valid_langs}', 'trace_id': trace_id}}), 400
    
    try:
        suggestions = dictionary_service.autocomplete(query=query, language=language, target_lang=target_lang, trace_id=trace_id)
        return jsonify({'suggestions': suggestions, 'trace_id': trace_id}), 200
    except Exception:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': 'An unexpected error occurred', 'trace_id': trace_id}}), 500


@router.route('/save', methods=['POST'])
@token_required
@require_approval
def save():
    """사전 검색 결과 저장 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    data = request.get_json()
    if not data:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Request body is required', 'trace_id': trace_id}}), 400
    
    word = data.get('word')
    source_lang = data.get('source_lang')
    target_lang = data.get('target_lang')
    search_results = data.get('search_results')
    source = data.get('source', 'dictionary')  # 'dictionary' or 'stt'
    
    if not word:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required field: word', 'trace_id': trace_id}}), 400
    if not source_lang:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required field: source_lang', 'trace_id': trace_id}}), 400
    if not target_lang:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': 'Missing required field: target_lang', 'trace_id': trace_id}}), 400
    
    valid_langs = ['ko', 'en', 'zh']
    if source_lang not in valid_langs:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid source_lang. Must be one of: {valid_langs}', 'trace_id': trace_id}}), 400
    if target_lang not in valid_langs:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid target_lang. Must be one of: {valid_langs}', 'trace_id': trace_id}}), 400
    
    valid_sources = ['dictionary', 'stt']
    if source not in valid_sources:
        return jsonify({'error': {'code': 'VALIDATION_ERROR', 'message': f'Invalid source. Must be one of: {valid_sources}', 'trace_id': trace_id}}), 400
    
    try:
        result = dictionary_service.save(
            word=word,
            source_lang=source_lang,
            target_lang=target_lang,
            search_results=search_results,
            source=source,
            trace_id=trace_id
        )
        result['trace_id'] = trace_id
        return jsonify(result), 200
    except Exception as e:
        print(f"Error saving dictionary: {e}")
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': 'An unexpected error occurred', 'trace_id': trace_id}}), 500
