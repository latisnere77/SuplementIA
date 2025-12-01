# Quick Start - Manual Testing

## 🚀 Quick Setup (2 minutes)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser to:** `http://localhost:3000/portal`

3. **Open DevTools:** Press `F12` (or `Cmd+Option+I` on Mac)

4. **Clear cache:** DevTools → Application → Storage → "Clear site data"

---

## ✅ Quick Test (5 minutes)

### Test 1: Valid Supplement
Search: **ashwagandha**

**Expected:** ✅ Recommendation appears with study data

---

### Test 2: Invalid Supplement  
Search: **rutina**

**Expected:** ⚠️ Educational error with suggestions

---

### Test 3: Cache Works
1. Search: **magnesium**
2. Refresh page (F5)

**Expected:** ✅ Results load from cache (faster)

---

### Test 4: Network Error
1. DevTools → Network → Enable "Offline"
2. Search: **vitamin d**

**Expected:** ❌ System error appears

---

## 📋 Full Testing

For comprehensive testing, see:
- **[MANUAL-TESTING-CHECKLIST.md](.kiro/specs/frontend-error-display-fix/MANUAL-TESTING-CHECKLIST.md)** - Complete checklist with 11 test cases
- **[MANUAL-TESTING-GUIDE.md](scripts/MANUAL-TESTING-GUIDE.md)** - Detailed guide with console logs

---

## ✅ Success Criteria

- ✅ Valid supplements show recommendations (NOT errors)
- ⚠️ Invalid supplements show educational errors with suggestions
- ✅ Cache persists across refreshes
- ❌ Network errors show system error state

---

## 🐛 Common Issues

**ErrorState shown for valid supplements?**
→ Clear cache and try again

**No suggestions for invalid supplements?**
→ Check Network tab for API response

**Cache not working?**
→ Check Application → Local Storage in DevTools

---

## 📞 Need Help?

Check console logs for:
- `[ResultsPage] State changed:` - Shows state transitions
- `[Cache Validation]` - Shows cache validation results
- `✅ Setting recommendation state` - Shows successful data load
- `⚠️ Insufficient data error` - Shows educational errors
- `❌ Network error` - Shows system errors
