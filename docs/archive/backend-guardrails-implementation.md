# Guardrails Implementation - Backend Lambda (Capa 3)

## Resumen

Este documento describe cómo implementar la validación de queries en el backend AWS Lambda (Python) para completar el sistema de guardrails de 3 capas.

**Estado**: Frontend ✅ | API Route ✅ | Backend Lambda ⏳ (Pendiente)

---

## ¿Por qué necesitamos validación en el backend?

Aunque ya tenemos validación en frontend y API route, el backend Lambda necesita su propia validación porque:

1. **Defensa en profundidad**: Usuarios malintencionados podrían llamar directamente al Lambda
2. **Protección de Bedrock**: Evitar llamadas costosas a Bedrock con queries inválidas
3. **Logging centralizado**: Rastrear intentos sospechosos en CloudWatch
4. **Compliance**: Asegurar que NUNCA se procesen queries inapropiadas

---

## Implementación en Python

### 1. Crear validador Python

Crea un archivo `query_validator.py` en tu Lambda:

```python
"""
Query Validator para Backend Lambda
Valida búsquedas para prevenir consultas inapropiadas
"""

import re
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class ValidationResult:
    """Resultado de validación"""
    valid: bool
    error: Optional[str] = None
    suggestion: Optional[str] = None
    severity: Optional[str] = None  # 'warning' | 'error' | 'blocked'


# LISTA BLANCA - Términos válidos conocidos
VALID_SUPPLEMENTS = {
    # Suplementos populares
    'ashwagandha', 'cbd', 'melatonin', 'melatonina', 'creatine', 'creatina',
    'protein', 'proteina', 'whey', 'collagen', 'colageno', 'caffeine', 'cafeina',
    'bcaa', 'glutamine', 'glutamina', 'beta-alanine', 'beta-alanina',
    'l-carnitine', 'l-carnitina', 'coq10', 'rhodiola', 'ginseng',

    # Ácidos grasos
    'omega-3', 'omega-6', 'omega-9', 'fish-oil', 'aceite-de-pescado',

    # Vitaminas
    'vitamin-a', 'vitamina-a', 'vitamin-b', 'vitamina-b',
    'vitamin-b12', 'b12', 'vitamin-c', 'vitamina-c',
    'vitamin-d', 'vitamina-d', 'vitamin-d3', 'd3',
    'vitamin-e', 'vitamina-e', 'vitamin-k', 'vitamina-k',
    'biotin', 'biotina', 'niacin', 'niacina',

    # Minerales
    'magnesium', 'magnesio', 'zinc', 'iron', 'hierro',
    'calcium', 'calcio', 'potassium', 'potasio',
    'selenium', 'selenio', 'chromium', 'cromo',

    # Aminoácidos
    'l-theanine', 'l-teanina', 'taurine', 'taurina',
    'arginine', 'arginina', 'lysine', 'lisina',

    # Hierbas
    'turmeric', 'curcuma', 'ginger', 'jengibre',
    'garlic', 'ajo', 'green-tea', 'te-verde',
}

# CATEGORÍAS VÁLIDAS
VALID_CATEGORIES = {
    'sleep', 'sueño', 'dormir', 'insomnia', 'insomnio',
    'cognitive', 'cognitivo', 'memory', 'memoria', 'focus', 'enfoque',
    'muscle', 'musculo', 'muscle-gain', 'ganar-musculo',
    'strength', 'fuerza', 'performance', 'rendimiento',
    'energy', 'energia', 'fatigue', 'fatiga',
    'immune', 'inmune', 'immunity', 'inmunidad',
    'heart', 'corazon', 'cardiovascular',
    'stress', 'estres', 'anxiety', 'ansiedad',
    'joint', 'articulaciones', 'bones', 'huesos',
    'skin', 'piel', 'hair', 'cabello',
    'digestion', 'digestion', 'gut', 'intestino',
}

# LISTA NEGRA - Términos prohibidos
BLOCKED_TERMS = {
    # Recetas de cocina
    'recipe', 'receta', 'pizza', 'pasta', 'cake', 'pastel',
    'bread', 'pan', 'cookie', 'galleta', 'dessert', 'postre',

    # Medicamentos con receta
    'antibiotic', 'antibiotico', 'penicillin', 'penicilina',
    'ibuprofen', 'ibuprofeno', 'aspirin', 'aspirina',
    'opioid', 'opioide', 'morphine', 'morfina',
    'adderall', 'ritalin', 'xanax', 'valium',

    # Drogas ilegales
    'cocaine', 'cocaina', 'heroin', 'heroina',
    'methamphetamine', 'metanfetamina', 'meth',
    'marijuana', 'marihuana', 'cannabis', 'weed',
    'lsd', 'ecstasy', 'mdma', 'ketamine',

    # Esteroides anabólicos
    'steroid', 'esteroide', 'anabolic', 'anabolico',
    'testosterone-injection', 'hgh', 'growth-hormone',

    # Términos ofensivos/peligrosos
    'bomb', 'bomba', 'weapon', 'arma',
    'poison', 'veneno', 'kill', 'matar',
}

# PATRONES SOSPECHOSOS
SUSPICIOUS_PATTERNS = [
    r'\b(how to|como) (make|hacer|create|crear) (bomb|bomba|weapon|arma)',
    r'\b(recipe|receta) (for|para|de)\b',
    r'\b(buy|comprar|purchase|adquirir) (drug|droga|illegal)',
    r'\b(prescription|receta medica|rx)\b',
]


def validate_supplement_query(query: str) -> ValidationResult:
    """
    Validar query de búsqueda

    Args:
        query: Búsqueda del usuario

    Returns:
        ValidationResult con valid=True/False y error opcional
    """
    # Normalizar query
    normalized = query.lower().strip()

    # 1. VALIDACIÓN BÁSICA
    if not normalized or len(normalized) < 2:
        return ValidationResult(
            valid=False,
            error='La búsqueda es demasiado corta',
            severity='warning'
        )

    if len(normalized) > 100:
        return ValidationResult(
            valid=False,
            error='La búsqueda es demasiado larga',
            severity='warning'
        )

    # 2. LISTA NEGRA - Bloquear términos prohibidos
    words = normalized.split()
    for word in words:
        if word in BLOCKED_TERMS:
            return ValidationResult(
                valid=False,
                error='Esta búsqueda no está permitida',
                severity='blocked',
                suggestion='Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium'
            )

    # 3. PATRONES SOSPECHOSOS
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, normalized, re.IGNORECASE):
            return ValidationResult(
                valid=False,
                error='Esta búsqueda no parece relacionada con suplementos',
                severity='blocked',
                suggestion='Intenta buscar: ashwagandha, omega-3, vitamin-d, magnesium'
            )

    # 4. LISTA BLANCA - Validación positiva
    has_valid_term = False

    for word in words:
        # Buscar coincidencias exactas
        if word in VALID_SUPPLEMENTS or word in VALID_CATEGORIES:
            has_valid_term = True
            break

        # Buscar coincidencias parciales
        for valid_term in list(VALID_SUPPLEMENTS) + list(VALID_CATEGORIES):
            if valid_term in word or word in valid_term:
                if len(valid_term) >= 4 and len(word) >= 4:
                    has_valid_term = True
                    break

        if has_valid_term:
            break

    # 5. HEURÍSTICA - Si no está en lista blanca
    if not has_valid_term:
        # Permitir queries que parezcan ingredientes
        looks_like_ingredient = (
            re.match(r'^[a-z]{4,}(-[a-z]{2,})?$', normalized, re.IGNORECASE) or
            re.search(r'acid|ine|ate|ol$', normalized, re.IGNORECASE) or
            re.search(r'extract|extracto|powder|polvo', normalized, re.IGNORECASE)
        )

        if not looks_like_ingredient:
            return ValidationResult(
                valid=False,
                error='No reconocemos este suplemento',
                severity='warning',
                suggestion='Suplementos comunes: ashwagandha, omega-3, vitamin-d, magnesium'
            )

    # ✅ QUERY VÁLIDA
    return ValidationResult(valid=True)


def sanitize_query(query: str) -> str:
    """Sanitizar y normalizar query"""
    return query.strip()[:100].replace('<', '').replace('>', '')
```

