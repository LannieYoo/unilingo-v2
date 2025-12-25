#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dictionary API Routes
"""

from flask import Blueprint, request, jsonify, g
from backend.services.dictionary_service import get_dictionary_service
from backend.middleware.error_handler import ValidationError, DictionaryError

bp = Blueprint('dictionary', __name__, url_prefix='/api/dictionary')

dictionary_service = get_dictionary_service()


@bp.route('/search', methods=['GET'])
def search():
    """
    Search word definition
    
    Query parameters:
        word: str (required)
        target_lang: str (required)
    
    Response:
        {
            "word": str,
            "detected_lang": str,
            "pronunciation": {"uk": str, "us": str},
            "meanings": [...],
            "cached": bool,
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # Get query parameters
        word = request.args.get('word')
        target_lang = request.args.get('target_lang')
        
        # Validate required fields
        if not word:
            raise ValidationError("Missing required parameter: word")
        if not target_lang:
            raise ValidationError("Missing required parameter: target_lang")
        
        # Validate word length
        if len(word) > 100:
            raise ValidationError("Word too long. Maximum 100 characters")
        if len(word) < 1:
            raise ValidationError("Word too short. Minimum 1 character")
        
        # Validate language code
        valid_langs = ['ko', 'en', 'zh']
        if target_lang not in valid_langs:
            raise ValidationError(f"Invalid target_lang. Must be one of: {valid_langs}")
        
        # Search
        result = dictionary_service.search(
            word=word,
            target_lang=target_lang,
            trace_id=trace_id
        )
        
        # Add trace_id to response
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


@bp.route('/autocomplete', methods=['GET'])
def autocomplete():
    """
    Get autocomplete suggestions
    
    Query parameters:
        query: str (required)
        language: str (optional)
        target_lang: str (required)
    
    Response:
        {
            "suggestions": [...],
            "trace_id": str
        }
    """
    trace_id = g.get('trace_id', 'unknown')
    
    try:
        # Get query parameters
        query = request.args.get('query')
        language = request.args.get('language')
        target_lang = request.args.get('target_lang')
        
        # Validate required fields
        if not query:
            raise ValidationError("Missing required parameter: query")
        if not target_lang:
            raise ValidationError("Missing required parameter: target_lang")
        
        # Validate query length
        if len(query) > 50:
            raise ValidationError("Query too long. Maximum 50 characters")
        
        # Return empty if query too short
        if len(query) < 1:
            return jsonify({
                'suggestions': [],
                'trace_id': trace_id
            }), 200
        
        # Validate language code
        valid_langs = ['ko', 'en', 'zh']
        if target_lang not in valid_langs:
            raise ValidationError(f"Invalid target_lang. Must be one of: {valid_langs}")
        
        # Get suggestions
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
