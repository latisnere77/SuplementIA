# Backend Shared Utilities

Módulos compartidos reutilizables entre todas las Lambdas del backend.

## 📁 Archivos

- `query-utils.js` - Utilidades de expansión y normalización de queries

## 🚀 Uso

```javascript
// En cualquier Lambda
const { expandQuery, hasExpansion } = require('../shared/query-utils');

// Expandir query
const expanded = expandQuery('carnitina');
console.log(expanded);
/*
{
  original: 'carnitina',
  canonical: 'L-Carnitine',
  variations: [
    'L-Carnitine',
    'Levocarnitine',
    'Acetyl-L-Carnitine',
    ...
  ],
  searchStrategy: 'multi_term',
  confidence: 1.0
}
*/

// Buscar en PubMed con TODAS las variaciones
for (const variation of expanded.variations) {
  const studies = await searchPubMed(variation);
  // Process studies
}
```

## 🧪 Testing

```bash
cd backend/shared
node query-utils.js
```

## 📝 Mantenimiento

Para agregar un nuevo suplemento:

1. Editar `QUERY_VARIATIONS` en `query-utils.js`
2. Agregar mappings en `frontend/lib/portal/query-normalization/normalizer.ts`
3. Agregar en `frontend/lib/portal/supplement-suggestions.ts`
4. Ejecutar tests

---

**Actualizado**: 2025-11-21
**Módulos**: 1 (query-utils)
