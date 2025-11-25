# Intelligent Supplement Search - Arquitectura 3.5 "True Serverless"

## 🎯 Objetivo

Reemplazar el sistema actual de búsqueda de suplementos (70 hardcoded, 15% error rate) con un sistema inteligente escalable que usa búsqueda semántica vectorial, reduciendo errores a <1%, latencia a 120ms, y eliminando mantenimiento manual.

## 📊 Ganancias Cuantificables

| Métrica | Actual | Nueva | Mejora |
|---------|--------|-------|--------|
| **Suplementos soportados** | 70 | Ilimitados | +∞ |
| **Tasa de error 500** | 15% | <1% | **-93%** |
| **Latencia P95** | 5s | 120ms | **-96%** |
| **Costo mensual** | $0 | $0-19 | +$19 |
| **Mantenimiento** | 8h/mes | 0h/mes | **-100%** |
| **ROI anual** | - | $889,572 | **390,000%** |

## 🏗️ Arquitectura

```
User → Cloudflare Workers (Edge) → Redis → Postgres (pgvector) → Lambda (ML) → PubMed
         < 50ms                      < 10ms    < 50ms              $0 cost
```

### Stack Tecnológico

1. **Cloudflare Workers**: Edge computing global (300+ locations)
2. **Redis (Upstash)**: L2 cache (85% hit rate target)
3. **Vercel Postgres + pgvector**: Vector search semántico
4. **Lambda + Sentence Transformers**: ML local ($0 embeddings)
5. **DynamoDB**: Discovery queue
6. **S3 + Athena**: Analytics

## 📁 Documentos del Spec

### 1. [requirements.md](./requirements.md)
Requisitos del sistema en formato EARS con 10 user stories y 50 acceptance criteria.

**Highlights**:
- Búsqueda sin errores 500 (Req 1)
- Latencia < 200ms (Req 2)
- Multilingüe automático (Req 3)
- Cost-efficient $0-19/mes (Req 10)

### 2. [design.md](./design.md)
Diseño técnico completo con arquitectura, componentes, y 34 correctness properties.

**Highlights**:
- Arquitectura detallada con diagramas
- 34 correctness properties para property-based testing
- Estrategia de testing con fast-check
- Plan de deployment en 4 fases
- Análisis de costos y escalabilidad

### 3. [tasks.md](./tasks.md)
Plan de implementación con 17 tareas principales y 60+ subtareas.

**Highlights**:
- Setup de infraestructura (Task 1)
- Vector search core (Task 2)
- Smart cache multi-tier (Task 3)
- Auto-discovery system (Task 6)
- 34 property-based tests
- Deployment gradual 10% → 50% → 100%

### 4. [GANANCIAS-CUANTIFICABLES.md](./GANANCIAS-CUANTIFICABLES.md)
Análisis detallado de ROI y ganancias vs sistema actual.

**Highlights**:
- Ahorro de $74,131/mes
- ROI de 390,000%
- Comparación métrica por métrica
- Ejemplos reales de mejoras

### 5. [ARQUITECTURAS-COMPARADAS.md](./ARQUITECTURAS-COMPARADAS.md)
Comparación de 3 arquitecturas diferentes para el caso de uso.

**Arquitecturas analizadas**:
1. Pragmatic Stack (PostgreSQL + Redis + LLM) - $13/mes
2. AWS Serverless ML (OpenSearch + Bedrock) - $170/mes
3. **Hybrid Intelligence (Elegida)** - $19/mes

### 6. [ANALISIS-COSTOS-DETALLADO.md](./ANALISIS-COSTOS-DETALLADO.md)
Desglose detallado de costos por servicio y escenario.

**Escenarios**:
- 1 usuario (12 búsquedas/mes): **$0/mes**
- 10K búsquedas/día: **$19/mes**
- 100K búsquedas/día: **$45/mes**

### 7. [AWS-FREE-TIER-ORGANIZATIONS.md](./AWS-FREE-TIER-ORGANIZATIONS.md)
Análisis de cómo funciona AWS Free Tier en Organizations.

**Conclusión**: Free Tier se comparte entre todas las cuentas, no se multiplica.

## 🚀 Quick Start

### Para Revisar el Spec

