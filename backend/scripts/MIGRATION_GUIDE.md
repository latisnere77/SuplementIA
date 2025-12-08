# LanceDB Migration Guide

## Overview

This guide explains how to migrate the 43 legacy supplements from the export file to LanceDB in the staging/production environment.

## Prerequisites

### 1. Infrastructure Setup
- ✅ EFS mounted at `/mnt/efs/`
- ✅ ML model uploaded to `/mnt/efs/models/all-MiniLM-L6-v2/`
- ✅ LanceDB directory created at `/mnt/efs/suplementia-lancedb/`
- ✅ Lambda functions deployed with VPC access to EFS

### 2. Python Dependencies
```bash
pip install lancedb pyarrow sentence-transformers hypothesis pytest
```

### 3. Environment Variables
```bash
export LANCEDB_PATH=/mnt/efs/suplementia-lancedb/
export MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2
```

## Migration Steps

### Step 1: Validate Export Data (Local)

Run this locally to verify the export file is valid:

```bash
python backend/scripts/validate-migration-data.py
```

**Expected output:**
```
✅ All validations passed!
   Total supplements: 43
   Export file: infrastructure/migrations/supplements-export.json
   Ready for migration to LanceDB
```

### Step 2: Run Migration (Staging/Production)

Run this on the Lambda environment or EC2 instance with EFS access:

```bash
# Set environment variables
export LANCEDB_PATH=/mnt/efs/suplementia-lancedb/
export MODEL_PATH=/mnt/efs/models/all-MiniLM-L6-v2

# Run migration
python backend/scripts/migrate-to-lancedb.py
```

**Expected output:**
```
======================================================================
🚀 Starting LanceDB Migration
======================================================================
📦 Loading model from /mnt/efs/models/all-MiniLM-L6-v2...
✅ Model loaded in 5.23s
🔌 Connecting to LanceDB at /mnt/efs/suplementia-lancedb/...
✅ Connected to LanceDB
📂 Loading supplements from infrastructure/migrations/supplements-export.json...
✅ Loaded 43 supplements

🔄 Generating embeddings for 43 supplements...
  [1/43] Processing: Ganoderma lucidum
      ✅ Generated 384-dim embedding in 0.052s
  [2/43] Processing: Hericium erinaceus
      ✅ Generated 384-dim embedding in 0.048s
  ...
  [43/43] Processing: Iodine
      ✅ Generated 384-dim embedding in 0.051s

✅ Generated embeddings for all 43 supplements

📊 Creating supplements table...
✅ Created 'supplements' table with 43 records

🔍 Verifying data integrity...
   Original supplements: 43
   Inserted supplements: 43
   ✅ All 43 embeddings are 384-dimensional

🔍 Testing searchability...
   Testing search for: Ganoderma lucidum
      ✅ Found correct supplement
   Testing search for: Hericium erinaceus
      ✅ Found correct supplement
   ...

✅ Searchability verified for 5 samples

======================================================================
✅ Migration completed successfully!
======================================================================
   Total time: 12.45s
   Supplements migrated: 43
   Database path: /mnt/efs/suplementia-lancedb/
   Table: supplements
======================================================================
```

### Step 3: Run Property Tests

Verify migration correctness with property-based tests:

```bash
# Run all property tests
pytest backend/lambda/test_migration_properties.py -v

# Run specific property
pytest backend/lambda/test_migration_properties.py::TestMigrationProperties::test_property_19_migration_vector_dimensions -v
```

**Expected output:**
```
======================================================================
Testing Property 19: Migration Vector Dimensions
======================================================================
Checking 43 migrated supplements...
  ✅ Ganoderma lucidum: 384-dim
  ✅ Hericium erinaceus: 384-dim
  ...
  ✅ Iodine: 384-dim

✅ Property 19 holds: All 43 supplements have 384-dimensional embeddings

======================================================================
Testing Property 20: Migrated Supplement Searchability
======================================================================
Testing searchability for 43 supplements...
  ✅ Ganoderma lucidum: Found at position 1
  ✅ Hericium erinaceus: Found at position 1
  ...
  ✅ Iodine: Found at position 1

✅ Property 20 holds: All 43 supplements are searchable

PASSED
```

## Verification Checklist

After migration, verify:

- [ ] All 43 supplements inserted into LanceDB
- [ ] All embeddings are 384-dimensional
- [ ] All supplements searchable by name
- [ ] Vector search returns results in < 10ms
- [ ] No errors in CloudWatch logs
- [ ] Property tests pass

## Troubleshooting

### Issue: Model not found

**Error:**
```
❌ Failed to load model: [Errno 2] No such file or directory: '/mnt/efs/models/all-MiniLM-L6-v2'
```

**Solution:**
1. Verify EFS is mounted: `ls -la /mnt/efs/`
2. Check model exists: `ls -la /mnt/efs/models/all-MiniLM-L6-v2/`
3. Re-upload model if missing (see Task 3 completion summary)

### Issue: LanceDB connection failed

**Error:**
```
❌ Failed to connect to LanceDB: [Errno 13] Permission denied: '/mnt/efs/suplementia-lancedb/'
```

**Solution:**
1. Check directory permissions: `ls -la /mnt/efs/`
2. Create directory if missing: `mkdir -p /mnt/efs/suplementia-lancedb/`
3. Set correct permissions: `chmod 755 /mnt/efs/suplementia-lancedb/`

### Issue: Embedding generation slow

**Symptom:** Each embedding takes > 1 second

**Solution:**
1. Verify model is loaded from EFS (not downloading)
2. Check Lambda memory allocation (increase to 2048 MB)
3. Verify ARM64 architecture for better performance

### Issue: Search not returning correct results

**Symptom:** Property 20 test fails

**Solution:**
1. Verify embeddings were generated correctly
2. Check embedding dimensions (must be 384)
3. Rebuild HNSW index if needed
4. Verify query embedding generation uses same model

## Performance Benchmarks

**Expected performance:**
- Model loading (cold start): 5-10 seconds
- Embedding generation: 0.05 seconds per supplement
- Total migration time: 10-15 seconds for 43 supplements
- Vector search: < 10ms per query
- Memory usage: ~500 MB (with model loaded)

## Rollback Procedure

If migration fails or produces incorrect results:

1. **Drop the table:**
```python
import lancedb
db = lancedb.connect('/mnt/efs/suplementia-lancedb/')
db.drop_table('supplements')
```

2. **Re-run migration:**
```bash
python backend/scripts/migrate-to-lancedb.py
```

3. **Verify with tests:**
```bash
pytest backend/lambda/test_migration_properties.py -v
```

## Next Steps

After successful migration:

1. ✅ Mark Task 5 as complete
2. ➡️ Proceed to Task 6: Checkpoint - Verify data migration
3. ➡️ Proceed to Task 7: Implement DynamoDB cache operations
4. ➡️ Test end-to-end search flow

## Support

For issues or questions:
- Check CloudWatch logs: `/aws/lambda/search-api-lancedb`
- Review Task 5 completion summary: `backend/scripts/TASK_5_COMPLETION_SUMMARY.md`
- Consult design document: `.kiro/specs/system-completion-audit/design.md`
