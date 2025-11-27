#!/usr/bin/env python3
"""
SuplementIA - Download Sentence Transformers Model to EFS
This script downloads the ML model and saves it to EFS for Lambda functions
"""

import os
import sys
from sentence_transformers import SentenceTransformer

# Configuration
MODEL_NAME = 'all-MiniLM-L6-v2'
EFS_PATH = os.environ.get('EFS_PATH', '/mnt/efs/models')
MODEL_PATH = os.path.join(EFS_PATH, MODEL_NAME)

def download_model():
    """Download and save Sentence Transformers model to EFS"""
    
    print("="*60)
    print("SuplementIA - Model Download Script")
    print("="*60)
    print(f"Model: {MODEL_NAME}")
    print(f"Target path: {MODEL_PATH}")
    print()
    
    # Check if EFS is mounted
    if not os.path.exists(EFS_PATH):
        print(f"❌ ERROR: EFS path not found: {EFS_PATH}")
        print("Please ensure EFS is mounted at /mnt/efs")
        sys.exit(1)
    
    # Create models directory
    os.makedirs(EFS_PATH, exist_ok=True)
    print(f"✓ EFS path exists: {EFS_PATH}")
    
    # Check if model already exists
    if os.path.exists(MODEL_PATH):
        print(f"⚠️  Model already exists at {MODEL_PATH}")
        response = input("Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Aborted.")
            sys.exit(0)
    
    # Download model
    print()
    print("Downloading model from HuggingFace...")
    print("This may take a few minutes...")
    
    try:
        model = SentenceTransformer(MODEL_NAME)
        print("✓ Model downloaded successfully")
        
        # Save to EFS
        print(f"Saving model to {MODEL_PATH}...")
        model.save(MODEL_PATH)
        print("✓ Model saved to EFS")
        
        # Verify
        print()
        print("Verifying model...")
        test_model = SentenceTransformer(MODEL_PATH)
        test_embedding = test_model.encode("test")
        print(f"✓ Model loaded successfully")
        print(f"✓ Embedding dimensions: {len(test_embedding)}")
        
        # Check file size
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(MODEL_PATH):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total_size += os.path.getsize(filepath)
        
        size_mb = total_size / (1024 * 1024)
        print(f"✓ Model size: {size_mb:.2f} MB")
        
        print()
        print("="*60)
        print("✅ Model download complete!")
        print(f"Path: {MODEL_PATH}")
        print(f"Size: {size_mb:.2f} MB")
        print("="*60)
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    download_model()
