# URL del API Gateway para SuplementIA

## ✅ Endpoint Configurado

**URL del API Gateway:**
```
https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
```

## 📋 Configuración en Vercel

Agrega esta variable de entorno en Vercel Dashboard:

1. Ve a: https://vercel.com/dashboard → Tu proyecto → Settings → Environment Variables
2. Agrega:
   ```
   PORTAL_API_URL=https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
   ```
3. Asegúrate de seleccionar **Production**, **Preview**, y **Development**
4. Guarda y redespliega

## 🧪 Prueba del Endpoint

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

## 📝 Notas

- El endpoint está configurado en el API Gateway `epmozzfkq4` (ankosoft-api-staging)
- Stage: `staging`
- Método: `POST`
- Integración: Lambda `ankosoft-formulation-api`
- CORS: Habilitado

## 🔄 Próximos Pasos

1. ✅ Endpoint configurado
2. ⏳ Agregar variable de entorno en Vercel
3. ⏳ Probar desde el portal
4. ⏳ Verificar que los datos se guardan en DynamoDB

