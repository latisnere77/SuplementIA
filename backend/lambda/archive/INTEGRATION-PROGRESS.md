# 🚀 Integración del Sistema Inteligente - Progreso

## ✅ Completado

### 1. **Código del Lambda Actualizado**

**Archivo**: `backend/lambda/lambda_function.py`

- ✅ Reemplazado el código placeholder con la versión integrada
- ✅ Incluye llamadas al sistema inteligente (orchestration endpoint)
- ✅ Maneja estudios REALES de PubMed
- ✅ Sistema de fallback configurado
- ✅ Backup creado: `lambda_function.py.backup`

**Características**:
- Llama al orchestration endpoint (`/api/portal/enrich`)
- Recibe estudios reales de PubMed
- Transforma datos enriquecidos al formato de recomendación
- Fallback automático si el sistema inteligente no está disponible
- Logging completo con metadata

---

### 2. **Dependencies Configuradas**

**Archivo**: `backend/lambda/requirements.txt`

```txt
requests==2.31.0  # ✅ Para llamadas HTTP al orchestration endpoint
boto3>=1.28.0     # ✅ AWS SDK (incluido en Lambda runtime)
```

---

### 3. **Variables de Entorno Configuradas**

**Lambda**: `ankosoft-formulation-api`
**Región**: `us-east-1`

**Variables configuradas**:
```bash
ENRICH_API_URL=http://localhost:3000/api/portal/enrich  # ⚠️ Needs update
FALLBACK_ENABLED=true                                     # ✅ Fallback habilitado
ENRICH_TIMEOUT=60                                         # ✅ 60 segundos timeout
```

**⚠️ IMPORTANTE**: `ENRICH_API_URL` está configurado como `localhost` temporalmente.
**Debe actualizarse** cuando Next.js esté deployado en producción.

---

### 4. **Dockerfile Creado**

**Archivo**: `backend/lambda/Dockerfile`

```dockerfile
FROM public.ecr.aws/lambda/python:3.11
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/
COPY query_validator.py ${LAMBDA_TASK_ROOT}/
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt
CMD ["lambda_function.lambda_handler"]
```

---

### 5. **Script de Deployment Creado**

**Archivo**: `backend/lambda/deploy-docker.sh`

**Funcionalidad**:
- Autentica Docker con ECR
- Construye imagen Docker
- Sube imagen a ECR
- Actualiza función Lambda
- Verifica deployment

**Uso**:
```bash
cd backend/lambda
./deploy-docker.sh
```

---

## ⏳ Pendiente

### 1. **Iniciar Docker** (Requisito inmediato)

**Error actual**: `Docker no está corriendo`

**Solución**:
1. Abrir Docker Desktop, o
2. Iniciar daemon de Docker:
   ```bash
   # macOS
   open -a Docker

   # Linux
   sudo systemctl start docker
   ```

3. Verificar que Docker está corriendo:
   ```bash
   docker info
   ```

---

### 2. **Deployar Lambda** (Una vez Docker esté corriendo)

```bash
cd /Users/latisnere/documents/suplementia/backend/lambda
./deploy-docker.sh
```

**Qué hace**:
1. ✅ Autentica con ECR
2. ✅ Construye imagen Docker con el código actualizado
3. ✅ Sube imagen a ECR: `239378269775.dkr.ecr.us-east-1.amazonaws.com/ankosoft-formulation-api`
4. ✅ Actualiza Lambda `ankosoft-formulation-api` con la nueva imagen
5. ✅ Espera a que Lambda esté listo

**Duración estimada**: 3-5 minutos

---

### 3. **Deployar Next.js App** (Para obtener URL de producción)

**Opciones**:

#### Opción A: Vercel (Recomendado)
```bash
cd /Users/latisnere/documents/suplementia
vercel --prod
```

Esto retornará una URL como: `https://suplementia-xxx.vercel.app`

#### Opción B: Otra plataforma
- Netlify
- AWS Amplify
- Render
- Etc.

**IMPORTANTE**: La URL que obtengas aquí es la que necesitas para el siguiente paso.

---

