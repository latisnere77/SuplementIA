# 🚀 Roadmap de Implementación: Sistema Dinámico de Evidencia

## ✅ FASE 1 COMPLETADA (Hoy)

### Lo que hicimos:
- ✅ Medical MCP instalado en `/mcp-servers/medical-mcp`
- ✅ Configurado en Claude Desktop
- ✅ Vitamina A agregada al cache estático con datos ricos
- ✅ Schema DynamoDB diseñado (`infrastructure/dynamodb-schema.ts`)
- ✅ Servicio de cache DynamoDB creado (`lib/services/dynamodb-cache.ts`)
- ✅ Sistema de pruebas funcionando (`scripts/test-dynamic-evidence.ts`)

### Resultados:
```bash
# Antes
Vitamina A → Datos genéricos pobres (Grade C, info vaga)

# Ahora
Vitamina A → Datos ricos (Grade A, 4 beneficios, 67 estudios)
```

---

## 📅 FASE 2: Integración Backend (Días 2-4)

### Objetivo
Integrar Medical MCP en el backend Lambda para búsqueda real en PubMed.

### Tareas

#### 2.1 Crear Lambda Function para MCP Integration
```typescript
// backend/lambda/mcp-pubmed-search/index.ts

import { searchPubMedArticles } from '@/lib/services/medical-mcp-client';
import { generateRichEvidenceData } from '@/lib/portal/supplements-evidence-dynamic';

export async function handler(event: {supplementName: string}) {
  // 1. Search PubMed via Medical MCP
  // 2. Return structured study data
  // 3. Log metrics
}
```

**Tiempo estimado**: 1 día

#### 2.2 Crear cliente MCP en TypeScript
```typescript
// lib/services/medical-mcp-client.ts

export async function searchSupplementInPubMed(
  supplement: string
): Promise<PubMedArticle[]> {
  // Call Medical MCP via HTTP or stdio
  // Filter for RCTs and meta-analyses
  // Return parsed studies
}
```

**Tiempo estimado**: 1 día

#### 2.3 Testing e Integración
- Unit tests para cliente MCP
- Integration tests con PubMed real
- Manejo de errores y rate limiting

**Tiempo estimado**: 1 día

### Entregables Fase 2
- [ ] Lambda function que llama Medical MCP
- [ ] Cliente TypeScript para interactuar con MCP
- [ ] Tests pasando
- [ ] Documentación de API

---

## 📅 FASE 3: Análisis con IA (Días 5-7)

### Objetivo
Implementar análisis de estudios con Bedrock/Claude para generar datos estructurados.

### Tareas

#### 3.1 Crear Prompt Engineering para Bedrock
```typescript
// lib/services/bedrock-analyzer.ts

const ANALYSIS_PROMPT = `
You are a medical research analyst...
Analyze these PubMed studies and provide structured output...

Output format:
{
  "overallGrade": "A",
  "worksFor": [...],
  "doesntWorkFor": [...],
  ...
}
`;
```

**Tiempo estimado**: 1 día

#### 3.2 Implementar llamada a Bedrock
```typescript
export async function analyzeStudiesWithBedrock(
  supplement: string,
  studies: PubMedArticle[]
): Promise<StudyAnalysis> {
  // Call Bedrock Claude 3.5 Sonnet
  // Parse JSON response
  // Validate output schema
}
```

**Tiempo estimado**: 1 día

#### 3.3 Validación y Quality Control
- Validar que output tenga estructura correcta
- Verificar que grades sean consistentes
- Detectar "alucinaciones" (datos inventados)
- Implementar fallbacks

**Tiempo estimado**: 1 día

### Entregables Fase 3
- [ ] Prompt optimizado y testeado
- [ ] Servicio de análisis con Bedrock
- [ ] Validación de calidad implementada
- [ ] Ejemplos de output para review

---

## 📅 FASE 4: Sistema de Caching (Días 8-9)

### Objetivo
Implementar DynamoDB para cachear resultados generados.

### Tareas

#### 4.1 Desplegar DynamoDB Table
```bash
# Opción A: CloudFormation
aws cloudformation deploy \
  --template-file infrastructure/dynamodb-template.yml \
  --stack-name supplements-cache

# Opción B: CDK
cdk deploy SupplementsCacheStack
```

**Tiempo estimado**: 0.5 días

#### 4.2 Integrar con Sistema de Generación
```typescript
// lib/portal/supplements-evidence-orchestrator.ts

export async function getEvidenceData(supplement: string) {
  // 1. Check static cache (instant)
  const static = getRichSupplementData(supplement);
  if (static) return static;

  // 2. Check DynamoDB (fast)
  const cached = await getCachedEvidence(supplement);
  if (cached) return cached;

  // 3. Generate dynamically (slow, first time)
  const generated = await generateFromPubMed(supplement);
  await saveCachedEvidence(supplement, generated);

  return generated;
}
```

**Tiempo estimado**: 1 día

#### 4.3 Monitoreo y Métricas
- CloudWatch metrics para cache hit rate
- Logs estructurados
- Alertas para errores

**Tiempo estimado**: 0.5 días

### Entregables Fase 4
- [ ] Tabla DynamoDB desplegada
- [ ] Sistema de 3 niveles funcionando
- [ ] Métricas en CloudWatch
- [ ] Documentación de operaciones

---

## 📅 FASE 5: UX y Frontend (Días 10-12)

### Objetivo
Implementar experiencia de usuario para generación dinámica.

### Tareas

#### 5.1 Loading States
```tsx
// components/portal/EvidenceLoadingState.tsx

export function EvidenceLoading({ supplementName }: Props) {
  return (
    <div className="animate-pulse">
      <h3>🔬 Analizando estudios de PubMed...</h3>
      <Progress value={progress} />
      <p className="text-sm text-muted">
        Encontrados {studyCount} estudios clínicos
      </p>
    </div>
  );
}
```

