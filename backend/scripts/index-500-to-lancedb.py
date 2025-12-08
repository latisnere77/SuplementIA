#!/usr/bin/env python3
"""
Index 500 supplements to LanceDB with Bedrock Titan V2 embeddings
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import List, Dict
import lancedb
import boto3
from botocore.config import Config

# Configuration
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
BEDROCK_EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0'
EMBEDDING_DIMENSIONS = 512
SUPPLEMENTS_FILE = '/tmp/top-500-supplements.json'

# Boto3 configuration
bedrock_config = Config(
    connect_timeout=60,
    read_timeout=120,
    retries={'max_attempts': 3}
)

bedrock_runtime = boto3.client(
    'bedrock-runtime',
    region_name='us-east-1',
    config=bedrock_config
)


def get_embedding_bedrock(text: str) -> List[float]:
    """
    Generate embeddings using Amazon Bedrock Titan Text Embeddings V2

    Args:
        text: Input text to embed

    Returns:
        List of floats representing the embedding vector (512 dimensions)
    """
    try:
        start_time = time.time()

        native_request = {
            "inputText": text,
            "dimensions": EMBEDDING_DIMENSIONS,
            "normalize": True
        }

        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_EMBEDDING_MODEL,
            body=json.dumps(native_request)
        )

        model_response = json.loads(response['body'].read())
        embedding = model_response['embedding']
        token_count = model_response.get('inputTextTokenCount', 0)

        elapsed = (time.time() - start_time) * 1000

        return embedding

    except Exception as e:
        print(f"  ✗ Bedrock embedding error: {str(e)}")
        raise


def grade_evidence(study_count: int) -> str:
    """Grade evidence based on study count"""
    if study_count >= 1000:
        return 'A'
    elif study_count >= 500:
        return 'B'
    elif study_count >= 100:
        return 'C'
    elif study_count >= 50:
        return 'D'
    elif study_count >= 10:
        return 'E'
    else:
        return 'F'


def index_supplements_to_lancedb(supplements: List[Dict], db_path: str):
    """
    Index supplements to LanceDB with Bedrock embeddings

    Args:
        supplements: List of supplement dictionaries
        db_path: Path to LanceDB database
    """
    print(f"\n{'='*60}")
    print(f"Indexing {len(supplements)} supplements to LanceDB")
    print(f"Database: {db_path}")
    print(f"{'='*60}\n")

    # Create directory if needed
    os.makedirs(db_path, exist_ok=True)

    # Backup existing database if present
    if os.path.exists(os.path.join(db_path, 'supplements.lance')):
        import shutil
        backup_path = f"{db_path}-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        print(f"Backing up existing database to: {backup_path}")
        shutil.copytree(db_path, backup_path)
        print(f"  ✓ Backup created\n")

    # Process supplements
    indexed = 0
    failed = 0
    records = []

    for idx, supp in enumerate(supplements, 1):
        try:
            name = supp['name']
            print(f"[{idx}/{len(supplements)}] {name}")

            # Generate embedding for supplement name
            embedding = get_embedding_bedrock(name)
            print(f"  ✓ Embedding: {len(embedding)} dim")

            # Prepare record
            now = datetime.now().isoformat()
            record = {
                "id": idx,
                "name": name,
                "scientific_name": supp.get('scientific_name', ''),
                "common_names": supp.get('common_names', []),
                "vector": embedding,
                "metadata": {
                    "category": supp.get('category', 'other'),
                    "popularity": supp.get('popularity', 'medium'),
                    "evidence_grade": grade_evidence(supp.get('study_count_estimate', 0)),
                    "study_count": supp.get('study_count_estimate', 0),
                    "pubmed_query": name
                },
                "search_count": 0,
                "last_searched_at": now,
                "created_at": now,
                "updated_at": now
            }

            records.append(record)
            indexed += 1

            # Small delay to avoid rate limiting
            time.sleep(0.1)

        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"Processed: {indexed} successful, {failed} failed")
    print(f"{'='*60}\n")

    # Create LanceDB table
    print("Creating LanceDB table...")
    db = lancedb.connect(db_path)

    table = db.create_table(
        "supplements",
        data=records,
        mode="overwrite"
    )
    print(f"  ✓ Table created with {len(records)} records\n")

    # Create ANN index (with correct parameters for 500 vectors)
    print("Creating ANN index...")
    try:
        # For 500 vectors, use smaller num_partitions
        # Rule: num_partitions should be < num_vectors
        num_partitions = min(64, len(records) // 2)
        num_sub_vectors = 128  # 512 / 4

        table.create_index(
            metric="cosine",
            index_type="IVF_PQ",
            num_partitions=num_partitions,
            num_sub_vectors=num_sub_vectors
        )
        print(f"  ✓ Index created (partitions: {num_partitions}, sub_vectors: {num_sub_vectors})\n")
    except Exception as e:
        print(f"  ⚠ Index creation warning: {str(e)}")
        print(f"  Using linear search (fine for {len(records)} vectors)\n")

    # Verify
    print("Verifying indexing...")
    df = table.to_pandas()
    print(f"  Total records: {len(df)}")
    print(f"  Vector dimensions: {len(df.iloc[0]['vector'])}")

    print(f"\n  Sample records:")
    print(df[['id', 'name', 'scientific_name']].head(10))

    # Test search with NAC
    print("\n" + "="*60)
    print("Testing search with 'NAC'")
    print("="*60 + "\n")

    test_embedding = get_embedding_bedrock("NAC")
    results = (
        table.search(test_embedding)
        .metric("cosine")
        .limit(5)
        .to_list()
    )

    print("Results:")
    for i, result in enumerate(results, 1):
        similarity = 1 - result.get('_distance', 1)
        print(f"  {i}. {result['name']} (similarity: {similarity:.3f})")

    print(f"\n{'='*60}")
    print("✓ Indexing completed successfully!")
    print(f"Database: {db_path}")
    print(f"{'='*60}\n")


def main():
    """Main indexing script"""

    print("\n" + "="*60)
    print("LanceDB Indexing - 500 Supplements")
    print("Using Bedrock Titan V2 (512 dimensions)")
    print("="*60 + "\n")

    # Load supplements
    if not os.path.exists(SUPPLEMENTS_FILE):
        print(f"ERROR: Supplements file not found: {SUPPLEMENTS_FILE}")
        print("\nPlease run: python generate-top-500-supplements.py first")
        sys.exit(1)

    with open(SUPPLEMENTS_FILE, 'r') as f:
        supplements = json.load(f)

    print(f"Loaded {len(supplements)} supplements from {SUPPLEMENTS_FILE}\n")

    # Index to LanceDB
    try:
        index_supplements_to_lancedb(supplements, LANCEDB_PATH)
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Indexing failed: {str(e)}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
