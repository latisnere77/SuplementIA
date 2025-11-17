# Plan de Mejoras - SuplementIA

## 🎯 Objetivo
Conectar el portal con datos reales del backend y mejorar la experiencia del usuario.

## 📋 Estado Actual

### ✅ Lo que ya funciona:
- Portal desplegado en Vercel
- UI completa con búsqueda, resultados, evidencia
- Modo demo con datos mock
- Internacionalización (ES/EN)
- Componentes de monetización (Paywall, Stripe)

### ⚠️ Lo que falta:
- Conexión con backend Lambda real
- Tablas DynamoDB desplegadas
- Variables de entorno configuradas
- Mapeo mejorado de categorías
- Indicadores visuales de datos reales vs demo

## 🔧 Mejoras Propuestas

### 1. Configuración de Backend Real

#### 1.1 Variables de Entorno en Vercel
```bash
# Backend API
PORTAL_API_URL=https://[API-GATEWAY-ID].execute-api.us-east-1.amazonaws.com/portal/recommend

# DynamoDB Tables
PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-production
PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-production
PORTAL_SUBSCRIPTIONS_TABLE=ankosoft-portal-subscriptions-production

# Cognito (opcional por ahora)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=

# Stripe (opcional por ahora)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

#### 1.2 Verificar Endpoint Lambda
- Confirmar que `/portal/recommend` está desplegado
- Probar el endpoint con un request de prueba
- Verificar que retorna el formato correcto

### 2. Mejoras en el Mapeo de Categorías

Actualmente el mapeo es básico. Mejorar para:
- Soporte de más términos en español/inglés
- Detección inteligente de sinónimos
- Manejo de categorías compuestas (ej: "muscle gain + sleep")

### 3. Mejoras en UX

#### 3.1 Indicadores Visuales
- Badge "Demo Mode" cuando está usando datos mock
- Badge "Live Data" cuando está usando datos reales
- Loading states más informativos

#### 3.2 Manejo de Errores
- Mensajes de error más claros
- Retry automático en caso de fallo
- Fallback graceful a demo mode

### 4. Optimizaciones de Performance

- Cache de recomendaciones frecuentes
- Prefetch de datos comunes
- Optimización de imágenes y assets

## 🚀 Plan de Implementación

### Fase 1: Conexión con Backend (Prioridad Alta)
1. Obtener URL del API Gateway
2. Configurar variables de entorno en Vercel
3. Probar conexión con endpoint real
4. Verificar que los datos se guardan en DynamoDB

### Fase 2: Mejoras de Mapeo (Prioridad Media)
1. Expandir diccionario de categorías
2. Implementar detección de sinónimos
3. Agregar validación de categorías

### Fase 3: Mejoras de UX (Prioridad Media)
1. Agregar indicadores de modo (demo/live)
2. Mejorar loading states
3. Agregar manejo de errores robusto

### Fase 4: Optimizaciones (Prioridad Baja)
1. Implementar cache
2. Optimizar assets
3. Agregar analytics

## 📝 Próximos Pasos Inmediatos

1. **Obtener URL del API Gateway**: Necesitamos la URL del endpoint `/portal/recommend`
2. **Configurar en Vercel**: Agregar variables de entorno
3. **Probar conexión**: Hacer un request de prueba
4. **Verificar respuesta**: Asegurar que el formato es correcto

## ❓ Preguntas para el Usuario

1. ¿Ya tienes el endpoint Lambda desplegado? ¿Cuál es la URL?
2. ¿Quieres que configuremos las variables de entorno ahora?
3. ¿Qué mejoras específicas te gustaría priorizar?
4. ¿Hay alguna funcionalidad adicional que quieras agregar?

