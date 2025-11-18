# ✅ Corrección Completada - Lambda Redis Import

## 🎯 Problema Resuelto

**Error original:**
```
Cannot find module '/var/modules/utils/redis-cache.mjs' imported from /var/task/cache-functions.mjs
```

**Causa:** Ruta de importación incorrecta en `cache-functions.mjs`

**Solución aplicada:**
```javascript
// ❌ ANTES (incorrecto)
import { RedisCache } from '../modules/utils/redis-cache.mjs';

// ✅ DESPUÉS (correcto)  
import { RedisCache } from './modules/utils/redis-cache.mjs';
```

## 📝 Archivo Modificado

- `infrastructure/lambda/formulation-api/cache-functions.mjs`
  - Línea 15: Corregida ruta de importación de `RedisCache`
  - Línea 16: Corregida ruta de importación de `publishRedisMetrics`

## 🚀 Estado del Despliegue

**Código:** ✅ Corregido y listo
**Despliegue:** ⏳ Pendiente (problema con formato de imagen Docker)

### Opciones para Desplegar:

1. **CodeBuild (Recomendado):**
   ```bash
   aws codebuild start-build --project-name formulation-api-docker-build
   ```

2. **Esperar CI/CD automático:**
   Si tienes un pipeline configurado, hacer commit y push:
   ```bash
   git add infrastructure/lambda/formulation-api/cache-functions.mjs
   git commit -m "fix: correct Redis cache import path"
   git push
   ```

3. **Despliegue manual vía ECR:**
   Necesita construir imagen con Docker v2 manifest (no OCI)

## ✅ Verificación Post-Despliegue

Una vez desplegado, probar:
```bash
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{"category":"muscle-gain","age":35,"gender":"male","location":"CDMX"}'
```

**Respuesta esperada:** JSON con recomendación (no error 502)

## 📋 Próximos Pasos

1. ✅ Código corregido
2. ⏳ Desplegar Lambda
3. ⏳ Probar endpoint
4. ⏳ Configurar variables de entorno en Vercel
5. ⏳ Verificar que portal funciona con datos reales

