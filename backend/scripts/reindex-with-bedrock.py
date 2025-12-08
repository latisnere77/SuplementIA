#!/usr/bin/env python3
"""
SuplementIA - Re-index LanceDB with Bedrock Titan Embeddings V2
Re-index existing LanceDB from 384 to 512 dimensions using Bedrock
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
LANCEDB_PATH_OLD = os.environ.get('LANCEDB_PATH_OLD', '/mnt/efs/suplementia-lancedb-384')
LANCEDB_PATH_NEW = os.environ.get('LANCEDB_PATH_NEW', '/mnt/efs/suplementia-lancedb')
BEDROCK_EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0'
EMBEDDING_DIMENSIONS = 512

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
        print(f"  ✓ Bedrock embedding: {elapsed:.0f}ms, tokens: {token_count}, dim: {len(embedding)}")

        return embedding

    except Exception as e:
        print(f"  ✗ Bedrock embedding error: {str(e)}")
        raise


def read_old_lancedb(db_path: str) -> List[Dict]:
    """Read all supplements from old LanceDB"""
    print(f"Reading old LanceDB from: {db_path}")

    try:
        db = lancedb.connect(db_path)
        table = db.open_table("supplements")

        # Read all records
        df = table.to_pandas()
        records = df.to_dict('records')

        print(f"  ✓ Read {len(records)} supplements from old database")
        print(f"  Old vector dimensions: {len(records[0]['vector']) if records else 0}")

        return records

    except Exception as e:
        print(f"  ✗ Error reading old database: {str(e)}")
        raise


def create_new_lancedb(db_path: str):
    """Create new LanceDB database"""
    print(f"\nCreating new LanceDB at: {db_path}")

    # Create directory if it doesn't exist
    os.makedirs(db_path, exist_ok=True)

    # Connect to LanceDB
    db = lancedb.connect(db_path)

    print(f"  ✓ New database initialized")

    return db


def reindex_supplements(old_records: List[Dict], new_db: lancedb.db.LanceDBConnection):
    """
    Re-index supplements with new Bedrock embeddings

    Args:
        old_records: List of old supplement records
        new_db: New LanceDB connection
    """
    print(f"\n{'='*60}")
    print(f"Starting re-indexing of {len(old_records)} supplements")
    print(f"{'='*60}\n")

    # Create new table with overwrite mode
    print("Creating new supplements table...")

    reindexed = 0
    failed = 0
    new_records = []

    for idx, old_record in enumerate(old_records, 1):
        try:
            name = old_record['name']
            print(f"[{idx}/{len(old_records)}] Processing: {name}")

            # Generate new embedding using Bedrock
            new_embedding = get_embedding_bedrock(name)

            # Prepare new record with updated embedding
            now = datetime.now().isoformat()
            new_record = {
                "id": old_record['id'],
                "name": name,
                "scientific_name": old_record.get('scientific_name', ''),
                "common_names": old_record.get('common_names', []),
                "vector": new_embedding,
                "metadata": old_record.get('metadata', {}),
                "search_count": old_record.get('search_count', 0),
                "last_searched_at": old_record.get('last_searched_at', now),
                "created_at": old_record.get('created_at', now),
                "updated_at": now
            }

            new_records.append(new_record)
            print(f"  ✓ Re-indexed with 512-dim embedding")

            reindexed += 1

            # Add small delay to avoid rate limiting
            time.sleep(0.1)

        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
            failed += 1

    # Create table with all new records
    print(f"\nInserting {len(new_records)} records into new database...")
    table = new_db.create_table(
        "supplements",
        data=new_records,
        mode="overwrite"
    )
    print(f"  ✓ Table created with {len(new_records)} records")

    print(f"\n{'='*60}")
    print(f"Re-indexing complete!")
    print(f"  ✓ Re-indexed: {reindexed}")
    print(f"  ✗ Failed: {failed}")
    print(f"{'='*60}\n")

    # Create ANN index
    print("Creating ANN index for fast search...")
    try:
        table.create_index(
            metric="cosine",
            index_type="IVF_PQ",
            num_partitions=256,
            num_sub_vectors=128  # 512 / 4 for optimal performance
        )
        print("✓ Index created successfully\n")
    except Exception as e:
        print(f"✗ Index creation failed: {str(e)}\n")

    # Verify migration
    print("Verifying re-indexing...")
    df = table.to_pandas()
    print(f"  Total records in new LanceDB: {len(df)}")
    print(f"  New vector dimensions: {len(df.iloc[0]['vector'])}")
    print(f"\n  Sample records:")
    print(df[['id', 'name', 'scientific_name']].head(5))
    print()

    # Test search
    print("Testing vector search with Bedrock...")
    test_query = "NAC"
    test_embedding = get_embedding_bedrock(test_query)

    results = (
        table.search(test_embedding)
        .metric("cosine")
        .limit(3)
        .to_list()
    )

    print(f"\n  Query: '{test_query}'")
    print(f"  Results:")
    for i, result in enumerate(results, 1):
        similarity = 1 - result.get('_distance', 1)
        print(f"    {i}. {result['name']} (similarity: {similarity:.3f})")
    print()


def backup_old_database(old_path: str):
    """Backup old database before re-indexing"""
    import shutil

    backup_path = f"{old_path}-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    print(f"Backing up old database...")
    print(f"  From: {old_path}")
    print(f"  To: {backup_path}")

    try:
        if os.path.exists(old_path):
            shutil.copytree(old_path, backup_path)
            print(f"  ✓ Backup created successfully")
            return backup_path
        else:
            print(f"  ! Old database not found, skipping backup")
            return None
    except Exception as e:
        print(f"  ✗ Backup failed: {str(e)}")
        raise


def main():
    """Main re-indexing script"""
    print("\n" + "="*60)
    print("SuplementIA - LanceDB Re-indexing Script")
    print("From 384 dimensions (Sentence Transformers)")
    print("To 512 dimensions (Bedrock Titan V2)")
    print("="*60 + "\n")

    # Check if old database exists
    if not os.path.exists(LANCEDB_PATH_OLD):
        print(f"ERROR: Old database not found at {LANCEDB_PATH_OLD}")

        # Check if it's at the new path (might be the same path)
        if os.path.exists(LANCEDB_PATH_NEW):
            print(f"\nFound database at {LANCEDB_PATH_NEW}")
            print("Assuming this is the old database to re-index...")
            old_path = LANCEDB_PATH_NEW
            new_path = LANCEDB_PATH_NEW + "-512dim"
        else:
            print("\nNo database found. Exiting.")
            sys.exit(1)
    else:
        old_path = LANCEDB_PATH_OLD
        new_path = LANCEDB_PATH_NEW

    try:
        # Step 1: Backup old database
        backup_path = backup_old_database(old_path)

        # Step 2: Read old records
        old_records = read_old_lancedb(old_path)

        # Step 3: Create new database
        new_db = create_new_lancedb(new_path)

        # Step 4: Re-index with Bedrock
        reindex_supplements(old_records, new_db)

        print("✓ Re-indexing completed successfully!")
        print(f"\nOld database: {old_path}")
        if backup_path:
            print(f"Backup: {backup_path}")
        print(f"New database: {new_path}")
        print(f"\nTo use the new database, update Lambda environment variable:")
        print(f"  LANCEDB_PATH={new_path}\n")

        sys.exit(0)

    except Exception as e:
        print(f"\n✗ Re-indexing failed: {str(e)}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
