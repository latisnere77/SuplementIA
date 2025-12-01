# Legacy Cleanup Plan

**Feature:** Modern Architecture - Code Hygiene  
**Status:** 📋 Planning  
**Priority:** 🟡 Medium (Part of modernization)

---

## 🧹 Files to Remove

### Backend - Deprecated APIs

**File:** `app/api/portal/enrich-v2/route.ts`
- **Status:** ❌ DELETE
- **Reason:** Duplicate of main enrich route, not used in production
- **Migration:** Merge any useful optimizations into main enrich route
- **Risk:** Low - appears to be experimental

**File:** `app/api/portal/test-config/route.ts`
- **Status:** ❌ DELETE
- **Reason:** Test endpoint, should not be in production
- **Migration:** Move to development-only scripts
- **Risk:** Low - testing only

**File:** `app/api/analyze-studies/route.ts`
- **Status:** ⚠️ REVIEW
- **Reason:** Check if still used by frontend
- **Action:** Grep codebase for usage, delete if unused
- **Risk:** Medium - verify no dependencies

### Frontend - Unused Pages

**File:** `app/portal/page-simple.tsx`
- **Status:** ❌ DELETE
- **Reason:** Duplicate of main portal page
- **Migration:** None needed
- **Risk:** Low - appears to be old version

**File:** `app/portal/debug-enrich/`
- **Status:** ⚠️ KEEP (but rename)
- **Reason:** Useful for debugging, but should be dev-only
- **Action:** Add authentication check, only show in development
- **Risk:** Low - debugging tool

### Scripts - Diagnostic Scripts

**Directory:** `scripts/`
- **Status:** 🔄 ORGANIZE
- **Action:** Move to `_archived/scripts-YYYY-MM-DD/`
- **Keep:** Active diagnostic scripts
- **Archive:** One-time diagnostic scripts (diagnose-berberina, etc)
- **Risk:** None - just organization

---

## 🔄 Files to Refactor

### Backend Services

**File:** `lib/services/abbreviation-expander.ts`
- **Status:** ✅ RECENTLY OPTIMIZED
- **Action:** No changes needed
- **Notes:** Prompt caching working perfectly

**File:** `backend/lambda/content-enricher/`
- **Status:** 🔴 CRITICAL REFACTOR
- **Issues:**
  - Takes 119 seconds (2 minutes)
  - Uses Sonnet (expensive, slow)
  - No prompt caching
  - 11,674 input tokens
- **Actions:**
  1. Implement two-stage pipeline
  2. Switch to Haiku
  3. Add prompt caching
  4. Reduce token count 60%
- **Priority:** P0 - Blocking production

**File:** `backend/lambda/studies-fetcher/`
- **Status:** ✅ WORKING WELL
- **Action:** Minor optimizations
  - Add parallel fetching for multiple terms
  - Improve error handling
  - Add retry logic
- **Priority:** P2 - Nice to have

### Frontend Components

**File:** `components/portal/` (various)
- **Status:** 🔄 ENHANCE
- **Actions:**
  1. Add loading skeletons
  2. Implement SSE event handling
  3. Add progress indicators
  4. Improve error states
- **Priority:** P1 - User experience

---

## 📝 Code Quality Improvements

### TypeScript Strict Mode

**Current Issues:**
- Some files use `any` types
- Missing error type guards
- Inconsistent null checks

**Actions:**
```typescript
// ❌ Before
catch (error: any) {
  console.error(error.message);
}

// ✅ After
catch (error) {
  console.error(error instanceof Error ? error.message : 'Unknown error');
}
```

### Logging Standardization

**Current Issues:**
- Mix of console.log and structured logging
- Inconsistent log formats
- Missing correlation IDs in some places

**Actions:**
```typescript
// ❌ Before
console.log('Processing', term);

// ✅ After
console.log(JSON.stringify({
  event: 'PROCESSING_START',
  term,
  requestId,
  timestamp: new Date().toISOString(),
}));
```

### Error Handling

**Current Issues:**
- Some errors not caught
- Generic error messages
- No retry logic

