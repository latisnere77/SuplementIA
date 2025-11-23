# 🔓 Desactivar Vercel Deployment Protection - Guía Paso a Paso

## ⏱️ Tiempo estimado: 2 minutos

---

## 📋 **Pasos**

### **Paso 1: Abrir Vercel Dashboard**

```bash
# Abrir en el navegador:
open https://vercel.com/jorges-projects-485d82c7/suplementia/settings/deployment-protection
```

O manualmente:
1. Ir a https://vercel.com/dashboard
2. Click en proyecto **"suplementia"**
3. Click en **"Settings"** (arriba)
4. Click en **"Deployment Protection"** (menú izquierdo)

---

### **Paso 2: Desactivar la Protección**

En la página de **Deployment Protection**:

1. Buscar la sección **"Vercel Authentication"**
2. Verás un toggle/switch que dice:
   - "Protect your Production Deployments"
   - O "Vercel Authentication: Enabled"

3. **Click en el toggle para DESACTIVARLO** (cambiar de azul a gris)

4. Confirmar si te pide confirmación

5. **Guardar cambios** (si hay botón de "Save")

---

### **Paso 3: Verificar que Funcionó**

Una vez desactivado, ejecuta este comando en tu terminal:

```bash
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"Caffeine","maxStudies":5}'
```

**Antes** (con protección):
```html
<!doctype html>
<title>Authentication Required</title>
...
```

**Después** (sin protección):
```json
{
  "success": true,
  "metadata": {
    "studiesUsed": 5,
    "hasRealData": true,
    "intelligentSystem": true
  },
  "data": { ... }
}
```

---

## ✅ **Una vez desactivado**

El endpoint estará disponible públicamente y el Lambda backend podrá acceder sin problemas.

Luego puedes proceder con:

1. **Test del orchestration endpoint**:
```bash
curl -X POST https://www.suplementai.com/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"Caffeine","maxStudies":5}' | jq '.metadata'
```

2. **Deployar código del Lambda** (si quieres):
   - Ir a AWS Lambda Console
   - Función: `ankosoft-formulation-api`
   - Upload ZIP: `backend/lambda/deployment/lambda-package.zip`
   - Handler: `lambda_function.lambda_handler`

3. **Test end-to-end**:
```bash
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{"category":"caffeine","age":30,"gender":"male","location":"CDMX"}' \
  | jq '.recommendation._enrichment_metadata'
```

---

## 🔒 **Nota de Seguridad**

El endpoint `/api/portal/enrich` estará público, pero esto es **aceptable** porque:

1. ✅ Es un endpoint de API que debe ser llamado por el backend Lambda
2. ✅ Ya tiene validación de parámetros (guardrails)
3. ✅ No expone datos sensibles
4. ✅ Tiene rate limiting de Vercel automáticamente
5. ✅ Las llamadas a PubMed y Bedrock ya tienen sus propios límites

Si quieres más seguridad en el futuro, puedes:
- Configurar un **bypass token** específico para el Lambda
- Usar **IP whitelisting** (aunque el Lambda usa IPs dinámicas)
- Configurar **API keys** en el endpoint

---

## 🆘 **Si No Encuentras la Opción**

Si no ves "Deployment Protection" o "Vercel Authentication":

1. Puede estar en **Settings → General → Deployment Protection**
2. O en **Settings → Security → Deployment Protection**
3. O puede llamarse **"Vercel Authentication"** directamente

**Buscar en Settings cualquier toggle que diga**:
- "Vercel Authentication"
- "Deployment Protection"
- "Password Protection"
- "Preview Deployments Protection"

Y **desactivarlo** para **Production Deployments**.

---

## 📸 **Ayuda Visual**

La pantalla debería verse así:

```
Settings > Deployment Protection

┌─────────────────────────────────────────────┐
│ Vercel Authentication                       │
│                                             │
│ Protect your Production Deployments        │
│                                             │
│ [●────] ← Click aquí para desactivar       │
│  ON                                         │
│                                             │
│ When enabled, visitors must log in with    │
│ Vercel to view your deployments            │
└─────────────────────────────────────────────┘
```

**Cambiar a**:

```
┌─────────────────────────────────────────────┐
│ Vercel Authentication                       │
│                                             │
│ Protect your Production Deployments        │
│                                             │
│ [────○] ← Desactivado                      │
│  OFF                                        │
└─────────────────────────────────────────────┘
```

---

**¡Listo!** Una vez hecho esto, el sistema inteligente estará 100% funcional 🎉
