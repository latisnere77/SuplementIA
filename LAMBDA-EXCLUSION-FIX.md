# Lambda Exclusion Map Fix

## Status: ✅ DEPLOYED

## What Was Fixed

Added EXCLUSION_MAP to `backend/lambda/studies-fetcher/src/pubmed/queryBuilder.ts` to prevent confusion between similar supplement names in PubMed queries.

## Changes Made

### 1. Added EXCLUSION_MAP
```typescript
const EXCLUSION_MAP: Record<string, string[]> = {
  'ginger': ['ginseng', 'panax'],
  'ginseng': ['ginger', 'zingiber'],
  'ashwagandha': ['rhodiola', 'ginseng'],
  'rhodiola': ['ashwagandha', 'ginseng'],
};
```

### 2. Updated buildMainQuery()
Now automatically adds exclusion terms to PubMed queries:
```typescript
// Add exclusions for similar supplements
const exclusions = getExclusions(supplementName);
if (exclusions.length > 0) {
  const exclusionQueries = exclusions.map(term => `NOT ${term}[tiab]`);
  parts.push(...exclusionQueries);
}
```

### 3. Fixed Lambda Function Name
Updated `package.json` deploy script to use correct function name:
- ❌ `suplementia-studies-fetcher`
- ✅ `suplementia-studies-fetcher-dev`

## Deployment

```bash
cd backend/lambda/studies-fetcher
npm run build
npm run deploy
```

**Result:** Lambda function successfully updated

## Git Commit

```
commit c991052
feat: Add EXCLUSION_MAP to prevent ginger/ginseng confusion in PubMed queries
```

## Impact

- **Ginger** searches will now exclude "ginseng" and "panax" studies
- **Ginseng** searches will now exclude "ginger" and "zingiber" studies
- Similar protection for ashwagandha/rhodiola confusion
- More accurate study results for users

## Testing

To test the fix, search for:
- "ginger" - should not return ginseng studies
- "ginseng" - should not return ginger studies

## Next Steps

Monitor production searches to identify other supplements that may need exclusion rules.
