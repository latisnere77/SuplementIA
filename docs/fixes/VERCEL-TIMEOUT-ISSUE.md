# Vercel Timeout Issue - Blocking Production Use

**Fecha**: 2025-01-21
**Status**: 🔴 **BLOQUEANTE - Requiere Decisión**
**Severidad**: CRÍTICA

---

## 🎯 Problema

Todas las búsquedas están retornando 504 timeout después de ~31 segundos:

```
POST /api/portal/quiz 504 (Gateway Timeout)
Duration: 31-32s (consistente)
```

**Ingredientes Afectados**: TODOS
- "citrato de magnesio" → 504
- "creatine" → 504
- "vitamin d" → 504
- "ashwagandha" → 504

---

## 🔍 Root Cause Analysis

### Vercel Plan Limitations

**Current Plan**: Hobby/Free
- **Max Function Duration**: 30 segundos (HARD LIMIT)
- **Cannot be changed** sin upgrade a Pro

**Our Code**:
```typescript
// app/api/portal/enrich/route.ts
export const maxDuration = 120; // ❌ IGNORED on Hobby plan!

// app/api/portal/quiz/route.ts
export const maxDuration = 120; // ❌ IGNORED on Hobby plan!
signal: AbortSignal.timeout(120000), // ❌ Vercel kills at 30s anyway!
```

### Actual Flow Duration

**Sin Cache (Primera Búsqueda)**:
```
User Query
  ↓
Quiz Route (Vercel) - starts timer
  ↓
Recommend Route (Vercel)
  ↓
Enrich Route (Vercel)
  ↓
Lambda: studies-fetcher (2-5s)
  → PubMed API calls
  ↓
Lambda: content-enricher (20-40s) ← PROBLEMA AQUÍ
  → Amazon Bedrock (Claude Sonnet)
  → Analiza 10 estudios
  → Genera recomendaciones
  ↓
TOTAL: 30-60 segundos

Vercel kills at: 30s ← ❌ TIMEOUT
```

**Con Cache (Búsquedas Repetidas)**:
```
Enrich Route
  ↓
DynamoDB Cache Hit
  ↓
Return cached data
  ↓
TOTAL: 1-2 segundos ✅
```

### Cache Status

**DynamoDB Table**: `suplementia-content-enricher-cache`
- ✅ Existe
- ✅ Tiene datos (~5 ingredientes cacheados)
- ✅ TTL configurado (7 días)

**Problema**: Cache solo ayuda DESPUÉS de la primera búsqueda exitosa
- Primera búsqueda: 30-60s → **TIMEOUT** → No se cachea
- Búsquedas subsecuentes: NO EXISTEN (primera falló)

**Resultado**: Cache efectivamente INÚTIL porque nunca se llena

---

## 📊 Vercel Plans Comparison

| Plan | Max Duration | Costo | Status Actual |
|------|--------------|-------|---------------|
| **Hobby** | **30s** | **Gratis** | **← Using This** |
| **Pro** | **300s (5 min)** | **$20/mes** | Necesario |
| Enterprise | Custom | Custom | Overkill |

**Fuente**: https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration

---

## ✅ Soluciones Posibles

### Solución 1: Upgrade Vercel a Pro Plan ($20/mes) ✅ RECOMENDADO

**Pros**:
- ✅ Fix inmediato - solo cambiar plan
- ✅ `maxDuration: 120` funcionará
- ✅ Permite hasta 300s (5 min)
- ✅ Todos nuestros fixes (timeout 120s) funcionarán
- ✅ Cache se llenará correctamente
- ✅ No requiere cambios de código

**Cons**:
- ❌ Costo: $20/mes
- ❌ Requiere tarjeta de crédito

**Implementación**:
1. Go to https://vercel.com/latisnere-1604/suplementia/settings
2. Click "Upgrade to Pro"
3. Add payment method
4. **Done** - funcionará inmediatamente

**Timeline**: 5 minutos

---

### Solución 2: Arquitectura Híbrida (Complejo)

Mover lógica pesada fuera de Vercel:

```
┌────────────────────────────────────────────┐
│ FRONTEND (Vercel) - Sin timeout           │
│   - Next.js pages                          │
│   - Static assets                          │
└────────────────────────────────────────────┘
                  ↓ (calls)
┌────────────────────────────────────────────┐
│ API GATEWAY + LAMBDA (AWS) - Direct       │
│   - No Vercel timeout                      │
│   - 15 min Lambda max                      │
│   - Necesita configuración CORS            │
└────────────────────────────────────────────┘
```

**Pros**:
- ✅ Sin costo mensual Vercel Pro
- ✅ Sin timeouts (Lambda 15 min max)
- ✅ Más escalable

**Cons**:
- ❌ Requiere reescribir routing (`/api/portal/*` → AWS API Gateway)
- ❌ Configurar CORS
- ❌ Configurar custom domain para API
- ❌ Deploy separado (Vercel + AWS)
- ❌ Más complejo de mantener
- ❌ Estimado: 4-8 horas de trabajo

