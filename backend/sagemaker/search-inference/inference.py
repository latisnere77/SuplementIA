"""
SuplementIA - SageMaker Serverless Inference
Vector search with LanceDB and SentenceTransformer
"""

import json
import os
import time
import hashlib
from typing import List, Dict, Optional
from datetime import datetime

import boto3
from botocore.config import Config
import lancedb
from sentence_transformers import SentenceTransformer

# Configuration
MODEL_NAME = "all-MiniLM-L6-v2"
LANCEDB_PATH = "/tmp/lancedb"
DYNAMODB_CACHE_TABLE = os.environ.get('DYNAMODB_CACHE_TABLE', 'supplement-cache')
SIMILARITY_THRESHOLD = float(os.environ.get('SIMILARITY_THRESHOLD', '0.85'))

# Optimized boto3 configuration
boto_config = Config(
    max_pool_connections=50,
    retries={'max_attempts': 3, 'mode': 'adaptive'},
    connect_timeout=5,
    read_timeout=10
)

# Global state (loaded at startup)
model = None
db = None
dynamodb = None
cache_table = None


def log_structured(event_type: str, **kwargs):
    """Structured logging for CloudWatch"""
    log_entry = {
        'timestamp': time.time(),
        'event_type': event_type,
        **kwargs
    }
    print(json.dumps(log_entry))


def convert_decimals_to_floats(obj):
    """Convert DynamoDB Decimal types to Python floats for JSON serialization"""
    from decimal import Decimal
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals_to_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals_to_floats(item) for item in obj]
    return obj


