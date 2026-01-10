"""
SuplementIA - Vector Search API with LanceDB
Lambda ARM64 Container function for semantic supplement search
"""

import json
import time
import os
from typing import List, Dict, Optional
from decimal import Decimal
import boto3
from botocore.config import Config
import lancedb
import requests


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder that converts Decimal to float"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Environment variables
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb')
DYNAMODB_CACHE_TABLE = os.environ.get('DYNAMODB_CACHE_TABLE', 'supplement-cache')
SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))
BEDROCK_EMBEDDING_MODEL = os.environ.get('BEDROCK_EMBEDDING_MODEL', 'amazon.titan-embed-text-v2:0')
# Titan Text Embeddings V2 only supports: 1024 (default), 512, 256
# Using 512 as compromise between performance and accuracy
# Note: This requires re-indexing LanceDB from 384 to 512 dimensions
EMBEDDING_DIMENSIONS = int(os.environ.get('EMBEDDING_DIMENSIONS', '512'))

# Boto3 configuration for VPC endpoint connectivity
# Increase connect_timeout to allow VPC endpoint DNS resolution
bedrock_config = Config(
    connect_timeout=60,  # Allow time for VPC endpoint connection
    read_timeout=120,    # Allow time for model inference
    retries={'max_attempts': 2}
)

# Global variables (cached across invocations)
db = None
bedrock_runtime = None
dynamodb = boto3.resource('dynamodb')
cache_table = dynamodb.Table(DYNAMODB_CACHE_TABLE)


def initialize():
    """Initialize LanceDB and Bedrock client (cached across invocations)"""
    global db, bedrock_runtime

    if db is None:
        print(f"Initializing LanceDB from {LANCEDB_PATH}")
        db = lancedb.connect(LANCEDB_PATH)

    if bedrock_runtime is None:
        print("Initializing Bedrock Runtime client with VPC endpoint config")
        bedrock_runtime = boto3.client(
            'bedrock-runtime',
            region_name='us-east-1',
            config=bedrock_config  # Use config with increased timeouts for VPC endpoint
        )

    return db


def get_embedding_bedrock(text: str) -> List[float]:
    """
    Generate embeddings using Amazon Bedrock Titan Text Embeddings V2

    Titan V2 supported dimensions: 1024, 512, 256
    - Using 512 dimensions (valid Titan V2 value)
    - Enable normalization for cosine similarity searches
    - Note: Requires LanceDB re-indexing to 512 dimensions

    Args:
        text: Input text to embed

    Returns:
        List of floats representing the embedding vector (512 dimensions)
    """
    global bedrock_runtime

    try:
        start_time = time.time()

        # Create request following AWS best practices
        native_request = {
            "inputText": text,
            "dimensions": EMBEDDING_DIMENSIONS,  # 512 for optimal performance
            "normalize": True  # Required for cosine similarity in LanceDB
        }

        # Invoke Bedrock
        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_EMBEDDING_MODEL,
            body=json.dumps(native_request)
        )

        # Parse response
        model_response = json.loads(response['body'].read())
        embedding = model_response['embedding']
        token_count = model_response.get('inputTextTokenCount', 0)

        elapsed = (time.time() - start_time) * 1000
        print(f"Bedrock embedding: {elapsed:.2f}ms, tokens: {token_count}, dim: {len(embedding)}")

        return embedding

    except Exception as e:
        print(f"Bedrock embedding error: {str(e)}")
        raise


