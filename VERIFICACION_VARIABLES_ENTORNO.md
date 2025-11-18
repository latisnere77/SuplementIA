# Verificación de Variables de Entorno en Vercel

## Estado: PENDIENTE DE CONFIGURACIÓN MANUAL

Para que el portal funcione sin fallbacks, necesitas configurar estas variables en Vercel:

### Variables Requeridas

1. **PORTAL_API_URL**
   ```
   https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
   ```

2. **PORTAL_QUIZZES_TABLE**
   ```
   ankosoft-portal-quizzes-staging
   ```

3. **PORTAL_RECOMMENDATIONS_TABLE**
   ```
   ankosoft-portal-recommendations-staging
   ```

## Pasos para Configurar

1. Ve a https://vercel.com/dashboard
2. Selecciona el proyecto "suplementia"
3. Ve a **Settings** → **Environment Variables**
4. Agrega las 3 variables arriba mencionadas
5. Asegúrate de seleccionar:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
6. **Redeploy** el proyecto después de agregar las variables

## Verificación

Después de configurar, haz una búsqueda en el portal y revisa los logs de Vercel Functions. Debes ver:
- `🔗 Calling backend API: https://...`
- `📥 Backend response status: 200`
- `✅ Backend response received`

## Nota Importante

El sistema NO usará fallbacks si:
- `PORTAL_API_URL` está configurada (cualquier valor excepto 'DISABLED' o 'false')
- El backend responde correctamente

Si `PORTAL_API_URL` no está configurada, el sistema usará la URL por defecto pero puede activar demo mode.

