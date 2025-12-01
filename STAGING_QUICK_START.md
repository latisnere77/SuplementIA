# ⚡ Quick Start - Staging Deployment

## TL;DR - Para completar el despliegue ahora:

```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda
./deploy-staging-complete.sh
```

Tiempo: ~30-40 minutos | Costo: $5.59/mes

---

## ✅ Lo que YA está hecho (Hoy 29/Nov/2025)

| Recurso | Estado | ID/Nombre |
|---------|--------|-----------|
| Stack CloudFormation | ✅ Creado | `staging-lancedb` |
| VPC | ✅ Creado | `vpc-0c7e06b3bc19d60c5` |
| EFS | ✅ Creado | `fs-0e6f9a62f873bc52c` |
| DynamoDB Tables | ✅ Creadas | 2 tablas |
| Lambda Functions | ✅ Creadas | 2 funciones |
| CodeBuild Project | ✅ Creado | `staging-efs-setup` |
| Security Groups | ✅ Configurados | 3 grupos |
| IAM Roles | ✅ Creados | 3 roles |
| **Costo mensual** | **$5.59** | vs $30-35 con RDS |

**Infraestructura:** 100% completa ✅

---

## ⚠️ Lo que falta (30-40 min de ejecución)

| Tarea | Script | Tiempo |
|-------|--------|--------|
| Código Lambda con dependencias | `deploy-staging-complete.sh` | 20 min |
| Modelos ML en EFS | Incluido en script | 15 min |
| Tests de validación | Incluido en script | 5 min |

**Código:** Pendiente de ejecutar script ⚠️

---

## 🎯 Próximos Pasos

### Ahora mismo (si tienes 40 min):

```bash
cd /Users/latisnere/Documents/suplementia/backend/lambda
./deploy-staging-complete.sh
```

El script hace TODO automáticamente:
- ✅ Instala dependencias (lancedb, sentence-transformers, etc.)
- ✅ Empaqueta código Lambda
- ✅ Sube a S3 y actualiza funciones
- ✅ Descarga modelos ML a EFS
- ✅ Ejecuta tests
- ✅ Muestra resultados

### Más tarde:

Lee la guía completa: `STAGING_DEPLOYMENT_GUIDE.md`

---

## 📦 Archivos Creados Hoy

```
/Users/latisnere/Documents/suplementia/
├── backend/lambda/
│   └── deploy-staging-complete.sh    # Script de despliegue automático
├── STAGING_DEPLOYMENT_GUIDE.md       # Guía completa
└── STAGING_QUICK_START.md            # Este archivo
```

---

## 💰 Costos

**Staging:** $5.59/mes
- DynamoDB: $0.39/mes (pay-per-request)
- EFS: $4.00/mes (~13GB modelos ML)
- CloudWatch: $1.20/mes (logs + métricas)

**vs Arquitectura anterior con RDS:** $30-35/mes ❌

**Ahorro:** ~$25/mes por entorno 🎉

---

## 🔍 Verificar Estado Actual

```bash
# Ver stacks
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `staging`)].StackName' \
  --region us-east-1

# Ver Lambdas
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `staging`)].[FunctionName,Runtime,CodeSize]' \
  --region us-east-1 \
  --output table

# Ver costos estimados
aws cloudformation describe-stacks \
  --stack-name staging-lancedb \
  --query 'Stacks[0].Outputs[?OutputKey==`TotalMonthlyCost`].OutputValue' \
  --output text
```

---

## ❓ FAQ

**¿Por qué la Lambda tiene CodeSize=0?**
- Está creada pero sin código desplegado. Ejecuta el script para completar.

**¿Puedo usar producción mientras despliego staging?**
- Sí, son entornos completamente independientes.

**¿Qué pasa si cancelo el script?**
- Puedes re-ejecutarlo, es idempotente.

**¿Cómo elimino todo si no lo necesito?**
```bash
aws cloudformation delete-stack --stack-name staging-codebuild-efs-setup
aws cloudformation delete-stack --stack-name staging-lancedb
aws s3 rb s3://suplementia-lambda-deployments-staging --force
```

---

**Última actualización:** 2025-11-29 17:48
**Próxima acción:** Ejecutar `deploy-staging-complete.sh`
