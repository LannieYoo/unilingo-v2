#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary Router - 라우터 정의와 파라미터 해석

from flask import Blueprint, request, jsonify, g
from . import service

router = Blueprint('dictionary', __name__, url_prefix='/api/dictionary')

dictionary_service = service.get_dictionary_service()


@router.route('/search', methods=['GET'])
def search():
    """단어 검색 API"""
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
    except Exception:
        return jsonify({'error': {'code': 'INTERNAL_ERROR', 'message': 'An unexpected error occurred', 'trace_id': trace_id}}), 500


@router.route('/autocomplete', methods=['GET'])
def autocomplete():
    """자동완성 API"""
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
