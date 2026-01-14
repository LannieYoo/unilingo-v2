#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Health Service - 비즈니스 로직

import requests
from flask import current_app
from typing import Dict


def check_translation_service() -> str:
    """번역 서비스 상태 확인"""
    try:
        response = requests.get(
            'https://translate.googleapis.com/translate_a/single',
            params={'client': 'gtx', 'sl': 'en', 'tl': 'ko', 'dt': 't', 'q': 'test'},
            timeout=3
        )
        return 'operational' if response.status_code == 200 else 'degraded'
    except Exception:
        return 'degraded'


def check_dictionary_service() -> str:
    """사전 서비스 상태 확인"""
    try:
        response = requests.get(
            'https://api.dictionaryapi.dev/api/v2/entries/en/test',
            timeout=3
        )
        return 'operational' if response.status_code == 200 else 'degraded'
    except Exception:
        return 'degraded'


def check_stt_service() -> str:
    """STT 서비스 상태 확인"""
    try:
        if not current_app.config.get('STT_ENABLED', True):
            return 'down'
        try:
            from faster_whisper import WhisperModel
            return 'operational'
        except ImportError:
            return 'down'
    except Exception:
        return 'down'


def get_all_services_status() -> Dict[str, str]:
    """모든 서비스 상태 확인"""
    return {
        'translation': check_translation_service(),
        'dictionary': check_dictionary_service(),
        'stt': check_stt_service()
    }


def get_overall_status(services_status: Dict[str, str]) -> str:
    """전체 상태 판단"""
    critical_services = ['translation', 'dictionary']
    for service in critical_services:
        if services_status.get(service) == 'down':
            return 'unhealthy'
    return 'healthy'
