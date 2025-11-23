# Guía de Integración: Sistema Inteligente de Evidencia

## 🎯 Objetivo

Integrar el nuevo **sistema inteligente de evidencia** en el backend Lambda de recomendaciones (`/portal/recommend`), para que automáticamente use estudios reales de PubMed al generar recomendaciones.

---

## 📍 Situación Actual

### Backend Lambda de Recomendaciones
- **URL**: `https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging`
- **Endpoint**: `/portal/recommend`
- **Estado**: Deployado en AWS (código no en este repo)
- **Problema**: Genera evidencia sin datos reales de PubMed

### Nuevo Sistema Inteligente (YA FUNCIONANDO)
- **Orchestration**: `/api/portal/enrich` (Next.js API)
- **Studies Fetcher**: `https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search`
- **Content Enricher**: `https://lm9ho0w527.execute-api.us-east-1.amazonaws.com/dev/enrich`
- **Estado**: ✅ Funcionando y probado

---

## 🔧 Opciones de Integración

### Opción A: Llamar al Orchestration Endpoint (Recomendado)

El backend Lambda puede llamar directamente al orchestration endpoint que maneja todo:

```python
import requests
import json

def generate_recommendation(category, age, gender, location, request_id):
    """
    Genera recomendación usando el sistema inteligente
    """
    # URL del orchestration endpoint
    ENRICH_URL = "https://your-app.vercel.app/api/portal/enrich"

    # Llamar al sistema inteligente
    response = requests.post(
        ENRICH_URL,
        json={
            'supplementName': category,
            'category': category,
            'maxStudies': 20,
            'rctOnly': False,
            'yearFrom': 2010
        },
        timeout=60  # Dar tiempo para buscar en PubMed
    )

    if not response.ok:
        logger.error(f"Enrich API failed: {response.status_code}")
        # Fallback a método antiguo
        return generate_recommendation_fallback(category, age, gender, location)

    data = response.json()

    if not data.get('success'):
        logger.error(f"Enrich API error: {data.get('error')}")
        return generate_recommendation_fallback(category, age, gender, location)

    # Datos enriquecidos con estudios REALES
    enriched_data = data.get('data', {})
    metadata = data.get('metadata', {})

    logger.info(json.dumps({
        'event': 'INTELLIGENT_ENRICHMENT',
        'requestId': request_id,
        'studiesUsed': metadata.get('studiesUsed', 0),
        'hasRealData': metadata.get('hasRealData', False)
    }))

    # Transformar al formato de recomendación
    recommendation = {
        'recommendation_id': f'rec_{request_id[:8]}',
        'category': category,
        'evidence_summary': transform_to_evidence_summary(enriched_data, metadata),
        'ingredients': transform_to_ingredients(enriched_data),
        'products': [],  # Agregar lógica de productos
        # Datos adicionales del sistema inteligente
        '_enrichment_metadata': {
            'studiesUsed': metadata.get('studiesUsed', 0),
            'hasRealData': metadata.get('hasRealData', False),
            'intelligentSystem': True
        }
    }

    return recommendation


def transform_to_evidence_summary(enriched_data, metadata):
    """
    Transforma datos del content-enricher al formato evidence_summary
    """
    works_for = enriched_data.get('worksFor', [])

    # Calcular total de estudios basado en los ingredients
    ingredients = enriched_data.get('ingredients', [])
    total_studies = sum(ing.get('studyCount', 0) for ing in ingredients)
    total_participants = sum(ing.get('participants', 0) for ing in ingredients) if ingredients else 0

    # Calcular efficacy basado en grades
    efficacy = calculate_efficacy_from_works_for(works_for)

    return {
        'totalStudies': total_studies or metadata.get('studiesUsed', 0),
        'totalParticipants': total_participants,
        'efficacyPercentage': efficacy,
        'researchSpanYears': 15,  # Basado en yearFrom=2010
        'ingredients': [
            {
                'name': ing.get('name'),
                'grade': ing.get('grade'),
                'studyCount': ing.get('studyCount', 0),
                'rctCount': ing.get('rctCount', 0),
                'description': ing.get('description', '')
            }
            for ing in ingredients
        ]
    }


def calculate_efficacy_from_works_for(works_for):
    """
    Calcula efficacy percentage basado en grades de worksFor
    """
    grade_weights = {'A': 90, 'B': 75, 'C': 60, 'D': 40, 'E': 25, 'F': 10}

    if not works_for:
        return 50

    total_weight = sum(grade_weights.get(item.get('evidenceGrade', 'C'), 60) for item in works_for)
    return int(total_weight / len(works_for))


def transform_to_ingredients(enriched_data):
    """
    Transforma ingredients del enricher al formato esperado
    """
    return enriched_data.get('ingredients', [])
```