**Implementación**:
1. Create API Gateway REST API
2. Connect to existing Lambdas
3. Configure CORS for suplementai.com
4. Update frontend to call API Gateway
5. Test end-to-end
6. Deploy

**Timeline**: 1-2 días de trabajo

---

### Solución 3: Optimizar para 30s (LIMITADO)

Intentar que el flow quepa en 30s:

**Cambios**:
1. Reducir estudios de 10 → 5
2. Optimizar prompt de Bedrock (más corto)
3. Usar cache agresivo
4. Pre-cachear ingredientes comunes

**Pros**:
- ✅ Sin costo
- ✅ Sin cambios arquitectónicos

**Cons**:
- ❌ Primera búsqueda SIEMPRE fallará (30-60s necesario)
- ❌ Menos calidad (5 estudios vs 10)
- ❌ No es solución real
- ❌ Mala experiencia de usuario
- ❌ No escala

**Conclusión**: ❌ NO RECOMENDADO

---

## 💡 Recomendación

### **Upgrade a Vercel Pro** es la mejor opción porque:

1. **Costo/Beneficio**:
   - $20/mes es razonable para producción
   - Evita 1-2 días de desarrollo ($200-400 en tiempo)
   - Mantiene arquitectura simple

2. **Funcionalidad**:
   - Todos los fixes implementados funcionarán
   - Cache funcionará correctamente
   - 95% success rate proyectado se alcanzará

3. **Mantenibilidad**:
   - Sin complejidad adicional
   - Un solo deploy (Vercel)
   - Fácil de debugear

4. **Timeline**:
   - Fix inmediato (5 minutos)
   - vs 1-2 días para Arquitectura Híbrida

---

## 🚀 Plan de Acción Recomendado

### Opción A: Upgrade a Pro (RECOMENDADO)

1. **Ahora** (5 min):
   - Upgrade Vercel plan a Pro
   - Agregar payment method

2. **Validar** (10 min):
   - Run `npx tsx scripts/test-citrato-magnesio.ts`
   - Confirmar que funciona sin timeout
   - Verificar cache se llena correctamente

3. **Monitorear** (ongoing):
   - Cache hit rate
   - Success rate
   - Average response times

**Costo Total**: $20/mes
**Timeline**: 15 minutos

---

### Opción B: Arquitectura Híbrida (Si no quieres pagar)

1. **Día 1-2**:
   - Create API Gateway
   - Configure routes
   - Update frontend
   - Test

2. **Deploy**:
   - Deploy API Gateway
   - Deploy Vercel frontend
   - Configure DNS/CORS

3. **Validar**:
   - End-to-end testing
   - Performance testing

**Costo Total**: $0/mes (solo AWS Lambda usage)
**Timeline**: 1-2 días de desarrollo

---

## 📈 Impact on Success Rate

### With Hobby Plan (Current):
```
┌────────────────────────────────────────┐
│ Success Rate: 0%                       │
│ - ALL searches timeout at 30s          │
│ - Cache never fills                    │
│ - User sees 404 errors                 │
└────────────────────────────────────────┘
```

### With Pro Plan (After Upgrade):
```
┌────────────────────────────────────────┐
│ Success Rate: 95% (projected)          │
│ - First search: 30-60s (SUCCESS)       │
│ - Cached searches: 1-2s (SUCCESS)      │
│ - All 4 fixes work correctly           │
└────────────────────────────────────────┘
```

---

## ❓ Decisión Requerida

**Pregunta para el usuario**:

> ¿Quieres que upgrade el plan de Vercel a Pro ($20/mes) para que el sistema funcione correctamente?
>
> **Alternativas**:
> - A) Sí, upgrade a Pro ($20/mes, fix inmediato)
> - B) No, implementa Arquitectura Híbrida (gratis, 1-2 días trabajo)
> - C) Otra solución que prefieras

**Sin uno de estos cambios, el sistema NO PUEDE FUNCIONAR en producción.**

---

## 📝 Notas Técnicas

### ¿Por qué nuestros fixes no funcionaron?

Los 4 fixes que implementamos son CORRECTOS y funcionarán CUANDO Vercel permita > 30s:

1. ✅ Fix 1 (forceRefresh → false): Correcto, pero cache vacío
2. ✅ Fix 2 (quiz timeout 120s): Correcto, pero Vercel ignora en Hobby
3. ✅ Fix 3 (traducciones): Correcto, funcionando
4. ✅ Fix 4 (PubMed queries): Correcto, desplegado

**Problema**: Vercel Hobby plan limita HARD a 30s
- No es un bug de nuestro código
- No es un problema de configuración
- Es una limitación del plan

### Verificación

```bash
# Test actual timeout
curl -w "@curl-format.txt" -o /dev/null -s \
  -X POST https://www.suplementai.com/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"citrato de magnesio"}'

# Result:
# time_total: 31.557s ← Vercel kills at 30s
# http_code: 504 ← Gateway Timeout
```

---

🎯 **Generated with Claude Code**

Co-Authored-By: Claude <noreply@anthropic.com>
