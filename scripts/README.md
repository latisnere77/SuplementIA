# 🛠️ Scripts Útiles

## 📋 Scripts Activos

### Testing de Sistema

#### Examine-Style Format
- **`test-examine-style.ts`** - Compara formatos standard vs examine-style
  ```bash
  export LAMBDA_URL="https://your-lambda-url.amazonaws.com"
  npx tsx scripts/test-examine-style.ts
  ```

#### Intelligent Search
- **`test-intelligent-search.ts`** - Prueba sistema de búsqueda inteligente
  ```bash
  npx tsx scripts/test-intelligent-search.ts
  ```

#### Sistema Completo
- **`test-complete-system.ts`** - Prueba flujo completo end-to-end
  ```bash
  npx tsx scripts/test-complete-system.ts
  ```

- **`test-full-system.ts`** - Prueba sistema completo con múltiples suplementos
  ```bash
  npx tsx scripts/test-full-system.ts
  ```

### Testing de Componentes

#### PubMed Integration
- **`test-pubmed-direct.ts`** - Prueba directa de PubMed API
- **`test-pubmed-search.ts`** - Prueba búsqueda en PubMed
- **`test-improved-pubmed-query.ts`** - Prueba queries mejoradas

#### Content Enrichment
- **`test-enrich-v2.ts`** - Prueba enrichment v2
- **`test-dynamic-evidence.ts`** - Prueba evidencia dinámica

#### Frontend Integration
- **`test-frontend-integration.ts`** - Prueba integración frontend
- **`test-progress-system.ts`** - Prueba sistema de progreso

### Testing de Suplementos Específicos

- **`test-glicinato-magnesio.ts`** - Glicinato de magnesio
- **`test-magnesio-pubmed.ts`** - Magnesio (PubMed)
- **`test-magnesium-glycinate-improved.ts`** - Magnesium glycinate mejorado
- **`test-collagen-peptides.ts`** - Collagen peptides
- **`test-vitamin-b12-backend.ts`** - Vitamin B12
- **`test-vitamina-d-streaming.ts`** - Vitamina D (streaming)
- **`test-saw-palmetto-production.ts`** - Saw Palmetto (producción)

### Monitoring y Tracing

#### CloudWatch
- **`check-saw-palmetto-cloudwatch.sh`** - Revisa logs de Saw Palmetto
- **`trace-search-cloudwatch.ts`** - Trace de búsquedas en CloudWatch

#### X-Ray
- **`trace-search-xray.ts`** - Trace de búsquedas en X-Ray
- **`trace-vitamin-b12.ts`** - Trace de Vitamin B12

#### Scripts de Monitoreo
- **`monitorear-portal.sh`** - Monitoreo continuo del portal
- **`monitoreo-continuo.sh`** - Monitoreo general
- **`trace-full-flow.sh`** - Trace de flujo completo
- **`trace-saw-palmetto-production.sh`** - Trace de Saw Palmetto

### Utilidades

#### Conectividad
- **`probar-conectividad.sh`** - Prueba conectividad AWS
- **`verificar-credenciales-aws.sh`** - Verifica credenciales AWS
- **`verificar-variables-vercel.sh`** - Verifica variables Vercel

#### DynamoDB
- **`test-dynamodb-connection.ts`** - Prueba conexión DynamoDB
- **`test-dynamodb-simple.ts`** - Prueba simple de DynamoDB

#### Query Normalization
- **`test-query-normalization.ts`** - Prueba normalización de queries
- **`test-multiple-ingredients.ts`** - Prueba múltiples ingredientes

### Validación
- **`validar-flujo-completo.sh`** - Valida flujo completo del sistema

---

## 📂 Scripts Archivados

Los scripts legacy y obsoletos están en `scripts/archive/`:
- Scripts de debugging antiguos
- Scripts de cache específicos
- Scripts de diagnóstico de problemas resueltos
- Scripts de testing de features deprecadas

---

## 🚀 Uso Común

### 1. Probar Examine-Style Format
```bash
export LAMBDA_URL="https://your-lambda-url.amazonaws.com"
npx tsx scripts/test-examine-style.ts
```

### 2. Probar Sistema Completo
```bash
npx tsx scripts/test-complete-system.ts
```

### 3. Monitorear Portal
```bash
./scripts/monitorear-portal.sh
```

### 4. Verificar Conectividad AWS
```bash
./scripts/verificar-credenciales-aws.sh
```

### 5. Trace de Búsquedas
```bash
npx tsx scripts/trace-search-xray.ts
```

---

## 📝 Convenciones

### Naming:
- `test-*.ts` - Scripts de testing
- `trace-*.ts` - Scripts de tracing
- `check-*.sh` - Scripts de verificación
- `validar-*.sh` - Scripts de validación
- `verificar-*.sh` - Scripts de verificación

### Archivado:
- Mover a `archive/` cuando ya no sean necesarios
- Mantener para referencia histórica
- No eliminar, solo archivar

---

*Última actualización: 22 de Noviembre, 2025*