### 4. **Actualizar Variable de Entorno del Lambda**

Una vez que tengas la URL de producción de Next.js (ej: `https://suplementia.vercel.app`):

```bash
# Obtener variables actuales
aws lambda get-function-configuration \
  --function-name ankosoft-formulation-api \
  --region us-east-1 \
  --query 'Environment.Variables' > /tmp/lambda-env.json

# Editar /tmp/lambda-env.json para cambiar ENRICH_API_URL

# Actualizar Lambda
aws lambda update-function-configuration \
  --function-name ankosoft-formulation-api \
  --environment "Variables={ENRICH_API_URL=https://suplementia.vercel.app/api/portal/enrich,FALLBACK_ENABLED=true,ENRICH_TIMEOUT=60,...}" \
  --region us-east-1
```

**O más simple con script**:
```bash
# Guardado como backend/lambda/update-enrich-url.sh
PRODUCTION_URL="https://suplementia.vercel.app"

aws lambda update-function-configuration \
  --function-name ankosoft-formulation-api \
  --environment "Variables={ENRICH_API_URL=${PRODUCTION_URL}/api/portal/enrich,FALLBACK_ENABLED=true,ENRICH_TIMEOUT=60,ENABLE_LANCEDB_FIXED_SCHEMA=true,ENABLE_VIRTUAL_LAB=true,REDIS_PORT=6379,ENABLE_COMPATIBILITY_VALIDATION=true,FEEDBACK_TABLE=ankosoft-formulation-feedback,ENABLE_META_ANALYSIS=true,REDIS_ENDPOINT=formulation-redis-1763391998.opsnyf.0001.use1.cache.amazonaws.com,ENABLE_SYNERGIES=true}" \
  --region us-east-1
```

---

### 5. **Probar Sistema End-to-End**

```bash
# Test 1: Caffeine
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H 'Content-Type: application/json' \
  -d '{"category":"caffeine","age":30,"gender":"male","location":"CDMX"}' | jq '.'

# Verificar en la respuesta:
# - recommendation._enrichment_metadata.hasRealData == true
# - recommendation._enrichment_metadata.studiesUsed > 0
# - recommendation._enrichment_metadata.intelligentSystem == true
```

```bash
# Test 2: Ashwagandha
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H 'Content-Type: application/json' \
  -d '{"category":"ashwagandha","age":30,"gender":"male","location":"CDMX"}' | jq '.recommendation._enrichment_metadata'

# Esperado:
# {
#   "studiesUsed": 10-20,
#   "hasRealData": true,
#   "intelligentSystem": true,
#   "studiesSource": "PubMed"
# }
```

---

## 📊 Arquitectura Actual

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario busca "Ashwagandha" en Frontend                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Frontend → Backend Lambda                                   │
│ POST /portal/recommend                                       │
│ https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/... │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Backend Lambda (ankosoft-formulation-api)                   │
│ - Valida query con guardrails ✅                            │
│ - Llama orchestration endpoint ⏳                           │
│   → POST /api/portal/enrich                                  │
│   → URL: [NEEDS PRODUCTION URL]                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Orchestration Endpoint (Next.js) ⏳                         │
│ /api/portal/enrich                                           │
│                                                              │
│ STEP 1: Fetch studies from PubMed                           │
│   → studies-fetcher Lambda ✅                               │
│   → 20 estudios reales                                       │
│                                                              │
│ STEP 2: Enrich with Claude                                  │
│   → content-enricher Lambda ✅                              │
│   → Análisis de estudios reales                             │
│   → Grades precisos (A-F)                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Response al Backend Lambda                                  │
│ {                                                            │
│   success: true,                                             │
│   data: {...},                                               │
│   metadata: {                                                │
│     studiesUsed: 20,                                         │
│     hasRealData: true,                                       │
│     intelligentSystem: true                                  │
│   }                                                          │
│ }                                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────┐
│ Transform & Response al Frontend                            │
│ - Datos enriquecidos con estudios REALES                    │
│ - Calificaciones precisas                                   │
│ - Metadata verificable                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Pasos Inmediatos

