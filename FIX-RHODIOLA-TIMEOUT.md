# Fix: Rhodiola Timeout Issue

**Fecha:** 2025-11-22  
**Problema:** Búsquedas de "rhodiola" tardan 31+ segundos y retornan 404

---

## 🔍 Diagnóstico

### Problema Identificado

El sistema estaba tardando **31+ segundos** en procesar búsquedas de "rhodiola" y retornando error 404 (insufficient_data), cuando en realidad:

1. ✅ PubMed tiene 5 estudios disponibles
2. ✅ El endpoint `/api/portal/enrich` funciona en 1.5s
3. ✅ El endpoint `/api/portal/recommend` funciona en 1.8s
4. ❌ El endpoint `/api/portal/quiz` tarda 31s y retorna 404

### Causa Raíz

El problema estaba en el servicio de **expansión de abreviaturas** (`lib/services/abbreviation-expander.ts`):

1. Para cada búsqueda, el sistema llama a Claude Haiku (LLM) para:
   - Expandir abreviaturas (HMB → beta-hydroxy beta-methylbutyrate)
   - Traducir términos en español (magnesio → magnesium)

2. **Sin timeout configurado**, las llamadas al LLM podían tardar 20-30 segundos

3. Esto causaba que el flujo completo excediera los timeouts y retornara 404

### Evidencia

```bash
# Búsqueda directa a enrich (con caché): 1.5s ✅
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -d '{"supplementName": "rhodiola", "maxStudies": 5}'
# Resultado: 200 OK, 1.5s

# Búsqueda a quiz (sin caché, con LLM): 31s ❌
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -d '{"category": "rhodiola", "age": 35}'
# Resultado: 404, 31s
```

---

## ✅ Solución Implementada

### 1. Timeout en LLM Expansion (5 segundos)

**Archivo:** `lib/services/abbreviation-expander.ts`

```typescript
// ANTES: Sin timeout
const llmAlternatives = await expandWithLLM(trimmed);

// DESPUÉS: Con timeout de 5s
const LLM_TIMEOUT = 5000; // 5 segundos max
let llmAlternatives: string[] = [];
try {
  llmAlternatives = await Promise.race([
    expandWithLLM(trimmed),
    new Promise<string[]>((_, reject) => 
      setTimeout(() => reject(new Error('LLM expansion timeout')), LLM_TIMEOUT)
    ),
  ]);
} catch (error: any) {
  console.warn('LLM expansion timeout, using original term');
  llmAlternatives = [];
}
```

**Beneficio:** Si el LLM tarda más de 5s, el sistema continúa con el término original en lugar de esperar indefinidamente.

### 2. Timeout en Enrich Route (8 segundos)

**Archivo:** `app/api/portal/enrich/route.ts`

```typescript
// ANTES: Sin timeout
const expansion = await expandAbbreviation(supplementName);

// DESPUÉS: Con timeout de 8s
const LLM_EXPANSION_TIMEOUT = 8000; // 8 segundos max
const expansion = await Promise.race([
  expandAbbreviation(supplementName),
  new Promise<any>((_, reject) => 
    setTimeout(() => reject(new Error('LLM expansion timeout')), LLM_EXPANSION_TIMEOUT)
  ),
]);
```

**Beneficio:** Protección adicional a nivel de ruta para evitar que el LLM bloquee todo el flujo.

### 3. Mapa de Términos Comunes

**Archivo:** `app/api/portal/enrich/route.ts`

```typescript
const COMMON_ABBREVIATIONS: Record<string, string> = {
  // Abreviaturas
  'cbd': 'cannabidiol',
  'nac': 'N-acetylcysteine',
  'coq10': 'coenzyme q10',
  
  // Suplementos comunes (evita llamada al LLM)
  'rhodiola': 'rhodiola',
  'rhodiola rosea': 'rhodiola rosea',
  'ashwagandha': 'ashwagandha',
  'ginseng': 'ginseng',
  'berberine': 'berberine',
  'berberina': 'berberine',
};
```

**Beneficio:** Los términos más comunes se procesan instantáneamente sin llamar al LLM.

---

## 📊 Resultados Esperados

### Antes del Fix

| Endpoint | Término | Tiempo | Status |
|----------|---------|--------|--------|
| /api/portal/quiz | rhodiola | 31s | 404 ❌ |
| /api/portal/quiz | rhodiola rosea | 31s | 404 ❌ |

### Después del Fix

| Endpoint | Término | Tiempo Esperado | Status Esperado |
|----------|---------|-----------------|-----------------|
| /api/portal/quiz | rhodiola | 2-5s | 200 ✅ |
| /api/portal/quiz | rhodiola rosea | 2-5s | 200 ✅ |

**Mejora:** ~85% reducción en tiempo de respuesta (31s → 2-5s)

---

## 🧪 Validación

### Script de Prueba

Creado `scripts/test-rhodiola-timeout-fix.ts` para validar el fix:

