#!/usr/bin/env python3
"""
Pre-load Common Supplements to PubMed Cache

This script populates the DynamoDB cache with PubMed study counts for the most
commonly searched supplements. This eliminates first-search delays for popular queries.

Usage:
    python3 preload-common-supplements.py [--limit N] [--dry-run]

Requirements:
    - AWS credentials configured (same as Lambda)
    - boto3, requests installed
    - DynamoDB table 'pubmed-cache' exists
"""

import sys
import os
import time
import json
import argparse
from typing import List, Dict
from datetime import datetime

# Add Lambda directory to path to import functions
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'search-api-lancedb'))

# Import Lambda functions
try:
    import boto3
    import requests
    from botocore.exceptions import ClientError
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install with: pip install boto3 requests")
    sys.exit(1)

# Top 100 most commonly searched supplements (curated from research + user behavior)
COMMON_SUPPLEMENTS = [
    # Tier 1: Essential & Very Popular (searched daily)
    "Vitamin D", "Vitamin C", "Omega-3", "Magnesium", "Zinc",
    "Vitamin B12", "Iron", "Calcium", "Fish Oil", "Multivitamin",

    # Tier 2: Popular Nootropics & Longevity (searched frequently)
    "Creatine", "Ashwagandha", "Melatonin", "CoQ10", "Curcumin",
    "Resveratrol", "Quercetin", "NAC", "Glutathione", "Alpha-GPC",

    # Tier 3: Longevity & Biohacking (growing interest)
    "NMN", "NR", "Pterostilbene", "Sulforaphane", "Apigenin",
    "Fisetin", "Spermidine", "Berberine", "Metformin", "Rapamycin",

    # Tier 4: Sports & Performance
    "Protein", "BCAAs", "Beta-Alanine", "Citrulline", "L-Carnitine",
    "Taurine", "HMB", "Glutamine", "Arginine", "Leucine",

    # Tier 5: Cognitive Enhancement
    "Lion's Mane", "Bacopa Monnieri", "Rhodiola", "Ginkgo Biloba", "Phosphatidylserine",
    "Acetyl-L-Carnitine", "L-Theanine", "Caffeine", "Huperzine A", "Phenylpiracetam",

    # Tier 6: Metabolic & Hormonal
    "Berberine", "Chromium", "ALA", "Biotin", "Folate",
    "Vitamin K2", "Boron", "DHEA", "Pregnenolone", "Tribulus",

    # Tier 7: Joint & Bone Health
    "Glucosamine", "Chondroitin", "MSM", "Collagen", "Hyaluronic Acid",
    "Vitamin K", "Strontium", "Silicon", "Boswellia", "Turmeric",

    # Tier 8: Gut Health & Digestion
    "Probiotics", "Prebiotics", "Digestive Enzymes", "L-Glutamine", "Psyllium",
    "Aloe Vera", "Ginger", "Peppermint", "Slippery Elm", "Marshmallow Root",

    # Tier 9: Cardiovascular
    "Garlic", "Hawthorn", "Nattokinase", "Red Yeast Rice", "Policosanol",
    "Grape Seed Extract", "Pine Bark Extract", "Tocotrienols", "Niacin", "Guggul",

    # Tier 10: Mood & Stress
    "5-HTP", "SAMe", "St. John's Wort", "Kava", "Valerian",
    "Passionflower", "Lemon Balm", "Chamomile", "Mucuna Pruriens", "L-Tyrosine",
]

def build_optimized_pubmed_query(query: str) -> str:
    """
    Build optimized PubMed query for faster searches
    (Copied from lambda_function.py)
    """
    clean_query = query.replace(" supplement", "").replace(" supplementation", "").strip()
    word_count = len(clean_query.split())

    if word_count <= 3:
        return f'"{clean_query}"[Title/Abstract]'
    else:
        return f'{clean_query} AND (supplement[Title/Abstract] OR supplementation[Title/Abstract])'


def get_pubmed_count(query: str, api_key: str = None) -> int:
    """
    Query PubMed API for study count
    """
    pubmed_query = build_optimized_pubmed_query(query)

    params = {
        'db': 'pubmed',
        'term': pubmed_query,
        'retmode': 'json',
        'retmax': 0,
    }

    if api_key:
        params['api_key'] = api_key

    try:
        response = requests.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
            params=params,
            timeout=20
        )

        data = response.json()
        count = int(data.get('esearchresult', {}).get('count', 0))
        return count

    except requests.Timeout:
        print(f"  ⏱️  PubMed timeout for: {query}")
        return -1
    except Exception as e:
        print(f"  ❌ PubMed error for {query}: {e}")
        return -1


def cache_pubmed_count(query: str, count: int, pubmed_query: str, dynamodb_table) -> bool:
    """
    Store PubMed count in DynamoDB cache with 30-day TTL
    """
    cache_key = query.lower().strip()
    ttl = int(time.time()) + (30 * 24 * 60 * 60)  # 30 days

    try:
        dynamodb_table.put_item(
            Item={
                'query': cache_key,
                'count': count,
                'pubmed_query': pubmed_query,
                'ttl': ttl,
                'cached_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'source': 'preload-script',
            }
        )
        return True
    except Exception as e:
        print(f"  ❌ Cache write error for {query}: {e}")
        return False


