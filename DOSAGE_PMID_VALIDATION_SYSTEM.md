# Sistema de Validación de Dosis con PMIDs

## 🎯 Objetivo
Prevenir alucinaciones en la dosificación al requerir citaciones PMID para todas las afirmaciones de dosis específicas.

## 🔒 Problema Identificado
- **ANTES**: Claude (Bedrock) generaba dosis que "sonaban" científicas sin evidencia real
- **Ejemplo**: glycyrrhiza uralensis mostraba "300-600mg/día" sin PMIDs que respaldaran estas dosis
- **Riesgo**: Información médica incorrecta podría ser peligrosa para los usuarios

## ✅ Solución Implementada

### 1. **Prompts Actualizados** (`content-enricher/src/prompts.ts`)

#### Campos Nuevos Obligatorios:
```typescript
"dosage": {
  "sourcePMIDs": ["PMID1", "PMID2"],  // OBLIGATORIO para dosis numéricas
  "timingPMID": "PMID" | null,        // Para claims de timing
  "durationPMID": "PMID" | null,      // Para claims de duración
  // ...
}
```

#### Instrucciones Críticas al LLM:
```
"⚠️ REGLA CRÍTICA: CADA afirmación de dosis DEBE estar documentada
en los estudios proporcionados. NO generes dosis basadas en conocimiento
general. Si no hay evidencia clara de dosis en los estudios, escribe
'Dosis no establecida en estudios disponibles - consultar literatura adicional'."
```

### 2. **Validación Estricta** (líneas 454-498)

```typescript
// Si menciona dosis específicas (ej: "300mg", "500-600mg")
const dosePattern = /\d+\s*-?\s*\d*\s*(mg|g|mcg|μg|iu)/i;

if (dosePattern.test(data.dosage.standard)) {
  // DEBE tener sourcePMIDs
  if (!data.dosage.sourcePMIDs || sourcePMIDs.length === 0) {
    errors.push('dosage.sourcePMIDs is required when specific doses are mentioned');
  }
}

// Validar formato de PMIDs (deben ser numéricos)
sourcePMIDs.forEach((pmid) => {
  if (!/^\d+$/.test(pmid)) {
    errors.push('PMID must be numeric string');
  }
});
```

### 3. **Sanitización Post-Generación** (`sanitizeDosageWithPMIDValidation`)

Función que se ejecuta DESPUÉS de que Claude genera el contenido:

```typescript
export function sanitizeDosageWithPMIDValidation(dosage: any): any {
  // Si tiene dosis numéricas pero NO tiene PMIDs válidos
  if (hasDoseNumbers && !hasValidPMIDs) {
    // ❌ REEMPLAZAR con mensaje seguro
    dosage.standard = 'Dosis no establecida en estudios disponibles';
    console.warn('[DOSAGE_SANITIZED] Removed unverified dose');
  }

  // Sanitizar timing sin PMID
  if (specificTiming && !timingPMID) {
    dosage.timing = 'Sin preferencia de horario según estudios clínicos';
  }

  return dosage;
}
```

### 4. **Integración en Bedrock** (`bedrock.ts` líneas 342-358 y `bedrockConverse.ts` líneas 205-221)

```typescript
// DESPUÉS de validación pero ANTES de retornar
if (enrichedData.dosage) {
  const originalDosage = JSON.stringify(enrichedData.dosage);
  enrichedData.dosage = sanitizeDosageWithPMIDValidation(enrichedData.dosage);

  if (originalDosage !== sanitizedDosage) {
    console.warn({
      event: 'DOSAGE_SANITIZED',
      message: 'Removed unverified dosage claims without PMID support'
    });
  }
}
```

### 5. **Tipos TypeScript Actualizados** (`types.ts`)

```typescript
export interface Dosage {
  standard: string;
  sourcePMIDs?: string[];      // PMIDs que respaldan las dosis
  timingPMID?: string | null;  // PMID para timing
  durationPMID?: string | null; // PMID para duración
  effectiveDose?: string;       // Con citación
  optimalDose?: string;         // Con citación
  maxSafeDose?: string;         // Con citación
}
```