### 2. Integrar en Lambda Handler

Modifica tu Lambda handler (ej: `lambda_function.py`):

```python
import json
import logging
from query_validator import validate_supplement_query, sanitize_query

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """Main Lambda handler"""

    # Extraer categoría del evento
    body = json.loads(event.get('body', '{}'))
    category = body.get('category')

    # Log del request
    request_id = context.request_id
    logger.info(f"[{request_id}] Processing request for category: {category}")

    # GUARDRAILS: Validar query
    validation = validate_supplement_query(category)

    if not validation.valid:
        # Log del intento bloqueado
        logger.warning(f"[{request_id}] BLOCKED QUERY: {category}")
        logger.warning(f"[{request_id}] Reason: {validation.error}")
        logger.warning(f"[{request_id}] Severity: {validation.severity}")

        # Retornar error 400
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': validation.error,
                'suggestion': validation.suggestion,
                'severity': validation.severity,
                'requestId': request_id
            })
        }

    # Sanitizar categoría
    sanitized_category = sanitize_query(category)

    logger.info(f"[{request_id}] Query validated successfully: {sanitized_category}")

    # Continuar con lógica normal...
    # ... llamar a Bedrock ...
    # ... generar recomendación ...

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': True,
            # ... resto de la respuesta ...
        })
    }
```