def preload_supplements(
    supplements: List[str],
    dry_run: bool = False,
    delay: float = 0.5,
    pubmed_api_key: str = None
) -> Dict:
    """
    Pre-load supplements to DynamoDB cache

    Args:
        supplements: List of supplement names to pre-load
        dry_run: If True, only query PubMed without caching
        delay: Delay between PubMed requests (to respect rate limits)
        pubmed_api_key: Optional PubMed API key for higher rate limits

    Returns:
        Statistics dictionary
    """
    stats = {
        'total': len(supplements),
        'cached': 0,
        'skipped': 0,
        'errors': 0,
        'total_studies': 0,
        'start_time': datetime.now(),
    }

    # Initialize DynamoDB
    if not dry_run:
        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('pubmed-cache')
            print(f"✅ Connected to DynamoDB table: pubmed-cache\n")
        except Exception as e:
            print(f"❌ Failed to connect to DynamoDB: {e}")
            return stats
    else:
        table = None
        print("🔍 DRY RUN MODE - Will not write to cache\n")

    # Process each supplement
    print(f"Processing {len(supplements)} supplements...\n")

    for i, supplement in enumerate(supplements, 1):
        print(f"[{i}/{len(supplements)}] {supplement}")

        # Query PubMed
        count = get_pubmed_count(supplement, pubmed_api_key)

        if count == -1:
            stats['errors'] += 1
            continue

        if count == 0:
            print(f"  ⏭️  No studies found (skipping)")
            stats['skipped'] += 1
            continue

        stats['total_studies'] += count

        # Cache result
        if not dry_run:
            pubmed_query = build_optimized_pubmed_query(supplement)
            success = cache_pubmed_count(supplement, count, pubmed_query, table)

            if success:
                print(f"  ✅ Cached: {count} studies")
                stats['cached'] += 1
            else:
                stats['errors'] += 1
        else:
            print(f"  🔍 Found: {count} studies (not cached - dry run)")
            stats['cached'] += 1

        # Respect PubMed rate limits
        # With API key: 10 requests/second
        # Without API key: 3 requests/second
        if i < len(supplements):
            time.sleep(delay)

    stats['end_time'] = datetime.now()
    stats['duration'] = (stats['end_time'] - stats['start_time']).total_seconds()

    return stats


def print_stats(stats: Dict):
    """
    Print pre-loading statistics
    """
    print("\n" + "="*60)
    print("📊 PRE-LOADING STATISTICS")
    print("="*60)
    print(f"Total supplements:    {stats['total']}")
    print(f"✅ Successfully cached: {stats['cached']}")
    print(f"⏭️  Skipped (0 studies):  {stats['skipped']}")
    print(f"❌ Errors:              {stats['errors']}")
    print(f"📚 Total studies:       {stats['total_studies']:,}")
    print(f"⏱️  Duration:            {stats['duration']:.1f}s")
    print(f"⚡ Avg per supplement:  {stats['duration']/stats['total']:.2f}s")
    print("="*60)

    if stats['cached'] > 0:
        print(f"\n✅ Cache populated with {stats['cached']} supplements")
        print(f"💾 Estimated cache size: {stats['cached'] * 0.5:.2f} KB")
        print(f"💰 Estimated monthly cost: $0.{int(stats['cached'] * 0.00025 * 1000):03d}")


def main():
    parser = argparse.ArgumentParser(
        description='Pre-load common supplements to PubMed cache'
    )
    parser.add_argument(
        '--limit', '-l',
        type=int,
        default=100,
        help='Maximum number of supplements to pre-load (default: 100)'
    )
    parser.add_argument(
        '--dry-run', '-d',
        action='store_true',
        help='Query PubMed without caching results'
    )
    parser.add_argument(
        '--delay', '-t',
        type=float,
        default=0.5,
        help='Delay between PubMed requests in seconds (default: 0.5)'
    )
    parser.add_argument(
        '--api-key', '-k',
        type=str,
        default=None,
        help='PubMed API key for higher rate limits'
    )

    args = parser.parse_args()

    # Limit supplements list
    supplements_to_process = COMMON_SUPPLEMENTS[:args.limit]

    print("="*60)
    print("🚀 SUPPLEMENT PRE-LOADING SCRIPT")
    print("="*60)
    print(f"Supplements to process: {len(supplements_to_process)}")
    print(f"Dry run mode: {args.dry_run}")
    print(f"Delay between requests: {args.delay}s")
    print(f"PubMed API key: {'Yes' if args.api_key else 'No'}")
    print(f"Estimated duration: {len(supplements_to_process) * (args.delay + 2):.0f}s")
    print("="*60)

    # Confirm before proceeding
    if not args.dry_run:
        response = input("\n⚠️  This will write to DynamoDB. Continue? (y/N): ")
        if response.lower() != 'y':
            print("❌ Aborted")
            return

    print()

    # Run pre-loading
    stats = preload_supplements(
        supplements_to_process,
        dry_run=args.dry_run,
        delay=args.delay,
        pubmed_api_key=args.api_key
    )

    # Print results
    print_stats(stats)

    # Save detailed results
    if not args.dry_run:
        results_file = f'/tmp/preload-results-{int(time.time())}.json'
        with open(results_file, 'w') as f:
            json.dump({
                **stats,
                'start_time': stats['start_time'].isoformat(),
                'end_time': stats['end_time'].isoformat(),
            }, f, indent=2)
        print(f"\n📄 Detailed results saved to: {results_file}")


if __name__ == '__main__':
    main()
