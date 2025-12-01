# Fix: Potasio (Potassium) Search Returns No Results

**Date:** 2025-11-26  
**Status:** ⚠️ REQUIRES AWS ACCESS  
**Priority:** HIGH (affects user experience)

## Problem

User searches for "Potasio" (Potassium) return no results, even though:
- Potasio is in the `supplements-database.ts` (line 679)
- Potasio is in the `regenerate-top-supplements.ts` list (line 47)
- The query validator recognizes "potasio" as valid (line 45)

## Root Cause

**RDS Postgres database only has 39 supplements indexed, and Potassium is NOT one of them.**

Verified by checking `infrastructure/migrations/supplements-export.json`:
- Total supplements: 39 (now 43 after fix)
- Missing minerals: Potassium, Copper, Manganese, Iodine
- The vector search Lambda cannot find what doesn't exist in the database

## Impact

- Users searching for common minerals get 404 errors
- Searches are added to discovery queue but not processed
- Fallback to legacy normalizer is not working (separate issue)

## Solution Implemented

### 1. Updated Export File ✅

Added 4 missing minerals to `infrastructure/migrations/supplements-export.json`:

```json
{
  "name": "Potassium",
  "scientific_name": "Potassium",
  "common_names": ["Potasio", "Potassium", "Potassium Citrate", "Potassium Chloride"],
  "metadata": {
    "category": "mineral",
    "popularity": "high",
    "pubmedQuery": "(potassium) AND (blood pressure OR hypertension OR heart OR muscle OR cramps)"
  }
}
```

Also added: Copper, Manganese, Iodine

### 2. Created Import Scripts ✅

- `scripts/add-missing-minerals.ts` - Validates export file
- `scripts/trigger-potasio-discovery.ts` - Triggers discovery queue

## Required Actions (AWS Access Needed)

### Option A: Direct RDS Import (Recommended)

```bash
# 1. Connect to RDS Postgres
psql -h <RDS_HOST> -U postgres -d supplements

# 2. Insert Potassium
INSERT INTO supplements (name, scientific_name, common_names, metadata, search_count)
VALUES (
  'Potassium', 
  'Potassium', 
  ARRAY['Potasio', 'Potassium', 'Potassium Citrate', 'Potassium Chloride'],
  '{"category":"mineral","popularity":"high","pubmedQuery":"(potassium) AND (blood pressure OR hypertension OR heart OR muscle OR cramps)","pubmedFilters":{"yearFrom":2010,"rctOnly":false,"maxStudies":10}}'::jsonb,
  0
);

# 3. Generate embedding using Lambda
# Call embedding-generator Lambda with text: "Potassium Potasio"

# 4. Update supplement with embedding
UPDATE supplements 
SET embedding = '<embedding_vector>'::vector
WHERE name = 'Potassium';

# 5. Repeat for Copper, Manganese, Iodine
```

### Option B: Use Import Script

```bash
# Requires RDS credentials in environment
export RDS_HOST=<your-rds-host>
export RDS_PASSWORD=<your-password>
export RDS_DATABASE=supplements
export RDS_USER=postgres

# Run import
npx tsx scripts/import-to-rds.ts
```

### Option C: Trigger Discovery Worker

```bash
# 1. Verify discovery worker Lambda is deployed and running
aws lambda get-function --function-name discovery-worker

# 2. Check DynamoDB discovery queue
aws dynamodb scan --table-name staging-discovery-queue

# 3. Manually invoke discovery worker
aws lambda invoke \
  --function-name discovery-worker \
  --payload '{"Records":[]}' \
  response.json
```

## Verification

After import, test with:

```bash
# Test search API
curl "https://staging-search-api.execute-api.us-east-1.amazonaws.com/search?q=Potasio"

# Should return:
# {
#   "success": true,
#   "supplement": {
#     "name": "Potassium",
#     "commonNames": ["Potasio", "Potassium", ...]
#   },
#   "similarity": 0.95+
# }
```

## Related Issues

1. **Lambda staging URL not responding** - `staging-search-api` endpoint returns connection errors
2. **Fallback not working** - Legacy normalizer should catch missing supplements but doesn't
3. **Discovery worker not processing** - Queue items not being processed automatically

## Files Modified

- ✅ `infrastructure/migrations/supplements-export.json` - Added 4 minerals
- ✅ `scripts/add-missing-minerals.ts` - Created import helper
- ✅ `scripts/trigger-potasio-discovery.ts` - Created discovery trigger
- ✅ `scripts/diagnose-potasio.ts` - Created diagnostic tool

## Next Steps

1. **Immediate:** Someone with AWS access needs to import the 4 minerals to RDS
2. **Short-term:** Fix Lambda staging endpoint or update URLs
3. **Medium-term:** Implement automatic discovery worker processing
4. **Long-term:** Expand RDS database to include all 100+ supplements from `regenerate-top-supplements.ts`

## References

- Supplements database: `lib/portal/supplements-database.ts`
- Top supplements list: `scripts/regenerate-top-supplements.ts`
- Lambda search API: `backend/lambda/search-api/lambda_function.py`
- Export file: `infrastructure/migrations/supplements-export.json`