def get_supplements_seed_data():
    """Return the full list of supplements for seeding"""
    return [
        # Vitamins
        {"name": "Vitamin D", "scientific_name": "Cholecalciferol", "common_names": ["Vitamina D", "D3", "Vitamina D3", "Colecalciferol"], "category": "vitamin"},
        {"name": "Vitamin C", "scientific_name": "Ascorbic Acid", "common_names": ["Vitamina C", "Acido Ascorbico", "Acido Ascorbico"], "category": "vitamin"},
        {"name": "Vitamin B12", "scientific_name": "Cobalamin", "common_names": ["Vitamina B12", "B12", "Cobalamina", "Cianocobalamina"], "category": "vitamin"},
        {"name": "Vitamin B6", "scientific_name": "Pyridoxine", "common_names": ["Vitamina B6", "B6", "Piridoxina"], "category": "vitamin"},
        {"name": "Vitamin B1", "scientific_name": "Thiamine", "common_names": ["Vitamina B1", "B1", "Tiamina"], "category": "vitamin"},
        {"name": "Vitamin B2", "scientific_name": "Riboflavin", "common_names": ["Vitamina B2", "B2", "Riboflavina"], "category": "vitamin"},
        {"name": "Vitamin B3", "scientific_name": "Niacin", "common_names": ["Vitamina B3", "B3", "Niacina", "Acido Nicotinico"], "category": "vitamin"},
        {"name": "Vitamin B5", "scientific_name": "Pantothenic Acid", "common_names": ["Vitamina B5", "B5", "Acido Pantotenico"], "category": "vitamin"},
        {"name": "Vitamin B7", "scientific_name": "Biotin", "common_names": ["Vitamina B7", "Biotina", "Vitamina H"], "category": "vitamin"},
        {"name": "Vitamin B9", "scientific_name": "Folic Acid", "common_names": ["Vitamina B9", "Acido Folico", "Folato", "Acido Folico"], "category": "vitamin"},
        {"name": "Vitamin A", "scientific_name": "Retinol", "common_names": ["Vitamina A", "Retinol", "Beta Caroteno", "Betacaroteno"], "category": "vitamin"},
        {"name": "Vitamin E", "scientific_name": "Tocopherol", "common_names": ["Vitamina E", "Tocoferol", "Alfa Tocoferol"], "category": "vitamin"},
        {"name": "Vitamin K", "scientific_name": "Phylloquinone", "common_names": ["Vitamina K", "K1", "K2", "Filoquinona", "Menaquinona"], "category": "vitamin"},
        # Minerals
        {"name": "Magnesium", "scientific_name": "Magnesium", "common_names": ["Magnesio", "Citrato de Magnesio", "Glicinato de Magnesio", "Oxido de Magnesio"], "category": "mineral"},
        {"name": "Zinc", "scientific_name": "Zinc", "common_names": ["Zinc", "Cinc", "Picolinato de Zinc", "Gluconato de Zinc"], "category": "mineral"},
        {"name": "Calcium", "scientific_name": "Calcium", "common_names": ["Calcio", "Carbonato de Calcio", "Citrato de Calcio"], "category": "mineral"},
        {"name": "Iron", "scientific_name": "Iron", "common_names": ["Hierro", "Sulfato de Hierro", "Fumarato de Hierro", "Bisglicinato de Hierro"], "category": "mineral"},
        {"name": "Potassium", "scientific_name": "Potassium", "common_names": ["Potasio", "Cloruro de Potasio", "Citrato de Potasio"], "category": "mineral"},
        {"name": "Selenium", "scientific_name": "Selenium", "common_names": ["Selenio", "Selenometionina"], "category": "mineral"},
        {"name": "Copper", "scientific_name": "Copper", "common_names": ["Cobre", "Gluconato de Cobre"], "category": "mineral"},
        {"name": "Manganese", "scientific_name": "Manganese", "common_names": ["Manganeso"], "category": "mineral"},
        {"name": "Chromium", "scientific_name": "Chromium", "common_names": ["Cromo", "Picolinato de Cromo"], "category": "mineral"},
        {"name": "Iodine", "scientific_name": "Iodine", "common_names": ["Yodo", "Yoduro de Potasio"], "category": "mineral"},
        # Fatty Acids
        {"name": "Omega-3", "scientific_name": "Omega-3 Fatty Acids", "common_names": ["Omega 3", "Aceite de Pescado", "Fish Oil", "EPA", "DHA", "Acidos Grasos Omega 3"], "category": "fatty-acid"},
        {"name": "Omega-6", "scientific_name": "Omega-6 Fatty Acids", "common_names": ["Omega 6", "Acido Linoleico", "GLA"], "category": "fatty-acid"},
        {"name": "Omega-9", "scientific_name": "Omega-9 Fatty Acids", "common_names": ["Omega 9", "Acido Oleico"], "category": "fatty-acid"},
        # Adaptogens
        {"name": "Ashwagandha", "scientific_name": "Withania somnifera", "common_names": ["Ashwagandha", "Ginseng Indio", "Withania", "Bufera"], "category": "adaptogen"},
        {"name": "Rhodiola", "scientific_name": "Rhodiola rosea", "common_names": ["Rhodiola", "Rodiola", "Raiz de Oro", "Raiz Artica"], "category": "adaptogen"},
        {"name": "Ginseng", "scientific_name": "Panax ginseng", "common_names": ["Ginseng", "Ginseng Coreano", "Ginseng Rojo", "Panax"], "category": "adaptogen"},
        {"name": "Maca", "scientific_name": "Lepidium meyenii", "common_names": ["Maca", "Maca Peruana", "Maca Andina", "Ginseng Peruano"], "category": "adaptogen"},
        {"name": "Holy Basil", "scientific_name": "Ocimum tenuiflorum", "common_names": ["Tulsi", "Albahaca Sagrada", "Holy Basil"], "category": "adaptogen"},
        # Antioxidants
        {"name": "Curcumin", "scientific_name": "Curcuma longa", "common_names": ["Curcuma", "Curcuma", "Turmeric", "Curcumina"], "category": "antioxidant"},
        {"name": "Resveratrol", "scientific_name": "Resveratrol", "common_names": ["Resveratrol", "Extracto de Uva"], "category": "antioxidant"},
        {"name": "CoQ10", "scientific_name": "Coenzyme Q10", "common_names": ["CoQ10", "Coenzima Q10", "Ubiquinol", "Ubiquinona"], "category": "antioxidant"},
        {"name": "Alpha Lipoic Acid", "scientific_name": "Alpha Lipoic Acid", "common_names": ["Acido Alfa Lipoico", "ALA", "Acido Alfa Lipoico"], "category": "antioxidant"},
        {"name": "Glutathione", "scientific_name": "Glutathione", "common_names": ["Glutation", "Glutation", "GSH"], "category": "antioxidant"},
        {"name": "Quercetin", "scientific_name": "Quercetin", "common_names": ["Quercetina", "Quercetin"], "category": "antioxidant"},
        # Sleep & Relaxation
        {"name": "Melatonin", "scientific_name": "Melatonin", "common_names": ["Melatonina", "Hormona del Sueno"], "category": "sleep"},
        {"name": "GABA", "scientific_name": "Gamma-Aminobutyric Acid", "common_names": ["GABA", "Acido Gamma-Aminobutirico"], "category": "sleep"},
        {"name": "L-Theanine", "scientific_name": "L-Theanine", "common_names": ["L-Teanina", "Teanina", "Theanine"], "category": "sleep"},
        {"name": "Valerian", "scientific_name": "Valeriana officinalis", "common_names": ["Valeriana", "Valerian", "Raiz de Valeriana"], "category": "sleep"},
        {"name": "Passionflower", "scientific_name": "Passiflora incarnata", "common_names": ["Pasiflora", "Pasionaria", "Flor de la Pasion", "Passionflower"], "category": "sleep"},
        {"name": "Chamomile", "scientific_name": "Matricaria chamomilla", "common_names": ["Manzanilla", "Camomila", "Chamomile"], "category": "sleep"},
        # Performance & Energy
        {"name": "Creatine", "scientific_name": "Creatine monohydrate", "common_names": ["Creatina", "Creatine", "Monohidrato de Creatina"], "category": "performance"},
        {"name": "Caffeine", "scientific_name": "Caffeine", "common_names": ["Cafeina", "Cafeina", "Caffeine"], "category": "performance"},
        {"name": "Beta-Alanine", "scientific_name": "Beta-Alanine", "common_names": ["Beta Alanina", "Beta-Alanina"], "category": "performance"},
        {"name": "L-Carnitine", "scientific_name": "L-Carnitine", "common_names": ["L-Carnitina", "Carnitina", "Acetil L-Carnitina", "ALCAR"], "category": "performance"},
        {"name": "Citrulline", "scientific_name": "L-Citrulline", "common_names": ["Citrulina", "L-Citrulina", "Malato de Citrulina"], "category": "performance"},
        # Protein & Amino Acids
        {"name": "Collagen", "scientific_name": "Collagen peptides", "common_names": ["Colageno", "Colageno", "Collagen", "Peptidos de Colageno", "Colageno Hidrolizado"], "category": "protein"},
        {"name": "Whey Protein", "scientific_name": "Whey Protein", "common_names": ["Proteina de Suero", "Whey", "Proteina Whey", "Suero de Leche"], "category": "protein"},
        {"name": "BCAAs", "scientific_name": "Branched-Chain Amino Acids", "common_names": ["BCAA", "BCAAs", "Aminoacidos Ramificados", "Leucina Isoleucina Valina"], "category": "protein"},
        {"name": "L-Glutamine", "scientific_name": "L-Glutamine", "common_names": ["Glutamina", "L-Glutamina", "Glutamine"], "category": "protein"},
        {"name": "Glycine", "scientific_name": "Glycine", "common_names": ["Glicina", "Glycine"], "category": "protein"},
        # Digestive Health
        {"name": "Probiotics", "scientific_name": "Various strains", "common_names": ["Probioticos", "Probioticos", "Flora Intestinal", "Lactobacillus", "Bifidobacterium"], "category": "digestive"},
        {"name": "Prebiotics", "scientific_name": "Prebiotic Fiber", "common_names": ["Prebioticos", "Prebioticos", "Fibra Prebiotica", "Inulina", "FOS"], "category": "digestive"},
        {"name": "Digestive Enzymes", "scientific_name": "Digestive Enzymes", "common_names": ["Enzimas Digestivas", "Enzimas", "Lipasa", "Amilasa", "Proteasa"], "category": "digestive"},
        {"name": "Psyllium", "scientific_name": "Plantago ovata", "common_names": ["Psyllium", "Psilio", "Cascara de Psyllium", "Fibra de Psyllium"], "category": "digestive"},
        # Joint & Bone Health
        {"name": "Glucosamine", "scientific_name": "Glucosamine", "common_names": ["Glucosamina", "Sulfato de Glucosamina"], "category": "joint"},
        {"name": "Chondroitin", "scientific_name": "Chondroitin Sulfate", "common_names": ["Condroitina", "Sulfato de Condroitina", "Chondroitin"], "category": "joint"},
        {"name": "MSM", "scientific_name": "Methylsulfonylmethane", "common_names": ["MSM", "Metilsulfonilmetano", "Azufre Organico"], "category": "joint"},
        {"name": "Hyaluronic Acid", "scientific_name": "Hyaluronic Acid", "common_names": ["Acido Hialuronico", "Acido Hialuronico", "Hialuronato"], "category": "joint"},
        # Brain & Cognitive
        {"name": "Lion's Mane", "scientific_name": "Hericium erinaceus", "common_names": ["Melena de Leon", "Lion's Mane", "Hericium", "Yamabushitake"], "category": "nootropic"},
        {"name": "Bacopa", "scientific_name": "Bacopa monnieri", "common_names": ["Bacopa", "Brahmi", "Bacopa Monnieri"], "category": "nootropic"},
        {"name": "Ginkgo Biloba", "scientific_name": "Ginkgo biloba", "common_names": ["Ginkgo", "Ginkgo Biloba", "Arbol de los Cuarenta Escudos"], "category": "nootropic"},
        {"name": "Phosphatidylserine", "scientific_name": "Phosphatidylserine", "common_names": ["Fosfatidilserina", "PS", "Phosphatidylserine"], "category": "nootropic"},
        # Herbs & Botanicals
        {"name": "Echinacea", "scientific_name": "Echinacea purpurea", "common_names": ["Equinacea", "Echinacea", "Equinacea"], "category": "herb"},
        {"name": "Elderberry", "scientific_name": "Sambucus nigra", "common_names": ["Sauco", "Elderberry", "Baya de Sauco", "Sambucus"], "category": "herb"},
        {"name": "Milk Thistle", "scientific_name": "Silybum marianum", "common_names": ["Cardo Mariano", "Milk Thistle", "Silimarina"], "category": "herb"},
        {"name": "Saw Palmetto", "scientific_name": "Serenoa repens", "common_names": ["Saw Palmetto", "Palma Enana", "Serenoa"], "category": "herb"},
        {"name": "St. John's Wort", "scientific_name": "Hypericum perforatum", "common_names": ["Hierba de San Juan", "Hiperico", "St. John's Wort"], "category": "herb"},
        {"name": "Green Tea Extract", "scientific_name": "Camellia sinensis", "common_names": ["Extracto de Te Verde", "EGCG", "Te Verde", "Catequinas"], "category": "herb"},
        {"name": "Spirulina", "scientific_name": "Arthrospira platensis", "common_names": ["Espirulina", "Spirulina", "Alga Espirulina"], "category": "herb"},
        {"name": "Chlorella", "scientific_name": "Chlorella vulgaris", "common_names": ["Clorela", "Chlorella", "Alga Clorela"], "category": "herb"},
        {"name": "Moringa", "scientific_name": "Moringa oleifera", "common_names": ["Moringa", "Arbol de la Vida", "Moringa Oleifera"], "category": "herb"},
        {"name": "Turmeric", "scientific_name": "Curcuma longa", "common_names": ["Curcuma", "Turmeric", "Raiz de Curcuma"], "category": "herb"},
        {"name": "Ginger", "scientific_name": "Zingiber officinale", "common_names": ["Jengibre", "Ginger", "Raiz de Jengibre"], "category": "herb"},
        {"name": "Garlic", "scientific_name": "Allium sativum", "common_names": ["Ajo", "Garlic", "Extracto de Ajo", "Allicina"], "category": "herb"},
    ]


