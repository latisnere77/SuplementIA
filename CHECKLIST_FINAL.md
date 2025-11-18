# Checklist Final: Conexión Backend-Frontend Sin Fallbacks

## Estado de Ejecución

### ✅ FASE 1: Verificación de Variables de Entorno
- [x] Script de verificación creado
- [x] Documento de guía creado
- [ ] **ACCIÓN MANUAL REQUERIDA**: Configurar variables en Vercel Dashboard
  - [ ] `PORTAL_API_URL`
  - [ ] `PORTAL_QUIZZES_TABLE`
  - [ ] `PORTAL_RECOMMENDATIONS_TABLE`
  - [ ] Redeploy del proyecto

### ⏳ FASE 2: Despliegue del Backend Actualizado
- [x] Script de despliegue ejecutado
- [x] Build iniciado en CodeBuild
- [ ] **EN PROGRESO**: Build ID `formulation-api-docker-build:b18f6da2-da28-4b36-94c7-30ad9376541b`
- [ ] Verificar que el build termine exitosamente
- [ ] Verificar que el Lambda se actualice correctamente

### ✅ FASE 3: Verificación de Permisos Lambda
- [x] Script de verificación creado: `scripts/verificar-permisos-lambda.sh`
- [ ] **EJECUTAR DESPUÉS DE FASE 2**: Verificar permisos y configuración

### ✅ FASE 4: Prueba de Conectividad
- [x] Script de prueba creado: `suplementia/scripts/probar-conectividad.sh`
- [ ] **EJECUTAR DESPUÉS DE FASE 2**: Probar conectividad

### ✅ FASE 5: Eliminación de Fallbacks
- [x] Código corregido: `app/api/portal/recommendation/[id]/route.ts`
- [x] Check de `mock_` ahora devuelve 404
- [x] Solo demo mode si `isDemoMode=true`
- [x] Código limpio en `app/api/portal/quiz/route.ts`

### ✅ FASE 6: Validación del Flujo Completo
- [x] Script de validación creado: `suplementia/scripts/validar-flujo-completo.sh`
- [ ] **EJECUTAR DESPUÉS DE FASE 4**: Validar flujo completo

---

## Orden de Ejecución

### Inmediato (Manual)
1. **Configurar variables en Vercel** (5 minutos)
   - Ve a https://vercel.com/dashboard
   - Proyecto "suplementia" → Settings → Environment Variables
   - Agrega las 3 variables requeridas
   - Redeploy

### Después del Build (Automático)
2. **Verificar build de CodeBuild** (esperar 5-10 minutos)
   - URL: https://console.aws.amazon.com/codesuite/codebuild/projects/formulation-api-docker-build/build/formulation-api-docker-build:b18f6da2-da28-4b36-94c7-30ad9376541b
   - Verificar que termine con status "SUCCEEDED"

3. **Ejecutar verificación de permisos** (10 minutos)
   ```bash
   cd /Users/latisnere/Documents/ankosoft-clean
   ./scripts/verificar-permisos-lambda.sh
   ```

4. **Ejecutar prueba de conectividad** (15 minutos)
   ```bash
   cd /Users/latisnere/Documents/suplementia
   ./scripts/probar-conectividad.sh
   ```

5. **Ejecutar validación completa** (20 minutos)
   ```bash
   cd /Users/latisnere/Documents/suplementia
   ./scripts/validar-flujo-completo.sh
   ```

---

## Criterios de Éxito

- [ ] Todas las búsquedas usan el backend real (no mock data)
- [ ] `recommendation_id` siempre empieza con `rec_` (nunca `mock_`)
- [ ] La categoría se preserva correctamente
- [ ] Los logs muestran el flujo completo sin errores
- [ ] Los errores del backend se muestran claramente (no se ocultan con mock)

---

## Notas

- **Fase 1 es bloqueante**: Sin variables en Vercel, el sistema puede usar demo mode
- **Fase 2 está en progreso**: El build tomará 5-10 minutos
- **Fases 3-6 dependen de Fase 2**: Ejecutar después de que termine el build

