#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary Router
사전 API 라우터
"""

from flask import Blueprint, request, jsonify, g

from .._04_services import get_dictionary_service
from ...exception import ValidationError, DictionaryError

router = Blueprint('dictionary', __name__, url_prefix='/api/dictionary')

dictionary_service = get_dictionary_service()


@router.route('/search', methods=['GET'])
def search():
    """단어 검색 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        word = request.args.get('word')
        target_lang = request.args.get('target_lang')
        
        if not word:
            raise ValidationError("Missing required parameter: word")
        if not target_lang:
            raise ValidationError("Missing required parameter: target_lang")
        
        if len(word) > 100:
            raise ValidationError("Word too long. Maximum 100 characters")
        if len(word) < 1:
            raise ValidationError("Word too short. Minimum 1 character")
        
        valid_langs = ['ko', 'en', 'zh']
        if target_lang not in valid_langs:
            raise ValidationError(f"Invalid target_lang. Must be one of: {valid_langs}")
        
        result = dictionary_service.search(
            word=word,
            target_lang=target_lang,
            trace_id=trace_id
        )
        
        result['trace_id'] = trace_id
        return jsonify(result), 200
    
    except ValidationError as e:
        return jsonify({
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 400
    
    except DictionaryError as e:
        return jsonify({
            'error': {
                'code': 'DICTIONARY_ERROR',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 500
    
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
                'trace_id': trace_id
            }
        }), 500


@router.route('/autocomplete', methods=['GET'])
def autocomplete():
    """자동완성 API"""
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        query = request.args.get('query')
        language = request.args.get('language')
        target_lang = request.args.get('target_lang')
        
        if not query:
            raise ValidationError("Missing required parameter: query")
        if not target_lang:
            raise ValidationError("Missing required parameter: target_lang")
        
        if len(query) > 50:
            raise ValidationError("Query too long. Maximum 50 characters")
        
        if len(query) < 1:
            return jsonify({
                'suggestions': [],
                'trace_id': trace_id
            }), 200
        
        valid_langs = ['ko', 'en', 'zh']
        if target_lang not in valid_langs:
            raise ValidationError(f"Invalid target_lang. Must be one of: {valid_langs}")
        
        suggestions = dictionary_service.autocomplete(
            query=query,
            language=language,
            target_lang=target_lang,
            trace_id=trace_id
        )
        
        return jsonify({
            'suggestions': suggestions,
            'trace_id': trace_id
        }), 200
    
    except ValidationError as e:
        return jsonify({
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': str(e),
                'trace_id': trace_id
            }
        }), 400
    
    except Exception as e:
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
                'trace_id': trace_id
            }
        }), 500