def ensure_table_exists():
    """Ensure supplements table exists, create with seed data if not"""
    global db, model

    EXPECTED_COUNT = 75

    try:
        table = db.open_table("supplements")
        row_count = table.count_rows()

        if row_count < EXPECTED_COUNT:
            log_structured('table_outdated', current_count=row_count, expected=EXPECTED_COUNT, recreating=True)
            db.drop_table("supplements")
            raise Exception("Table outdated, recreating")

        log_structured('table_exists', name='supplements', row_count=row_count)
        return table
    except Exception as e:
        log_structured('table_not_found', creating=True, error=str(e))

        supplements = get_supplements_seed_data()
        data = []

        for idx, supp in enumerate(supplements, 1):
            search_text = f"{supp['name']} {supp['scientific_name']} {' '.join(supp['common_names'])}"
            embedding = model.encode(search_text).tolist()

            data.append({
                'id': idx,
                'name': supp['name'],
                'scientific_name': supp['scientific_name'],
                'common_names': supp['common_names'],
                'vector': embedding,
                'metadata': {'category': supp['category'], 'evidence_grade': 'A', 'study_count': 100},
                'search_count': 0,
                'created_at': datetime.now().isoformat(),
            })

        table = db.create_table('supplements', data=data, mode='overwrite')
        log_structured('table_created', records=len(data))
        return table


