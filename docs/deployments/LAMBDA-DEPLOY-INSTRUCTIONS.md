# Instrucciones de Deploy - Lambda Studies Fetcher

## ✅ Trabajo Completado

1. ✅ Código de traducción implementado (`translator.ts`)
2. ✅ Integración en el handler del Lambda
3. ✅ Dependencias instaladas (`@aws-sdk/client-bedrock-runtime`)
4. ✅ Build exitoso
5. ✅ Paquete ZIP creado (2.1MB)

## 🚀 Deploy Manual

El archivo `studies-fetcher.zip` está listo en:
```
backend/lambda/studies-fetcher/studies-fetcher.zip
```

### Opción 1: AWS CLI (Recomendado)

```bash
cd backend/lambda/studies-fetcher

aws lambda update-function-code \
  --function-name suplementia-studies-fetcher-dev \
  --zip-file fileb://studies-fetcher.zip \
  --region us-east-1
```

### Opción 2: AWS Console

1. Ir a: https://console.aws.amazon.com/lambda
2. Buscar función: `suplementia-studies-fetcher-dev`
3. Click en "Upload from" → ".zip file"
4. Seleccionar: `backend/lambda/studies-fetcher/studies-fetcher.zip`
5. Click "Save"

### Opción 3: Script de Deploy

```bash
cd backend/lambda/studies-fetcher
./deploy-simple.sh
```

## 🧪 Verificar Deploy

### 1. Test con curl

```bash
curl -X POST https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search \
  -H "Content-Type: application/json" \
  -d '{
    "supplementName": "glucosamina",
    "maxResults": 5
  }'
```

**Resultado esperado**:
- Debería traducir "glucosamina" → "glucosamine"
- Devolver 5 estudios de PubMed

### 2. Verificar Logs en CloudWatch

```bash
aws logs tail /aws/lambda/suplementia-studies-fetcher-dev --follow
```

**Buscar eventos**:
- `TRANSLATION_STATIC` - Traducción desde mapa estático
- `TRANSLATION_LLM_SUCCESS` - Traducción con Claude Haiku
- `TERM_TRANSLATED` - Confirmación de traducción

### 3. Test desde el Frontend

Una vez desplegado, probar en:
```
https://suplementia.vercel.app/portal/results?q=glucosamina
```

Debería funcionar sin necesidad de configurar nada en Vercel.

## 📊 Logs Esperados

### Traducción Exitosa (Mapa Estático)

```json
{
  "event": "TRANSLATION_STATIC",
  "original": "glucosamina",
  "translated": "glucosamine",
  "source": "static_map"
}
```

### Traducción Exitosa (LLM)

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

### Búsqueda Exitosa

```json
{
  "event": "TERM_TRANSLATED",
  "original": "glucosamina",
  "translated": "glucosamine"
}
```

```json
{
  "event": "STUDIES_FETCH_SUCCESS",
  "supplementName": "glucosamine",
  "studiesFound": 5,
  "duration": 1500
}
```

## 🔧 Permisos Requeridos

El Lambda necesita permisos para usar Bedrock. Verificar que el rol IAM tenga:

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

### Verificar Permisos

```bash
# Obtener el rol del Lambda
aws lambda get-function \
  --function-name suplementia-studies-fetcher-dev \
  --query 'Configuration.Role' \
  --output text

# Ver políticas del rol
aws iam list-attached-role-policies \
  --role-name <ROLE_NAME>
```

### Agregar Permisos (si faltan)

```bash
# Crear política
aws iam create-policy \
  --policy-name BedrockInvokeModel \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
    }]
  }'

# Adjuntar al rol del Lambda
aws iam attach-role-policy \
  --role-name <ROLE_NAME> \
  --policy-arn <POLICY_ARN>
```

## 🎯 Beneficios del Deploy

Una vez desplegado:

1. ✅ **No más configuración en Vercel** - Sin credenciales de AWS
2. ✅ **Traducción automática** - Para cualquier término en español
3. ✅ **Sin timeouts** - Lambda tiene 60 segundos
4. ✅ **Logs completos** - CloudWatch tiene todo
5. ✅ **Escalable** - Funciona para cualquier idioma futuro

## 📝 Términos que Funcionarán Automáticamente

### Mapa Estático (Instantáneo)
- vitamina d, c, k2
- omega 3
- coenzima q10
- magnesio, calcio, hierro, zinc
- condroitina, glucosamina
- colageno, melatonina, creatina
- berberina, curcuma, jengibre
- menta, valeriana, manzanilla, lavanda

### LLM (1-2 segundos)
- Cualquier otro término en español
- Automáticamente detectado y traducido
- Sin necesidad de agregar al código

## 🐛 Troubleshooting

### Error: "Access Denied" al llamar Bedrock

**Causa**: Faltan permisos IAM  
**Solución**: Agregar política de Bedrock al rol del Lambda (ver arriba)

### Error: "Module not found"

**Causa**: Dependencias no incluidas en el ZIP  
**Solución**: Rebuild y repackage
```bash
cd backend/lambda/studies-fetcher
rm -rf node_modules dist
npm install
npm run build
npm run package:zip
```

### Traducción no funciona

**Causa**: Deploy no se aplicó correctamente  
**Solución**: Verificar versión del Lambda
```bash
aws lambda get-function \
  --function-name suplementia-studies-fetcher-dev \
  --query 'Configuration.LastModified'
```

## ✅ Checklist Post-Deploy

- [ ] Lambda desplegado exitosamente
- [ ] Test con curl funciona
- [ ] Logs en CloudWatch muestran traducción
- [ ] Frontend funciona con términos en español
- [ ] No hay errores de permisos
- [ ] Cache limpiado para términos problemáticos

## 📞 Siguiente Paso

Después del deploy, probar:

```bash
# Limpiar cache
npx tsx scripts/clear-condroitina-cache.ts
npx tsx scripts/clear-all-vitamin-cache.ts

# Test end-to-end
npx tsx scripts/test-condroitina-e2e.ts
```

---

**Fecha**: 22 de noviembre de 2025  
**Archivo**: `studies-fetcher.zip` (2.1MB)  
**Status**: ✅ Listo para deploy
