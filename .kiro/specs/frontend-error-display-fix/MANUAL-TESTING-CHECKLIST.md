# Manual Testing Checklist - Frontend Error Display Fix

## 🎯 Testing Objective
Verify that the frontend correctly displays recommendations for valid supplements and shows appropriate error messages for supplements without sufficient scientific data.

## 📋 Pre-Testing Setup

### 1. Start Development Server
```bash
npm run dev
```
Wait for server to start on `http://localhost:3000`

### 2. Open Browser DevTools
- Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)
- Open the **Console** tab
- Open the **Network** tab
- Open the **Application** tab (for localStorage inspection)

### 3. Clear All Cache (Important!)
In DevTools → Application → Storage:
- Click "Clear site data"
- Confirm the action
- Refresh the page

---

## ✅ Test Case 1: Ashwagandha (Valid Supplement)

**Query:** `ashwagandha`

### Steps:
1. Navigate to `http://localhost:3000/portal`
2. Enter "ashwagandha" in the search box
3. Click search or press Enter
4. Observe the loading state
5. Wait for results to appear

### Expected Results:
- [ ] Loading spinner appears initially
- [ ] Loading spinner disappears after data loads
- [ ] **Recommendation display appears** (NOT ErrorState)
- [ ] Study count is visible (e.g., "Based on 50+ studies")
- [ ] Benefits section is displayed
- [ ] Dosage section is displayed
- [ ] Side effects section is displayed
- [ ] No error messages shown

### Console Verification:
Look for these logs:
```
[ResultsPage] State changed: { hasRecommendation: true, isLoading: false, hasError: false }
✅ Setting recommendation state
[Cache Validation] { hasRealData: true, totalStudies: >0 }
```

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ✅ Test Case 2: Omega-3 (Valid Supplement)

**Query:** `omega-3`

### Steps:
1. Search for "omega-3"
2. Wait for results

### Expected Results:
- [ ] Recommendation display appears
- [ ] Study data is visible
- [ ] No error messages
- [ ] All sections render correctly

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ✅ Test Case 3: Vitamin D (Valid Supplement)

**Query:** `vitamin d`

### Steps:
1. Search for "vitamin d"
2. Wait for results

### Expected Results:
- [ ] Recommendation display appears
- [ ] Study data is visible
- [ ] No error messages
- [ ] All sections render correctly

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ✅ Test Case 4: Magnesium (Valid Supplement)

**Query:** `magnesium`

### Steps:
1. Search for "magnesium"
2. Wait for results

### Expected Results:
- [ ] Recommendation display appears
- [ ] Study data is visible
- [ ] No error messages
- [ ] All sections render correctly

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ⚠️ Test Case 5: Rutina (Insufficient Data)

**Query:** `rutina`

### Steps:
1. Search for "rutina"
2. Wait for results

### Expected Results:
- [ ] **Educational ErrorState appears** (yellow/warning style)
- [ ] Message explains insufficient scientific data
- [ ] Suggestions are provided (e.g., "Did you mean: Rutin, Quercetin?")
- [ ] No recommendation display shown
- [ ] Error is styled as educational (not system error)

### Console Verification:
```
⚠️ Insufficient data error
💡 Suggestions: [array of suggestions]
```

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ⚠️ Test Case 6: Quercetin (Insufficient Data)

**Query:** `quercetin`

### Steps:
1. Search for "quercetin"
2. Wait for results

### Expected Results:
- [ ] Educational ErrorState appears
- [ ] Suggestions are provided
- [ ] No recommendation display shown
- [ ] Error is styled as educational

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## 🔄 Test Case 7: Cache Persistence

**Query:** `ashwagandha` (or any valid supplement)

### Steps:
1. Search for "ashwagandha"
2. Wait for results to load completely
3. Note the recommendation ID in console
4. **Refresh the page** (F5 or Cmd+R)
5. Wait for results to load

### Expected Results:
- [ ] Results load faster (from cache)
- [ ] Same recommendation ID as before
- [ ] No new API call in Network tab (or very quick)
- [ ] No error state shown
- [ ] Data displays correctly

### Console Verification:
```
[Cache] Using cached recommendation for: ashwagandha
[Cache Validation] { hasRealData: true }
```

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## 🗑️ Test Case 8: Cleared Browser Cache

**Query:** `magnesium`

### Steps:
1. Search for "magnesium"
2. Wait for results to load
3. **Clear browser cache:**
   - DevTools → Application → Storage → Clear site data
4. **Refresh the page** (F5)
5. Wait for results to load

