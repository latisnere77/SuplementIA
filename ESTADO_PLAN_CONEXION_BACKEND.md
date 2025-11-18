# Estado del Plan: Conectar Backend-Frontend Sin Fallbacks

## Resumen Ejecutivo

**Objetivo**: Conectar el frontend (Vercel) con el backend (Lambda) sin usar fallbacks a mock data.

**Estado General**: 1 de 6 fases completadas

---

## Estado Detallado por Fase

### ✅ FASE 1: Verificación y Configuración de Variables de Entorno
**Estado**: COMPLETADA (requiere acción manual)

**Acciones completadas**:
- ✅ Documento de verificación creado: `VERIFICACION_VARIABLES_ENTORNO.md`
- ✅ Variables identificadas y documentadas

**Acción pendiente (MANUAL)**:
1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto "suplementia"
3. Settings → Environment Variables
4. Agregar:
   - `PORTAL_API_URL=https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend`
   - `PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-staging`
   - `PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-staging`
5. Seleccionar ambientes: Production, Preview, Development
6. **Redeploy** el proyecto

---

### ⏳ FASE 2: Despliegue del Backend Actualizado
**Estado**: LISTA PARA EJECUTAR

**Acciones completadas**:
- ✅ Script de despliegue verificado: `start-codebuild.sh`
- ✅ Buildspec.yml verificado
- ✅ Código del backend actualizado con logging mejorado

**Acción pendiente**:
```bash
cd infrastructure/lambda/formulation-api
./start-codebuild.sh
```

**Tiempo estimado**: 5-10 minutos
**Costo estimado**: ~$0.03 - $0.05

**Monitoreo**:
- Build ID se mostrará al ejecutar el script
- Ver progreso en: AWS CodeBuild Console

---

### ⏳ FASE 3: Verificación de Permisos y Configuración Lambda
**Estado**: PREPARADA (ejecutar después de Fase 2)

**Verificaciones necesarias**:

1. **Variables de entorno del Lambda**:
   - `PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-staging`
   - `PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-staging`
   - `PORTAL_CHECKINS_TABLE` (opcional)
   - `PORTAL_REFERRALS_TABLE` (opcional)

2. **Permisos IAM del Lambda**:
   - `dynamodb:PutItem` en `ankosoft-portal-quizzes-staging`
   - `dynamodb:PutItem` en `ankosoft-portal-recommendations-staging`
   - `dynamodb:GetItem` en ambas tablas
   - `dynamodb:Query` en `ankosoft-portal-recommendations-staging` (para GSI)

3. **Tablas DynamoDB**:
   - Verificar que existen: `ankosoft-portal-quizzes-staging`, `ankosoft-portal-recommendations-staging`
   - Verificar que tienen GSI `recommendation_id-index` (si se usa Query)

**Comando para verificar**:
```bash
aws lambda get-function-configuration --function-name ankosoft-formulation-api --region us-east-1
aws dynamodb describe-table --table-name ankosoft-portal-recommendations-staging --region us-east-1
```

---

### ⏳ FASE 4: Prueba de Conectividad
**Estado**: PENDIENTE (ejecutar después de Fase 2 y 3)

**Pruebas a realizar**:

1. **Búsqueda de prueba desde el portal**:
   - Buscar "Aloe Vera" o "magnesio"
   - Verificar que NO devuelve mock data

2. **Revisar logs de Vercel Functions**:
   - Debe mostrar: `🔗 Calling backend API: https://...`
   - Debe mostrar: `📥 Backend response status: 200`
   - Debe mostrar: `✅ Backend response received`
   - NO debe mostrar errores de conexión

3. **Revisar logs de CloudWatch del Lambda**:
   - Debe mostrar: `🎯 Portal recommendation request received`
   - Debe mostrar: `✅ Portal Engine: Recommendation generated successfully`
   - NO debe mostrar: `⚠️  Using fallback recommendation`

4. **Verificar respuesta**:
   - `recommendation_id` debe empezar con `rec_` (nunca `mock_`)
   - `category` debe coincidir con la búsqueda
   - `ingredients` debe tener datos

---

### ⏳ FASE 5: Eliminación de Fallbacks Innecesarios
**Estado**: EN REVISIÓN

