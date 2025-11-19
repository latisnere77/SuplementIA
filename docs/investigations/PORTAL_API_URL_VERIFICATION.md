# Verificación: PORTAL_API_URL en Vercel

**Fecha**: 2025-11-18
**Proyecto**: suplementia

## Configuración Requerida

La variable de entorno `PORTAL_API_URL` debe estar configurada en Vercel para que el portal se conecte al backend Lambda.

### URL Correcta

```
https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging
```

**NOTA**: Sin trailing slash al final.

### Cómo Verificar en Vercel Dashboard

1. Ir a: https://vercel.com/jorges-projects-485d82c7/suplementia/settings/environment-variables

2. Buscar la variable `PORTAL_API_URL`

3. Verificar que:
   - Está configurada para **Production** y **Preview**
   - El valor es: `https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging`
   - NO tiene trailing slash
   - NO tiene espacios o newlines

### Cómo Configurar/Actualizar

1. Si no existe, agregar:
   - Key: `PORTAL_API_URL`
   - Value: `https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging`
   - Environments: Production, Preview

2. Si existe pero está incorrecta:
   - Editar el valor
   - Asegurar que no tenga trailing slash
   - Guardar cambios
   - Hacer redeploy (o esperar al siguiente push)

### Verificación vía CLI

```bash
# Desde el directorio suplementia
cd /Users/latisnere/Documents/suplementia

# Listar variables de entorno
vercel env ls --scope=jorges-projects-485d82c7

# Buscar PORTAL_API_URL
vercel env ls --scope=jorges-projects-485d82c7 | grep PORTAL_API_URL
```

### Comportamiento del Sistema

- **Si PORTAL_API_URL está configurada**: El sistema usará el backend Lambda real
- **Si PORTAL_API_URL = 'DISABLED' o 'false'**: El sistema usará datos mock (demo mode)
- **Si PORTAL_API_URL no está configurada**: El sistema usará la URL por defecto (`https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging`)

### Debugging

Si hay problemas de conexión, verificar en los logs de Vercel:

1. Ir a: https://vercel.com/jorges-projects-485d82c7/suplementia
2. Seleccionar un deployment reciente
3. Ver logs del build y runtime
4. Buscar logs que contengan:
   - `🔗 [DEBUG] Calling backend URL`
   - `🔗 [DEBUG] PORTAL_API_URL env`
   - `🔗 [DEBUG] PORTAL_API_URL resolved`

### Endpoints del Backend

El sistema construye las siguientes URLs:

1. **Status Check**: `${PORTAL_API_URL}/portal/status/${recommendationId}`
   - Ejemplo: `https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/status/rec_123`

2. **Generate Recommendation**: `${PORTAL_API_URL}/portal/recommend`
   - Ejemplo: `https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend`

### Notas Importantes

- La URL base NO debe incluir `/portal/recommend` o `/portal/status`
- El código agrega estos paths automáticamente
- La normalización de URL elimina trailing slashes automáticamente
- Los espacios y newlines se eliminan automáticamente