### Opción B: Llamar Directamente a los Lambdas

Si prefieres mayor control, llama a los Lambdas directamente:

```python
import requests

def generate_recommendation_with_studies(category, request_id):
    """
    Genera recomendación llamando a los Lambdas directamente
    """
    # 1. Obtener estudios de PubMed
    STUDIES_URL = "https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search"

    studies_response = requests.post(
        STUDIES_URL,
        json={
            'supplementName': category,
            'maxResults': 20,
            'filters': {
                'rctOnly': False,
                'yearFrom': 2010,
                'humanStudiesOnly': True,
                'studyTypes': [
                    'randomized controlled trial',
                    'meta-analysis',
                    'systematic review'
                ]
            }
        },
        timeout=30
    )

    studies = []
    if studies_response.ok:
        studies_data = studies_response.json()
        if studies_data.get('success'):
            studies = studies_data.get('data', {}).get('studies', [])
            logger.info(f"Fetched {len(studies)} studies from PubMed")

    # 2. Enriquecer con Content Enricher (con estudios reales)
    ENRICHER_URL = "https://lm9ho0w527.execute-api.us-east-1.amazonaws.com/dev/enrich"

    enricher_response = requests.post(
        ENRICHER_URL,
        json={
            'supplementId': category,
            'category': category,
            'studies': studies  # ← ESTUDIOS REALES
        },
        timeout=60
    )

    if not enricher_response.ok:
        logger.error(f"Enricher failed: {enricher_response.status_code}")
        return generate_recommendation_fallback(category)

    enricher_data = enricher_response.json()

    if not enricher_data.get('success'):
        logger.error(f"Enricher error: {enricher_data.get('error')}")
        return generate_recommendation_fallback(category)

    # Transformar a formato de recomendación
    # ... (mismo código que Opción A)
```

---

## 📝 Modificaciones Necesarias en el Lambda

### Archivo: `lambda_function.py` (o similar)

#### 1. Agregar importaciones

```python
import requests  # Agregar a requirements.txt
import json
import logging
from datetime import datetime
```

#### 2. Agregar variables de entorno

```python
# En tu Lambda configuration → Environment variables
ENRICH_API_URL = "https://your-app.vercel.app/api/portal/enrich"
STUDIES_API_URL = "https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search"
ENRICHER_LAMBDA_URL = "https://lm9ho0w527.execute-api.us-east-1.amazonaws.com/dev/enrich"

# En el código
ENRICH_URL = os.environ.get('ENRICH_API_URL')
```

#### 3. Modificar función de generación de recomendaciones

**ANTES:**
```python
def generate_recommendation_placeholder(category, age, gender, location, request_id):
    # ... código antiguo que no usa estudios reales
    return {
        'recommendation_id': f'rec_{request_id[:8]}',
        'category': category,
        'evidence_summary': {
            'totalStudies': 0,  # ← hardcoded o fake
            'efficacyPercentage': 0,  # ← sin datos reales
        },
    }
```

**DESPUÉS:**
```python
def generate_recommendation(category, age, gender, location, request_id):
    """
    Genera recomendación usando sistema inteligente de evidencia
    """
    ENRICH_URL = os.environ.get('ENRICH_API_URL')

    try:
        # Llamar al sistema inteligente
        response = requests.post(
            ENRICH_URL,
            json={
                'supplementName': category,
                'category': category,
                'maxStudies': 20,
                'rctOnly': False,
                'yearFrom': 2010
            },
            timeout=60
        )

        if response.ok:
            data = response.json()
            if data.get('success'):
                # ✅ Datos con estudios REALES de PubMed
                return transform_enriched_to_recommendation(
                    data, category, age, gender, location, request_id
                )

        # Si falla, usar fallback
        logger.warning(f"Enrich API failed, using fallback")

    except Exception as e:
        logger.error(f"Enrich API error: {str(e)}")

    # Fallback a método antiguo
    return generate_recommendation_fallback(category, age, gender, location, request_id)
```

---

## 🧪 Testing

### 1. Test Local (Python)

```bash
# En el directorio del Lambda backend
python test_integration.py
```