def expand_query_intelligent(query: str) -> List[str]:
    """
    Use Claude to intelligently expand supplement queries with:
    - Full scientific names
    - Common abbreviations
    - Synonyms and alternative names

    Returns list of search terms to try in order of relevance
    """
    global bedrock_runtime

    try:
        start_time = time.time()
        print(f"[DEBUG] Starting query expansion for: {query}")

        prompt = f"""You are a supplement and nutrition expert. Given a supplement search query, provide alternative search terms that might match the same supplement.

Query: "{query}"

Provide:
1. English translation (if query is in another language)
2. The full scientific name (if it's an abbreviation)
3. Common alternative names
4. The original query

Return ONLY a JSON array of strings, ordered by relevance. Maximum 4 terms.

Examples:
- "NAC" → ["N-Acetyl Cysteine", "N-Acetylcysteine", "NAC", "Acetylcysteine"]
- "CoQ10" → ["Coenzyme Q10", "Ubiquinone", "CoQ10", "Ubidecarenone"]
- "Vitamin D" → ["Vitamin D", "Cholecalciferol", "Vitamin D3"]
- "peptidos bioactivos" → ["bioactive peptides", "bioactive peptide", "peptidos bioactivos"]

Output only the JSON array, nothing else."""

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200,
            "temperature": 0.3,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })

        print(f"[DEBUG] Calling Bedrock invoke_model...")
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=body
        )
        print(f"[DEBUG] Bedrock invoke_model returned")

        response_body = json.loads(response['body'].read())
        expanded_text = response_body['content'][0]['text'].strip()

        # Parse JSON response
        expanded_terms = json.loads(expanded_text)

        elapsed = (time.time() - start_time) * 1000
        print(f"Query expansion: {query} → {expanded_terms} ({elapsed:.2f}ms)")

        return expanded_terms

    except Exception as e:
        print(f"Query expansion error: {str(e)}, falling back to original query")
        return [query]


def check_cache(query_hash: str) -> Optional[Dict]:
    """Check DynamoDB cache for cached result"""
    try:
        response = cache_table.get_item(
            Key={
                'PK': f'SUPPLEMENT#{query_hash}',
                'SK': 'QUERY'
            }
        )

        if 'Item' in response:
            print(f"Cache hit for query hash: {query_hash}")
            return response['Item'].get('supplementData')

        return None
    except Exception as e:
        print(f"Cache check error: {str(e)}")
        return None


def store_cache(query_hash: str, supplement_data: Dict, embedding: List[float]):
    """Store result in DynamoDB cache"""
    try:
        import time
        ttl = int(time.time()) + (7 * 24 * 60 * 60)  # 7 days
        
        cache_table.put_item(
            Item={
                'PK': f'SUPPLEMENT#{query_hash}',
                'SK': 'QUERY',
                'supplementData': supplement_data,
                'embedding': embedding,
                'ttl': ttl,
                'searchCount': 1,
                'lastAccessed': int(time.time())
            }
        )
        print(f"Cached result for query hash: {query_hash}")
    except Exception as e:
        print(f"Cache store error: {str(e)}")


def vector_search(query: str, limit: int = 5) -> List[Dict]:
    """
    Perform intelligent vector search using LanceDB with query expansion

    Args:
        query: Search query text
        limit: Maximum number of results

    Returns:
        List of matching supplements with similarity scores
    """
    start_time = time.time()

    # Initialize
    db = initialize()

    # Expand query intelligently using Claude
    expanded_queries = expand_query_intelligent(query)

    # Try each expanded query until we find good results
    best_results = []
    best_similarity = 0

    for search_term in expanded_queries:
        # Generate embedding using Bedrock
        embedding = get_embedding_bedrock(search_term)

        # Search LanceDB
        search_start = time.time()
        table = db.open_table("supplements")

        results = (
            table.search(embedding)
            .metric("cosine")
            .limit(limit)
            .to_list()
        )

        search_time = (time.time() - search_start) * 1000
        print(f"LanceDB search for '{search_term}': {search_time:.2f}ms")

        # Check if we found better results
        if results:
            top_similarity = 1 - results[0].get('_distance', 1)
            print(f"Top similarity for '{search_term}': {top_similarity:.3f}")

            if top_similarity > best_similarity:
                best_similarity = top_similarity
                best_results = results
                print(f"New best match: '{search_term}' with similarity {top_similarity:.3f}")

                # If we found a very good match, stop searching
                if top_similarity >= 0.95:
                    print(f"Excellent match found, stopping search")
                    break

    # Filter by similarity threshold
    filtered_results = [
        r for r in best_results
        if (1 - r.get('_distance', 1)) >= SIMILARITY_THRESHOLD
    ]

    total_time = (time.time() - start_time) * 1000
    print(f"Total intelligent search time: {total_time:.2f}ms, Results: {len(filtered_results)}, Best similarity: {best_similarity:.3f}")

    return filtered_results


