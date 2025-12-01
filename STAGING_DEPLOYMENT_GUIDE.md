# 🚀 Guía de Despliegue Staging - SuplementIA

## Estado Actual

### ✅ Completado (100% infraestructura)

**Stack Principal:** `staging-lancedb`
- **Costo mensual:** $5.59/mes
  - DynamoDB: $0.39
  - EFS: $4.00
  - CloudWatch: $1.20
- **Región:** us-east-1

**Recursos Creados:**
- ✅ VPC: `vpc-0c7e06b3bc19d60c5`
- ✅ EFS: `fs-0e6f9a62f873bc52c`
- ✅ Subnets: `subnet-016f4ab10eaf2afd0`, `subnet-050fcfaaab6262df0`
- ✅ DynamoDB: `staging-lancedb-supplement-cache`, `staging-lancedb-discovery-queue`
- ✅ Lambdas: `staging-search-api-lancedb`, `staging-discovery-worker-lancedb`
- ✅ CodeBuild: `staging-efs-setup`
- ✅ Security Groups, IAM Roles, CloudWatch Alarms

### ⚠️ Pendiente

- Lambda code con dependencias completas (lancedb, sentence-transformers)
- Modelos ML en EFS (`all-MiniLM-L6-v2`)
- Datos iniciales en LanceDB

---

## 🎯 Despliegue Completo en 3 Pasos

### Opción A: Script Automático (Recomendado)

```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda
./deploy-staging-complete.sh
```

**Tiempo:** ~30-40 minutos
**Qué hace:**
1. Construye paquetes Lambda con todas las dependencias
2. Sube a S3 y actualiza funciones
3. Descarga modelos ML a EFS vía CodeBuild
4. Inicializa LanceDB con datos de prueba
5. Ejecuta tests de validación

---

### Opción B: Manual Paso a Paso

#### 1. Desplegar Search API Lambda

```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda/search-api-lancedb

# Limpiar
rm -rf package function.zip
mkdir package

# Instalar dependencias ARM64
pip3 install \
  --platform manylinux2014_aarch64 \
  --target=package \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  lancedb sentence-transformers boto3 pyarrow

# Empaquetar
cp lambda_function.py package/
cd package && zip -r ../function.zip . && cd ..

# Subir a S3
aws s3 cp function.zip \
  s3://suplementia-lambda-deployments-staging/search-api-lancedb/$(date +%Y%m%d)-complete.zip

# Actualizar Lambda
aws lambda update-function-code \
  --function-name staging-search-api-lancedb \
  --s3-bucket suplementia-lambda-deployments-staging \
  --s3-key search-api-lancedb/$(date +%Y%m%d)-complete.zip \
  --region us-east-1
```

#### 2. Desplegar Discovery Worker Lambda

```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda/discovery-worker-lancedb

# Mismo proceso que Search API
rm -rf package function.zip
mkdir package

pip3 install \
  --platform manylinux2014_aarch64 \
  --target=package \
  --implementation cp \
  --python-version 3.11 \
  --only-binary=:all: \
  lancedb sentence-transformers boto3 pyarrow pandas

cp lambda_function.py package/
cd package && zip -r ../function.zip . && cd ..

aws s3 cp function.zip \
  s3://suplementia-lambda-deployments-staging/discovery-worker-lancedb/$(date +%Y%m%d)-complete.zip

aws lambda update-function-code \
  --function-name staging-discovery-worker-lancedb \
  --s3-bucket suplementia-lambda-deployments-staging \
  --s3-key discovery-worker-lancedb/$(date +%Y%m%d)-complete.zip \
  --region us-east-1
```

#### 3. Descargar Modelos ML a EFS

```bash
# Iniciar CodeBuild
BUILD_ID=$(aws codebuild start-build \
  --project-name staging-efs-setup \
  --region us-east-1 \
  --query 'build.id' \
  --output text)

echo "Build iniciado: $BUILD_ID"

# Monitorear progreso
aws logs tail /aws/codebuild/staging-efs-setup \
  --region us-east-1 \
  --follow
```

---

## 🧪 Testing

### Test Search API

```bash
aws lambda invoke \
  --function-name staging-search-api-lancedb \
  --cli-binary-format raw-in-base64-out \
  --payload '{"queryStringParameters":{"q":"vitamin d"}}' \
  --region us-east-1 \
  response.json

cat response.json | jq .
```

**Respuesta esperada:**
```json
{
  "statusCode": 200,
  "body": "{\"results\": [...], \"total\": 5}"
}
```

### Test Discovery Worker

```bash
# Agregar item a la cola de descubrimiento
aws dynamodb put-item \
  --table-name staging-lancedb-discovery-queue \
  --item '{"PK":{"S":"TEST#1"},"SK":{"S":"PENDING"},"supplement_name":{"S":"Vitamin C"}}' \
  --region us-east-1

# El worker se ejecutará automáticamente vía DynamoDB Streams
# Verificar logs
aws logs tail /aws/lambda/staging-discovery-worker-lancedb \
  --region us-east-1 \
  --follow
```

---

## 📊 Monitoreo

### CloudWatch Dashboards

```bash
# Ver métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=staging-search-api-lancedb \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

### Ver Logs en Tiempo Real

```bash
# Search API
aws logs tail /aws/lambda/staging-search-api-lancedb \
  --region us-east-1 \
  --follow

# Discovery Worker
aws logs tail /aws/lambda/staging-discovery-worker-lancedb \
  --region us-east-1 \
  --follow
```

---

## 🗑️ Limpieza (Eliminar Staging)

```bash
# Eliminar stacks en orden
aws cloudformation delete-stack \
  --stack-name staging-codebuild-efs-setup \
  --region us-east-1

aws cloudformation delete-stack \
  --stack-name staging-lancedb \
  --region us-east-1

# Eliminar bucket S3
aws s3 rb s3://suplementia-lambda-deployments-staging --force
```

---

## 📝 Notas Importantes

1. **Primera ejecución:** Las Lambdas pueden tardar 30-60s la primera vez mientras montan EFS
2. **Cold starts:** Esperados ~3-5s para Lambdas ARM64 con EFS
3. **Límites:**
   - Lambda timeout: 30s (Search API), 5min (Discovery Worker)
   - EFS throughput: Bursting mode
   - DynamoDB: Pay-per-request

4. **Seguridad:**
   - Lambdas en VPC privada
   - EFS solo accesible desde VPC
   - DynamoDB con encryption at rest

---

## 🔗 Enlaces Útiles

- **Consola Lambda:** https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
- **EFS:** https://console.aws.amazon.com/efs/home?region=us-east-1
- **DynamoDB:** https://console.aws.amazon.com/dynamodbv2/home?region=us-east-1#tables

---

## 📞 Soporte

**Problemas comunes:**

### Error: "No module named 'lancedb'"
- El paquete Lambda no tiene las dependencias
- Solución: Ejecutar `deploy-staging-complete.sh`

### Error: "Unable to mount EFS"
- Mount targets aún no disponibles
- Solución: Esperar 2-3 minutos y reintentar

### Error: CodeBuild timeout
- Descarga de modelos ML muy lenta
- Solución: Aumentar timeout en CodeBuild project

---

**Fecha de creación:** 2025-11-29
**Última actualización:** 2025-11-29
**Versión:** 1.0
