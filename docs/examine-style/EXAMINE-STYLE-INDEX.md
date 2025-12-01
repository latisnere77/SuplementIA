# 📚 Examine-Style Format - Índice de Documentación

## 🎯 Inicio Rápido

**¿Primera vez aquí?** Lee esto primero:
1. **`EXAMINE-STYLE-SUMMARY.md`** - Resumen ejecutivo (2 min)
2. **`IMPLEMENTACION-COMPLETA-NOV22.md`** - Overview completo (5 min)

**¿Listo para deployar?**
1. **`EXAMINE-STYLE-READY-TO-DEPLOY.md`** - Guía de deployment
2. **`DEPLOY-EXAMINE-STYLE.sh`** - Script automatizado

---

## 📖 Documentación por Categoría

### 🚀 Deployment

| Archivo | Descripción | Cuándo usar |
|---------|-------------|-------------|
| **`EXAMINE-STYLE-READY-TO-DEPLOY.md`** | Guía completa de deployment con checklist | Antes de deployar |
| **`DEPLOY-EXAMINE-STYLE.sh`** | Script automatizado de deployment | Para deployar |
| **`EXAMINE-STYLE-SUMMARY.md`** | Resumen ejecutivo con comandos | Quick reference |

### 📝 Implementación

| Archivo | Descripción | Cuándo usar |
|---------|-------------|-------------|
| **`IMPLEMENTACION-COMPLETA-NOV22.md`** | Resumen completo de la implementación | Overview general |
| **`EXAMINE-STYLE-IMPLEMENTATION-COMPLETE.md`** | Detalles técnicos completos | Deep dive técnico |
| **`RESUMEN-EXAMINE-STYLE-NOV22.md`** | Resumen detallado en español | Referencia detallada |

### 🧪 Testing

| Archivo | Descripción | Cuándo usar |
|---------|-------------|-------------|
| **`scripts/test-examine-style.ts`** | Script de comparación de formatos | Para probar ambos formatos |

### 📊 Análisis

| Archivo | Descripción | Cuándo usar |
|---------|-------------|-------------|
| **`MAGNESIUM-CONTENT-ANALYSIS.md`** | Análisis de formato Examine.com | Entender el formato |
| **`EXAMINE-STYLE-IMPLEMENTATION-PLAN.md`** | Plan original de implementación | Contexto histórico |

---

## 🗂️ Estructura de Archivos

### Backend (Lambda)

```
backend/lambda/content-enricher/src/
├── types.ts                      ✅ Modificado - Tipos duales
├── prompts-examine-style.ts      ✅ NUEVO - Prompt Examine
├── bedrock.ts                    ✅ Modificado - Soporte dual
├── index.ts                      ✅ Modificado - contentType
└── cache.ts                      ✅ Modificado - Union types
```

### Frontend

```
components/portal/
└── ExamineStyleView.tsx          ✅ NUEVO - Renderer Examine
```

### Testing

```
scripts/
└── test-examine-style.ts         ✅ NUEVO - Test comparación
```

### Documentación

```
/
├── EXAMINE-STYLE-INDEX.md                      📚 Este archivo
├── EXAMINE-STYLE-SUMMARY.md                    📝 Resumen ejecutivo
├── IMPLEMENTACION-COMPLETA-NOV22.md            📝 Overview completo
├── EXAMINE-STYLE-READY-TO-DEPLOY.md            🚀 Guía deployment
├── EXAMINE-STYLE-IMPLEMENTATION-COMPLETE.md    📝 Detalles técnicos
├── RESUMEN-EXAMINE-STYLE-NOV22.md              📝 Resumen detallado
├── MAGNESIUM-CONTENT-ANALYSIS.md               📊 Análisis formato
├── EXAMINE-STYLE-IMPLEMENTATION-PLAN.md        📋 Plan original
└── DEPLOY-EXAMINE-STYLE.sh                     🚀 Script deploy
```

---

## 🎯 Guías por Objetivo

### "Quiero entender qué se implementó"
1. Lee **`EXAMINE-STYLE-SUMMARY.md`** (2 min)
2. Lee **`IMPLEMENTACION-COMPLETA-NOV22.md`** (5 min)
3. Opcional: **`EXAMINE-STYLE-IMPLEMENTATION-COMPLETE.md`** (15 min)

### "Quiero deployar a producción"
1. Lee **`EXAMINE-STYLE-READY-TO-DEPLOY.md`** (10 min)
2. Ejecuta **`./DEPLOY-EXAMINE-STYLE.sh`**
3. Sigue checklist en **`EXAMINE-STYLE-READY-TO-DEPLOY.md`**

### "Quiero probar localmente"
1. Lee **`EXAMINE-STYLE-SUMMARY.md`** - sección "Cómo usar"
2. Ejecuta **`npx tsx scripts/test-examine-style.ts`**
3. Revisa resultados

### "Quiero entender el formato Examine.com"
1. Lee **`MAGNESIUM-CONTENT-ANALYSIS.md`**
2. Compara con **`EXAMINE-STYLE-IMPLEMENTATION-COMPLETE.md`**
3. Revisa ejemplos en **`RESUMEN-EXAMINE-STYLE-NOV22.md`**

