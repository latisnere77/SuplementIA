# ⚠️ STAGING RESOURCES CLEANUP REQUIRED

## Estado Actual

He auditado AWS y encontré **recursos de staging activos** que están generando costos innecesarios.

## Recursos Encontrados

### ❌ NO hay stack de CloudFormation "staging-intelligent-search"
- El stack principal de staging ya fue eliminado o nunca existió ✅

### ⚠️ SÍ hay recursos huérfanos de staging:

#### DynamoDB Tables (12 tablas)
- `ankosoft-compound-analysis-staging` - 0 items
- `ankosoft-demographic-knowledge-staging` - 15 items
- `ankosoft-formulation-feedback-staging` - 1 item
- `ankosoft-innovation-cache-staging` - 0 items
- `ankosoft-market-intelligence-cache-staging` - 123 items, 3.01 MB
- `ankosoft-portal-checkins-staging` - 0 items
- `ankosoft-portal-quizzes-staging` - 0 items
- `ankosoft-portal-recommendations-staging` - 113 items, 0.19 MB
- `ankosoft-portal-referrals-staging` - 0 items
- `ankosoft-portal-subscriptions-staging` - 0 items
- `ankosoft-trial-results-staging` - 2 items
- `tier2-study-cache-staging` - 150 items, 1.40 MB

**Costo estimado**: ~$5-8/mes

#### Lambda Functions (12 funciones)
- `ankosoft-problem-generator-staging`
- `ankosoft-compound-similarity-staging`
- `ankosoft-discovery-signal-validator-staging`
- `ankosoft-feedback-handler-staging`
- `ankosoft-market-intelligence-staging`
- `ankosoft-backend-staging-LogRetentionaae0aa3c5b4d4-1sIaloUtRa2V`
- `ankosoft-novel-compounds-staging`
- `ankosoft-cache-cleanup-staging`
- `TrialResultsStack-staging-LogRetentionaae0aa3c5b4d-JqnkJCZtB4Be`
- `ankosoft-trial-results-handler-staging`
- `ankosoft-cost-monitoring-staging`
- `ankosoft-innovation-analysis-staging`

**Costo estimado**: ~$2-5/mes (si se invocan)

#### CloudWatch Log Groups (11 grupos)
- `/aws/apigateway/ankosoft-staging`
- `/aws/lambda/TrialResultsStack-staging-*`
- `/aws/lambda/ankosoft-backend-staging-*`
- `/aws/lambda/ankosoft-cache-cleanup-staging`
- `/aws/lambda/ankosoft-compound-similarity-staging`
- `/aws/lambda/ankosoft-cost-monitoring-staging`
- `/aws/lambda/ankosoft-discovery-signal-validator-staging`
- `/aws/lambda/ankosoft-feedback-handler-staging`
- `/aws/lambda/ankosoft-innovation-analysis-staging`
- `/aws/lambda/ankosoft-market-intelligence-staging`
- `/aws/lambda/ankosoft-novel-compounds-staging`

**Costo estimado**: ~$1-2/mes

### 💰 Total Ahorro Potencial: **$8-15/mes**

## Cómo Eliminar

### Opción 1: Script Automático (RECOMENDADO)
```bash
./infrastructure/scripts/delete-all-staging-resources.sh
```

### Opción 2: Manual (Comandos individuales)

#### Eliminar DynamoDB Tables
```bash
aws dynamodb delete-table --table-name ankosoft-compound-analysis-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-demographic-knowledge-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-formulation-feedback-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-innovation-cache-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-market-intelligence-cache-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-portal-checkins-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-portal-quizzes-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-portal-recommendations-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-portal-referrals-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-portal-subscriptions-staging --region us-east-1
aws dynamodb delete-table --table-name ankosoft-trial-results-staging --region us-east-1
aws dynamodb delete-table --table-name tier2-study-cache-staging --region us-east-1
```

#### Eliminar Lambda Functions
```bash
aws lambda delete-function --function-name ankosoft-problem-generator-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-compound-similarity-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-discovery-signal-validator-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-feedback-handler-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-market-intelligence-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-backend-staging-LogRetentionaae0aa3c5b4d4-1sIaloUtRa2V --region us-east-1
aws lambda delete-function --function-name ankosoft-novel-compounds-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-cache-cleanup-staging --region us-east-1
aws lambda delete-function --function-name TrialResultsStack-staging-LogRetentionaae0aa3c5b4d-JqnkJCZtB4Be --region us-east-1
aws lambda delete-function --function-name ankosoft-trial-results-handler-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-cost-monitoring-staging --region us-east-1
aws lambda delete-function --function-name ankosoft-innovation-analysis-staging --region us-east-1
```

#### Eliminar CloudWatch Log Groups
```bash
aws logs delete-log-group --log-group-name /aws/apigateway/ankosoft-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/TrialResultsStack-staging-LogRetentionaae0aa3c5b4d-JqnkJCZtB4Be --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-backend-staging-LogRetentionaae0aa3c5b4d4-1sIaloUtRa2V --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-cache-cleanup-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-compound-similarity-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-cost-monitoring-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-discovery-signal-validator-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-feedback-handler-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-innovation-analysis-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-market-intelligence-staging --region us-east-1
aws logs delete-log-group --log-group-name /aws/lambda/ankosoft-novel-compounds-staging --region us-east-1
```

## Production Resources (MANTENER)

En production solo encontré:
- ✅ 1 tabla DynamoDB: `production-supplements-evidence-cache` (15 items) - **MANTENER**
- ✅ 1 log group: `/aws/lambda/production-supplements-generator` - **MANTENER**
- ✅ NO hay RDS, Redis, EFS, o Lambda functions activas

## Recomendación

1. **ELIMINAR** todos los recursos de staging (ahorro: $8-15/mes)
2. **MANTENER** los recursos de production
3. **DEPLOYAR** la infraestructura optimizada cuando estés listo

## Comando Rápido

Para eliminar todo staging de una vez:
```bash
cd infrastructure/scripts
./delete-all-staging-resources.sh
```

Esto te pedirá confirmación antes de eliminar.
