# Vitamin B Complex - LanceDB Update Guide

## Overview

This guide explains how to add "Vitamin B Complex" to LanceDB to fix the "vitamina b" search issue.

## Problem

When users search for "vitamina b" (generic B vitamin), the system returns:
- ❌ **Before fix**: "Vitamin B12" (too specific) or "Multivitamin" (wrong)
- ✅ **After fix**: "Vitamin B Complex" (correct)

## Root Cause

LanceDB is missing a "Vitamin B Complex" entry. The normalizer has it, but autocomplete bypasses the normalizer and searches LanceDB directly.

## Solution Files

### 1. Code Changes (✅ Already Done)
- `scripts/enrich-lancedb-autocomplete.ts` - Added vitamin b complex entry
- `lib/portal/supplements-database.ts` - Added EN/ES entries

### 2. Database Update (Human-Gated)
- Running the LanceDB update script mutates data and generates Bedrock embeddings. Under
  `AGENTS.md` section 3.1 this is not autonomous work; it requires a task-specific human GO
  naming the exact command, target data store, smoke test, rollback, and audit record.

---

## 🚀 How to Update LanceDB

### Prerequisites

Make sure you have:
1. AWS credentials configured (for Bedrock embeddings)
2. Environment variables set:
   - `LANCEDB_PATH` (optional, defaults to `/tmp/lancedb-pristine`)
   - `AWS_REGION` (for Bedrock)
   - `BEDROCK_MODEL_ID` (for embeddings)

### Step 1: Prepare the Update Script Command

```bash
# Navigate to project root
cd /Users/latisnere/Documents/suplementAI

# Human-gated: do not run without explicit GO
npx ts-node scripts/add-vitamin-b-complex-to-lancedb.ts
```

### Expected Output

```
🚀 Starting LanceDB update for Vitamin B Complex

📂 Connecting to LanceDB...
   Path: /tmp/lancedb-pristine

✅ Connected to LanceDB (156 supplements)

🔍 Checking if Vitamin B Complex already exists...
✅ Vitamin B Complex not found (will be added)

🧮 Generating embedding for "Vitamin B Complex"...
✅ Embedding generated (512 dimensions)

📋 Supplement record created:
   Name: Vitamin B Complex
   Scientific name: B Vitamin Complex
   Common names (10): vitamin b, vitamina b, vit b, b complex, complejo b...
   Evidence grade: A
   Category: vitamin

💾 Inserting into LanceDB...
✅ Successfully added to LanceDB (156 → 157 supplements)

🔍 Verifying insertion...
✅ Verification successful!
   Found: Vitamin B Complex
   Similarity: 1.0

🧪 Testing search queries:

Query: "vitamina b"
  Top result: Vitamin B Complex
  Similarity: 0.954

Query: "vitamin b"
  Top result: Vitamin B Complex
  Similarity: 0.987

Query: "complejo b"
  Top result: Vitamin B Complex
  Similarity: 0.912

🎉 Done! Vitamin B Complex successfully added to LanceDB
```

### Step 2: Verify Locally

Test that the autocomplete now works:

```bash
# Test autocomplete API locally
curl 'http://localhost:3000/api/portal/autocomplete?q=vitamina%20b&lang=es&limit=5'

# Expected response:
# [{"text":"Vitamin B Complex","type":"supplement","score":95.4,...}]
```

### Step 3: Prepare a Review PR

```bash
# Commit the changes
git add scripts/add-vitamin-b-complex-to-lancedb.ts
git add scripts/enrich-lancedb-autocomplete.ts
git add lib/portal/supplements-database.ts
git commit -m "fix: add Vitamin B Complex to LanceDB and autocomplete

- Added Vitamin B Complex entry to LanceDB
- Updated enrichment script with vitamin b complex aliases
- Added Vitamin B Complex to supplements database (EN/ES)
- Fixes issue where 'vitamina b' returned B12 instead of B Complex

Resolves: Vitamin B search bug"

# Push a feature branch and open a PR against main.
# Do not push directly to main, enable auto-merge, or deploy autonomously.
git push origin <feature-branch>
```

### Step 4: Human-Gated Deploy

Deployment is blocked until a human reviews/merges the PR and gives a dedicated deploy GO with
the target SHA, smoke command, rollback command, and audit record.

1. **Amplify Build**: ~5 minutes after approved deploy
   - Check: https://console.aws.amazon.com/amplify/
   - App ID: d2yn3faih4ykom

2. **CDN Cache Expiration**: ~5 minutes (auto-expires)
   - Manual invalidation is an AWS write and requires explicit human GO.

### Step 5: Production Smoke