```bash
npx tsx scripts/test-rhodiola-timeout-fix.ts
```

Este script prueba:
1. `/api/portal/enrich` con "rhodiola"
2. `/api/portal/recommend` con "rhodiola"
3. `/api/portal/quiz` con "rhodiola"
4. `/api/portal/quiz` con "rhodiola rosea"

### Validación Manual

```bash
# Test 1: Enrich
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "rhodiola", "maxStudies": 5}'

# Test 2: Quiz
curl -X POST https://www.suplementai.com/api/portal/quiz \
  -H "Content-Type: application/json" \
  -d '{"category": "rhodiola", "age": 35, "gender": "male", "location": "CDMX"}'
```

**Criterios de éxito:**
- ✅ Tiempo de respuesta < 10s
- ✅ Status 200 OK
- ✅ Datos reales retornados (no mock)
- ✅ `hasRealData: true` en metadata

---

## 🔧 Configuración de Timeouts

### Cadena de Timeouts

```
Frontend (35s)
  └─> /api/portal/quiz (120s)
       └─> /api/portal/recommend (115s)
            └─> /api/portal/enrich (115s)
                 ├─> LLM Expansion (8s) ← NUEVO
                 │    └─> expandWithLLM (5s) ← NUEVO
                 ├─> Lambda studies-fetcher (30s)
                 └─> Lambda content-enricher (60s)
```

**Lógica:**
1. **LLM Expansion:** 5-8s (rápido, no crítico)
2. **Lambdas:** 30-60s (crítico, necesita tiempo)
3. **API Routes:** 115-120s (permite completar Lambdas)
4. **Frontend:** 35s (suficiente para flujo normal)

---

## 📝 Archivos Modificados

1. `lib/services/abbreviation-expander.ts`
   - Agregado timeout de 5s en `expandAbbreviation()`
   - Manejo de errores mejorado

2. `app/api/portal/enrich/route.ts`
   - Agregado timeout de 8s en llamada a `expandAbbreviation()`
   - Agregados términos comunes al mapa de fallback

3. `scripts/test-rhodiola-timeout-fix.ts` (nuevo)
   - Script de validación automatizado

4. `FIX-RHODIOLA-TIMEOUT.md` (este archivo)
   - Documentación del fix

---

## 🎯 Impacto

### Búsquedas Afectadas

Este fix mejora el rendimiento para:

1. **Términos en inglés sin traducción:**
   - rhodiola, ashwagandha, ginseng, turmeric, etc.

2. **Términos que no necesitan expansión:**
   - Nombres completos de suplementos

3. **Casos donde el LLM es lento:**
   - Timeouts de Bedrock
   - Alta latencia de red
   - Throttling de API

### Búsquedas NO Afectadas

El fix NO afecta negativamente:

1. **Abreviaturas reales:** HMB, NAC, BCAA, etc.
   - Siguen expandiéndose correctamente
   - Si el LLM falla, se usa el término original

2. **Términos en español:** magnesio, cúrcuma, jengibre, etc.
   - Siguen traduciéndose correctamente
   - Si el LLM falla, se usa traducción programática

---

## 🚀 Despliegue

```bash
# Commit
git add -A
git commit -m "fix: Add timeout protection for LLM expansion to prevent slow searches"

# Push (auto-deploy a Vercel)
git push origin main
```

**Tiempo de despliegue:** ~2-3 minutos

---

## 📈 Monitoreo

### Logs a Revisar

1. **CloudWatch Logs:**
   ```
   event: "ABBREVIATION_LLM_TIMEOUT"
   event: "QUERY_LLM_EXPANSION_START"
   event: "QUERY_LLM_EXPANSION_RESULT"
   ```

2. **Vercel Logs:**
   - Buscar "rhodiola" en logs
   - Verificar tiempos de respuesta

### Métricas Clave

- **Tiempo de respuesta promedio:** < 5s
- **Tasa de timeout del LLM:** < 10%
- **Tasa de éxito:** > 95%

---

## 🔄 Rollback Plan

Si el fix causa problemas:

```bash
# Revertir commit
git revert HEAD

# Push
git push origin main
```

**Alternativa:** Aumentar timeouts si 5-8s no es suficiente:
- LLM_TIMEOUT: 5s → 10s
- LLM_EXPANSION_TIMEOUT: 8s → 15s

---

## ✅ Checklist de Validación

Después del despliegue, verificar:

- [ ] Búsqueda de "rhodiola" retorna 200 OK
- [ ] Tiempo de respuesta < 10s
- [ ] Datos reales retornados (no mock)
- [ ] Búsqueda de "rhodiola rosea" funciona
- [ ] Búsqueda de "berberina" sigue funcionando
- [ ] Búsqueda de "HMB" (abreviatura) sigue funcionando
- [ ] Búsqueda de "magnesio" (español) sigue funcionando

---

**Fix implementado por:** Kiro AI  
**Fecha:** 2025-11-22T16:50:00Z  
**Commit:** 6050978
