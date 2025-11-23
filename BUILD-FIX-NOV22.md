# 🔧 Build Fix - November 22, 2025

## ❌ Problem

Tres commits consecutivos fallaron en Vercel debido a un error de build de Next.js:

```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'jobId').
```

## 🔍 Root Cause

Creé una nueva ruta dinámica `/api/portal/status/[jobId]` que conflictaba con la ruta existente `/api/portal/status/[id]`.

**Next.js Rule**: No puedes tener dos rutas dinámicas con diferentes nombres de parámetro en el mismo nivel de directorio.

### Estructura Problemática
```
app/api/portal/status/
├── [id]/route.ts        ← Existente (polling al backend)
└── [jobId]/route.ts     ← Nuevo (consulta DynamoDB) ❌ CONFLICTO
```

## ✅ Solution

Renombré la nueva ruta a `/api/portal/enrichment-status/[id]` para evitar el conflicto.

### Estructura Corregida
```
app/api/portal/
├── status/
│   └── [id]/route.ts              ← Existente (polling al backend)
└── enrichment-status/
    └── [id]/route.ts              ← Nuevo (consulta DynamoDB) ✅ OK
```

## 🔧 Changes Made

### 1. Deleted Conflicting Route
```bash
git rm app/api/portal/status/[jobId]/route.ts
```

### 2. Created New Route
```bash
mkdir -p app/api/portal/enrichment-status/[id]
# Created: app/api/portal/enrichment-status/[id]/route.ts
```

### 3. Updated Poll URL
```typescript
// app/api/portal/enrich-async/route.ts

// Before ❌
pollUrl: `/api/portal/status/${jobId}?supplement=${...}`

// After ✅
pollUrl: `/api/portal/enrichment-status/${jobId}?supplement=${...}`
```

## 🧪 Verification

### Local Build Test
```bash
npm run build
```

**Result**: ✅ Success
```
Route (app)                              Size     First Load JS
...
├ ƒ /api/portal/enrichment-status/[id]   0 B                0 B
├ ƒ /api/portal/status/[id]              0 B                0 B
...
```

### Deployment
```bash
git add app/api/portal/enrichment-status app/api/portal/enrich-async/route.ts
git rm app/api/portal/status/[jobId]/route.ts
git commit -m "fix: resolve Next.js dynamic route conflict"
git push origin main
```

**Result**: ✅ Vercel deployment successful

## 📚 Lesson Learned

### ❌ What Went Wrong

1. **Didn't run build locally** before pushing to git
2. **Didn't check for existing routes** before creating new ones
3. **Assumed different parameter names** would work

### ✅ Best Practices Going Forward

1. **Always run `npm run build` before pushing**
   ```bash
   npm run build && git push origin main
   ```

2. **Check existing routes first**
   ```bash
   ls -la app/api/portal/status/
   ```

3. **Understand Next.js routing rules**
   - Same directory level = same parameter name
   - Different functionality = different directory

4. **Test locally before deploying**
   - Build passes locally = Build passes in Vercel
   - Catch errors early

## 🎯 Impact

### Before Fix
- ❌ 3 failed deployments
- ❌ Build errors in Vercel
- ❌ Production down

### After Fix
- ✅ Build passes locally
- ✅ Build passes in Vercel
- ✅ Production working

## 📊 Timeline

| Time | Event | Status |
|------|-------|--------|
| 23:10 | Commit 64180b8 - Async enrichment | ❌ Failed |
| 23:15 | Commit ced58e9 - Frontend integration | ❌ Failed |
| 23:20 | Commit 143b347 - Documentation | ❌ Failed |
| 23:30 | Discovered build error | 🔍 Investigating |
| 23:35 | Identified route conflict | 🔍 Root cause |
| 23:40 | Fixed route naming | ✅ Solution |
| 23:45 | Commit 5b32ded - Build fix | ✅ Success |

## 🔮 Prevention

### Pre-Push Checklist
- [ ] Run `npm run build` locally
- [ ] Check for TypeScript errors
- [ ] Check for route conflicts
- [ ] Test critical paths
- [ ] Review git diff
- [ ] Push to git

### Automated Checks (Future)
```json
// package.json
{
  "scripts": {
    "pre-push": "npm run build && npm run lint",
    "push": "npm run pre-push && git push"
  }
}
```

## 📝 Next.js Dynamic Route Rules

### ✅ Valid
```
/api/users/[id]/route.ts
/api/posts/[id]/route.ts
```
Different directories = OK

### ❌ Invalid
```
/api/users/[id]/route.ts
/api/users/[userId]/route.ts
```
Same directory, different param names = ERROR

### ✅ Valid Alternative
```
/api/users/[id]/route.ts
/api/user-details/[userId]/route.ts
```
Different directories = OK

## 🎉 Summary

**Problem**: Route conflict caused build failures  
**Solution**: Renamed route to avoid conflict  
**Lesson**: Always test build locally before pushing  
**Status**: ✅ Fixed and deployed

---

**Developer**: Kiro AI  
**Date**: November 22, 2025  
**Commits**: 
- ❌ 64180b8, ced58e9, 143b347 (failed)
- ✅ 5b32ded (fixed)

**Status**: ✅ **RESOLVED**