### 3. Monitoring y Logging

Configura CloudWatch Insights para rastrear queries bloqueadas:

```cloudwatch
fields @timestamp, @message
| filter @message like /BLOCKED QUERY/
| stats count() by bin(5m)
```

Para ver patrones de intentos sospechosos:

```cloudwatch
fields @timestamp, @message, category
| filter @message like /Severity: blocked/
| sort @timestamp desc
| limit 100
```

---

## Testing

### Test en Local (Python)

```python
from query_validator import validate_supplement_query

# Test casos válidos
assert validate_supplement_query('ashwagandha').valid == True
assert validate_supplement_query('omega-3').valid == True
assert validate_supplement_query('sleep').valid == True

# Test casos inválidos
assert validate_supplement_query('pizza recipe').valid == False
assert validate_supplement_query('cocaine').valid == False
assert validate_supplement_query('how to make bomb').valid == False

print("✅ All tests passed!")
```

### Test en Lambda (curl)

```bash
# Test query válida
curl -X POST https://YOUR_LAMBDA_URL/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{"category": "ashwagandha", "age": 30, "gender": "male"}'

# Test query inválida
curl -X POST https://YOUR_LAMBDA_URL/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{"category": "pizza recipe", "age": 30, "gender": "male"}'
# Debe retornar 400 con mensaje de error
```

---

## Deployment

1. **Agregar archivo al Lambda**:
   ```bash
   zip -r lambda.zip query_validator.py lambda_function.py
   aws lambda update-function-code \
     --function-name YOUR_LAMBDA_NAME \
     --zip-file fileb://lambda.zip
   ```

2. **Configurar CloudWatch**:
   - Crear alarma para `BLOCKED QUERY` > 10 en 5 minutos
   - Notificar a SNS/Email cuando se detecten patrones sospechosos

---

## Mantenimiento

### Actualizar Listas

Para agregar nuevos suplementos válidos:

1. Editar `VALID_SUPPLEMENTS` o `VALID_CATEGORIES`
2. Re-deployar Lambda
3. Sincronizar con frontend (`/lib/portal/query-validator.ts`)

Para agregar términos bloqueados:

1. Editar `BLOCKED_TERMS`
2. Re-deployar Lambda
3. Verificar logs de CloudWatch

---

## Arquitectura Completa

```
Usuario
  ↓
┌─────────────────────────┐
│   FRONTEND (Capa 1)     │ ← Validación instantánea
│   query-validator.ts    │
└─────────────────────────┘
  ↓
┌─────────────────────────┐
│   API ROUTE (Capa 2)    │ ← Validación antes de backend
│   /api/portal/quiz      │
└─────────────────────────┘
  ↓
┌─────────────────────────┐
│  BACKEND LAMBDA (Capa 3)│ ← Validación final + Bedrock
│  query_validator.py     │
└─────────────────────────┘
```

---

## Referencias

- Frontend validator: `/lib/portal/query-validator.ts`
- API route validator: `/app/api/portal/quiz/route.ts`
- Backend docs: Este archivo

---

**Status**: ⏳ Pendiente de implementación en Lambda
**Owner**: Backend Team
**Prioridad**: Alta (protege costos de Bedrock)
