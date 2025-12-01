# SuplementIA - Deployment Guide

## ✅ Project Setup Complete

El proyecto SuplementIA ha sido creado exitosamente como un proyecto separado.

## 📋 Próximos Pasos

### 1. Crear Repositorio en GitHub

```bash
cd /Users/latisnere/Documents/suplementia

# Crear repositorio en GitHub
gh repo create suplementia --public --source=. --remote=origin --push

# O si prefieres hacerlo manualmente:
# 1. Ve a https://github.com/new
# 2. Crea un repositorio llamado "suplementia"
# 3. Luego ejecuta:
git remote add origin https://github.com/TU_USUARIO/suplementia.git
git push -u origin main
```

### 2. Desplegar en Vercel

```bash
# Desde el directorio del proyecto
cd /Users/latisnere/Documents/suplementia

# Iniciar sesión en Vercel (si no lo has hecho)
vercel login

# Desplegar
vercel

# Seguir las instrucciones:
# - Link to existing project? No
# - Project name: suplementia
# - Directory: ./
# - Override settings? No
```

### 3. Configurar Variables de Entorno en Vercel

Después del despliegue, ve al dashboard de Vercel y agrega estas variables:

**Opcional (para modo demo):**
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID` (dejar vacío para demo)
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` (dejar vacío para demo)
- `PORTAL_QUIZZES_TABLE` (dejar vacío para demo)
- `PORTAL_RECOMMENDATIONS_TABLE` (dejar vacío para demo)
- `PORTAL_API_URL` (dejar vacío para demo)

**Para producción (cuando estés listo):**
- Configura AWS Cognito y obtén los IDs
- Configura DynamoDB tables
- Configura Lambda API endpoint
- Configura Stripe (si quieres pagos)

### 4. Verificar Despliegue

Una vez desplegado, Vercel te dará una URL como:
- `https://suplementia.vercel.app`

El portal funcionará en modo demo sin necesidad de configurar backend.

## 🎯 Estado Actual

- ✅ Proyecto creado y separado
- ✅ Dependencias instaladas
- ✅ Build funciona (con warnings esperados)
- ✅ Modo demo activo
- ⏳ Pendiente: GitHub repo
- ⏳ Pendiente: Vercel deployment

## 📝 Notas

- El build muestra un warning sobre `/portal/results` porque es una página dinámica (esperado)
- El portal funciona en modo demo sin backend
- Cuando configures las variables de entorno, cambiará automáticamente a modo producción

