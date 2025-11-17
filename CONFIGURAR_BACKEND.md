# Configurar Backend Real para SuplementIA

## 🔍 Análisis del Problema

El endpoint `/portal/recommend` **existe en el código del Lambda** pero **NO está configurado en API Gateway**.

### Estado Actual:
- ✅ Lambda `ankosoft-formulation-api` tiene el handler para `/portal/recommend`
- ❌ API Gateway `epmozzfkq4` (ankosoft-api-staging) NO tiene el recurso `/portal` configurado
- ❌ La URL `4u55roa15e` da "Not Found" (ese API Gateway no existe o no tiene el endpoint)

## 🎯 Soluciones Posibles

### Opción 1: Agregar endpoint al API Gateway existente (Recomendado)

Agregar el recurso `/portal/recommend` al API Gateway `epmozzfkq4`:

```bash
# 1. Obtener root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id epmozzfkq4 --query 'items[?path==`/`].id' --output text)

# 2. Crear recurso /portal
PORTAL_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id epmozzfkq4 \
  --parent-id $ROOT_ID \
  --path-part portal \
  --query 'id' --output text)

# 3. Crear recurso /portal/recommend
RECOMMEND_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id epmozzfkq4 \
  --parent-id $PORTAL_RESOURCE_ID \
  --path-part recommend \
  --query 'id' --output text)

# 4. Agregar método POST
aws apigateway put-method \
  --rest-api-id epmozzfkq4 \
  --resource-id $RECOMMEND_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE

# 5. Configurar integración con Lambda
aws apigateway put-integration \
  --rest-api-id epmozzfkq4 \
  --resource-id $RECOMMEND_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:239378269775:function:ankosoft-formulation-api/invocations

# 6. Desplegar cambios
aws apigateway create-deployment \
  --rest-api-id epmozzfkq4 \
  --stage-name staging
```

### Opción 2: Usar Function URL (Más simple, menos features)

Crear Function URL para el Lambda:

```bash
aws lambda create-function-url-config \
  --function-name ankosoft-formulation-api \
  --auth-type NONE \
  --cors '{"AllowOrigins":["*"],"AllowMethods":["POST","OPTIONS"],"AllowHeaders":["Content-Type"]}'
```

Luego usar la Function URL directamente.

### Opción 3: Usar el API Gateway existente con path diferente

Si el Lambda está configurado para recibir cualquier path, podríamos usar:
- `https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/{proxy+}`

Y el Lambda manejaría el routing internamente.

## 📋 URL Final Esperada

Después de configurar, la URL será:
```
https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
```

## ⚙️ Configuración en Vercel

Una vez que tengas la URL, agrega en Vercel Dashboard → Settings → Environment Variables:

```
PORTAL_API_URL=https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
```

## 🧪 Prueba

```bash
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "category": "muscle-gain",
    "age": 35,
    "gender": "male",
    "location": "CDMX"
  }'
```

