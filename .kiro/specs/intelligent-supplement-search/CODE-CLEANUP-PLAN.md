# Code Cleanup Plan: Remove Technical Debt

## Overview

Identify and remove obsolete, unused, and deprecated code to improve maintainability and reduce confusion.

## Obsolete Code Inventory

### 1. Hardcoded Normalizer (TO DEPRECATE)
**File**: `lib/portal/query-normalization/normalizer.ts`
**Status**: ⚠️ Currently in use, but should be replaced
**Lines**: ~400 lines
**Problem**: 
- Hardcoded list of ~70 supplements
- Requires manual updates for each new supplement
- Cannot handle typos or variations
- No semantic understanding

**Action**:
- Mark as `@deprecated` immediately
- Replace with intelligent search API calls
- Archive after 1 month of 100% intelligent search usage
- Keep for emergency fallback during migration

**Timeline**: Deprecate now, remove in 2 months

---

### 2. Old Supplement Suggestions (UNUSED)
**File**: `lib/portal/__tests__/supplement-suggestions.test.ts` (DELETED)
**Status**: ✅ Already deleted
**Problem**: Test file for non-existent module

**Action**: ✅ Complete

---

### 3. Legacy Autocomplete (DUPLICATE)
**Files**:
- `lib/portal/autocomplete-suggestions-fuzzy.ts`
- `lib/portal/useAutocomplete.tsx`

**Status**: ⚠️ May be obsolete if intelligent search handles autocomplete

**Investigation Needed**:
```typescript
// Check if these are used
grep -r "autocomplete-suggestions-fuzzy" app/
grep -r "useAutocomplete" app/
```

**Action**:
- Verify if still used
- If unused → Archive
- If used → Integrate with intelligent search

---

### 4. Old Evidence Transformer (LEGACY)
**File**: `lib/portal/evidence-transformer.ts`
**Lines**: ~150 lines
**Status**: ⚠️ Check if replaced by new system

**Investigation**:
```typescript
// Check usage
grep -r "evidence-transformer" app/
```

**Action**:
- If unused → Archive
- If used → Document purpose clearly

---

### 5. Duplicate API Endpoints (REDUNDANT)

**Old Endpoints** (May be obsolete):
- `/api/portal/recommend/route.ts` - Old recommendation endpoint
- `/api/portal/enrich/route.ts` - Old enrichment endpoint (1000+ lines!)
- `/api/portal/enrich-v2/route.ts` - Version 2 (why 2 versions?)
- `/api/portal/enrich-stream/route.ts` - Streaming version

**New Endpoints** (Should be used):
- `/api/portal/enrich-async/route.ts` - Async enrichment (NEW)
- `/api/portal/enrichment-status/[id]/route.ts` - Status polling (NEW)
- `/api/portal/search/route.ts` - Intelligent search (TO CREATE)

**Action**:
1. Audit which endpoints are actually called by frontend
2. Deprecate unused endpoints
3. Add warnings to old endpoints
4. Remove after migration complete

---

### 6. Unused Lambda Functions (ORPHANED)

**Directory**: `backend/lambda/`

**Potentially Unused**:
- `archive/` - Already archived, can be deleted
- `enrich-proxy/` - Proxy to what? Check if needed
- `query-expander/` - Is this used or replaced by search-api?

**Action**:
```bash
# Check CloudWatch logs for invocations
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# Check last invocation time
aws lambda list-functions --query 'Functions[*].[FunctionName,LastModified]'
```

**Cleanup**:
- Delete `archive/` directory
- Document purpose of each Lambda
- Remove unused Lambdas
- Update deployment scripts

---

### 7. Duplicate Deployment Scripts (CONFUSING)

**Files**:
- `backend/lambda/deploy.sh`
- `backend/lambda/deploy-simple.sh`
- `backend/lambda/deploy-docker.sh`
- `backend/lambda/deploy-as-zip.sh`
- `backend/lambda/deploy-staging-lambdas.sh`

**Problem**: 5 different deployment scripts, unclear which to use

**Action**:
- Document which script is for what
- Consolidate if possible
- Add README explaining deployment process
- Remove obsolete scripts

---

### 8. Old Test Files (OUTDATED)

**Pattern**: `*.test.ts` files that test deleted/deprecated code

