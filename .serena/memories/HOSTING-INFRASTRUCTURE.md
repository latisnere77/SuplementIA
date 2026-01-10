# 🔴 HOSTING INFRASTRUCTURE - CRÍTICO

## TODO EL PROYECTO CORRE EN AWS AMPLIFY

**AWS Account ID: 643942183354**
**Región: us-east-1**
**Dominio: www.SuplementAi.com**

---

### Hecho innegable:
- ✅ 100% del proyecto está hosteado en **AWS Amplify**
- ✅ Cuenta AWS: **643942183354**
- ❌ NO está en Vercel
- ❌ NO hay otro hosting

### Servicios AWS Amplify conectados:
- Frontend + Backend: AWS Amplify
- Lambda Functions (APIs): Studies, Enricher, Search, Quiz
- DynamoDB: Caching de datos
- S3: Assets
- LanceDB/EFS: Búsqueda vectorial

### Acceso a AWS Account 643942183354:

**⚠️ IMPORTANTE: USAR ASSUME ROLE**

Para acceder a la cuenta AWS 643942183354, DEBO:
1. Usar **AWS Organizations** (tengo permisos configurados)
2. Realizar **Assume Role** para acceder a la cuenta
3. NO usar credenciales directas - siempre through Organizations

**Comando de ejemplo:**
```bash
aws sts assume-role \
  --role-arn arn:aws:iam::643942183354:role/OrganizationAccountAccessRole \
  --role-session-name suplementia-session \
  --region us-east-1
```

Luego usar las credenciales temporales retornadas para acceder a Amplify, Lambda, DynamoDB, etc.

### Deploy Process:
1. Git push a main
2. AWS Amplify auto-detecta
3. Auto-build y deploy
4. URL en vivo: www.SuplementAi.com

---

**Última verificación**: 2026-01-09
**Estado**: Confirmado y explícito
