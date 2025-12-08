#!/usr/bin/env python3
"""
Verify LanceDB setup and data integrity
Run this after migration to ensure everything is working
"""

import os
import sys
from typing import Dict, List
import lancedb
from sentence_transformers import SentenceTransformer

# Configuration
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')

def verify_efs_mount():
    """Verify EFS is mounted"""
    print("\n1. Verifying EFS mount...")
    print("-" * 60)
    
    if not os.path.exists('/mnt/efs'):
        print("❌ EFS not mounted at /mnt/efs")
        return False
    
    print("✓ EFS mounted at /mnt/efs")
    
    # Check disk space
    stat = os.statvfs('/mnt/efs')
    free_gb = (stat.f_bavail * stat.f_frsize) / (1024**3)
    total_gb = (stat.f_blocks * stat.f_frsize) / (1024**3)
    used_gb = total_gb - free_gb
    
    print(f"  Total: {total_gb:.2f} GB")
    print(f"  Used: {used_gb:.2f} GB")
    print(f"  Free: {free_gb:.2f} GB")
    
    return True

def verify_model():
    """Verify ML model is available"""
    print("\n2. Verifying ML model...")
    print("-" * 60)
    
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model not found at {MODEL_PATH}")
        return False
    
    print(f"✓ Model directory exists: {MODEL_PATH}")
    
    # Check model files
    required_files = ['config.json', 'pytorch_model.bin']
    for file in required_files:
        file_path = os.path.join(MODEL_PATH, file)
        if os.path.exists(file_path):
            size_mb = os.path.getsize(file_path) / (1024**2)
            print(f"  ✓ {file} ({size_mb:.2f} MB)")
        else:
            print(f"  ❌ {file} missing")
            return False
    
    # Try loading model
    try:
        print("\n  Loading model...")
        model = SentenceTransformer(MODEL_PATH)
        print("  ✓ Model loaded successfully")
        
        # Test embedding
        test_embedding = model.encode("test")
        print(f"  ✓ Embedding dimensions: {len(test_embedding)}")
        
        if len(test_embedding) != 384:
            print(f"  ❌ Wrong embedding dimensions: {len(test_embedding)} (expected 384)")
            return False
        
    except Exception as e:
        print(f"  ❌ Error loading model: {str(e)}")
        return False
    
    return True

def verify_lancedb():
    """Verify LanceDB database"""
    print("\n3. Verifying LanceDB database...")
    print("-" * 60)
    
    if not os.path.exists(LANCEDB_PATH):
        print(f"❌ LanceDB not found at {LANCEDB_PATH}")
        return False
    
    print(f"✓ LanceDB directory exists: {LANCEDB_PATH}")
    
    try:
        # Connect to database
        db = lancedb.connect(LANCEDB_PATH)
        print("  ✓ Connected to LanceDB")
        
        # Check tables
        tables = db.table_names()
        print(f"  ✓ Tables: {tables}")
        
        if 'supplements' not in tables:
            print("  ❌ 'supplements' table not found")
            return False
        
        # Open table
        table = db.open_table('supplements')
        print("  ✓ Opened 'supplements' table")
        
        # Get record count
        df = table.to_pandas()
        count = len(df)
        print(f"  ✓ Total supplements: {count}")
        
        if count == 0:
            print("  ❌ No supplements in database")
            return False
        
        # Show sample records
        print("\n  Sample records:")
        for idx, row in df.head(5).iterrows():
            print(f"    {row['id']}. {row['name']} ({row.get('scientific_name', 'N/A')})")
        
        # Check schema
        print("\n  Schema:")
        for col in df.columns:
            dtype = df[col].dtype
            print(f"    - {col}: {dtype}")
        
        # Verify vector dimensions
        if 'vector' in df.columns:
            first_vector = df['vector'].iloc[0]
            if isinstance(first_vector, list):
                print(f"  ✓ Vector dimensions: {len(first_vector)}")
                if len(first_vector) != 384:
                    print(f"  ❌ Wrong vector dimensions: {len(first_vector)} (expected 384)")
                    return False
        
    except Exception as e:
        print(f"  ❌ Error accessing LanceDB: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def verify_search():
    """Verify vector search functionality"""
    print("\n4. Verifying vector search...")
    print("-" * 60)
    
    try:
        # Load model
        model = SentenceTransformer(MODEL_PATH)
        
        # Connect to database
        db = lancedb.connect(LANCEDB_PATH)
        table = db.open_table('supplements')
        
        # Test queries
        test_queries = [
            "vitamin d",
            "omega 3",
            "magnesium",
            "vitamin c"
        ]
        
        for query in test_queries:
            print(f"\n  Query: '{query}'")
            
            # Generate embedding
            embedding = model.encode(query).tolist()
            
            # Search
            results = (
                table.search(embedding)
                .metric("cosine")
                .limit(3)
                .to_list()
            )
            
            if not results:
                print(f"    ❌ No results found")
                continue
            
            print(f"    ✓ Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                similarity = 1 - result.get('_distance', 1)
                print(f"      {i}. {result['name']} (similarity: {similarity:.3f})")
        
        print("\n  ✓ Vector search working correctly")
        return True
        
    except Exception as e:
        print(f"  ❌ Error testing search: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all verification checks"""
    print("="*60)
    print("SuplementIA - LanceDB Setup Verification")
    print("="*60)
    
    checks = [
        ("EFS Mount", verify_efs_mount),
        ("ML Model", verify_model),
        ("LanceDB Database", verify_lancedb),
        ("Vector Search", verify_search),
    ]
    
    results = {}
    
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n❌ Unexpected error in {name}: {str(e)}")
            results[name] = False
    
    # Summary
    print("\n" + "="*60)
    print("Verification Summary")
    print("="*60)
    
    for name, passed in results.items():
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ All checks passed! LanceDB setup is ready.")
        print("="*60)
        sys.exit(0)
    else:
        print("❌ Some checks failed. Please fix issues above.")
        print("="*60)
        sys.exit(1)

if __name__ == "__main__":
    main()
