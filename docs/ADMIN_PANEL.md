# 🎛️ Panel de Control de Weaviate

## Acceso Rápido
**URL**: `https://suplementai.com/spot` (después del deploy)

## 🔐 Configuración en Vercel

### Paso 1: Agregar Variable de Entorno
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega una nueva variable:
   - **Name**: `ADMIN_API_KEY`
   - **Value**: `dev-secret-ce8b346a17a083be` (o cambia por tu propia clave secreta)
   - **Environments**: Marca "Production", "Preview", y "Development"
4. Click "Save"

### Paso 2: Redesplegar
1. Ve a la pestaña "Deployments"
2. Click en los 3 puntos del último deployment
3. Click "Redeploy"

### Paso 3: Acceder al Panel
1. Abre `https://suplementai.com/spot`
2. Ingresa la clave: `dev-secret-ce8b346a17a083be`
3. ¡Listo! Ya puedes controlar el servidor

## 🎮 Cómo Usar el Panel

### Botones Disponibles
- **🚀 Start Service**: Enciende el servidor Weaviate (~2-3 min para arrancar)
- **🛑 Stop Service**: Apaga el servidor (ahorra ~$1/hora)
- **🔄 Refresh**: Actualiza el estado actual

### Información que Muestra
- **Desired Count**: Cuántas instancias quieres corriendo (0 o 1)
- **Running**: Cuántas están actualmente corriendo
- **Pending**: Cuántas están arrancando
- **Weaviate URL**: Link directo al servidor (cuando está corriendo)

## 💰 Ahorro de Costos

| Estado | Costo Mensual | Cuándo Usar |
|--------|---------------|-------------|
| Encendido 24/7 | ~$30 | Producción con usuarios |
| Apagado | ~$1 | No estás usando |
| Prender solo para pruebas | ~$3-5 | **← Tu caso actual** |

## 🔒 Seguridad

- La página `/spot` está protegida con contraseña
- Solo quien tenga la `ADMIN_API_KEY` puede acceder
- **IMPORTANTE**: Cambia la clave por defecto en producción

## 📝 Notas Técnicas

- Los datos en EFS se mantienen aunque apagues el servidor
- El servidor tarda ~2-3 minutos en arrancar completamente
- El panel se auto-actualiza cada 30 segundos
- Puedes acceder desde cualquier dispositivo con la clave