def reindex_lancedb_handler(event, context):
    """
    Re-index LanceDB from 384 to 512 dimensions using Bedrock

    This is a one-time operation to migrate from Sentence Transformers (384 dim)
    to Bedrock Titan V2 embeddings (512 dim)
    """
    from datetime import datetime

    print("\n" + "="*60)
    print("Starting LanceDB Re-indexing")
    print("From 384 to 512 dimensions")
    print("="*60 + "\n")

    try:
        # Initialize Bedrock
        global bedrock_runtime
        if bedrock_runtime is None:
            print("Initializing Bedrock Runtime client...")
            bedrock_runtime = boto3.client(
                'bedrock-runtime',
                region_name='us-east-1',
                config=bedrock_config
            )

        # Read old database
        old_db_path = LANCEDB_PATH
        print(f"Reading old LanceDB from: {old_db_path}")
        old_db = lancedb.connect(old_db_path)
        old_table = old_db.open_table("supplements")
        old_df = old_table.to_pandas()
        old_records = old_df.to_dict('records')

        print(f"  ✓ Found {len(old_records)} supplements")
        print(f"  Old vector dimensions: {len(old_records[0]['vector'])}")

        # Backup old database
        import shutil
        backup_path = f"{old_db_path}-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        print(f"\nBacking up to: {backup_path}")
        shutil.copytree(old_db_path, backup_path)
        print(f"  ✓ Backup created")

        # Create new records with Bedrock embeddings
        print(f"\nRe-indexing {len(old_records)} supplements...")
        new_records = []

        for idx, old_record in enumerate(old_records, 1):
            name = old_record['name']
            print(f"[{idx}/{len(old_records)}] {name}")

            # Generate new embedding
            new_embedding = get_embedding_bedrock(name)

            # Create new record
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

            # Delay to avoid rate limiting
            time.sleep(0.1)

        # Create new table with 512-dim vectors
        print(f"\nCreating new table with {len(new_records)} records...")
        new_db = lancedb.connect(old_db_path)
        new_table = new_db.create_table(
            "supplements",
            data=new_records,
            mode="overwrite"
        )
        print(f"  ✓ New table created")

        # Create ANN index
        print("\nCreating ANN index...")
        new_table.create_index(
            metric="cosine",
            index_type="IVF_PQ",
            num_partitions=256,
            num_sub_vectors=128
        )
        print(f"  ✓ Index created")

        # Verify
        verify_df = new_table.to_pandas()
        print(f"\nVerification:")
        print(f"  Total records: {len(verify_df)}")
        print(f"  New vector dimensions: {len(verify_df.iloc[0]['vector'])}")

        # Test search
        print("\nTesting search...")
        test_embedding = get_embedding_bedrock("NAC")
        results = (
            new_table.search(test_embedding)
            .metric("cosine")
            .limit(3)
            .to_list()
        )

        for i, result in enumerate(results, 1):
            similarity = 1 - result.get('_distance', 1)
            print(f"  {i}. {result['name']} (similarity: {similarity:.3f})")

        print("\n" + "="*60)
        print("✓ Re-indexing completed successfully!")
        print(f"Backup: {backup_path}")
        print("="*60 + "\n")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'message': 'Re-indexing completed successfully',
                'recordsProcessed': len(new_records),
                'oldDimensions': 384,
                'newDimensions': 512,
                'backupPath': backup_path
            })
        }

    except Exception as e:
        print(f"\n✗ Re-indexing failed: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Re-indexing failed',
                'message': str(e)
            })
        }


