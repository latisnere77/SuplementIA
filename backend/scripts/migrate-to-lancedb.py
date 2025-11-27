#!/usr/bin/env python3
"""
SuplementIA - Data Migration to LanceDB
Migrate 70 existing supplements from supplement-mappings.ts to LanceDB
"""

import json
import os
import sys
from datetime import datetime
from typing import List, Dict
import lancedb
from sentence_transformers import SentenceTransformer

# Configuration
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')

# Sample supplements (replace with actual data from supplement-mappings.ts)
SUPPLEMENTS = [
    {
        "name": "Vitamin D",
        "scientific_name": "Cholecalciferol",
        "common_names": ["Vitamin D3", "Colecalciferol"],
        "category": "vitamin",
        "popularity": "high",
        "study_count": 15000
    },
    {
        "name": "Omega-3",
        "scientific_name": "Omega-3 Fatty Acids",
        "common_names": ["Fish Oil", "EPA", "DHA"],
        "category": "fatty-acid",
        "popularity": "high",
        "study_count": 12000
    },
    {
        "name": "Magnesium",
        "scientific_name": "Magnesium",
        "common_names": ["Mg", "Magnesio"],
        "category": "mineral",
        "popularity": "high",
        "study_count": 8000
    },
    # Add remaining 67 supplements here...
]


def grade_evidence(study_count: int) -> str:
    """Grade evidence based on study count"""
    if study_count >= 100:
        return 'A'
    elif study_count >= 50:
        return 'B'
    elif study_count >= 10:
        return 'C'
    else:
        return 'D'


def initialize_lancedb(db_path: str) -> lancedb.db.LanceDBConnection:
    """Initialize LanceDB database"""
    print(f"Initializing LanceDB at: {db_path}")
    
    # Create directory if it doesn't exist
    os.makedirs(db_path, exist_ok=True)
    
    # Connect to LanceDB
    db = lancedb.connect(db_path)
    
    return db


def create_supplements_table(db: lancedb.db.LanceDBConnection):
    """Create supplements table with schema"""
    print("Creating supplements table...")
    
    # Define schema
    schema = {
        "id": "int",
        "name": "str",
        "scientific_name": "str",
        "common_names": "list",
        "vector": "list",
        "metadata": "dict",
        "search_count": "int",
        "last_searched_at": "str",
        "created_at": "str",
        "updated_at": "str"
    }
    
    # Create empty table
    table = db.create_table(
        "supplements",
        data=[],
        mode="overwrite"
    )
    
    print("Table created successfully")
    return table


def migrate_supplements(supplements: List[Dict], model_path: str, db_path: str):
    """
    Migrate supplements to LanceDB
    
    Args:
        supplements: List of supplement dictionaries
        model_path: Path to Sentence Transformers model
        db_path: Path to LanceDB database
    """
    print(f"\n{'='*60}")
    print(f"Starting migration of {len(supplements)} supplements")
    print(f"{'='*60}\n")
    
    # Load model
    print(f"Loading Sentence Transformers model from: {model_path}")
    model = SentenceTransformer(model_path)
    print("Model loaded successfully\n")
    
    # Initialize LanceDB
    db = initialize_lancedb(db_path)
    
    # Create table
    table = create_supplements_table(db)
    
    # Migrate supplements
    migrated = 0
    failed = 0
    
    for idx, supp in enumerate(supplements, 1):
        try:
            print(f"[{idx}/{len(supplements)}] Processing: {supp['name']}")
            
            # Generate embedding
            embedding = model.encode(supp['name']).tolist()
            print(f"  ✓ Generated embedding ({len(embedding)} dims)")
            
            # Prepare record
            now = datetime.now().isoformat()
            record = {
                "id": idx,
                "name": supp['name'],
                "scientific_name": supp.get('scientific_name', ''),
                "common_names": supp.get('common_names', []),
                "vector": embedding,
                "metadata": {
                    "category": supp.get('category', 'other'),
                    "popularity": supp.get('popularity', 'medium'),
                    "evidence_grade": grade_evidence(supp.get('study_count', 0)),
                    "study_count": supp.get('study_count', 0),
                    "pubmed_query": supp['name']
                },
                "search_count": 0,
                "last_searched_at": now,
                "created_at": now,
                "updated_at": now
            }
            
            # Insert into LanceDB
            table.add([record])
            print(f"  ✓ Inserted into LanceDB (ID: {idx})")
            
            migrated += 1
            
        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
            failed += 1
    
    print(f"\n{'='*60}")
    print(f"Migration complete!")
    print(f"  ✓ Migrated: {migrated}")
    print(f"  ✗ Failed: {failed}")
    print(f"{'='*60}\n")
    
    # Create ANN index
    print("Creating ANN index for fast search...")
    try:
        table.create_index(
            metric="cosine",
            index_type="IVF_PQ",
            num_partitions=256,
            num_sub_vectors=96
        )
        print("✓ Index created successfully\n")
    except Exception as e:
        print(f"✗ Index creation failed: {str(e)}\n")
    
    # Verify migration
    print("Verifying migration...")
    df = table.to_pandas()
    print(f"  Total records in LanceDB: {len(df)}")
    print(f"  Sample records:")
    print(df[['id', 'name', 'scientific_name']].head(5))
    print()
    
    # Test search
    print("Testing vector search...")
    test_query = "vitamin d"
    test_embedding = model.encode(test_query).tolist()
    
    results = (
        table.search(test_embedding)
        .metric("cosine")
        .limit(3)
        .to_list()
    )
    
    print(f"  Query: '{test_query}'")
    print(f"  Results:")
    for i, result in enumerate(results, 1):
        similarity = 1 - result.get('_distance', 1)
        print(f"    {i}. {result['name']} (similarity: {similarity:.3f})")
    print()


def main():
    """Main migration script"""
    print("\n" + "="*60)
    print("SuplementIA - LanceDB Migration Script")
    print("="*60 + "\n")
    
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model not found at {MODEL_PATH}")
        print("Please download the model first:")
        print(f"  python -c \"from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2').save('{MODEL_PATH}')\"")
        sys.exit(1)
    
    # Run migration
    try:
        migrate_supplements(SUPPLEMENTS, MODEL_PATH, LANCEDB_PATH)
        print("✓ Migration completed successfully!\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
