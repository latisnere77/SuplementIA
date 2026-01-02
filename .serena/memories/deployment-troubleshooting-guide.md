# Suplementia Deployment Troubleshooting Guide

**Última actualización:** 2026-01-02
**Caso de uso:** Troubleshooting de deployments en AWS Amplify cuando features no aparecen en producción

---

## 🏗️ Arquitectura del Sistema

### Cuentas AWS
- **Producción (Suplementia):** `643942183354` ⭐
- **Development/Testing:** `239378269775`

### Componentes Principales
```
GitHub (latisnere77/SuplementIA)
    ↓ (webhook 587111201)
AWS Amplify (cuenta 643942183354, us-east-1)
    ↓
CloudFront (d2of3lawf9cckm)
    ↓
suplementai.com
```

### Flow del API
```
Usuario → suplementai.com/api/portal/recommend
    ↓
/api/portal/enrich-v2 (Next.js API route)
    ↓
Lambda content-enricher (via ENRICHER_API_URL env var)
    ↓
Response con datos enriched (incluye synergies)
```

---

## 🚨 Problema Común: "fetch failed" en API

### Síntomas
- API retorna: `{"success": false, "error": "enrichment_failed", "details": "fetch failed"}`
- Cualquier suplemento falla
- Frontend no puede cargar datos

### Causa Raíz (95% de casos)
❌ Variable de entorno `ENRICHER_API_URL` en Amplify apunta a Lambda **INCORRECTA** o **FALTANTE**

### Solución Inmediata

#### Paso 1: Acceder a Amplify Console
```bash
AWS Console → Cuenta 643942183354 → Región us-east-1
→ Amplify → App "Suplementia"
→ Environment variables
```

#### Paso 2: Verificar ENRICHER_API_URL

**✅ Valor CORRECTO:**
```
https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/
```

**❌ Valor INCORRECTO (viejo):**
```
https://55noz2p7ypqcatwf2o2kjnw7dq0eeqge.lambda-url.us-east-1.on.aws/
```

#### Paso 3: Corregir y Redeploy
1. Editar o agregar `ENRICHER_API_URL` con valor correcto
2. Save
3. Redeploy la aplicación
4. Esperar 10 minutos
5. Validar con curl (ver abajo)

---

## 🔍 Validación con AWS CLI

### 1. Verificar GitHub Webhook
```bash
gh api repos/latisnere77/SuplementIA/hooks/587111201/deliveries --jq '.[0] | {delivered_at, status_code}'
```
**Esperado:** `status_code: 202` (Accepted)

### 2. Verificar Último Commit
```bash
gh api repos/latisnere77/SuplementIA/commits/main --jq '{sha: .sha[0:8], message: .commit.message, date: .commit.author.date}'
```

### 3. Test del API Endpoint
```bash
curl -X POST https://suplementai.com/api/portal/recommend \
  -H 'Content-Type: application/json' \
  -d '{"category":"Magnesium"}' | jq '{success, error}'
```
**Esperado:** `{"success": true, "error": null}`

**Si falla:**
```json
{
  "success": false,
  "error": "enrichment_failed",
  "details": "fetch failed"
}
```
→ Ir a Step 2 (verificar ENRICHER_API_URL)

### 4. Verificar CloudFront Distribution
```bash
dig www.suplementai.com +short
```
**Esperado:** `d2of3lawf9cckm.cloudfront.net.` + IPs

---

## 📋 Checklist Completo de Troubleshooting

### Nivel 1: GitHub & Webhooks
- [ ] Webhook activo: `gh api repos/latisnere77/SuplementIA/hooks/587111201`
- [ ] Último delivery status 202
- [ ] Commit pusheado a main

### Nivel 2: Amplify (Requiere AWS Console)
- [ ] Build status = SUCCEED (no FAILED)
- [ ] Build incluye último commit
- [ ] Environment variable `ENRICHER_API_URL` existe
- [ ] Valor correcto: `l7mve4qnytdpxfcyu46cyly5le0vdqgx`

### Nivel 3: Lambda
- [ ] Lambda existe en cuenta 643942183354
- [ ] Function URL accesible (puede dar 403 si tiene IAM auth - OK)
- [ ] No hay errores en CloudWatch Logs