def index_from_s3_handler(event, context):
    """
    Index supplements from S3 JSON file to LanceDB

    Event parameters:
        action: "index_from_s3"
        s3_bucket: S3 bucket name
        s3_key: S3 object key

    Default: s3://suplementia-data-1764470893/supplements/top-supplements.json
    """
    from datetime import datetime

    s3_bucket = event.get('s3_bucket', 'suplementia-data-1764470893')
    s3_key = event.get('s3_key', 'supplements/top-supplements.json')

    print(f"\n{'='*60}")
    print(f"Indexing supplements from S3")
    print(f"Bucket: {s3_bucket}")
    print(f"Key: {s3_key}")
    print(f"{'='*60}\n")

    try:
        # Initialize Bedrock
        global bedrock_runtime
        if bedrock_runtime is None:
            print("Initializing Bedrock Runtime client...")
            bedrock_runtime = boto3.client(
                'bedrock-runtime',
                region_name='us-east-1',
                config=bedrock_config
            )

        # Download from S3
        s3 = boto3.client('s3')
        print(f"Downloading {s3_key} from {s3_bucket}...")

        response = s3.get_object(Bucket=s3_bucket, Key=s3_key)
        supplements_json = response['Body'].read().decode('utf-8')
        supplements = json.loads(supplements_json)

        print(f"  ✓ Loaded {len(supplements)} supplements from S3\n")

        # Backup existing database
        import shutil
        if os.path.exists(os.path.join(LANCEDB_PATH, 'supplements.lance')):
            backup_path = f"{LANCEDB_PATH}-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            print(f"Backing up to: {backup_path}")
            shutil.copytree(LANCEDB_PATH, backup_path)
            print(f"  ✓ Backup created\n")

        # Process supplements
        print(f"Indexing {len(supplements)} supplements...")
        indexed = 0
        failed = 0
        records = []

        for idx, supp in enumerate(supplements, 1):
            try:
                name = supp['name']
                print(f"[{idx}/{len(supplements)}] {name}")

                # Generate embedding
                embedding = get_embedding_bedrock(name)

                # Prepare record
                now = datetime.now().isoformat()

                # Grade evidence
                study_count = supp.get('study_count_estimate', 0)
                if study_count >= 1000:
                    evidence_grade = 'A'
                elif study_count >= 500:
                    evidence_grade = 'B'
                elif study_count >= 100:
                    evidence_grade = 'C'
                elif study_count >= 50:
                    evidence_grade = 'D'
                else:
                    evidence_grade = 'E'

                record = {
                    "id": idx,
                    "name": name,
                    "scientific_name": supp.get('scientific_name', ''),
                    "common_names": supp.get('common_names', []),
                    "vector": embedding,
                    "metadata": {
                        "category": supp.get('category', 'other'),
                        "popularity": supp.get('popularity', 'medium'),
                        "evidence_grade": evidence_grade,
                        "study_count": study_count,
                        "pubmed_query": name
                    },
                    "search_count": 0,
                    "last_searched_at": now,
                    "created_at": now,
                    "updated_at": now
                }

                records.append(record)
                indexed += 1

                # Delay to avoid rate limiting
                time.sleep(0.1)

            except Exception as e:
                print(f"  ✗ Error: {str(e)}")
                failed += 1

        print(f"\n{'='*60}")
        print(f"Processed: {indexed} successful, {failed} failed")
        print(f"{'='*60}\n")

        # Create LanceDB table
        print("Creating LanceDB table...")
        db_conn = lancedb.connect(LANCEDB_PATH)

        table = db_conn.create_table(
            "supplements",
            data=records,
            mode="overwrite"
        )
        print(f"  ✓ Table created with {len(records)} records\n")

        # Create ANN index if enough vectors
        if len(records) >= 10:
            print("Creating ANN index...")
            try:
                num_partitions = min(64, len(records) // 2)
                num_sub_vectors = 128

                table.create_index(
                    metric="cosine",
                    index_type="IVF_PQ",
                    num_partitions=num_partitions,
                    num_sub_vectors=num_sub_vectors
                )
                print(f"  ✓ Index created (partitions: {num_partitions})\n")
            except Exception as e:
                print(f"  ⚠ Index creation warning: {str(e)}")
                print(f"  Using linear search\n")

        # Test search with NAC
        print("Testing search with 'NAC'...")
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
        print(f"{'='*60}\n")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'message': 'Indexing completed successfully',
                'recordsProcessed': len(records),
                'dimensions': EMBEDDING_DIMENSIONS,
                's3_source': f"s3://{s3_bucket}/{s3_key}"
            })
        }

    except Exception as e:
        print(f"\n✗ Indexing failed: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Indexing failed',
                'message': str(e)
            })
        }