**Tiempo estimado**: 1 día

#### 5.2 Streaming/Progressive Enhancement
- Mostrar datos parciales mientras se genera
- WebSocket o SSE para updates en tiempo real
- Fallback a polling si no disponible

**Tiempo estimado**: 1 día

#### 5.3 Error Handling & Fallbacks
```tsx
// Escenarios:
// - PubMed no responde → Mostrar datos limitados
// - Bedrock error → Usar análisis básico
// - DynamoDB timeout → Generar sin cachear
```

**Tiempo estimado**: 1 día

### Entregables Fase 5
- [ ] Loading states implementados
- [ ] Experiencia fluida para primera búsqueda
- [ ] Manejo elegante de errores
- [ ] Tests E2E para flujos completos

---

## 📅 FASE 6: Optimización (Días 13-14 y ongoing)

### Objetivo
Optimizar costos, performance y calidad.

### Tareas

#### 6.1 Background Job para Pre-generación
```typescript
// scripts/pre-generate-popular.ts

// Cron job que corre diariamente
// Identifica top 100 búsquedas
// Pre-genera evidencia para ellos
// Actualiza cache proactivamente
```

**Tiempo estimado**: 1 día

#### 6.2 Cost Optimization
- Monitoreo de costos Bedrock
- Implementar circuit breakers
- Rate limiting inteligente
- Cache warming estratégico

**Tiempo estimado**: 1 día

#### 6.3 Quality Improvements
- A/B testing de prompts
- Human-in-the-loop review workflow
- Detección de low-quality generations
- Auto-mejora basada en feedback

**Tiempo estimado**: Ongoing

### Entregables Fase 6
- [ ] Background jobs desplegados
- [ ] Dashboard de costos
- [ ] Sistema de quality scoring
- [ ] Documentación de mejoras

---

## 📊 Métricas de Éxito

### KPIs Técnicos
- ✅ **Cobertura**: 100% de suplementos (vs 5 actual)
- ✅ **Latencia P50**: <100ms (cache hit)
- ✅ **Latencia P95**: <8s (primera generación)
- ✅ **Cache Hit Rate**: >80% después de 1 semana
- ✅ **Error Rate**: <1%

### KPIs de Negocio
- ✅ **Costo mensual**: <$50 para 5,000 búsquedas únicas
- ✅ **Calidad**: Grade A-B en >90% de generaciones
- ✅ **Verificabilidad**: 100% con PMIDs incluidos
- ✅ **Satisfacción usuario**: Feedback positivo en UX

---

## 🛠️ Comandos Útiles

### Desarrollo
```bash
# Ejecutar tests
npm test

# Ejecutar prueba de generación dinámica
npx tsx scripts/test-dynamic-evidence.ts

# Verificar Medical MCP
ls -la mcp-servers/medical-mcp/build/

# Local DynamoDB (para desarrollo)
docker run -p 8000:8000 amazon/dynamodb-local
```

### Deployment
```bash
# Deploy DynamoDB table
cdk deploy SupplementsCacheStack

# Deploy Lambda functions
npm run deploy:lambdas

# Invalidate cache
npm run invalidate-cache -- vitamin-a
```

### Monitoreo
```bash
# Ver logs de generación
aws logs tail /aws/lambda/generate-evidence --follow

# Métricas de cache
aws cloudwatch get-metric-statistics \
  --namespace SupplementsCache \
  --metric-name CacheHitRate \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Costos de Bedrock más altos de lo esperado
**Mitigación**:
- Implementar budget alerts en AWS
- Rate limiting agresivo inicialmente
- Pre-generar top 50 antes de lanzar

### Riesgo 2: Calidad inconsistente de generaciones
**Mitigación**:
- Validación automática de output
- Human review para primeras 100 generaciones
- A/B testing de prompts

### Riesgo 3: PubMed rate limiting
**Mitigación**:
- Respetar límites de API (3 req/s)
- Implementar exponential backoff
- Cachear searches agresivamente

### Riesgo 4: DynamoDB costos inesperados
**Mitigación**:
- Usar on-demand billing inicialmente
- Monitorear RCU/WCU
- TTL para limpiar datos viejos

---

## 📞 Próximos Pasos Inmediatos

### Esta Semana (Días 2-4)
1. ✅ **Hoy**: Fase 1 completada
2. **Mañana**: Empezar Fase 2 - Crear Lambda MCP integration
3. **Día 3**: Implementar cliente MCP TypeScript
4. **Día 4**: Tests de integración Fase 2

### Próxima Semana (Días 5-9)
- Fase 3: Análisis con Bedrock
- Fase 4: Sistema de caching

### Semana 3 (Días 10-14)
- Fase 5: UX y frontend
- Fase 6: Optimización inicial

---

## 📚 Recursos

### Documentación
- Medical MCP: https://github.com/JamesANZ/medical-mcp
- PubMed API: https://www.ncbi.nlm.nih.gov/books/NBK25501/
- Bedrock Claude: https://docs.aws.amazon.com/bedrock/
- DynamoDB Best Practices: https://docs.aws.amazon.com/dynamodb/

### Archivos Clave del Proyecto
- `lib/portal/supplements-evidence-dynamic.ts` - Sistema de generación
- `lib/services/dynamodb-cache.ts` - Cache service
- `infrastructure/dynamodb-schema.ts` - Schema definition
- `scripts/test-dynamic-evidence.ts` - Testing

---

**Última actualización**: 2025-11-20
**Estado**: ✅ Fase 1 completada, listo para Fase 2
**Próxima reunión de revisión**: Después de completar Fase 2
