# Legacy System Backup

**Fecha de backup:** 2024-11-20
**Estado:** DEPRECATED - NO USAR EN PRODUCCIÓN

## Contenido

Este directorio contiene el sistema LEGACY de transformación de evidencia que fue reemplazado por el nuevo sistema inteligente.

### Archivos respaldados:

1. **`transform-evidence-route.ts`** (antes: `app/api/portal/transform-evidence/route.ts`)
   - Endpoint API legacy
   - Usaba sistema de 3 niveles (Static → DynamoDB → Dynamic)
   - Reemplazado por transformación client-side en `app/portal/results/page.tsx`

2. **`evidence-transformer.ts`** (antes: `lib/portal/evidence-transformer.ts`)
   - Lógica de transformación legacy
   - Incluía datos hardcodeados para suplementos específicos
   - Funciones: `transformEvidenceToNew()`, `generateWhatIsItFor()`, `generateWorksForData()`
   - Reemplazado por función `transformRecommendationToEvidence()` en `app/portal/results/page.tsx`

## ¿Por qué fue reemplazado?

### Sistema LEGACY (Obsoleto) ❌
- Datos hardcodeados (no escalable)
- NO tenía expansión de abreviaciones
- NO tenía traducción español→inglés
- Lógica duplicada con nuevo sistema
- Round-trip extra al servidor (más lento)

### Sistema NUEVO (Actual) ✅
- 100% dinámico (PubMed + Bedrock)
- Expansión de abreviaciones (HMB → beta-hydroxy...)
- Traducción automática (español → inglés)
- Transformación client-side (más rápido)
- Una sola fuente de verdad

## Flujo actual

```
Usuario → /api/portal/quiz
           ↓
         /api/portal/recommend
           ↓
         /api/portal/enrich
           ↓
         ├─ Bedrock Haiku (expansión + traducción)
         ├─ studies-fetcher Lambda (PubMed)
         └─ content-enricher Lambda (Bedrock Claude)
           ↓
         Frontend: transformRecommendationToEvidence()
           ↓
         EvidenceAnalysisPanelNew
```

## Cuándo eliminar este backup

Este backup se mantendrá hasta confirmar que el nuevo sistema funciona correctamente en producción.

**Criterios para eliminación:**
- ✅ Sistema nuevo funcionando sin errores por 2+ semanas
- ✅ No hay regresiones reportadas
- ✅ Performance es igual o mejor
- ✅ Todos los datos se muestran correctamente

## Restauración (si es necesario)

Si necesitas restaurar el sistema legacy:

```bash
# 1. Restaurar API endpoint
cp backup-legacy-system/transform-evidence-route.ts app/api/portal/transform-evidence/route.ts

# 2. Restaurar transformer
cp backup-legacy-system/evidence-transformer.ts lib/portal/evidence-transformer.ts

# 3. Revertir cambios en results/page.tsx (usar git)
git log --oneline | grep "refactor: Remove legacy transform-evidence system"
git revert <commit-hash>
```

## Notas adicionales

- El nuevo sistema mantiene la misma interfaz visual
- Los datos mostrados al usuario son los mismos o mejores
- La única diferencia es que ahora todo es dinámico en lugar de hardcoded