def lambda_handler(event, context):
    """
    Lambda handler for supplement search

    Query parameters:
        q: Search query (required)
        limit: Max results (optional, default: 5)

    Special operations:
        action: "reindex" - Re-index existing LanceDB to 512 dimensions
        action: "index_from_s3" - Index supplements from S3 JSON file
    """
    try:
        # Check for special operations
        if event.get('action') == 'reindex':
            return reindex_lancedb_handler(event, context)

        if event.get('action') == 'index_from_s3':
            return index_from_s3_handler(event, context)

        # Parse query parameters
        query_params = event.get('queryStringParameters', {})
        if not query_params:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Missing query parameters',
                    'message': 'Query parameter "q" is required'
                })
            }
        
        query = query_params.get('q', '').strip()
        if not query:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Empty query',
                    'message': 'Query parameter "q" cannot be empty'
                })
            }
        
        # Validate query length
        if len(query) > 200:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Query too long',
                    'message': 'Query must be less than 200 characters'
                })
            }
        
        # Accept both 'limit' and 'top_k' parameters (top_k takes precedence)
        limit = int(query_params.get('top_k') or query_params.get('limit', 5))
        
        # Generate query hash for caching
        import hashlib
        query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]
        
        # Check cache
        cached_result = check_cache(query_hash)
        if cached_result:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'supplement': cached_result,
                    'cacheHit': True,
                    'source': 'dynamodb'
                }, cls=DecimalEncoder)
            }
        
        # Perform vector search
        results = vector_search(query, limit)

        if not results:
            # NOT FOUND - Try synchronous discovery
            print(f"[SYNC DISCOVERY] No results found for: {query}")
            print(f"[SYNC DISCOVERY] Attempting real-time discovery...")

            # Try to discover and index in real-time
            discovery_result = try_sync_discovery(query)

            if discovery_result['success']:
                print(f"[SYNC DISCOVERY] Successfully indexed: {query}")
                print(f"[SYNC DISCOVERY] Re-searching in LanceDB...")

                # Search again after adding to index
                results = vector_search(query, limit)

                if results:
                    print(f"[SYNC DISCOVERY] Found after indexing! Proceeding with result...")
                    # Continue to normal result handling below
                else:
                    print(f"[SYNC DISCOVERY] Still not found after indexing (unexpected)")
            else:
                # Discovery failed (insufficient studies or error)
                print(f"[SYNC DISCOVERY] Discovery failed: {discovery_result.get('reason', 'unknown')}")

                # Still add to background queue for future processing
                add_to_discovery_queue(query)

                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'success': False,
                        'message': discovery_result.get('message', 'Supplement not found'),
                        'query': query,
                        'reason': discovery_result.get('reason'),
                        'studyCount': discovery_result.get('study_count', 0),
                        'suggestion': 'We\'ll continue looking for this supplement in the background'
                    })
                }

            # If still no results after discovery attempt
            if not results:
                add_to_discovery_queue(query)

                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'success': False,
                        'message': 'Supplement not found',
                        'query': query,
                        'suggestion': 'This supplement has been added to our discovery queue'
                    })
                }
        
        # Get best match
        best_match = results[0]
        similarity = 1 - best_match.get('_distance', 1)
        
        supplement_data = {
            'id': best_match.get('id'),
            'name': best_match.get('name'),
            'scientificName': best_match.get('scientific_name'),
            'commonNames': best_match.get('common_names', []),
            'metadata': best_match.get('metadata', {}),
            'similarity': round(similarity, 3)
        }
        
        # Store in cache with Bedrock embedding
        embedding = get_embedding_bedrock(query)
        store_cache(query_hash, supplement_data, embedding)
        
        # Format alternative matches (all results except the first one)
        alternative_matches = []
        for result in results[1:]:  # Skip first result (already returned as supplement)
            alt_similarity = 1 - result.get('_distance', 1)
            alternative_matches.append({
                'id': result.get('id'),
                'name': result.get('name'),
                'scientificName': result.get('scientific_name'),
                'commonNames': result.get('common_names', []),
                'metadata': result.get('metadata', {}),
                'similarity': round(alt_similarity, 3)
            })
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'supplement': supplement_data,
                'cacheHit': False,
                'source': 'lancedb',
                'alternativeMatches': alternative_matches  # Now returns array instead of count
            })
        }
        
    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }


