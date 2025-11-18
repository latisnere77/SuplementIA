# Variables de Entorno para Vercel

## 🚀 Configuración Rápida

### Paso 1: Ve al Dashboard de Vercel
https://vercel.com/dashboard → Selecciona proyecto `suplementia` → Settings → Environment Variables

### Paso 2: Agrega estas variables

```bash
PORTAL_API_URL=https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend
```

**Importante:** Selecciona todos los ambientes (Production, Preview, Development)

### Paso 3: Guarda y espera el redeploy

Vercel redeployará automáticamente con las nuevas variables.

## 📝 Variables Opcionales (para producción completa)

```bash
# DynamoDB (opcional - usa staging por defecto)
PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-staging
PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-staging
PORTAL_SUBSCRIPTIONS_TABLE=ankosoft-portal-subscriptions-staging

# Cognito (opcional - demo mode funciona sin esto)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=

# Stripe (opcional - demo mode funciona sin esto)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

## ✅ Después de Configurar

Una vez que agregues `PORTAL_API_URL`, el portal cambiará automáticamente de modo demo a modo producción.

**Nota:** El Lambda tiene un error interno que necesita ser corregido, pero el endpoint está configurado correctamente.