### "Necesito detalles técnicos"
1. Lee **`EXAMINE-STYLE-IMPLEMENTATION-COMPLETE.md`**
2. Revisa código en `backend/lambda/content-enricher/src/`
3. Revisa tipos en `types.ts`

### "Tengo un problema"
1. Revisa **`EXAMINE-STYLE-READY-TO-DEPLOY.md`** - sección "Rollback Plan"
2. Revisa logs: `aws logs tail /aws/lambda/content-enricher --follow`
3. Revisa X-Ray traces

---

## 📊 Comparación de Formatos

### Standard Format (Original)

**Características:**
- Evidence grades: A, B, C, D
- Secciones: worksFor, doesntWorkFor, mechanisms
- Formato establecido

**Ejemplo:**
```json
{
  "worksFor": [{
    "condition": "Type 2 Diabetes",
    "evidenceGrade": "B",
    "effectSize": "Moderate",
    "studyCount": 12
  }]
}
```

**Cuándo usar:**
- Default (si no se especifica contentType)
- Usuarios acostumbrados al formato actual
- Integración con código existente

### Examine-Style Format (Nuevo)

**Características:**
- Effect magnitudes: Small, Moderate, Large, No effect
- Datos cuantitativos precisos
- Evidence counts explícitos
- Contexto adicional

**Ejemplo:**
```json
{
  "benefitsByCondition": [{
    "condition": "Type 2 Diabetes",
    "effect": "Moderate",
    "quantitativeData": "Reduces fasting glucose by 15-20 mg/dL",
    "evidence": "12 studies, 1,847 participants",
    "context": "Greater effect in magnesium-deficient individuals",
    "studyTypes": ["RCT", "Meta-analysis"]
  }]
}
```

**Cuándo usar:**
- Usuarios que prefieren datos cuantitativos
- Análisis más detallado
- Comparación con Examine.com

---

## 🔧 Comandos Útiles

### Build & Deploy

```bash
# Build Lambda
cd backend/lambda/content-enricher && npm run build

# Deploy (automatizado)
./DEPLOY-EXAMINE-STYLE.sh

# Deploy (manual)
aws lambda update-function-code \
  --function-name content-enricher \
  --zip-file fileb://lambda.zip
```

### Testing

```bash
# Test comparación
export LAMBDA_URL="https://your-lambda-url.amazonaws.com"
npx tsx scripts/test-examine-style.ts

# Test standard format
curl -X POST $LAMBDA_URL \
  -H "Content-Type: application/json" \
  -d '{"supplementId": "magnesium"}'

# Test examine-style format
curl -X POST $LAMBDA_URL \
  -H "Content-Type: application/json" \
  -d '{"supplementId": "magnesium", "contentType": "examine-style"}'
```

### Monitoring

```bash
# Ver logs
aws logs tail /aws/lambda/content-enricher --follow

# Ver función
aws lambda get-function --function-name content-enricher

# Ver métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=content-enricher \
  --start-time 2025-11-22T00:00:00Z \
  --end-time 2025-11-22T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

---

## ✅ Checklist Rápido

### Pre-Deploy
- [ ] Leí **`EXAMINE-STYLE-READY-TO-DEPLOY.md`**
- [ ] Backend compila: `npm run build`
- [ ] Tengo acceso a AWS CLI
- [ ] Conozco el nombre de la Lambda function

### Deploy
- [ ] Ejecuté **`./DEPLOY-EXAMINE-STYLE.sh`**
- [ ] Deployment exitoso
- [ ] Tests pasaron

### Post-Deploy
- [ ] Verifiqué logs en CloudWatch
- [ ] Probé standard format
- [ ] Probé examine-style format
- [ ] Verifiqué métricas

---

## 🎓 Recursos Adicionales

### Documentación Externa
- [Examine.com](https://examine.com) - Inspiración del formato
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

### Documentación Interna
- `README.md` - Documentación general del proyecto
- `backend/lambda/content-enricher/README.md` - Docs de Lambda
- `.kiro/specs/modern-architecture/` - Specs de arquitectura

---

## 📞 Soporte

### Problemas Comunes

**Build falla:**
- Verifica Node.js version: `node --version`
- Reinstala dependencias: `npm ci`
- Revisa errores de TypeScript

**Deploy falla:**
- Verifica AWS credentials: `aws sts get-caller-identity`
- Verifica permisos de Lambda
- Revisa nombre de función

**Tests fallan:**
- Verifica Lambda URL
- Verifica que Lambda esté deployada
- Revisa logs de CloudWatch

### Contacto
- Revisa logs: CloudWatch Logs
- Revisa traces: AWS X-Ray
- Revisa métricas: CloudWatch Metrics

---

## 🎉 Status

**Implementación: COMPLETA** ✅
**Documentación: COMPLETA** ✅
**Testing: COMPLETO** ✅
**Ready to Deploy: SÍ** ✅

---

*Última actualización: 22 de Noviembre, 2025*
*Versión: 1.0.0*
