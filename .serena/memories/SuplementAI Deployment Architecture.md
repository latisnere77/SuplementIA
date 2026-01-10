# SuplementAI - Arquitectura de Deployment

## INFORMACIÓN CRÍTICA

**Hosting**: AWS Amplify (100% del proyecto)
**AWS Account ID**: 643942183354
**Acceso**: Vía AWS Organizations (tengo permisos configurados)

## ⚠️ IMPORTANTE
- **NO usar Vercel** - El proyecto NO está en Vercel
- **Todo el hosting es AWS Amplify**
- Las credenciales AWS ya están configuradas vía AWS Organizations

## Stack de Deployment

### Frontend + Backend
- **Platform**: AWS Amplify
- **Region**: us-east-1
- **Account**: 643942183354

### Servicios AWS Conectados
- **Lambda Functions**:
  - Studies API: https://pl3wb2enqwsfevm5k2lmlrv3em0jipsy.lambda-url.us-east-1.on.aws/
  - Enricher API: https://55noz2p7ypqcatwf2o2kjnw7dq0eeqge.lambda-url.us-east-1.on.aws/
  - Search API: https://ogmnjgz664uws4h4t522agsmj40gbpyr.lambda-url.us-east-1.on.aws/
  - Quiz API: https://jru2vbkz6igdiakrjdmrtl2vb40tweac.lambda-url.us-east-1.on.aws/

- **DynamoDB**: Para caching de variantes y datos
- **LanceDB/EFS**: Para búsqueda vectorial
- **S3**: Para almacenamiento de assets

## Proceso de Deployment Correcto

1. **Git Push a Main**: 
   ```bash
   git push origin main
   ```

2. **AWS Amplify Auto-Deploy**:
   - Amplify detecta el push a main
   - Ejecuta build automáticamente
   - Despliega a producción

3. **Verificar Deployment**:
   - AWS Console → Amplify
   - O usando AWS CLI con permisos de Organizations

## Archivos de Configuración

- `amplify.yml`: Configuración de build en Amplify
- `amplify/`: Configuración del proyecto Amplify
- `vercel.json`: ⚠️ IGNORAR - Legacy, no se usa

## GitHub Webhooks

- Webhook configurado: Amplify (NO Vercel)
- URL: https://amplify-webhooks.us-east-1.amazonaws.com/github/repository-webhook

## Comandos Útiles

```bash
# Ver apps de Amplify
aws amplify list-apps --region us-east-1

# Ver deployments
aws amplify list-branches --app-id <app-id> --region us-east-1

# Trigger manual deployment
aws amplify start-job --app-id <app-id> --branch-name main --job-type RELEASE --region us-east-1
```

## URLs de Producción

- Production URL: Se obtiene de AWS Amplify Console
- Branch previews: Amplify genera URLs automáticamente

---

**Última actualización**: 2026-01-09
**Memoria creada**: Para evitar confusiones futuras con Vercel