def model_fn(model_dir):
    """
    Load model - called by SageMaker at startup
    This is where model loading happens (eliminates cold start on invocations)
    """
    global model, db, dynamodb, cache_table

    log_structured('model_fn_start', model_dir=model_dir)
    start_time = time.time()

    # Load SentenceTransformer model
    log_structured('loading_sentence_transformer')
    model = SentenceTransformer(MODEL_NAME)
    model_load_time = time.time() - start_time
    log_structured('model_loaded', duration_s=model_load_time)

    # Initialize LanceDB
    log_structured('initializing_lancedb', path=LANCEDB_PATH)
    db = lancedb.connect(LANCEDB_PATH)

    # Ensure table exists (create with embeddings if needed)
    ensure_table_exists()

    # Initialize DynamoDB
    dynamodb = boto3.resource('dynamodb', config=boto_config)
    cache_table = dynamodb.Table(DYNAMODB_CACHE_TABLE)

    total_time = time.time() - start_time
    log_structured('model_fn_complete', total_duration_s=total_time)

    return model


def input_fn(request_body, request_content_type):
    """Parse input data"""
    if request_content_type == 'application/json':
        return json.loads(request_body)
    raise ValueError(f"Unsupported content type: {request_content_type}")


def predict_fn(input_data, model):
    """
    Main prediction function
    """
    global db, cache_table

    request_start = time.time()

    query = input_data.get('query', '').strip()
    if not query:
        return {
            'success': False,
            'error': 'Empty query',
            'message': 'Query parameter cannot be empty'
        }

    if len(query) > 200:
        return {
            'success': False,
            'error': 'Query too long',
            'message': 'Query must be less than 200 characters'
        }

    limit = int(input_data.get('limit', 5))

    log_structured('search_request', query=query, limit=limit)

    # Generate query hash for caching
    query_hash = hashlib.sha256(query.lower().encode()).hexdigest()[:16]

    # Check cache
    try:
        cache_response = cache_table.get_item(
            Key={'PK': f'SUPPLEMENT#{query_hash}', 'SK': 'QUERY'}
        )
        if 'Item' in cache_response:
            cached_data = convert_decimals_to_floats(cache_response['Item'].get('supplementData'))
            request_time = (time.time() - request_start) * 1000
            log_structured('cache_hit', query_hash=query_hash, latency_ms=request_time)
            return {
                'success': True,
                'supplement': cached_data,
                'cacheHit': True,
                'source': 'dynamodb',
                'latency_ms': round(request_time, 2)
            }
    except Exception as e:
        log_structured('cache_error', error=str(e))

    # Generate embedding
    embedding_start = time.time()
    embedding = model.encode(query).tolist()
    embedding_time = (time.time() - embedding_start) * 1000
    log_structured('embedding_generated', duration_ms=embedding_time)

    # Search LanceDB
    search_start = time.time()
    table = ensure_table_exists()

    results = (
        table.search(embedding)
        .metric("cosine")
        .limit(limit)
        .to_list()
    )

    search_time = (time.time() - search_start) * 1000
    log_structured('lancedb_search_complete', duration_ms=search_time, results_count=len(results))

    # Filter by similarity threshold
    filtered_results = [
        r for r in results
        if (1 - r.get('_distance', 1)) >= SIMILARITY_THRESHOLD
    ]

    if not filtered_results:
        # Add to discovery queue
        try:
            discovery_table = dynamodb.Table('discovery-queue')
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
            log_structured('discovery_queued', query=query)
        except Exception as e:
            log_structured('discovery_queue_error', error=str(e))

        request_time = (time.time() - request_start) * 1000
        return {
            'success': False,
            'message': 'Supplement not found',
            'query': query,
            'suggestion': 'This supplement has been added to our discovery queue',
            'latency_ms': round(request_time, 2)
        }

    # Get best match
    best_match = filtered_results[0]
    similarity = 1 - best_match.get('_distance', 1)

    supplement_data = {
        'id': best_match.get('id'),
        'name': best_match.get('name'),
        'scientificName': best_match.get('scientific_name'),
        'commonNames': best_match.get('common_names', []),
        'metadata': best_match.get('metadata', {}),
        'similarity': round(similarity, 3)
    }

    # Store in cache
    try:
        from decimal import Decimal
        ttl = int(time.time()) + (7 * 24 * 60 * 60)

        def convert_floats(obj):
            if isinstance(obj, float):
                return Decimal(str(round(obj, 6)))
            elif isinstance(obj, dict):
                return {k: convert_floats(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_floats(item) for item in obj]
            return obj

        cache_table.put_item(
            Item={
                'PK': f'SUPPLEMENT#{query_hash}',
                'SK': 'QUERY',
                'supplementData': convert_floats(supplement_data),
                'ttl': ttl,
                'searchCount': 1,
                'lastAccessed': int(time.time())
            }
        )
        log_structured('cache_stored', query_hash=query_hash)
    except Exception as e:
        log_structured('cache_store_error', error=str(e))

    request_time = (time.time() - request_start) * 1000
    log_structured('request_complete', duration_ms=request_time, similarity=similarity)

    return {
        'success': True,
        'supplement': supplement_data,
        'cacheHit': False,
        'source': 'lancedb',
        'alternativeMatches': len(filtered_results) - 1,
        'latency_ms': round(request_time, 2)
    }


def output_fn(prediction, accept):
    """Format output"""
    if accept == 'application/json':
        return json.dumps(prediction), 'application/json'
    raise ValueError(f"Unsupported accept type: {accept}")
