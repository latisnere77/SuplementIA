# 🚀 Deployment Checklist - Fix de Datos Falsos

## ✅ Completado

- [x] Código modificado y testeado localmente
- [x] Cache de DynamoDB limpiado (13 entradas eliminadas)
- [x] Commit realizado: `e6a9dea`
- [x] Push a GitHub completado
- [x] Vercel está desplegando automáticamente

## ⏳ Pendiente (Después del Deploy)

### 1. Verificar Deploy de Vercel (2-5 minutos)

Revisa en: https://vercel.com/latisneres-projects/suplementia

Espera a que el deploy termine y muestre ✅ "Ready"

### 2. Ejecutar Verificación en Producción

```bash
./scripts/verify-fix.sh https://www.suplementai.com
```

**Resultado esperado:**
- ✅ Test 1: Enzima q15 retorna 404
- ✅ Test 2: CoQ10 retorna 200 con datos reales
- ✅ Test 3: XYZ123 retorna 404

### 3. Limpiar LocalStorage de Usuarios

Los usuarios que ya visitaron la página con datos falsos necesitan limpiar su cache.

**Opción A: Script Automático (Recomendado)**
1. Abre https://www.suplementai.com en tu navegador
2. Presiona F12 (DevTools)
3. Ve a Console
4. Copia y pega el contenido de `scripts/clear-browser-cache.js`
5. Presiona Enter

**Opción B: Manual**
1. Abre DevTools (F12)
2. Ve a Application → Local Storage
3. Selecciona tu dominio
4. Busca keys que empiecen con `recommendation_`
5. Elimina las que tengan `studiesUsed: 0` pero `totalStudies > 0`

### 4. Probar Flujo Completo en Producción

#### Test A: Suplemento Inexistente con Sugerencia
1. Ve a https://www.suplementai.com/portal
2. Busca: "Enzima q15"
3. **Esperado:**
   - 🔍 Icono de búsqueda
   - "No encontramos información científica sobre 'Enzima q15'"
   - "¿Quizás buscabas 'CoQ10'?"
   - Botón azul: "Buscar 'CoQ10'"

4. Click en "Buscar 'CoQ10'"
5. **Esperado:**
   - Carga datos reales de PubMed
   - Muestra estudios verificables
   - NO muestra datos falsos

#### Test B: Suplemento Válido
1. Busca: "Magnesium"
2. **Esperado:**
   - Encuentra estudios reales
   - Muestra evidencia científica
   - Calificación basada en estudios reales

#### Test C: Otras Variaciones
Prueba estos términos (todos deben sugerir CoQ10):
- "enzima q"
- "coenzima q"
- "coq"

### 5. Monitorear Logs

```bash
# Si tienes acceso a los logs de Vercel
vercel logs suplementia --follow
```

Busca estos mensajes:
- ✅ `STUDIES_FETCHED` - Estudios encontrados
- ✅ `ORCHESTRATION_SUCCESS` - Enriquecimiento exitoso
- ❌ `insufficient_data` - No hay estudios (comportamiento correcto)

### 6. Invalidar Cache en Producción (Opcional)

Si detectas que aún hay datos falsos en producción:

```bash
# Desde tu máquina local (con credenciales AWS configuradas)
NODE_ENV=production npx tsx scripts/invalidate-fake-supplements.ts
```

## 📊 KPIs para Verificar

Después del deploy, monitorea:

1. **Tasa de Error 404**: Debería aumentar (esto es BUENO - significa que detectamos suplementos inexistentes)
2. **Tasa de Recomendaciones con `hasRealData=true`**: Debería ser 100%
3. **Usuarios que ven sugerencias**: Nuevas métricas a trackear
4. **Click-through en botones de sugerencia**: ¿Los usuarios hacen click en "Buscar CoQ10"?

## 🐛 Troubleshooting

### Problema: Aún veo datos falsos
**Solución:**
1. Verifica que el deploy terminó
2. Limpia localStorage del navegador
3. Usa modo incógnito para probar sin cache
4. Ejecuta `./scripts/verify-fix.sh` para confirmar que el backend está correcto

### Problema: Todos los suplementos retornan 404
**Solución:**
1. Verifica logs de Lambda (studies-fetcher)
2. Confirma que la API de PubMed está accesible
3. Revisa credenciales de AWS
4. Verifica variables de entorno en Vercel

### Problema: Sugerencias no aparecen
**Solución:**
1. Verifica que `supplement-suggestions.ts` tiene la entrada correcta
2. Revisa logs del navegador (Console)
3. Confirma que el frontend puede acceder a la función `suggestSupplementCorrection`

## ✅ Criterios de Éxito

Deploy es exitoso cuando:
- [ ] Todos los tests del script `verify-fix.sh` pasan
- [ ] "Enzima q15" muestra sugerencia de "CoQ10"
- [ ] Click en "Buscar CoQ10" funciona correctamente
- [ ] CoQ10 muestra datos reales de PubMed
- [ ] NO hay datos falsos en ninguna búsqueda
- [ ] Logs no muestran errores críticos

## 📞 Contacto de Emergencia

Si algo sale mal:

1. **Rollback rápido:**
   ```bash
   git revert e6a9dea
   git push origin main
   ```

2. **Desactivar validación estricta temporalmente:**
   - Comenta las validaciones en `app/api/portal/recommend/route.ts:164-187`
   - Esto permitirá que el sistema funcione mientras investigas

3. **Reportar issue:**
   - GitHub: https://github.com/latisnere77/SuplementIA/issues
   - Incluye logs y screenshots

---

**Última actualización:** 2025-11-21
**Commit:** e6a9dea
**Deploy:** Automático vía Vercel
**Autor:** Jorge Latisnere <latisnere@gmail.com>
