#!/usr/bin/env python3
"""
Property-Based Tests for Data Migration

Tests migration correctness properties:
- Property 19: Migration Vector Dimensions
- Property 20: Migrated Supplement Searchability

**Feature: system-completion-audit, Property 19: Migration Vector Dimensions**
**Feature: system-completion-audit, Property 20: Migrated Supplement Searchability**
"""

import os
import sys
import json
import pytest
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import lancedb
    from sentence_transformers import SentenceTransformer
    from hypothesis import given, strategies as st, settings, HealthCheck
except ImportError as e:
    print(f"Missing required package: {e}")
    print("Install with: pip install lancedb sentence-transformers hypothesis pytest")
    sys.exit(1)

# Configuration
LANCEDB_PATH = os.environ.get('LANCEDB_PATH', '/mnt/efs/suplementia-lancedb/')
MODEL_PATH = os.environ.get('MODEL_PATH', '/mnt/efs/models/all-MiniLM-L6-v2')
SUPPLEMENTS_EXPORT_PATH = Path(__file__).parent.parent.parent / 'infrastructure' / 'migrations' / 'supplements-export.json'
EXPECTED_EMBEDDING_DIM = 384


class TestMigrationProperties:
    """Property-based tests for data migration"""
    
    @classmethod
    def setup_class(cls):
        """Load model and connect to LanceDB once for all tests"""
        print("\n🔧 Setting up test environment...")
        
        # Load model
        print(f"Loading model from {MODEL_PATH}...")
        cls.model = SentenceTransformer(MODEL_PATH)
        
        # Connect to LanceDB
        print(f"Connecting to LanceDB at {LANCEDB_PATH}...")
        cls.db = lancedb.connect(LANCEDB_PATH)
        
        # Load supplements table
        if 'supplements' not in cls.db.table_names():
            pytest.skip("Supplements table not found. Run migration first.")
        
        cls.table = cls.db.open_table('supplements')
        
        # Load original supplements
        if not SUPPLEMENTS_EXPORT_PATH.exists():
            pytest.skip(f"Supplements export file not found: {SUPPLEMENTS_EXPORT_PATH}")
        
        with open(SUPPLEMENTS_EXPORT_PATH, 'r', encoding='utf-8') as f:
            cls.original_supplements = json.load(f)
        
        print(f"✅ Test environment ready")
        print(f"   Model loaded: {MODEL_PATH}")
        print(f"   Database: {LANCEDB_PATH}")
        print(f"   Original supplements: {len(cls.original_supplements)}")
    
    def test_property_19_migration_vector_dimensions(self):
        """
        Property 19: Migration Vector Dimensions
        
        For each migrated supplement, verify embedding is 384-dimensional.
        
        **Validates: Requirements 10.2**
        """
        print("\n" + "=" * 70)
        print("Testing Property 19: Migration Vector Dimensions")
        print("=" * 70)
        
        # Get all supplements from LanceDB
        result = self.table.to_pandas()
        
        print(f"Checking {len(result)} migrated supplements...")
        
        failures = []
        
        for idx, row in result.iterrows():
            supplement_name = row['name']
            embedding = row['embedding']
            embedding_dim = len(embedding)
            
            if embedding_dim != EXPECTED_EMBEDDING_DIM:
                failures.append({
                    'name': supplement_name,
                    'expected': EXPECTED_EMBEDDING_DIM,
                    'actual': embedding_dim
                })
                print(f"  ❌ {supplement_name}: {embedding_dim}-dim (expected {EXPECTED_EMBEDDING_DIM})")
            else:
                print(f"  ✅ {supplement_name}: {embedding_dim}-dim")
        
        # Assert no failures
        if failures:
            failure_msg = "\n".join([
                f"  - {f['name']}: expected {f['expected']}-dim, got {f['actual']}-dim"
                for f in failures
            ])
            pytest.fail(f"Property 19 violated:\n{failure_msg}")
        
        print(f"\n✅ Property 19 holds: All {len(result)} supplements have {EXPECTED_EMBEDDING_DIM}-dimensional embeddings")
    
    def test_property_20_migrated_supplement_searchability(self):
        """
        Property 20: Migrated Supplement Searchability
        
        For each migrated supplement, search by name and verify supplement is returned in results.
        
        **Validates: Requirements 10.4**
        """
        print("\n" + "=" * 70)
        print("Testing Property 20: Migrated Supplement Searchability")
        print("=" * 70)
        
        print(f"Testing searchability for {len(self.original_supplements)} supplements...")
        
        failures = []
        
        for supplement in self.original_supplements:
            name = supplement['name']
            
            try:
                # Generate query embedding
                query_embedding = self.model.encode(name, convert_to_numpy=True).tolist()
                
                # Search LanceDB (using 'embedding' column for vector search)
                results = self.table.search(query_embedding, vector_column_name='embedding').limit(5).to_pandas()
                
                if len(results) == 0:
                    failures.append({
                        'name': name,
                        'reason': 'No results returned'
                    })
                    print(f"  ❌ {name}: No results")
                    continue
                
                # Check if the supplement is in top 5 results
                found = False
                for idx, row in results.iterrows():
                    if row['name'].lower() == name.lower():
                        found = True
                        print(f"  ✅ {name}: Found at position {idx + 1}")
                        break
                
                if not found:
                    top_result = results.iloc[0]['name']
                    failures.append({
                        'name': name,
                        'reason': f'Not in top 5 results (top result: {top_result})'
                    })
                    print(f"  ❌ {name}: Not found (top result: {top_result})")
                
            except Exception as e:
                failures.append({
                    'name': name,
                    'reason': f'Search error: {str(e)}'
                })
                print(f"  ❌ {name}: Error - {e}")
        
        # Assert no failures
        if failures:
            failure_msg = "\n".join([
                f"  - {f['name']}: {f['reason']}"
                for f in failures
            ])
            pytest.fail(f"Property 20 violated:\n{failure_msg}")
        
        print(f"\n✅ Property 20 holds: All {len(self.original_supplements)} supplements are searchable")
    
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(st.sampled_from(range(100)))
    def test_property_19_random_samples(self, seed):
        """
        Property 19 (Hypothesis): Random sampling of migrated supplements
        
        For any randomly selected migrated supplement, the embedding must be 384-dimensional.
        """
        # Get all supplements
        result = self.table.to_pandas()
        
        if len(result) == 0:
            pytest.skip("No supplements in database")
        
        # Select random supplement
        import random
        random.seed(seed)
        idx = random.randint(0, len(result) - 1)
        row = result.iloc[idx]
        
        supplement_name = row['name']
        embedding = row['embedding']
        embedding_dim = len(embedding)
        
        assert embedding_dim == EXPECTED_EMBEDDING_DIM, \
            f"Property 19 violated for {supplement_name}: expected {EXPECTED_EMBEDDING_DIM}-dim, got {embedding_dim}-dim"
    
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(st.sampled_from(range(100)))
    def test_property_20_random_searches(self, seed):
        """
        Property 20 (Hypothesis): Random search queries
        
        For any randomly selected supplement, searching by its name should return it in the results.
        """
        # Select random supplement
        import random
        random.seed(seed)
        
        if len(self.original_supplements) == 0:
            pytest.skip("No supplements to test")
        
        idx = random.randint(0, len(self.original_supplements) - 1)
        supplement = self.original_supplements[idx]
        name = supplement['name']
        
        # Generate query embedding
        query_embedding = self.model.encode(name, convert_to_numpy=True).tolist()
        
        # Search LanceDB (using 'embedding' column for vector search)
        results = self.table.search(query_embedding, vector_column_name='embedding').limit(5).to_pandas()
        
        assert len(results) > 0, f"Property 20 violated: No results for {name}"
        
        # Check if supplement is in results
        found = any(row['name'].lower() == name.lower() for _, row in results.iterrows())
        
        assert found, f"Property 20 violated: {name} not found in search results"


def run_tests():
    """Run all property tests"""
    pytest.main([__file__, '-v', '--tb=short'])


if __name__ == '__main__':
    run_tests()