### Expected Results:
- [ ] Loading spinner appears
- [ ] API call is made (visible in Network tab)
- [ ] Fresh data is fetched and displayed
- [ ] No error state shown
- [ ] Data is cached again for next time

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ⏰ Test Case 9: Stale Cached Data

**Query:** `ashwagandha`

### Steps:
1. Search for "ashwagandha" and wait for results
2. Open DevTools → Application → Local Storage
3. Find the cached supplement entry
4. **Modify the timestamp** to be 25 hours old:
   ```javascript
   // In Console, run:
   const key = 'supplement:ashwagandha';
   const data = JSON.parse(localStorage.getItem(key));
   data.timestamp = Date.now() - (25 * 60 * 60 * 1000);
   localStorage.setItem(key, JSON.stringify(data));
   ```
5. **Refresh the page**
6. Wait for results to load

### Expected Results:
- [ ] Stale cache is detected and removed
- [ ] Fresh API call is made
- [ ] New data is displayed
- [ ] No error state shown

### Console Verification:
```
[Cache] Stale cache detected, fetching fresh data
[Cache] Removed stale cache for: ashwagandha
```

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ❌ Test Case 10: System Error (Network Offline)

**Query:** `ashwagandha`

### Steps:
1. Open DevTools → Network tab
2. **Enable "Offline" mode** (checkbox at top)
3. Search for "ashwagandha"
4. Wait for error

### Expected Results:
- [ ] **System ErrorState appears** (red/error style)
- [ ] Message indicates connection error
- [ ] Retry button is available
- [ ] No recommendation display shown
- [ ] Error is styled as system error (different from educational)

### Console Verification:
```
❌ Network error: Failed to fetch
```

### Steps to Clean Up:
1. **Disable "Offline" mode** in Network tab
2. Refresh the page

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## ❌ Test Case 11: Invalid Cache Data

**Query:** `magnesium`

### Steps:
1. Search for "magnesium" and wait for results
2. Open DevTools → Application → Local Storage
3. **Corrupt the cached data:**
   ```javascript
   // In Console, run:
   const key = 'supplement:magnesium';
   localStorage.setItem(key, '{"invalid": "data"}');
   ```
4. **Refresh the page**
5. Wait for results to load

### Expected Results:
- [ ] Invalid cache is detected and removed
- [ ] Fresh API call is made
- [ ] Valid data is displayed
- [ ] No error state shown

### Console Verification:
```
[Cache] Invalid cache detected, removing
```

### Result: ✅ PASS / ❌ FAIL
**Notes:**

---

## 📊 Test Summary

### Valid Supplements (Should Show Recommendations):
- [ ] Ashwagandha
- [ ] Omega-3
- [ ] Vitamin D
- [ ] Magnesium

**Score:** ___/4 passed

### Invalid Supplements (Should Show Educational Error):
- [ ] Rutina
- [ ] Quercetin

**Score:** ___/2 passed

### Cache & Error Handling:
- [ ] Cache Persistence
- [ ] Cleared Browser Cache
- [ ] Stale Cached Data
- [ ] System Error (Offline)
- [ ] Invalid Cache Data

**Score:** ___/5 passed

### **Total Score:** ___/11 passed

---

## ✅ Success Criteria

All tests should pass with:
- ✅ 4/4 valid supplements showing recommendations
- ⚠️ 2/2 invalid supplements showing educational errors
- ✅ 5/5 cache and error handling tests passing

---

## 🐛 Troubleshooting

### Issue: ErrorState shown for valid supplements
**Check:**
- Console logs for cache validation
- Ensure `hasRealData: true` and `totalStudies > 0`
- Check Network tab for API response

**Solution:**
- Clear cache and try again
- Check backend API is returning correct data

---

### Issue: Cache not persisting
**Check:**
- localStorage in DevTools
- Ensure data is being saved with correct structure

**Solution:**
- Check cache storage logic in code
- Verify TTL is set correctly

---

### Issue: Stale cache not being replaced
**Check:**
- TTL logic in cache validation
- Timestamp comparison

**Solution:**
- Verify cache validation runs on page load
- Check TTL calculation

---

### Issue: No suggestions for invalid supplements
**Check:**
- API response in Network tab
- Backend is returning suggestions array

**Solution:**
- Verify backend suggestion logic
- Check supplement-suggestions.ts

---

## 📝 Notes

**Date Tested:** _______________

**Tester:** _______________

**Environment:** 
- [ ] Local Development
- [ ] Staging
- [ ] Production

**Browser:** _______________

**Additional Observations:**

---

## ✅ Sign-Off

- [ ] All tests completed
- [ ] All tests passed
- [ ] Issues documented
- [ ] Ready for deployment

**Signature:** _______________

**Date:** _______________
