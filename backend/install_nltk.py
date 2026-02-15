#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NLTK WordNet 데이터 다운로드 스크립트
"""

import nltk
import sys

def download_wordnet():
    """WordNet 데이터 다운로드"""
    try:
        print("Downloading WordNet data...")
        nltk.download('wordnet', quiet=False)
        nltk.download('omw-1.4', quiet=False)
        print("\n✓ WordNet data downloaded successfully!")
        return True
    except Exception as e:
        print(f"\n✗ Error downloading WordNet data: {e}")
        return False

if __name__ == '__main__':
    success = download_wordnet()
    sys.exit(0 if success else 1)
