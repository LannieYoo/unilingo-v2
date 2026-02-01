#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary DTO - 요청/응답 데이터 구조 정의

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class PronunciationDTO(BaseModel):
    ipa: Optional[str] = None
    phonetic: Optional[str] = None
    audio_url: Optional[str] = None


class DefinitionDTO(BaseModel):
    definition: str
    translation: Optional[str] = None
    examples: List[str] = []


class MeaningDTO(BaseModel):
    part_of_speech: str
    definitions: List[DefinitionDTO]


class SearchResponse(BaseModel):
    term: str
    lang: str
    pronunciation: PronunciationDTO
    meanings: List[MeaningDTO]
    source: str = 'free_dictionary_api'
    cached: bool = False
    trace_id: Optional[str] = None


class SuggestionDTO(BaseModel):
    word: str
    score: Optional[int] = None
    type: str
    translation: Optional[str] = None
    is_non_english: Optional[bool] = None
    source_lang: Optional[str] = None
    source_translation: Optional[str] = None


class AutocompleteResponse(BaseModel):
    suggestions: List[SuggestionDTO]
    trace_id: str