Production testing is part of the human-gated deploy/smoke plan, not an autonomous local task.

1. Visit: https://suplementai.com/portal
2. Type: "vitamina b"
3. Verify autocomplete shows: "Vitamin B Complex" or "Complejo B"
4. Select and verify results are correct

---

## 🧪 Testing Commands

### Test LanceDB Directly

This can generate embeddings or reach local LanceDB/Bedrock-backed paths. Treat it as
human-gated unless the task spec explicitly authorizes the exact command and target data store.

```bash
# Test vector search
node -e "
const { searchLanceDB } = require('./lib/lancedb-service');

async function test() {
  const results = await searchLanceDB('vitamina b', 5);
  console.log('Top 3 results:');
  results.slice(0, 3).forEach((r, i) => {
    console.log(\`\${i+1}. \${r.name} (similarity: \${r.similarity.toFixed(3)})\`);
  });
}

test().catch(console.error);
"
```

Expected output:
```
Top 3 results:
1. Vitamin B Complex (similarity: 0.954)
2. Vitamin B12 (similarity: 0.712)
3. Vitamin B6 (similarity: 0.689)
```

### Test Autocomplete API

```bash
# Test Spanish query
curl 'http://localhost:3000/api/portal/autocomplete?q=vitamina%20b&lang=es&limit=5' | jq '.suggestions[0]'

# Expected:
# {
#   "text": "Vitamin B Complex",
#   "type": "supplement",
#   "score": 95.4
# }

# Test English query
curl 'http://localhost:3000/api/portal/autocomplete?q=vitamin%20b&lang=en&limit=5' | jq '.suggestions[0]'

# Expected:
# {
#   "text": "Vitamin B Complex",
#   "type": "supplement",
#   "score": 98.7
# }
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module '@lancedb/lancedb'"

```bash
npm install
```

### Issue: "AWS Bedrock authentication failed"

```bash
# Check AWS credentials
aws sts get-caller-identity

# Set profile if needed
export AWS_PROFILE=suplementai

# Verify Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

AWS and Bedrock inspection/mutation must follow `AGENTS.md` section 3.1. Do not run these
commands autonomously from this legacy runbook.

### Issue: "LanceDB path not found"

Set the correct path:
```bash
export LANCEDB_PATH=/path/to/your/lancedb
```

Or update in script:
```typescript
const LANCEDB_PATH = '/absolute/path/to/lancedb';
```

### Issue: "Vitamin B Complex already exists"

The script is idempotent - it will skip insertion if the entry already exists.

If you need to update an existing entry:
1. Delete the old entry first (use LanceDB API)
2. Re-run the script

---

## 📊 Impact

### Before Fix
| Query | Result | Issue |
|-------|--------|-------|
| "vitamina b" | Vitamin B12 | Too specific |
| "vitamin b" | Multivitamin | Wrong |
| "complejo b" | No results | Missing |

### After Fix
| Query | Result | Status |
|-------|--------|--------|
| "vitamina b" | Vitamin B Complex | ✅ Correct |
| "vitamin b" | Vitamin B Complex | ✅ Correct |
| "complejo b" | Vitamin B Complex | ✅ Correct |

---

## 🎯 Related Files

- **Analysis**: `.serena/memories/VITAMIN-B-SEARCH-COMPREHENSIVE-ANALYSIS.md`
- **Bug Documentation**: `.serena/memories/vitamin-search-normalization-bug-fix.md`
- **Enrichment Script**: `scripts/enrich-lancedb-autocomplete.ts`
- **Supplements DB**: `lib/portal/supplements-database.ts`
- **LanceDB Service**: `lib/lancedb-service.ts`
- **Autocomplete Logic**: `lib/portal/autocomplete-suggestions-fuzzy.ts`

---

## 📝 Notes

1. **LanceDB mutation is gated**: Do not run update scripts autonomously.
2. **Production LanceDB**: May be in a different location and requires explicit target confirmation.
3. **Embeddings**: Generated using AWS Bedrock Titan V2 (512 dimensions), which is human-gated.
4. **Deploy/cache actions**: Amplify, CloudFront invalidation, and production smoke require GO.
5. **Idempotent is not permission**: Even idempotent scripts still mutate governed data stores.

---

## ✅ Checklist

- [x] Code changes committed
- [ ] Human GO captured for exact LanceDB/Bedrock command
- [ ] Script executed successfully after GO
- [ ] Local testing passed
- [ ] PR opened against main
- [ ] Human review/merge completed
- [ ] Human GO captured for deploy/smoke/rollback
- [ ] Amplify deployment completed after GO
- [ ] Production smoke passed after GO

---

*Last updated: 2026-01-10*