### **Paso 1**: Iniciar Docker
```bash
open -a Docker  # macOS
# O abrir Docker Desktop manualmente
```

### **Paso 2**: Deployar Lambda
```bash
cd /Users/latisnere/documents/suplementia/backend/lambda
./deploy-docker.sh
```

### **Paso 3**: Deployar Next.js a Vercel
```bash
cd /Users/latisnere/documents/suplementia
vercel --prod
```
Guardar la URL que retorna (ej: `https://suplementia-xxx.vercel.app`)

### **Paso 4**: Actualizar Variable de Entorno
```bash
PRODUCTION_URL="[URL de Vercel del Paso 3]"

aws lambda update-function-configuration \
  --function-name ankosoft-formulation-api \
  --environment "Variables={ENRICH_API_URL=${PRODUCTION_URL}/api/portal/enrich,FALLBACK_ENABLED=true,ENRICH_TIMEOUT=60,ENABLE_LANCEDB_FIXED_SCHEMA=true,ENABLE_VIRTUAL_LAB=true,REDIS_PORT=6379,ENABLE_COMPATIBILITY_VALIDATION=true,FEEDBACK_TABLE=ankosoft-formulation-feedback,ENABLE_META_ANALYSIS=true,REDIS_ENDPOINT=formulation-redis-1763391998.opsnyf.0001.use1.cache.amazonaws.com,ENABLE_SYNERGIES=true}" \
  --region us-east-1
```

### **Paso 5**: Probar Sistema
```bash
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H 'Content-Type: application/json' \
  -d '{"category":"caffeine","age":30,"gender":"male","location":"CDMX"}' \
  | jq '.recommendation._enrichment_metadata'
```

**Esperado**:
```json
{
  "studiesUsed": 5-20,
  "hasRealData": true,
  "intelligentSystem": true,
  "studiesSource": "PubMed"
}
```

---

## 📁 Archivos Modificados/Creados

### Modificados:
- ✅ `backend/lambda/lambda_function.py` - Integrado con sistema inteligente
- ✅ `backend/lambda/requirements.txt` - Ya tenía requests
- ✅ Lambda env vars - Configuradas (ENRICH_API_URL pendiente)

### Creados:
- ✅ `backend/lambda/Dockerfile` - Para Docker deployment
- ✅ `backend/lambda/deploy-docker.sh` - Script de deployment
- ✅ `backend/lambda/lambda_function.py.backup` - Backup del placeholder
- ✅ `backend/lambda/INTEGRATION-PROGRESS.md` - Este archivo

### Ya existían (funcionando):
- ✅ `backend/lambda/content-enricher/` - Lambda de enriquecimiento
- ✅ `backend/lambda/studies-fetcher/` - Lambda de estudios
- ✅ `app/api/portal/enrich/route.ts` - Orchestration endpoint
- ✅ `backend/lambda/query_validator.py` - Validador de queries

---

## 🔍 Troubleshooting

### Docker no inicia
```bash
# Verificar versión
docker --version

# Reinstalar si es necesario
brew install --cask docker
```

### Error al deployar Lambda
```bash
# Ver logs
aws logs tail /aws/lambda/ankosoft-formulation-api --follow --region us-east-1

# Verificar imagen en ECR
aws ecr describe-images \
  --repository-name ankosoft-formulation-api \
  --region us-east-1
```

### Next.js no deploya
```bash
# Login a Vercel
vercel login

# Link al proyecto
vercel link

# Deploy
vercel --prod
```

---

## 📚 Referencias

- [Documentación Sistema Inteligente](../../docs/INTELLIGENT-EVIDENCE-SYSTEM.md)
- [Guía de Integración](./INTEGRATION-GUIDE.md)
- [Implementación Completa](../../IMPLEMENTATION-COMPLETE.md)
- [Lambda Code](./lambda_function.py)
- [Orchestration Endpoint](../../app/api/portal/enrich/route.ts)

---

**Última actualización**: 2024-11-19 23:00 PST
**Status**: ⏳ Listo para deployment (requiere Docker running)
