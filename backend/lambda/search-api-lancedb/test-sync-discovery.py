#!/usr/bin/env python3
"""
Test script for synchronous discovery flow
Tests the new instant discovery feature
"""

import sys
import time

# Add lambda_function to path
sys.path.insert(0, '.')

from lambda_function import try_sync_discovery

def test_sync_discovery():
    """Test synchronous discovery with a new ingredient"""

    print("=" * 60)
    print("TESTING SYNCHRONOUS DISCOVERY FLOW")
    print("=" * 60)
    print()

    # Test 1: Ingredient with many studies (should succeed)
    print("TEST 1: Rhodiola (should have many studies)")
    print("-" * 60)
    start = time.time()
    result = try_sync_discovery("Rhodiola")
    elapsed = time.time() - start

    print(f"\nResult: {result}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"✅ PASSED - Study count: {result['study_count']}, Grade: {result['evidence_grade']}")
    else:
        print(f"❌ FAILED - Reason: {result.get('reason')}")
    print()

    # Test 2: Ingredient with few studies (should fail)
    print("TEST 2: XYZ123NonExistent (should have insufficient studies)")
    print("-" * 60)
    start = time.time()
    result = try_sync_discovery("XYZ123NonExistent")
    elapsed = time.time() - start

    print(f"\nResult: {result}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Success: {result['success']}")
    if not result['success'] and result.get('reason') == 'insufficient_studies':
        print(f"✅ PASSED - Correctly rejected with {result['study_count']} studies")
    else:
        print(f"❌ FAILED - Should have been rejected")
    print()

    # Test 3: Common supplement
    print("TEST 3: Ashwagandha (should have many studies)")
    print("-" * 60)
    start = time.time()
    result = try_sync_discovery("Ashwagandha")
    elapsed = time.time() - start

    print(f"\nResult: {result}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"✅ PASSED - Study count: {result['study_count']}, Grade: {result['evidence_grade']}")
    else:
        print(f"❌ FAILED - Reason: {result.get('reason')}")
    print()

    print("=" * 60)
    print("TESTS COMPLETED")
    print("=" * 60)

if __name__ == '__main__':
    try:
        test_sync_discovery()
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