## 🛡️ Capas de Protección

1. **Capa 1 - Prompt**: Instruir a Claude a NO inventar dosis
2. **Capa 2 - Validación**: Rechazar JSON sin PMIDs para dosis numéricas
3. **Capa 3 - Sanitización**: Remover dosis sin PMIDs que pasaron validación
4. **Capa 4 - Logging**: Registrar todas las sanitizaciones para auditoría

## 📊 Mensajes de Seguridad

### Cuando NO hay evidencia:
- ✅ `"Dosis no establecida en estudios disponibles - consultar literatura clínica específica"`
- ✅ `"Sin preferencia de horario según estudios clínicos"`
- ✅ `"Duración óptima no establecida en estudios disponibles"`

### Cuando SÍ hay evidencia:
```json
{
  "standard": "300-600mg/día de extracto estandarizado",
  "sourcePMIDs": ["12345678", "23456789"],
  "timing": "Con alimentos, 2 veces al día",
  "timingPMID": "34567890"
}
```

## 🔍 Logs de Auditoría

### Warnings al sanitizar:
```
[DOSAGE_SANITIZED] Removed unverified numeric dose from standard: 300-600mg/día
[DOSAGE_SANITIZED] Removed unverified timing claim: Con alimentos para mejorar absorción
[DOSAGE_SANITIZED] Removed unverified duration claim: 8-12 semanas
```

### Validación fallida:
```
dosage.sourcePMIDs is required when specific doses are mentioned in standard
dosage.sourcePMIDs[0] must be a numeric string (PMID format)
```

## ✅ Estado Actual

| Componente | Estado | Deployment |
|------------|--------|------------|
| Prompts actualizados | ✅ Completo | `content-enricher` |
| Validación con PMIDs | ✅ Completo | `content-enricher` |
| Sanitización post-gen | ✅ Completo | `content-enricher` |
| Tipos TypeScript | ✅ Completo | `content-enricher` |
| Quiz Orchestrator | ✅ Completo | `quiz-orchestrator` |

**Deployed to Production**:
- ✅ `production-content-enricher` (LastModified: 2025-12-31T14:52:16) - includes sanitization in both bedrock.ts AND bedrockConverse.ts
- ✅ `production-quiz-orchestrator` (LastModified: 2025-12-31T14:08:49)

## 🧪 Testing

### Para verificar si funciona:
1. Buscar un suplemento nuevo (no cacheado)
2. Revisar la sección de dosificación
3. Si muestra dosis específicas (ej: "300mg"), debe tener:
   - PMIDs en los metadatos
   - O mostrar "Dosis no establecida en estudios disponibles"

### Logs a revisar:
```bash
aws logs tail /aws/lambda/production-content-enricher --profile suplementai --since 5m | grep DOSAGE_SANITIZED
```

## 📈 Beneficios

1. **Seguridad**: No más dosis inventadas sin evidencia
2. **Trazabilidad**: Cada dosis tiene PMIDs que la respaldan
3. **Transparencia**: Usuarios pueden verificar las fuentes
4. **Cumplimiento**: Evita problemas legales por información médica incorrecta

## 🚨 Importante

Este sistema NO elimina la necesidad de revisión humana. Es una capa de protección automatizada, pero:
- Los PMIDs podrían ser incorrectos (Claude podría inventar PMIDs)
- La dosis podría estar mal interpretada del estudio
- Se recomienda auditoría periódica de contenido generado

## 🔄 Próximos Pasos Recomendados

1. **Verificación de PMIDs**: Agregar validación que verifique que los PMIDs existen en PubMed
2. **Cross-referencia**: Verificar que la dosis mencionada aparece en el abstract del PMID
3. **Dashboard de auditoría**: Panel para revisar dosis sanitizadas
4. **Alertas**: Notificar cuando muchas dosis son removidas (indica problema en los prompts)

---

**Creado**: 2025-12-31
**Autor**: Claude Code (Claude Sonnet 4.5)
**Última actualización**: 2025-12-31
