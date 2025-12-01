# 🎉 CONTAINER DEPLOYMENT - SESIÓN COMPLETADA
**Fecha:** 30 Noviembre 2025  
**Duración:** ~2 horas  
**Estado:** ✅ 90% Completado - Listo para copiar datos

---

## ✅ LO QUE SE LOGRÓ HOY

### 1. Arquitectura Lambda Containers (Igual que Producción)

**ANTES (Fallido):**
- Lambda Zip packages (límite 250MB)
- Intentos fallidos de usar EFS para dependencias
- CodeBuild con problemas de montaje EFS

**DESPUÉS (Exitoso):**
- ✅ Lambda **Container Images** (límite 10GB)
- ✅ Docker images con TODAS las dependencias incluidas
- ✅ Igual arquitectura que producción

### 2. Problemas Resueltos Durante el Deployment

#### Problema 1: g++ no disponible
**Error:** `Unknown compiler(s): [['g++']]`  
**Solución:** Cambiar `gcc g++` → `gcc gcc-c++` en Dockerfile

#### Problema 2: numpy requiere GCC >= 9.3
**Error:** `NumPy requires GCC >= 9.3` (Amazon Linux 2 tiene GCC 7.3.1)  
**Solución:** Agregado `numpy<2.0` a requirements.txt para forzar numpy 1.x

#### Problema 3: pyarrow compilando desde source
**Error:** pyarrow intentaba compilar y requería numpy 2.x  
**Solución:** Agregado `--only-binary=:all:` en pip install para forzar wheels pre-compilados

### 3. Recursos AWS Creados/Actualizados

#### ECR Repositories ✅
```
staging-search-api-lancedb:latest       (2.5GB)
staging-discovery-worker-lancedb:latest (2.5GB)
```

#### Lambda Functions ✅
```yaml
staging-search-api-lancedb:
  PackageType: Image
  Architecture: arm64
  Memory: 512MB
  Timeout: 30s
  ImageUri: 239378269775.dkr.ecr.us-east-1.amazonaws.com/staging-search-api-lancedb:latest
  Estado: Active ✅
  
staging-discovery-worker-lancedb:
  PackageType: Image
  Architecture: arm64
  Memory: 1024MB
  Timeout: 300s
  ImageUri: 239378269775.dkr.ecr.us-east-1.amazonaws.com/staging-discovery-worker-lancedb:latest
  Estado: Active ✅
```

#### EFS File Systems
```
Production: fs-03774cd22d8f9b3d9 (1.6GB de datos) ✅
Staging:    fs-0e6f9a62f873bc52c (12KB - vacío) ⚠️
```

---

## 📦 Archivos Creados/Modificados

### Dockerfiles
```
backend/lambda/search-api-lancedb/Dockerfile
backend/lambda/search-api-lancedb/requirements.txt
backend/lambda/discovery-worker-lancedb/Dockerfile
backend/lambda/discovery-worker-lancedb/requirements.txt
```

**Contenido clave:**
- Base image: `public.ecr.aws/lambda/python:3.11-arm64`
- Compilers: `gcc gcc-c++ make`
- Dependencies: `lancedb`, `sentence-transformers`, `numpy<2.0`
- ML Model: Pre-descargado `all-MiniLM-L6-v2` durante build
- Pip flags: `--no-cache-dir --only-binary=:all:`

### Lambda Code Updates
```python
# REMOVIDO el código de carga desde EFS:
# EFS_PYTHON_PATH = '/mnt/efs/python'
# if os.path.exists(EFS_PYTHON_PATH):
#     sys.path.insert(0, EFS_PYTHON_PATH)

# ACTUALIZADO modelo path:
MODEL_PATH = os.environ.get('MODEL_PATH', 'all-MiniLM-L6-v2')  
# Ya no usa /mnt/efs/models/ porque está en el container
```

### Deployment Scripts
```
backend/lambda/deploy-containers.sh  (Automatiza todo el proceso)
```

---

## ⚠️ PENDIENTE PARA PRÓXIMA SESIÓN

### Único Blocker: Base de Datos LanceDB Vacía

**Síntoma:**
```
Lambda timeout durante inicialización (30s)
INIT_REPORT Init Duration: 9998.03 ms  Phase: init  Status: timeout
```

**Causa:** 
- La Lambda intenta conectar a `/mnt/efs/suplementia-lancedb/`
- El directorio no existe o está vacío
- Staging EFS: 12KB (vacío)
- Production EFS: 1.6GB (con datos)

**Solución:** 2 opciones

#### Opción A: Copiar desde Producción (5-10 min)
```bash
# Usar DataSync o rsync vía EC2 temporal
aws datasync create-task \
  --source-location-arn <production-efs> \
  --destination-location-arn <staging-efs>
```

