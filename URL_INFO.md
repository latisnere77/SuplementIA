# URLs de SuplementIA

## 🌐 URL de Producción Actual

**URL Completa del Despliegue:**
```
https://suplementia-oqan9j34i-jorges-projects-485d82c7.vercel.app
```

## ⚠️ Nota Importante

Si estás intentando acceder a `https://suplementia.vercel.app` y da 404, es porque:

1. **No hay dominio personalizado configurado**: Vercel asigna URLs únicas a cada despliegue
2. **La URL corta no existe**: `suplementia.vercel.app` no está disponible automáticamente

## ✅ Soluciones

### Opción 1: Usar la URL Completa
Usa la URL completa del despliegue más reciente:
```
https://suplementia-oqan9j34i-jorges-projects-485d82c7.vercel.app
```

### Opción 2: Configurar Dominio Personalizado
1. Ve a Vercel Dashboard → Settings → Domains
2. Agrega tu dominio personalizado (ej: `suplementia.com`)
3. Configura los DNS según las instrucciones de Vercel

### Opción 3: Obtener la URL del Proyecto
```bash
cd /Users/latisnere/Documents/suplementia
vercel ls
```

## 🔍 Verificar Estado

```bash
# Ver todos los despliegues
vercel ls

# Ver información de un despliegue específico
vercel inspect <deployment-url>

# Ver logs
vercel logs <deployment-url>
```

