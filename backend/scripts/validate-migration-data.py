#!/usr/bin/env python3
"""
Validate Migration Data Export

This script validates the legacy supplement data export without requiring LanceDB.
It checks:
1. Data completeness (all 39 supplements present)
2. Data format correctness
3. Required fields present
4. Embedding generation readiness

This can run locally without EFS or LanceDB infrastructure.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any

# Configuration
SUPPLEMENTS_EXPORT_PATH = Path(__file__).parent.parent.parent / 'infrastructure' / 'migrations' / 'supplements-export.json'
EXPECTED_MIN_SUPPLEMENTS = 39  # Based on the export file


def load_supplements() -> List[Dict[str, Any]]:
    """Load supplements from export file"""
    print(f"📂 Loading supplements from {SUPPLEMENTS_EXPORT_PATH}...")
    
    if not SUPPLEMENTS_EXPORT_PATH.exists():
        raise FileNotFoundError(f"Supplements export file not found: {SUPPLEMENTS_EXPORT_PATH}")
    
    with open(SUPPLEMENTS_EXPORT_PATH, 'r', encoding='utf-8') as f:
        supplements = json.load(f)
    
    print(f"✅ Loaded {len(supplements)} supplements")
    return supplements


def validate_data_completeness(supplements: List[Dict[str, Any]]) -> None:
    """Validate that we have the expected number of supplements"""
    print(f"\n🔍 Validating data completeness...")
    
    count = len(supplements)
    print(f"   Found: {count} supplements")
    print(f"   Expected: >= {EXPECTED_MIN_SUPPLEMENTS} supplements")
    
    if count < EXPECTED_MIN_SUPPLEMENTS:
        raise ValueError(f"Insufficient supplements: expected >= {EXPECTED_MIN_SUPPLEMENTS}, got {count}")
    
    print(f"✅ Data completeness validated")


def validate_data_format(supplements: List[Dict[str, Any]]) -> None:
    """Validate that all supplements have required fields"""
    print(f"\n🔍 Validating data format...")
    
    required_fields = ['name', 'scientific_name', 'common_names', 'metadata', 'created_at', 'updated_at']
    
    errors = []
    
    for i, supplement in enumerate(supplements):
        missing_fields = [field for field in required_fields if field not in supplement]
        
        if missing_fields:
            errors.append(f"Supplement {i} ({supplement.get('name', 'UNKNOWN')}): missing fields {missing_fields}")
        
        # Validate common_names is a list
        if 'common_names' in supplement and not isinstance(supplement['common_names'], list):
            errors.append(f"Supplement {i} ({supplement.get('name', 'UNKNOWN')}): common_names must be a list")
        
        # Validate metadata is a dict
        if 'metadata' in supplement and not isinstance(supplement['metadata'], dict):
            errors.append(f"Supplement {i} ({supplement.get('name', 'UNKNOWN')}): metadata must be a dict")
    
    if errors:
        print(f"❌ Format validation failed:")
        for error in errors:
            print(f"   - {error}")
        raise ValueError(f"Format validation failed with {len(errors)} errors")
    
    print(f"✅ Data format validated for all {len(supplements)} supplements")


def validate_embedding_readiness(supplements: List[Dict[str, Any]]) -> None:
    """Validate that supplements are ready for embedding generation"""
    print(f"\n🔍 Validating embedding readiness...")
    
    errors = []
    
    for i, supplement in enumerate(supplements):
        name = supplement.get('name', '')
        scientific_name = supplement.get('scientific_name', '')
        common_names = supplement.get('common_names', [])
        
        # Check that we have at least one text field for embedding
        has_text = bool(name or scientific_name or common_names)
        
        if not has_text:
            errors.append(f"Supplement {i}: no text available for embedding generation")
        
        # Validate that embedding field is null (will be generated)
        if supplement.get('embedding') is not None:
            print(f"   ⚠️  Supplement {i} ({name}): already has embedding (will be regenerated)")
    
    if errors:
        print(f"❌ Embedding readiness validation failed:")
        for error in errors:
            print(f"   - {error}")
        raise ValueError(f"Embedding readiness validation failed with {len(errors)} errors")
    
    print(f"✅ All {len(supplements)} supplements ready for embedding generation")


def generate_statistics(supplements: List[Dict[str, Any]]) -> None:
    """Generate statistics about the supplements"""
    print(f"\n📊 Supplement Statistics:")
    
    # Count by category
    categories = {}
    for supplement in supplements:
        category = supplement.get('metadata', {}).get('category', 'unknown')
        categories[category] = categories.get(category, 0) + 1
    
    print(f"\n   By Category:")
    for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"     {category}: {count}")
    
    # Count by popularity
    popularity = {}
    for supplement in supplements:
        pop = supplement.get('metadata', {}).get('popularity', 'unknown')
        popularity[pop] = popularity.get(pop, 0) + 1
    
    print(f"\n   By Popularity:")
    for pop, count in sorted(popularity.items(), key=lambda x: x[1], reverse=True):
        print(f"     {pop}: {count}")
    
    # Sample supplements
    print(f"\n   Sample Supplements:")
    for supplement in supplements[:5]:
        name = supplement['name']
        scientific = supplement.get('scientific_name', 'N/A')
        common = ', '.join(supplement.get('common_names', [])[:2])
        print(f"     - {name} ({scientific})")
        if common:
            print(f"       Common names: {common}")


def main():
    """Main validation function"""
    print("=" * 70)
    print("🔍 Validating Migration Data Export")
    print("=" * 70)
    
    try:
        # Load supplements
        supplements = load_supplements()
        
        # Run validations
        validate_data_completeness(supplements)
        validate_data_format(supplements)
        validate_embedding_readiness(supplements)
        
        # Generate statistics
        generate_statistics(supplements)
        
        # Success!
        print("\n" + "=" * 70)
        print("✅ All validations passed!")
        print("=" * 70)
        print(f"   Total supplements: {len(supplements)}")
        print(f"   Export file: {SUPPLEMENTS_EXPORT_PATH}")
        print(f"   Ready for migration to LanceDB")
        print("=" * 70)
        
        return 0
        
    except Exception as e:
        print("\n" + "=" * 70)
        print(f"❌ Validation failed: {e}")
        print("=" * 70)
        return 1


if __name__ == '__main__':
    sys.exit(main())