**Análisis del código actual**:

✅ **app/api/portal/quiz/route.ts**:
- ✅ NO tiene fallback a mock en catch blocks (ya corregido)
- ✅ Solo usa demo mode si `PORTAL_API_URL === 'DISABLED'` o `'false'`
- ✅ Devuelve errores reales en lugar de mock data

⚠️ **app/api/portal/recommendation/[id]/route.ts**:
- ⚠️ Todavía tiene check: `recommendationId.startsWith('mock_')`
- ⚠️ Esto puede ser problemático si el backend genera IDs que empiezan con `mock_`
- ✅ NO tiene fallback a mock en catch blocks (ya corregido)

**Acción pendiente**:
- Revisar si el check `recommendationId.startsWith('mock_')` es necesario
- El backend NUNCA debería generar IDs que empiecen con `mock_` (ya corregido)
- Podría eliminarse este check o dejarlo como medida de seguridad

---

### ⏳ FASE 6: Validación del Flujo Completo
**Estado**: PENDIENTE (ejecutar después de todas las fases anteriores)

**Validaciones a realizar**:

1. **Búsqueda de categoría conocida** (ej: "muscle gain"):
   - ✅ Debe devolver datos reales del backend
   - ✅ `recommendation_id` debe ser `rec_...`
   - ✅ Debe tener ingredientes y productos

2. **Búsqueda de ingrediente** (ej: "Aloe Vera"):
   - ✅ Debe devolver datos reales del backend
   - ✅ `category` debe ser "Aloe Vera" (preservado)
   - ✅ Debe tener productos relacionados

3. **Búsqueda en español** (ej: "magnesio"):
   - ✅ Debe funcionar igual que en inglés
   - ✅ Debe preservar la categoría original

4. **Manejo de errores**:
   - ✅ Si el backend falla, debe mostrar error real (no mock)
   - ✅ El frontend debe mostrar mensaje de error claro

---

## Próximos Pasos Inmediatos

### Prioridad Alta (Bloqueantes)

1. **Fase 1 (Manual)**: Configurar variables de entorno en Vercel
   - ⏱️ Tiempo: 5 minutos
   - 📍 Ubicación: Vercel Dashboard

2. **Fase 2**: Desplegar backend actualizado
   - ⏱️ Tiempo: 5-10 minutos
   - 📍 Comando: `cd infrastructure/lambda/formulation-api && ./start-codebuild.sh`

### Prioridad Media (Después de Fase 2)

3. **Fase 3**: Verificar permisos y configuración Lambda
   - ⏱️ Tiempo: 10 minutos
   - 📍 Comandos AWS CLI

4. **Fase 4**: Probar conectividad
   - ⏱️ Tiempo: 15 minutos
   - 📍 Portal en Vercel + Logs

### Prioridad Baja (Optimización)

5. **Fase 5**: Revisar y eliminar fallbacks innecesarios
   - ⏱️ Tiempo: 10 minutos
   - 📍 Revisión de código

6. **Fase 6**: Validación completa del flujo
   - ⏱️ Tiempo: 20 minutos
   - 📍 Pruebas múltiples

---

## Criterios de Éxito Final

- ✅ Todas las búsquedas usan el backend real (no mock data)
- ✅ `recommendation_id` siempre empieza con `rec_` (nunca `mock_`)
- ✅ La categoría se preserva correctamente en todas las búsquedas
- ✅ Los logs muestran el flujo completo sin errores
- ✅ Los errores del backend se muestran claramente al usuario (no se ocultan con mock)

---

## Notas Importantes

1. **Fase 1 es bloqueante**: Sin las variables de entorno en Vercel, el sistema puede usar demo mode
2. **Fase 2 es crítica**: El backend debe estar desplegado con las mejoras recientes
3. **Fase 3 es importante**: Sin permisos correctos, el Lambda no puede escribir en DynamoDB
4. **Fase 4 valida todo**: Las pruebas de conectividad confirman que todo funciona
5. **Fase 5 es optimización**: Los fallbacks ya están mayormente eliminados
6. **Fase 6 es validación final**: Confirma que todo el sistema funciona end-to-end