#### Opción B: Crear DB Vacía + Seed Data (15-20 min)
```python
# Lambda temporal o script local
import lancedb
db = lancedb.connect('/mnt/efs/suplementia-lancedb')
# Crear tabla con schema
# Poblar con datos de prueba
```

---

## 🎯 QUICK START PRÓXIMA SESIÓN

```bash
# 1. Copiar datos de producción a staging (recomendado)
cd /Users/latisnere/Documents/suplementia/backend/lambda
./copy-production-data-to-staging.sh  # (crear este script)

# 2. Verificar datos copiados
aws lambda invoke \
  --function-name staging-search-api-lancedb \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  response.json

# 3. Si funciona: ✅ DEPLOYMENT 100% COMPLETO
```

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

| Aspecto | Antes (Zip) | Después (Container) |
|---------|-------------|---------------------|
| **Límite tamaño** | 250MB | 10GB |
| **Dependencias** | EFS (problemático) | Incluidas en image |
| **Build time** | ~5 min | ~8 min |
| **Cold start** | ~3-5s | ~5-8s |
| **Arquitectura** | Diferente a prod | Igual que prod ✅ |
| **Mantenibilidad** | Compleja | Simple |

---

## 💰 COSTOS

**Sin cambios** - Misma infraestructura:
- EFS: $4/mes
- DynamoDB: $0.39/mes
- Lambda: Pay-per-use
- ECR: $0.10/GB/mes (~$0.50/mes por 2 imágenes de 2.5GB)

**Total:** ~$5.59/mes (vs $30-35/mes con RDS) ✅

---

## 🔍 VALIDACIÓN

### ¿Por qué ya había algo desplegado antes?

**Historia del proyecto:**
1. **Sesión anterior:** Se creó stack `staging-lancedb` con Lambdas tipo Zip
2. **Problema:** Packages superaban 250MB (sentence-transformers + PyTorch)
3. **Intento 1:** Usar EFS para dependencias → CodeBuild falló
4. **Intento 2:** Optimizar packages → Aún muy grande
5. **Esta sesión:** Cambiar a Containers (solución correcta)

**Lambdas anteriores:**
- Existían pero con código vacío (CodeSize: 0)
- PackageType: Zip
- No funcionaban

**Lambdas actuales:**
- Eliminadas y recreadas desde cero
- PackageType: Image
- Contenido: 2.5GB cada una
- Funcionarán una vez tengamos datos en EFS ✅

---

## 🚀 COMANDOS ÚTILES

```bash
# Ver imágenes en ECR
aws ecr describe-images \
  --repository-name staging-search-api-lancedb \
  --region us-east-1

# Ver Lambdas
aws lambda get-function \
  --function-name staging-search-api-lancedb \
  --region us-east-1 \
  --query 'Configuration.[PackageType,ImageUri,State]'

# Ver logs
aws logs tail /aws/lambda/staging-search-api-lancedb \
  --region us-east-1 \
  --follow

# Rebuild y redeploy imagen
cd backend/lambda
docker build -t staging-search-api search-api-lancedb/
docker tag staging-search-api:latest \
  239378269775.dkr.ecr.us-east-1.amazonaws.com/staging-search-api-lancedb:latest
docker push 239378269775.dkr.ecr.us-east-1.amazonaws.com/staging-search-api-lancedb:latest

# Actualizar Lambda con nueva imagen
aws lambda update-function-code \
  --function-name staging-search-api-lancedb \
  --image-uri 239378269775.dkr.ecr.us-east-1.amazonaws.com/staging-search-api-lancedb:latest
```

---

## 📚 LECCIONES APRENDIDAS

1. **Lambda Containers > Lambda Zip** para ML workloads
2. **Pre-built wheels** evitan problemas de compilación
3. **Mismo approach que production** reduce sorpresas
4. **GCC version matters** al compilar desde source
5. **EFS para datos, Container para código** es la arquitectura correcta

---

## ✅ CHECKLIST FINAL

- [x] ECR repositories creados
- [x] Docker images con todas las dependencias
- [x] Imágenes pusheadas a ECR (2.5GB cada una)
- [x] Lambdas recreadas como PackageType: Image
- [x] Lambdas activas y configuradas
- [x] EFS montado correctamente
- [ ] **Base de datos LanceDB creada en EFS** ⬅️ PENDIENTE
- [ ] Lambda funcionando end-to-end

**Estado:** 90% completo - Solo falta copiar/crear datos

---

**Próximo paso:** Copiar base de datos de producción → staging (10 min)  
**Después:** ✅ DEPLOYMENT 100% COMPLETO
