#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vosk Model Download Script
Downloads and extracts Vosk Small English model for backend processing
"""

import os
import sys
import zipfile
import urllib.request
from pathlib import Path


# Vosk Small English model
MODEL_NAME = "vosk-model-small-en-us-0.15"
MODEL_URL = f"https://alphacephei.com/vosk/models/{MODEL_NAME}.zip"
MODELS_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODELS_DIR / MODEL_NAME
ZIP_PATH = MODELS_DIR / f"{MODEL_NAME}.zip"


def download_model():
    """Download Vosk model"""
    print(f"Downloading {MODEL_NAME}...")
    print(f"URL: {MODEL_URL}")
    print(f"Destination: {ZIP_PATH}")
    
    # Create models directory if not exists
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Download with progress
    def reporthook(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size)
        sys.stdout.write(f"\rProgress: {percent}%")
        sys.stdout.flush()
    
    try:
        urllib.request.urlretrieve(MODEL_URL, ZIP_PATH, reporthook)
        print("\nDownload complete!")
        return True
    except Exception as e:
        print(f"\nDownload failed: {e}")
        return False


def extract_model():
    """Extract Vosk model"""
    print(f"\nExtracting {MODEL_NAME}...")
    
    try:
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(MODELS_DIR)
        print("Extraction complete!")
        
        # Remove zip file
        ZIP_PATH.unlink()
        print("Cleaned up zip file")
        return True
    except Exception as e:
        print(f"Extraction failed: {e}")
        return False


def verify_model():
    """Verify model files exist"""
    print(f"\nVerifying model files...")
    
    required_files = [
        "am/final.mdl",
        "conf/mfcc.conf",
        "conf/model.conf",
        "graph/phones/word_boundary.int",
        "ivector/final.dubm",
        "ivector/final.ie",
        "ivector/final.mat",
        "ivector/global_cmvn.stats",
        "ivector/online_cmvn.conf",
        "ivector/splice.conf"
    ]
    
    all_exist = True
    for file in required_files:
        file_path = MODEL_PATH / file
        if file_path.exists():
            print(f"✓ {file}")
        else:
            print(f"✗ {file} (missing)")
            all_exist = False
    
    if all_exist:
        print("\n✓ Model verification successful!")
        print(f"Model path: {MODEL_PATH}")
        return True
    else:
        print("\n✗ Model verification failed!")
        return False


def main():
    """Main function"""
    print("=" * 60)
    print("Vosk Model Download Script")
    print("=" * 60)
    
    # Check if model already exists
    if MODEL_PATH.exists():
        print(f"\nModel already exists at: {MODEL_PATH}")
        response = input("Do you want to re-download? (y/N): ")
        if response.lower() != 'y':
            print("Skipping download.")
            return verify_model()
        
        # Remove existing model
        import shutil
        shutil.rmtree(MODEL_PATH)
        print("Removed existing model.")
    
    # Download model
    if not download_model():
        return False
    
    # Extract model
    if not extract_model():
        return False
    
    # Verify model
    return verify_model()


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
