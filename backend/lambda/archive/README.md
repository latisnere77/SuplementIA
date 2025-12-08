# Backend Lambda - Guardrails (Capa 3)

Sistema de validación de queries para AWS Lambda antes de llamar a Bedrock.

---

## 📁 Archivos

```
backend/lambda/
├── query_validator.py        # Validador de queries (núcleo)
├── lambda_function.py         # Handler de Lambda (template)
├── test_query_validator.py   # Tests unitarios
├── deploy.sh                  # Script de deployment
└── README.md                  # Este archivo
```

---

## 🚀 Quick Start

### 1. Ejecutar Tests Localmente

```bash
# Asegúrate de tener Python 3.9+
python --version

# Ejecutar tests
cd backend/lambda
python test_query_validator.py
```

**Output esperado**:
```
==========================================================
TESTS UNITARIOS - Query Validator
==========================================================

TEST: Suplementos válidos
  ✓ 'ashwagandha' -> válido
  ✓ 'omega-3' -> válido
  ...

==========================================================
RESUMEN
==========================================================
  Total tests: 52
  ✓ Passed: 52
  ✗ Failed: 0

🎉 ¡Todos los tests pasaron!
```

### 2. Adaptar a tu Lambda Existente

**Opción A: Usar handler completo** (recomendado si empiezas de cero)
```python
# Usa lambda_function.py como base
# Agrega tu lógica de Bedrock en la función generate_recommendation_placeholder()
```

**Opción B: Integrar en Lambda existente**
```python
# En tu lambda_function.py existente:
from query_validator import validate_supplement_query, sanitize_query

def lambda_handler(event, context):
    body = json.loads(event['body'])
    category = body.get('category')

    # AGREGAR VALIDACIÓN
    validation = validate_supplement_query(category)
    if not validation.valid:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': validation.error,
                'suggestion': validation.suggestion
            })
        }

    # Sanitizar
    sanitized_category = sanitize_query(category)

    # Continuar con tu lógica normal...
```

### 3. Deploy a AWS Lambda

```bash
# Configurar variables de entorno
export LAMBDA_FUNCTION_NAME="suplementia-recommendation-lambda"
export AWS_REGION="us-east-1"

# Deploy
./deploy.sh
```

---

## 🧪 Testing

### Tests Locales

```bash
# Ejecutar todos los tests
python test_query_validator.py

# Tests específicos (modificar el script)
python -c "from query_validator import validate_supplement_query; \
           print(validate_supplement_query('ashwagandha'))"
```

### Test en Lambda Deployado

```bash
# Test con curl
curl -X POST https://YOUR_LAMBDA_URL/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "category": "ashwagandha",
    "age": 30,
    "gender": "male",
    "location": "CDMX"
  }'

# Test con query bloqueada
curl -X POST https://YOUR_LAMBDA_URL/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "category": "pizza recipe",
    "age": 30,
    "gender": "male"
  }'

# Debe retornar 400 con mensaje de error
```

---

## 📊 Validación

### ✅ Queries VÁLIDAS

**Suplementos**: ashwagandha, omega-3, vitamin-d, magnesium, creatine, cbd, melatonin, protein, zinc, etc.

**Categorías**: sleep, cognitive, muscle-gain, energy, immune, heart, stress, anxiety, etc.

**Ejemplo**:
```python
validate_supplement_query('ashwagandha')
# ValidationResult(valid=True, error=None, ...)
```

### ❌ Queries BLOQUEADAS

**Recetas**: pizza recipe, cake, pasta, etc.

**Medicamentos**: ibuprofen, xanax, adderall, etc.

**Drogas**: cocaine, marijuana, methamphetamine, etc.

**Contenido ofensivo**: bomb, weapon, poison, etc.

**Ejemplo**:
```python
validate_supplement_query('pizza recipe')
# ValidationResult(
#     valid=False,
#     error='Esta búsqueda no está permitida',
#     severity='blocked',
#     suggestion='Intenta buscar: ashwagandha, omega-3, ...'
# )
```

