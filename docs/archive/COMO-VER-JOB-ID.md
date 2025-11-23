# Cómo Ver el Job ID en el Frontend

## 🔖 El Job ID Está Implementado

El sistema de Job ID **SÍ está funcionando** desde el commit `9ad269a`. Para verlo:

## 📋 Pasos para Ver el Job ID

### 1. Abrir DevTools

**Windows/Linux**: Presiona `F12` o `Ctrl+Shift+I`  
**Mac**: Presiona `Cmd+Option+I`

### 2. Ir a la Pestaña Console

En DevTools, haz clic en la pestaña **Console**

### 3. Buscar el Mensaje del Job ID

Cuando hagas una búsqueda, verás un mensaje como:

```
🔖 Job ID: job_1732302123456_abc123xyz - Query: "glucosamina" → "glucosamina"
```

### 4. Copiar el Job ID

Copia el Job ID completo, por ejemplo: `job_1732302123456_abc123xyz`

### 5. Buscar en Logs de Vercel

```bash
vercel logs --filter="job_1732302123456_abc123xyz"
```

Verás todos los logs relacionados con esa búsqueda específica.

## 🎯 Ejemplo Visual

```
┌─────────────────────────────────────────────────┐
│ DevTools - Console                              │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔖 Job ID: job_1732302123456_abc123xyz         │
│    Query: "glucosamina" → "glucosamina"        │
│                                                 │
│ ✅ API Response received                        │
│    success: true                                │
│    status: 200                                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🔍 Qué Hacer con el Job ID

### Para Debugging

1. **Copiar el Job ID** de la consola
2. **Buscar en Vercel**:
   ```bash
   vercel logs --filter="job_xxx"
   ```
3. **Ver el flujo completo**:
   - Frontend: Job ID generado
   - Quiz API: Job ID recibido
   - Recommend API: Job ID propagado
   - Enrich API: Job ID en logs
   - Lambda: Job ID procesado

### Para Reportar Errores

Cuando reportes un error, incluye:
- ✅ El Job ID completo
- ✅ La búsqueda que hiciste
- ✅ El error que viste

Ejemplo:
```
Job ID: job_1732302123456_abc123xyz
Búsqueda: "glucosamina"
Error: 504 Timeout
```

## 📊 Información que Proporciona el Job ID

Con un Job ID puedes ver:

1. **Traducción**: "glucosamina" → "glucosamine"
2. **Estudios encontrados**: 26,104 estudios
3. **Tiempo de procesamiento**: 8.2 segundos
4. **Dónde falló**: Si hubo timeout, en qué paso
5. **Cache**: Si se usó cache o datos frescos

## 🚨 Si No Ves el Job ID

### Problema 1: Console está filtrada

**Solución**: En DevTools Console, asegúrate de que el filtro esté en "All levels" o "Info"

### Problema 2: Console está limpia

**Solución**: Haz una nueva búsqueda después de abrir DevTools

### Problema 3: Deploy no se aplicó

**Solución**: 
1. Hard refresh: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
2. Limpiar cache del navegador
3. Verificar que estás en: https://suplementia.vercel.app

## ✅ Verificar que Funciona

1. Abre: https://suplementia.vercel.app/portal
2. Abre DevTools (F12) → Console
3. Busca cualquier suplemento
4. Deberías ver: `🔖 Job ID: job_xxx`

Si no lo ves, el deploy puede no haberse aplicado aún (espera 2-3 minutos).

---

**Última actualización**: 22 de noviembre de 2025  
**Commit con Job ID**: `9ad269a`  
**Status**: ✅ Implementado y funcionando