def add_to_discovery_queue(query: str):
    """Add unknown supplement to discovery queue"""
    try:
        discovery_table = dynamodb.Table('discovery-queue')

        import hashlib
        query_id = hashlib.sha256(query.encode()).hexdigest()[:16]

        discovery_table.put_item(
            Item={
                'PK': f'DISCOVERY#{query_id}',
                'SK': 'PENDING',
                'query': query,
                'searchCount': 1,
                'priority': 1,
                'status': 'pending',
                'createdAt': int(time.time())
            }
        )
        print(f"Added to discovery queue: {query}")
    except Exception as e:
        print(f"Error adding to discovery queue: {str(e)}")


def get_pubmed_count_cached(query: str) -> int:
    """
    Get PubMed study count with DynamoDB caching (Phase 2 optimization)

    Cache Flow:
    1. Check DynamoDB cache (TTL: 30 days)
    2. If hit: return cached count (<50ms)
    3. If miss: query PubMed API + cache result

    Args:
        query: Supplement name to search

    Returns:
        Study count from PubMed

    Raises:
        requests.Timeout: If PubMed query times out
        Exception: For other errors
    """
    import boto3
    import requests
    from botocore.exceptions import ClientError

    # Normalize query for cache key
    cache_key = query.lower().strip()

    try:
        # Check cache first
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.Table('pubmed-cache')

        try:
            response = table.get_item(Key={'query': cache_key})

            if 'Item' in response:
                count = response['Item']['count']
                print(f"[PUBMED CACHE HIT] {query}: {count} studies (cached)")
                return count
        except ClientError as e:
            # Cache table might not exist yet or other error - continue to PubMed
            print(f"[PUBMED CACHE MISS] Cache read error: {e}")

        # Cache miss - query PubMed via Proxy Lambda (to bypass VPC restrictions)
        print(f"[PUBMED CACHE MISS] Invoking Proxy Lambda for: {query}")

        pubmed_query = build_optimized_pubmed_query(query)
        
        lambda_client = boto3.client('lambda', region_name='us-east-1')
        
        try:
            # Invoke Proxy Lambda
            invoke_response = lambda_client.invoke(
                FunctionName='production-pubmed-proxy',
                InvocationType='RequestResponse',
                Payload=json.dumps({'query': pubmed_query})
            )
            
            # Parse Lambda response
            payload = json.loads(invoke_response['Payload'].read())
            
            # Helper to extract body if it's APIGateway-style or direct
            if 'body' in payload and isinstance(payload['body'], str):
                 body = json.loads(payload['body'])
            else:
                 body = payload
            
            if not body.get('success', False):
                 raise Exception(body.get('error', 'Unknown proxy error'))
                 
            count = body.get('count', 0)
            print(f"[PUBMED PROXY] Returned count: {count}")

        except Exception as e:
            print(f"[PUBMED PROXY ERROR] {str(e)}")
            raise

        # Store in cache with 30-day TTL
        try:
            ttl = int(time.time()) + (30 * 24 * 60 * 60)  # 30 days
            table.put_item(
                Item={
                    'query': cache_key,
                    'count': count,
                    'pubmed_query': pubmed_query,
                    'ttl': ttl,
                    'cached_at': time.strftime('%Y-%m-%dT%H:%M:%SZ')
                }
            )
            print(f"[PUBMED CACHE WRITE] Cached {query}: {count} studies")
        except ClientError as e:
            print(f"[PUBMED CACHE WRITE ERROR] {e}")

        return count

    except Exception as e:
        print(f"[PUBMED ERROR] {str(e)}")
        raise