---

## 📝 Logging

### CloudWatch Logs

El handler automáticamente loggea:

**Queries bloqueadas**:
```json
{
  "event": "QUERY_BLOCKED",
  "requestId": "abc-123",
  "category": "pizza recipe",
  "error": "Esta búsqueda no está permitida",
  "severity": "blocked",
  "timestamp": "2024-11-19T..."
}
```

**Queries válidas**:
```json
{
  "event": "QUERY_VALIDATED",
  "requestId": "abc-123",
  "sanitizedCategory": "ashwagandha",
  "timestamp": "2024-11-19T..."
}
```

### Consultas de CloudWatch Insights

**Buscar queries bloqueadas** (últimas 24h):
```cloudwatch
fields @timestamp, @message
| filter @message like /QUERY_BLOCKED/
| sort @timestamp desc
| limit 100
```

**Estadísticas de bloqueos**:
```cloudwatch
fields @timestamp, @message
| filter @message like /QUERY_BLOCKED/
| stats count() by bin(1h)
```

---

## 🔧 Configuración AWS

### Permisos IAM

Tu Lambda necesita estos permisos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Variables de Entorno (Opcional)

```bash
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-v2
```

---

## 🔄 Actualización

### Sincronizar Listas con Frontend

Las listas blanca/negra están sincronizadas con:
- Frontend: `/lib/portal/query-validator.ts`
- API Route: Usa el mismo validador del frontend

**Para agregar nuevos términos**:

1. Edita `VALID_SUPPLEMENTS` o `VALID_CATEGORIES` en `query_validator.py`
2. Agrega los mismos términos en `/lib/portal/query-validator.ts`
3. Re-deploy Lambda: `./deploy.sh`
4. Commit y push frontend: `npm run deploy`

---

## 🚨 Troubleshooting

### Error: "Lambda timeout"
- Aumenta el timeout del Lambda (Config > General > Timeout > 30s)
- Optimiza la lógica de Bedrock

### Error: "AccessDenied: Bedrock"
- Verifica permisos IAM del Lambda role
- Asegúrate de tener acceso a Bedrock en tu región

### Error: "Invalid JSON"
- El handler valida JSON automáticamente
- Retorna 400 con mensaje descriptivo

### Queries válidas son bloqueadas
- Revisa logs de CloudWatch: ¿qué término está activando el bloqueo?
- Agrega el término a `VALID_SUPPLEMENTS` o `VALID_CATEGORIES`
- Re-deploy

---

## 📈 Métricas Recomendadas

### CloudWatch Dashboards

**Widgets recomendados**:
1. **Invocations**: Número de requests
2. **Blocked Queries**: Queries bloqueadas por hora
3. **Error Rate**: Tasa de errores
4. **Duration**: Latencia p50, p90, p99

### Alarmas

**Alerta de queries sospechosas**:
```
Métrica: QUERY_BLOCKED
Umbral: > 10 en 5 minutos
Acción: SNS notification
```

---

## 🤝 Contribuir

Para mejorar el validador:

1. Agregar tests en `test_query_validator.py`
2. Ejecutar tests localmente
3. Actualizar `query_validator.py`
4. Re-ejecutar tests
5. Deploy a Lambda de staging primero
6. Deploy a producción

---

## 📚 Referencias

- [Documentación AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [AWS Bedrock API](https://docs.aws.amazon.com/bedrock/)
- [Frontend validator](/lib/portal/query-validator.ts)
- [API Route validator](/app/api/portal/quiz/route.ts)

---

## ✅ Checklist de Deployment

- [ ] Tests pasando localmente: `python test_query_validator.py`
- [ ] Lambda configurado en AWS
- [ ] IAM role con permisos de Bedrock
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso: `./deploy.sh`
- [ ] Test con curl funcionando
- [ ] CloudWatch logs visibles
- [ ] Alarmas configuradas (opcional)

---

**Status**: ✅ Capa 3 completa
**Última actualización**: 2024-11-19
**Versión**: 1.0.0