### Nivel 4: API & Frontend
- [ ] API `/api/portal/recommend` retorna success: true
- [ ] Response incluye `recommendation.supplement.synergies`
- [ ] Frontend muestra datos correctamente

---

## 🛠️ Comandos Útiles de Referencia

```bash
# Listar Amplify apps (requiere cuenta correcta)
aws amplify list-apps --region us-east-1

# Ver DNS info
dig suplementai.com +short
dig www.suplementai.com +short

# Test Lambda directo (fallará con 403 - esperado)
curl -X POST https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/ \
  -H 'Content-Type: application/json' \
  -d '{"supplementId":"magnesium"}'

# Test API público (debe funcionar)
curl -X POST https://suplementai.com/api/portal/recommend \
  -H 'Content-Type: application/json' \
  -d '{"category":"Magnesium"}' | python3 -m json.tool

# Buscar referencias a URLs de Lambda en código
grep -r "ENRICHER.*URL" . --include="*.ts" --include=".env*" | grep -v node_modules
```

---

## 📊 Variables de Entorno Críticas

| Variable | Usado Por | Valor Correcto |
|----------|-----------|----------------|
| `ENRICHER_API_URL` | `/api/portal/enrich-v2/route.ts:111` | `https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/` |
| `STUDIES_API_URL` | `/api/portal/enrich-v2/route.ts:61` | `https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search` |
| `CONTENT_ENRICHER_FUNCTION_URL` | Otros routes legacy | (misma que ENRICHER_API_URL) |

---

## 🔄 Proceso de Deployment Normal

```
1. git push origin main
2. GitHub webhook → Amplify (34 segundos típico)
3. Amplify Build (3-5 minutos)
4. Amplify Deploy (2-3 minutos)
5. CloudFront cache update (5-10 minutos)
---
Total: 10-20 minutos desde push hasta live
```

**Si después de 30 minutos no funciona:** Hay un problema (ver checklist)

---

## 🎯 Feature Específico: Synergies

### Commits Relacionados
- `2bce29bc` - Integración inicial synergies de SuplementsDB
- `50202abc` - Fix transformación frontend
- `2438522f` - Force Amplify redeploy
- `ab3078e7` - **CRÍTICO:** Pasa synergies desde Lambda a través de API route

### Archivos Clave
1. **Backend:** `/backend/lambda/content-enricher/src/synergies.ts`
2. **API Layer:** `/app/api/portal/recommend/route.ts:516-518`
3. **Transform:** `/app/[locale]/portal/results/page.tsx:358-360`
4. **UI:** `/components/portal/SynergiesSection.tsx`

### Cómo Validar que Funciona
```bash
# 1. Test API
curl -X POST https://suplementai.com/api/portal/recommend \
  -H 'Content-Type: application/json' \
  -d '{"category":"Magnesium"}' | jq '.recommendation.supplement.synergies'

# Debe retornar: array con synergies (no null)

# 2. Test en navegador
# → Ir a https://suplementai.com/en/portal/results?q=Magnesium
# → Scroll down después de "Dosificación"
# → Debe aparecer: "🔗 Sinergias con Otros Suplementos"
```

---

## 💡 Tips Pro

### Para evitar confusión de cuentas AWS
```bash
# Verificar cuenta actual
aws sts get-caller-identity

# Output esperado para producción:
# "Account": "643942183354"
```

### Para invalidar CloudFront cache manualmente
1. AWS Console → CloudFront → Distribution `d2of3lawf9cckm`
2. Invalidations → Create
3. Paths: `/*` y `/_next/static/*`
4. Esperar 5-10 minutos

### Para forzar rebuild si webhook no dispara
```bash
git commit --allow-empty -m "chore: force Amplify rebuild"
git push origin main
```

---

## 📞 Contacto/Referencias

- **Repo:** https://github.com/latisnere77/SuplementIA
- **Domain:** https://suplementai.com
- **Amplify Account:** 643942183354
- **Deployment Platform:** AWS Amplify (NOT Vercel!)