# In-memory cache for normalizations (warm container optimization)
normalization_cache = {}

def normalize_query_intelligent(query: str) -> str:
    """
    Intelligently normalize search query to English canonical form using Claude.
    Handles translation, synonyms, and even symptom-to-supplement mapping.
    
    This is critical for "Discovery" phase: ensuring we search PubMed for the correct English term.

    Args:
        query: Raw user query (e.g. "Creatina", "para dormir", "vitamina d3")

    Returns:
        Canonical English name (e.g. "Creatine", "Melatonin", "Vitamin D3")
    """
    global bedrock_runtime, normalization_cache

    query_lower = query.lower().strip()
    
    # Check cache first
    if query_lower in normalization_cache:
        print(f"[NORMALIZE] Cache hit: {query} -> {normalization_cache[query_lower]}")
        return normalization_cache[query_lower]

    try:
        print(f"[NORMALIZE] Normalizing: {query}")

        prompt = f"""Normalize this search query to the standard English scientific or common supplement name.
Rules:
1. Translate to English if in another language (e.g. "Creatina" -> "Creatine").
2. Return the primary active ingredient if it's a brand or complex term.
3. If it's a symptom/goal (e.g. "para dormir"), return the most evidence-backed supplement for it (e.g. "Melatonin").
4. Return ONLY the term, nothing else.

Query: "{query}"

Normalization:"""

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 50,
            "temperature": 0.0,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })

        if bedrock_runtime is None:
             # Initialize if not already (though usually initialize() is called before)
             bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1', config=bedrock_config)

        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=body
        )

        response_body = json.loads(response['body'].read())
        normalized = response_body['content'][0]['text'].strip().strip('"').strip('.')

        # Cache result
        normalization_cache[query_lower] = normalized
        print(f"[NORMALIZE] {query} -> {normalized}")
        
        return normalized

    except Exception as e:
        print(f"[NORMALIZE] Error: {str(e)}, using original query")
        return query


def build_optimized_pubmed_query(query: str) -> str:
    """
    Build optimized PubMed query for faster searches

    Strategy:
    - [UPDATED] Use intelligent normalization (Claude) instead of heuristic translation
    - Use Title/Abstract filter for focused searches
    - Simplify complex queries

    Args:
        query: Raw user query (any language)

    Returns:
        Optimized PubMed query string in English
    """
    # Step 1: Intelligent Normalization (Creatina -> Creatine)
    english_query = normalize_query_intelligent(query)

    # Step 2: Remove common supplement suffixes to avoid redundancy
    clean_query = english_query.replace(" supplement", "").replace(" supplementation", "").strip()

    # Step 3: For simple queries (1-3 words), use Title/Abstract for speed
    word_count = len(clean_query.split())

    if word_count <= 3:
        # Simple query: just search Title/Abstract
        return f'"{clean_query}"[Title/Abstract]'
    else:
        # Complex query: use broader search
        return f'{clean_query} AND (supplement[Title/Abstract] OR supplementation[Title/Abstract])'