```python
# test_integration.py
import requests

def test_intelligent_enrichment():
    """Test del sistema inteligente"""
    response = requests.post(
        'https://your-app.vercel.app/api/portal/enrich',
        json={
            'supplementName': 'Ashwagandha',
            'category': 'stress',
            'maxStudies': 10
        }
    )

    assert response.ok
    data = response.json()
    assert data['success'] == True
    assert data['metadata']['hasRealData'] == True
    assert data['metadata']['studiesUsed'] > 0

    print(f"✅ Test passed! Used {data['metadata']['studiesUsed']} real studies")

if __name__ == '__main__':
    test_intelligent_enrichment()
```

### 2. Test del Lambda Completo

```bash
# Test con curl al Lambda backend
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "category": "ashwagandha",
    "age": 30,
    "gender": "male",
    "location": "CDMX"
  }' | jq '.recommendation._enrichment_metadata'

# Debe retornar:
# {
#   "studiesUsed": 10,
#   "hasRealData": true,
#   "intelligentSystem": true
# }
```

---

## 🚀 Deployment

### Pasos para Deploy del Backend Lambda Modificado

1. **Actualizar código** con las modificaciones anteriores

2. **Agregar `requests` a requirements.txt**:
```txt
requests==2.31.0
boto3
```

3. **Configurar variables de entorno** en AWS Lambda Console:
```bash
ENRICH_API_URL=https://your-app.vercel.app/api/portal/enrich
STUDIES_API_URL=https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search
ENRICHER_LAMBDA_URL=https://lm9ho0w527.execute-api.us-east-1.amazonaws.com/dev/enrich
```

4. **Aumentar timeout** del Lambda a 60 segundos (para dar tiempo a PubMed)

5. **Deploy**:
```bash
# Desde el directorio del Lambda backend
./deploy.sh
```

6. **Verificar**:
```bash
# Test del endpoint
curl -X POST https://epmozzfkq4.execute-api.us-east-1.amazonaws.com/staging/portal/recommend \
  -H "Content-Type: application/json" \
  -d '{"category":"caffeine","age":30,"gender":"male","location":"CDMX"}' | jq '.'
```

---

## ✅ Checklist de Integración

- [ ] Código del Lambda backend modificado
- [ ] `requests` agregado a requirements.txt
- [ ] Variables de entorno configuradas en Lambda
- [ ] Timeout aumentado a 60s
- [ ] Tests locales pasando
- [ ] Lambda deployado
- [ ] Test end-to-end funcionando
- [ ] Logs en CloudWatch mostrando "INTELLIGENT_ENRICHMENT"
- [ ] Frontend recibiendo datos con `_enrichment_metadata`

---

## 📊 Beneficios Esperados

### Antes de la Integración
- ❌ Datos de evidencia fake o hardcoded
- ❌ No verificables
- ❌ Calificaciones incorrectas (ej: Cafeína Grade E)
- ❌ No escala

### Después de la Integración
- ✅ Datos de estudios REALES de PubMed
- ✅ Verificables con PMIDs
- ✅ Calificaciones precisas basadas en evidencia
- ✅ Escala a cualquier suplemento automáticamente
- ✅ Metadata incluye: `studiesUsed`, `hasRealData`, `intelligentSystem`

---

## 🔍 Monitoreo

### CloudWatch Logs

Buscar estos eventos en los logs del Lambda:

**Éxito:**
```json
{
  "event": "INTELLIGENT_ENRICHMENT",
  "requestId": "abc-123",
  "studiesUsed": 20,
  "hasRealData": true
}
```

**Fallback:**
```json
{
  "event": "ENRICH_FALLBACK",
  "requestId": "abc-123",
  "reason": "API timeout"
}
```

### Queries de CloudWatch Insights

```cloudwatch
fields @timestamp, @message
| filter @message like /INTELLIGENT_ENRICHMENT/
| stats count() by bin(1h)
```

---

## 🆘 Troubleshooting

### Error: "Enrich API timeout"
- **Causa**: PubMed API lento
- **Solución**: Aumentar timeout del Lambda a 90s

### Error: "No studies found"
- **Causa**: Suplemento muy raro o mal escrito
- **Solución**: El sistema automáticamente hace fallback

### Error: "requests module not found"
- **Causa**: No está en el deployment package
- **Solución**: Agregar `requests` a requirements.txt y re-deploy

---

## 📚 Referencias

- [Sistema Inteligente - Documentación](../docs/INTELLIGENT-EVIDENCE-SYSTEM.md)
- [Orchestration Endpoint](../app/api/portal/enrich/route.ts)
- [Content Enricher Lambda](../backend/lambda/content-enricher/)
- [Studies Fetcher Lambda](../backend/lambda/studies-fetcher/)

---

**Estado**: 📝 Guía completa - Listo para implementar
**Última actualización**: 2024-11-19