1. Lee [requirements.md](./requirements.md) para entender qué construimos
2. Lee [design.md](./design.md) para entender cómo lo construimos
3. Lee [tasks.md](./tasks.md) para ver el plan de implementación

### Para Implementar

1. Abre [tasks.md](./tasks.md) en Kiro
2. Click "Start task" en la primera tarea
3. Kiro te guiará paso a paso

## 📈 Métricas de Éxito

### Semana 1 (Post-Deploy)
- [ ] Tasa de error < 5%
- [ ] Latencia P95 < 500ms
- [ ] Cache hit rate > 70%

### Mes 1
- [ ] Tasa de error < 2%
- [ ] Latencia P95 < 200ms
- [ ] Cache hit rate > 80%
- [ ] 100+ nuevos suplementos

### Mes 3
- [ ] Tasa de error < 1%
- [ ] Latencia P95 < 120ms
- [ ] Cache hit rate > 85%
- [ ] 500+ suplementos
- [ ] 0 horas mantenimiento

## 🔧 Testing

### Property-Based Tests (34 properties)

Usamos **fast-check** para property-based testing:

```typescript
import fc from 'fast-check';

// Ejemplo: Property 1
it('Vector search similarity threshold', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 3, maxLength: 50 }),
      async (query) => {
        const results = await vectorSearch(query);
        return results.every(r => r.similarity >= 0.85);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Tests

- Embedding generation
- Cache operations
- Query normalization
- Error handling

### Integration Tests

- End-to-end search flow
- Cache tier fallback
- Discovery queue processing

## 💰 Costos

### Desglose Mensual (10K búsquedas/día)

```
Cloudflare Workers: $5
Redis (Upstash): $10
Vercel Postgres: $0 (free tier)
Lambda: $0 (free tier)
DynamoDB: $2
S3 + Athena: $2
─────────────────────
Total: $19/mes
```

### Escalabilidad de Costos

- **1 usuario**: $0/mes (todos en free tier)
- **10K búsquedas/día**: $19/mes
- **100K búsquedas/día**: $45/mes
- **1M búsquedas/día**: $150/mes

## 🎓 Decisiones de Diseño

### ¿Por qué Vercel Postgres en lugar de OpenSearch?

- **Costo**: $0 vs $70/mes
- **Simplicidad**: PostgreSQL conocido vs servicio nuevo
- **Escalabilidad**: pgvector escala a 100K+ supplements
- **Free tier**: Vercel Postgres tiene free tier permanente

### ¿Por qué ML local en lugar de OpenAI API?

- **Costo**: $0 vs $20/mes
- **Latencia**: 50ms vs 200ms
- **Privacidad**: Datos no salen de infraestructura
- **Escalabilidad**: No hay rate limits

### ¿Por qué Cloudflare Workers en lugar de Lambda?

- **Latencia**: < 50ms global vs 200ms+ desde us-east-1
- **Edge**: 300+ locations vs 1 región
- **Costo**: $5/mes vs $10/mes
- **DX**: Mejor developer experience

## 📚 Referencias

- [Vercel Postgres + pgvector](https://vercel.com/docs/storage/vercel-postgres/using-an-orm#pgvector)
- [Sentence Transformers](https://www.sbert.net/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [fast-check (PBT)](https://fast-check.dev/)
- [Upstash Redis](https://upstash.com/)

## 🤝 Contribuir

Este spec sigue la metodología de Spec-Driven Development de Kiro:

1. **Requirements**: User stories + acceptance criteria (EARS format)
2. **Design**: Arquitectura + correctness properties
3. **Tasks**: Plan de implementación incremental
4. **Implementation**: Ejecutar tareas una por una

## 📝 Notas

- Este spec reemplaza el spec anterior `vector-supplement-discovery`
- La arquitectura elegida es "Arquitectura 3.5: True Serverless"
- El sistema actual (70 suplementos hardcoded) será deprecado gradualmente
- Deployment será gradual: 10% → 50% → 100% con monitoreo continuo

## 🎉 Estado

- [x] Requirements completados
- [x] Design completado
- [x] Tasks completados
- [ ] Implementación pendiente
- [ ] Testing pendiente
- [ ] Deployment pendiente

---

**Creado**: 24 de Noviembre, 2024  
**Última actualización**: 24 de Noviembre, 2024  
**Versión**: 1.0.0