**Action**:
```bash
# Find test files for non-existent modules
find . -name "*.test.ts" -o -name "*.test.tsx" | while read f; do
  module=$(echo $f | sed 's/\.test\.[jt]sx\?$//')
  if [ ! -f "$module.ts" ] && [ ! -f "$module.tsx" ] && [ ! -f "$module.js" ]; then
    echo "Orphaned test: $f"
  fi
done
```

**Cleanup**:
- Delete tests for deleted modules
- Update tests for deprecated modules
- Add tests for new intelligent search

---

### 9. Unused Environment Variables (CLUTTER)

**Files**: `.env.example`, `.env.local`, `.env.production`

**Action**:
- Audit which variables are actually used
- Remove unused variables
- Document required variables
- Add validation for missing variables

---

### 10. Old Documentation (OUTDATED)

**Files**:
- `API.md` - May reference old endpoints
- `DEPLOYMENT.md` - May reference old deployment process
- Various `README.md` files

**Action**:
- Update to reflect current architecture
- Remove references to deprecated code
- Add architecture diagrams
- Document intelligent search system

---

## Cleanup Priority

### Priority 1: High Impact, Low Risk
1. ✅ Delete `archive/` directory
2. ⚠️ Mark normalizer as `@deprecated`
3. ⚠️ Add warnings to old API endpoints
4. ⚠️ Document which deployment script to use

### Priority 2: Medium Impact, Medium Risk
1. Archive unused Lambda functions
2. Consolidate deployment scripts
3. Remove orphaned test files
4. Clean up environment variables

### Priority 3: Low Impact, High Risk (Do After Migration)
1. Delete old normalizer
2. Remove old API endpoints
3. Delete deprecated Lambda functions
4. Major documentation rewrite

---

## Cleanup Checklist

### Immediate (This Week)
- [ ] Create `_archived/` directory
- [ ] Move `backend/lambda/archive/` to `_archived/lambda/`
- [ ] Add `@deprecated` to normalizer
- [ ] Add deprecation warnings to old endpoints
- [ ] Document deployment scripts in README

### Short-term (This Month)
- [ ] Audit Lambda function usage
- [ ] Remove unused Lambdas
- [ ] Consolidate deployment scripts
- [ ] Clean up environment variables
- [ ] Update API documentation

### Long-term (After Migration)
- [ ] Delete old normalizer
- [ ] Remove old API endpoints
- [ ] Delete deprecated code
- [ ] Rewrite architecture docs
- [ ] Add architecture diagrams

---

## Deprecation Template

For marking code as deprecated:

```typescript
/**
 * @deprecated This function is deprecated and will be removed in v2.0.0.
 * Use `intelligentSearch()` from `@/lib/portal/intelligent-search` instead.
 * 
 * Migration guide: https://docs.suplementia.com/migration/intelligent-search
 * 
 * @see intelligentSearch
 */
export function normalizeQuery(query: string): NormalizedQuery {
  console.warn(
    'DEPRECATED: normalizeQuery() is deprecated. Use intelligentSearch() instead. ' +
    'See https://docs.suplementia.com/migration/intelligent-search'
  );
  
  // ... existing code ...
}
```

---

## Archive Structure

```
_archived/
├── lambda/
│   ├── archive/              # Old archived Lambdas
│   ├── enrich-proxy/         # If unused
│   └── query-expander/       # If replaced
├── api/
│   ├── recommend/            # Old recommendation endpoint
│   ├── enrich-v2/            # Old version 2
│   └── enrich-stream/        # Old streaming
├── lib/
│   ├── normalizer/           # Old hardcoded normalizer
│   └── autocomplete-fuzzy/   # If unused
└── README.md                 # Why these were archived
```

---

## Metrics

Track cleanup progress:

- **Lines of Code Removed**: Target 2000+ lines
- **Files Archived**: Target 20+ files
- **Deprecated Warnings**: Target 5+ deprecations
- **Documentation Updated**: Target 10+ files
- **Test Coverage**: Maintain >80%

---

## Success Criteria

- ✅ No orphaned test files
- ✅ All deprecated code marked clearly
- ✅ Unused Lambdas removed
- ✅ Deployment process documented
- ✅ Architecture docs updated
- ✅ No confusion about which code to use

---

**Status**: Plan Ready
**Effort**: 16 hours
**Value**: High (Reduces confusion, improves maintainability)
**Risk**: Low (Archiving, not deleting)
