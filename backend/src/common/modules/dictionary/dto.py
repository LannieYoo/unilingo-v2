#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Dictionary DTO - 요청/응답 데이터 구조 정의

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class PronunciationDTO(BaseModel):
    uk: str = ''
    us: str = ''


class MeaningDTO(BaseModel):
    number: int
    definition: str
    translation: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None


class SearchResponse(BaseModel):
    word: str
    detected_lang: Optional[str]
    pronunciation: PronunciationDTO
    meanings: List[MeaningDTO]
    cached: bool = False
    trace_id: str


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
