# Manual Testing Guide - Frontend Error Display Fix

## Overview
This guide provides step-by-step instructions for manually testing the frontend error display fix to ensure all error states work correctly.

## Prerequisites
1. Start the development server: `npm run dev`
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Open the Console tab to see debug logs
4. Have the Network tab ready to monitor API calls

## Test Cases

### ✅ Test 1: Ashwagandha (Should Work - Has Studies)

**Steps:**
1. Clear browser cache and localStorage:
   - Open DevTools → Application → Storage → Clear site data
2. Navigate to: `http://localhost:3000/portal`
3. Search for: `ashwagandha`
4. Wait for results to load

**Expected Results:**
- ✅ Loading spinner appears initially
- ✅ Recommendation display appears (NOT ErrorState)
- ✅ Study count is visible (e.g., "Based on 50+ studies")
- ✅ Benefits, dosage, and side effects sections are displayed
- ✅ No error messages shown

**Console Logs to Check:**
```
[ResultsPage] State changed: { hasRecommendation: true, isLoading: false, hasError: false }
✅ Setting recommendation state: { id: '...', category: 'ashwagandha' }
[Cache Validation] { hasRealData: true, totalStudies: 50, ... }
```

---

### ✅ Test 2: Omega-3 (Should Work - Has Studies)

**Steps:**
1. Search for: `omega-3`
2. Wait for results to load

**Expected Results:**
- ✅ Recommendation display appears
- ✅ Study data is visible
- ✅ No error messages

---

### ✅ Test 3: Vitamin D (Should Work - Has Studies)

**Steps:**
1. Search for: `vitamin d`
2. Wait for results to load

**Expected Results:**
- ✅ Recommendation display appears
- ✅ Study data is visible
- ✅ No error messages

---

### ✅ Test 4: Magnesium (Should Work - Has Studies)

**Steps:**
1. Search for: `magnesium`
2. Wait for results to load

**Expected Results:**
- ✅ Recommendation display appears
- ✅ Study data is visible
- ✅ No error messages

---

### ⚠️ Test 5: Rutina (Should Show Educational Error)

**Steps:**
1. Search for: `rutina`
2. Wait for results to load

**Expected Results:**
- ⚠️ Educational ErrorState appears (yellow/warning style)
- ⚠️ Message explains insufficient scientific data
- ⚠️ Suggestions are provided (e.g., "Did you mean: Rutin, Quercetin?")
- ⚠️ No recommendation display shown

**Console Logs to Check:**
```
[ResultsPage] State changed: { hasRecommendation: false, isLoading: false, hasError: true }
⚠️ Insufficient data error
💡 Suggestions: Rutin, Quercetin
```

---

### ⚠️ Test 6: Quercetin (Should Show Educational Error)

**Steps:**
1. Search for: `quercetin`
2. Wait for results to load

**Expected Results:**
- ⚠️ Educational ErrorState appears
- ⚠️ Suggestions are provided
- ⚠️ No recommendation display shown

---

### 🔄 Test 7: Cache Persistence

**Steps:**
1. Search for: `ashwagandha`
2. Wait for results to load
3. Note the recommendation ID in console
4. Refresh the page (F5 or Cmd+R)
5. Wait for results to load

**Expected Results:**
- ✅ Results load faster (from cache)
- ✅ Same recommendation ID as before
- ✅ No API call in Network tab (or very quick)
- ✅ No error state shown

**Console Logs to Check:**
```
[Cache] Using cached recommendation for: ashwagandha
[Cache Validation] { hasRealData: true, ... }
```

---

### 🗑️ Test 8: Cleared Browser Cache

**Steps:**
1. Search for: `magnesium`
2. Wait for results to load
3. Clear browser cache:
   - DevTools → Application → Storage → Clear site data
4. Refresh the page (F5)
5. Wait for results to load

**Expected Results:**
- ✅ Loading spinner appears
- ✅ API call is made (visible in Network tab)
- ✅ Fresh data is fetched and displayed
- ✅ No error state shown
- ✅ Data is cached again

---

### ⏰ Test 9: Stale Cached Data

**Steps:**
1. Open DevTools → Application → Local Storage
2. Find a cached supplement entry
3. Modify the timestamp to be 25 hours old:
   ```javascript
   // In Console:
   const key = 'supplement:ashwagandha';
   const data = JSON.parse(localStorage.getItem(key));
   data.timestamp = Date.now() - (25 * 60 * 60 * 1000);
   localStorage.setItem(key, JSON.stringify(data));
   ```
4. Refresh the page
5. Wait for results to load

**Expected Results:**
- ✅ Stale cache is detected and removed
- ✅ Fresh API call is made
- ✅ New data is displayed
- ✅ No error state shown

**Console Logs to Check:**
```
[Cache] Stale cache detected, fetching fresh data
[Cache] Removed stale cache for: ashwagandha
```

---

### ❌ Test 10: System Error Simulation

**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Search for: `ashwagandha`
4. Wait for error

**Expected Results:**
- ❌ System ErrorState appears (red/error style)
- ❌ Message indicates connection error
- ❌ Retry button is available
- ❌ No recommendation display shown

**Console Logs to Check:**
```
[ResultsPage] State changed: { hasRecommendation: false, isLoading: false, hasError: true }
❌ Network error: Failed to fetch
```

---

## Verification Checklist

After completing all tests, verify:

- [ ] Valid supplements (ashwagandha, omega-3, vitamin d, magnesium) show recommendations
- [ ] Invalid supplements (rutina, quercetin) show educational errors with suggestions
- [ ] No ErrorState shown for valid supplements with studies
- [ ] Educational ErrorState (yellow) shown for supplements without studies
- [ ] System ErrorState (red) shown for actual system errors
- [ ] Cache persistence works across page refreshes
- [ ] Stale cache is detected and replaced with fresh data
- [ ] Cleared cache triggers fresh API calls
- [ ] Loading states transition correctly
- [ ] All console logs show correct state transitions

## Common Issues

### Issue: ErrorState shown for valid supplements
**Solution:** Check console logs for cache validation. Ensure `hasRealData: true` and `totalStudies > 0`.

### Issue: Cache not persisting
**Solution:** Check localStorage in DevTools. Ensure data is being saved with correct structure.

### Issue: Stale cache not being replaced
**Solution:** Check TTL logic. Ensure cache validation is running on page load.

### Issue: No suggestions for invalid supplements
**Solution:** Check API response. Ensure backend is returning suggestions array.

## Success Criteria

All tests should pass with:
- ✅ 4/4 valid supplements showing recommendations
- ⚠️ 2/2 invalid supplements showing educational errors
- ✅ Cache persistence working correctly
- ✅ Stale cache handling working correctly
- ❌ System errors displaying correctly

## Next Steps

If all tests pass:
1. Mark task 9 as complete
2. Proceed to task 10 (Final Checkpoint)
3. Deploy to staging for further testing

If any tests fail:
1. Review console logs for errors
2. Check Network tab for API responses
3. Verify state transitions in React DevTools
4. Fix issues and re-test