**Actions:**
```typescript
// ✅ Add retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 🗂️ Directory Structure Reorganization

### Current Structure (Messy)
```
suplementia/
├── app/
│   ├── api/
│   │   ├── analyze-studies/  ❌ Unused?
│   │   └── portal/
│   │       ├── enrich/       ✅ Main
│   │       ├── enrich-v2/    ❌ Duplicate
│   │       └── test-config/  ❌ Test only
│   └── portal/
│       ├── page.tsx          ✅ Main
│       └── page-simple.tsx   ❌ Old version
├── scripts/
│   ├── diagnose-*.ts         ⚠️ Archive old ones
│   └── test-*.ts             ⚠️ Archive old ones
└── _archived/                ✅ Good practice
```

### Proposed Structure (Clean)
```
suplementia/
├── app/
│   ├── api/
│   │   └── portal/
│   │       ├── enrich/           ✅ Main (optimized)
│   │       ├── autocomplete/     ✅ Keep
│   │       ├── studies/          ✅ Keep
│   │       └── [other routes]    ✅ Keep
│   └── portal/
│       ├── page.tsx              ✅ Main
│       ├── results/              ✅ Keep
│       └── [other pages]         ✅ Keep
├── lib/
│   ├── services/
│   │   ├── abbreviation-expander.ts  ✅ Optimized
│   │   ├── content-generator.ts      🆕 New (two-stage)
│   │   ├── cache-manager.ts          🆕 New (multi-layer)
│   │   └── stream-handler.ts         🆕 New (SSE)
│   └── utils/
│       ├── retry.ts                  🆕 New
│       └── logger.ts                 🆕 New
├── scripts/
│   ├── active/                       🆕 Currently used
│   └── README.md                     🆕 Documentation
└── _archived/
    ├── diagnostics-nov22/            ✅ Already done
    └── legacy-apis-nov22/            🆕 For deleted files
```

---

## 🎯 Cleanup Checklist

### Phase 1: Safe Deletions (1 hour)
- [ ] Delete `app/api/portal/enrich-v2/route.ts`
- [ ] Delete `app/api/portal/test-config/route.ts`
- [ ] Delete `app/portal/page-simple.tsx`
- [ ] Archive old diagnostic scripts
- [ ] Update `.gitignore` if needed

### Phase 2: Code Quality (2 hours)
- [ ] Fix all `any` types
- [ ] Add error type guards
- [ ] Standardize logging format
- [ ] Add retry logic utility
- [ ] Update ESLint rules

### Phase 3: Refactoring (4 hours)
- [ ] Refactor content-enricher Lambda
- [ ] Add two-stage pipeline
- [ ] Implement prompt caching
- [ ] Add parallel processing
- [ ] Update tests

### Phase 4: Documentation (1 hour)
- [ ] Update README.md
- [ ] Document new architecture
- [ ] Add migration guide
- [ ] Update API documentation

---

## 📊 Impact Analysis

### Before Cleanup
- **Files:** 150+ files
- **LOC:** ~15,000 lines
- **Unused code:** ~10%
- **Technical debt:** High
- **Maintainability:** Medium

### After Cleanup
- **Files:** ~130 files (13% reduction)
- **LOC:** ~13,000 lines (13% reduction)
- **Unused code:** <2%
- **Technical debt:** Low
- **Maintainability:** High

### Benefits
- ✅ Easier to navigate codebase
- ✅ Faster build times
- ✅ Less confusion for new developers
- ✅ Better code quality
- ✅ Reduced maintenance burden

---

## ⚠️ Risks and Mitigation

### Risk 1: Deleting Used Code
**Mitigation:**
- Grep entire codebase before deletion
- Check git history for recent usage
- Test thoroughly after deletion
- Keep backups in `_archived/`

### Risk 2: Breaking Dependencies
**Mitigation:**
- Run full test suite
- Check TypeScript compilation
- Test in staging environment
- Have rollback plan ready

### Risk 3: Lost Functionality
**Mitigation:**
- Document what each file does before deletion
- Extract useful code before deletion
- Keep archived for 30 days
- Monitor production after deployment

---

**Next Steps:**
1. Review this cleanup plan
2. Get approval for deletions
3. Execute Phase 1 (safe deletions)
4. Monitor for issues
5. Proceed with remaining phases
