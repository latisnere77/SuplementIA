# Translation Update - Studies Fetcher Lambda

## 🎯 Objetivo

Mover la traducción español→inglés del frontend (Vercel) al backend (AWS Lambda) para:
- ✅ No necesitar credenciales de AWS en Vercel
- ✅ Centralizar toda la lógica en AWS
- ✅ Mejor seguridad y mantenibilidad
- ✅ Funciona automáticamente para cualquier término en español

## 📦 Cambios Implementados

### 1. Nuevo Archivo: `src/translator.ts`

Servicio de traducción que usa AWS Bedrock (Claude Haiku):

**Características**:
- Mapa estático para términos de alto tráfico (performance)
- Detección automática de términos en español
- Traducción con Claude Haiku para términos no cacheados
- Fallback al término original si falla

**Términos en mapa estático**:
- vitamina d, c, k2
- omega 3
- coenzima q10
- magnesio, calcio, hierro, zinc
- condroitina, glucosamina
- colageno, melatonina, creatina
- berberina, curcuma, jengibre
- menta, valeriana, manzanilla, lavanda
- ginseng, ashwagandha, rhodiola

### 2. Modificado: `src/index.ts`

Integración de traducción en el handler:

```typescript
// Antes de buscar en PubMed
const translatedTerm = await translateToEnglish(originalTerm);

// Usar término traducido para búsqueda
const studies = await searchPubMed({ ...request, supplementName: translatedTerm });
```

### 3. Actualizado: `package.json`

Agregada dependencia:
```json
"@aws-sdk/client-bedrock-runtime": "^3.490.0"
```

## 🚀 Deploy

### Paso 1: Instalar Dependencias

```bash
cd backend/lambda/studies-fetcher
npm install
```

### Paso 2: Build

```bash
npm run build
```

### Paso 3: Deploy

```bash
# Opción A: Deploy simple (recomendado)
./deploy-simple.sh

# Opción B: Deploy completo con API Gateway
./deploy-complete.sh

# Opción C: Deploy manual
npm run package
aws lambda update-function-code \
  --function-name suplementia-studies-fetcher-dev \
  --zip-file fileb://studies-fetcher.zip \
  --region us-east-1
```

## 🧪 Testing

### Test Local

```bash
npm test
```

### Test en AWS

```bash
# Test con término en español
curl -X POST https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "condroitina",
    "maxResults": 5
  }'

# Debería traducir a "chondroitin" y devolver estudios
```

### Verificar Logs

```bash
# Ver logs en CloudWatch
aws logs tail /aws/lambda/suplementia-studies-fetcher-dev --follow

# Buscar eventos de traducción
aws logs filter-log-events \
  --log-group-name /aws/lambda/suplementia-studies-fetcher-dev \
  --filter-pattern "TRANSLATION"
```

## 📊 Logs Esperados

### Traducción Exitosa

```json
{
  "event": "TRANSLATION_STATIC",
  "original": "condroitina",
  "translated": "chondroitin",
  "source": "static_map"
}
```

```json
{
  "event": "TERM_TRANSLATED",
  "original": "condroitina",
  "translated": "chondroitin"
}
```

### Traducción con LLM

```json
{
  "event": "TRANSLATION_LLM_SUCCESS",
  "original": "espirulina",
  "translated": "spirulina",
  "duration": 1234,
  "inputTokens": 15,
  "outputTokens": 8
}
```

### Sin Traducción (No es español)

```json
{
  "event": "TRANSLATION_SKIPPED",
  "term": "creatine",
  "reason": "not_spanish"
}
```

## 🔧 Configuración Requerida

### Permisos IAM

El Lambda necesita permisos para usar Bedrock:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
    }
  ]
}
```

### Variables de Entorno

```bash
AWS_REGION=us-east-1
```

## 🎓 Beneficios

### Antes (Frontend)
- ❌ Requiere credenciales de AWS en Vercel
- ❌ Timeout de 15 segundos
- ❌ Falla silenciosamente en producción
- ❌ Difícil de debuggear

### Después (Backend)
- ✅ No requiere credenciales en Vercel
- ✅ Sin límite de timeout (Lambda tiene 60s)
- ✅ Logs completos en CloudWatch
- ✅ Fácil de debuggear y monitorear
- ✅ Centralizado en AWS

## 📝 Próximos Pasos

### 1. Remover Traducción del Frontend

Una vez que el Lambda esté desplegado, podemos simplificar el frontend:

```typescript
// En app/api/portal/enrich/route.ts
// ANTES: Intentar traducir con LLM
const expansion = await expandAbbreviation(supplementName);

// DESPUÉS: Confiar en que el Lambda traduce
// (Remover toda la lógica de traducción del frontend)
```

### 2. Monitorear Performance

- Verificar latencia de traducción
- Monitorear uso de Bedrock
- Optimizar mapa estático según tráfico

### 3. Agregar Más Idiomas (Futuro)

El sistema está diseñado para soportar más idiomas:
- Portugués
- Francés
- Italiano
- etc.

## 🐛 Troubleshooting

### Error: "Access Denied" al llamar Bedrock

**Solución**: Verificar permisos IAM del Lambda

```bash
aws lambda get-function --function-name suplementia-studies-fetcher-dev \
  --query 'Configuration.Role'

# Verificar que el rol tenga permisos de Bedrock
```

### Error: "Module not found: @aws-sdk/client-bedrock-runtime"

**Solución**: Reinstalar dependencias y rebuild

```bash
rm -rf node_modules dist
npm install
npm run build
npm run package
```

### Traducción no funciona

**Solución**: Verificar logs en CloudWatch

```bash
aws logs tail /aws/lambda/suplementia-studies-fetcher-dev --follow
```

Buscar eventos `TRANSLATION_LLM_FAILED` para ver el error específico.

---

**Fecha**: 22 de noviembre de 2025  
**Autor**: Kiro AI  
**Status**: ✅ Listo para deploy