def try_sync_discovery(query: str) -> Dict:
    """
    Attempt to discover and index supplement in real-time (synchronous)

    This provides instant results to users instead of requiring them to search again.

    Process:
    1. Query PubMed for study count (optimized query)
    2. If sufficient studies (≥3), add to LanceDB immediately
    3. Return success/failure

    Optimizations:
    - Increased timeout: 8s → 15s
    - Optimized PubMed queries for speed
    - Better error handling

    Returns:
        {
            'success': bool,
            'study_count': int,
            'reason': str,  # if failed
            'message': str
        }
    """
    import requests

    try:
        print(f"[SYNC DISCOVERY] Starting for: {query}")
        start_time = time.time()

        # Generate PubMed query (for metadata)
        pubmed_query = build_optimized_pubmed_query(query)

        # Step 1: Query PubMed for study count (with caching - Phase 2)
        study_count = get_pubmed_count_cached(query)

        elapsed = time.time() - start_time
        print(f"[SYNC DISCOVERY] PubMed results: {study_count} studies ({elapsed:.2f}s)")

        # Step 2: Check minimum threshold
        MIN_STUDIES = int(os.environ.get('MIN_STUDIES', '3'))

        if study_count < MIN_STUDIES:
            print(f"[SYNC DISCOVERY] Insufficient studies: {study_count} < {MIN_STUDIES}")
            return {
                'success': False,
                'study_count': study_count,
                'reason': 'insufficient_studies',
                'message': f'Only {study_count} studies found (minimum: {MIN_STUDIES})'
            }

        # Step 3: Grade evidence based on study count
        if study_count >= 100:
            evidence_grade = 'A'
        elif study_count >= 50:
            evidence_grade = 'B'
        elif study_count >= 10:
            evidence_grade = 'C'
        else:
            evidence_grade = 'D'

        # Step 4: Insert into LanceDB
        print(f"[SYNC DISCOVERY] Adding to LanceDB (grade: {evidence_grade})...")

        db = initialize()

        # Generate embedding
        embedding = get_embedding_bedrock(query)

        # Open table
        table = db.open_table("supplements")

        # Get next ID
        existing = table.to_pandas()
        next_id = existing['id'].max() + 1 if len(existing) > 0 else 1

        # Insert supplement with exact schema match (lines 522-539 from index_from_s3_handler)
        now = time.strftime('%Y-%m-%dT%H:%M:%SZ')

        table.add([{
            'id': int(next_id),
            'name': query,
            'scientific_name': '',
            'common_names': [],
            'vector': embedding,
            'search_count': 0,
            'last_searched_at': now,
            'created_at': now,
            'updated_at': now,
            'metadata': {
                'category': 'auto-discovered',
                'popularity': 'low',
                'evidence_grade': evidence_grade,
                'study_count': study_count,
                'pubmed_query': pubmed_query
            }
        }])

        elapsed = time.time() - start_time
        print(f"[SYNC DISCOVERY] Successfully indexed: {query} (ID: {next_id}, total time: {elapsed:.2f}s)")

        return {
            'success': True,
            'study_count': study_count,
            'evidence_grade': evidence_grade,
            'message': f'Successfully indexed with {study_count} studies'
        }

    except requests.Timeout:
        print(f"[SYNC DISCOVERY] PubMed timeout")
        return {
            'success': False,
            'study_count': 0,
            'reason': 'pubmed_timeout',
            'message': 'PubMed query timed out'
        }
    except Exception as e:
        print(f"[SYNC DISCOVERY] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'study_count': 0,
            'reason': 'error',
            'message': f'Discovery error: {str(e)}'
        }
