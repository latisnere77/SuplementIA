"""
AWS Lambda Handler con Sistema Inteligente de Evidencia
INTEGRADO con studies-fetcher y content-enricher

Este es un ejemplo completo de cómo integrar el sistema inteligente
en tu Lambda backend de recomendaciones.

USO:
1. Reemplaza tu lambda_function.py con este código
2. Agrega 'requests' a requirements.txt
3. Configura variables de entorno
4. Deploy

"""

import json
import logging
import os
import requests
from datetime import datetime
from query_validator import validate_supplement_query, sanitize_query

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configuración
ENRICH_API_URL = os.environ.get('ENRICH_API_URL', 'https://your-app.vercel.app/api/portal/enrich')
FALLBACK_ENABLED = os.environ.get('FALLBACK_ENABLED', 'true').lower() == 'true'
ENRICH_TIMEOUT = int(os.environ.get('ENRICH_TIMEOUT', '60'))


def lambda_handler(event, context):
    """
    Main Lambda handler con sistema inteligente de evidencia

    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda

    Returns:
        Response para API Gateway
    """
    request_id = context.request_id

    try:
        # Parsear body
        body = json.loads(event.get('body', '{}'))
        category = body.get('category')
        age = body.get('age', 30)
        gender = body.get('gender', 'male')
        location = body.get('location', 'CDMX')
        quiz_id = body.get('quiz_id')

        # Log del request
        logger.info(json.dumps({
            'requestId': request_id,
            'category': category,
            'timestamp': datetime.utcnow().isoformat(),
        }))

        # ========================================
        # GUARDRAILS: VALIDACIÓN DE QUERY
        # ========================================
        if not category:
            logger.warning(f"[{request_id}] Missing category")
            return create_error_response(400, 'Missing required field: category', request_id)

        # VALIDAR QUERY CON GUARDRAILS
        validation = validate_supplement_query(category)

        if not validation.valid:
            logger.warning(json.dumps({
                'event': 'QUERY_BLOCKED',
                'requestId': request_id,
                'category': category,
                'error': validation.error,
                'severity': validation.severity,
            }))

            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
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

        logger.info(json.dumps({
            'event': 'QUERY_VALIDATED',
            'requestId': request_id,
            'sanitizedCategory': sanitized_category,
        }))

        # ========================================
        # SISTEMA INTELIGENTE DE EVIDENCIA
        # ========================================

        recommendation = generate_intelligent_recommendation(
            sanitized_category,
            age,
            gender,
            location,
            quiz_id,
            request_id
        )

        # ========================================
        # RESPUESTA EXITOSA
        # ========================================

        logger.info(json.dumps({
            'event': 'RECOMMENDATION_GENERATED',
            'requestId': request_id,
            'category': sanitized_category,
            'hasIntelligentData': recommendation.get('_enrichment_metadata', {}).get('hasRealData', False),
            'studiesUsed': recommendation.get('_enrichment_metadata', {}).get('studiesUsed', 0),
        }))

        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'success': True,
                'requestId': request_id,
                'recommendation': recommendation
            })
        }

    except json.JSONDecodeError as e:
        logger.error(f"[{request_id}] Invalid JSON: {str(e)}")
        return create_error_response(400, 'Invalid JSON in request body', request_id)

    except Exception as e:
        logger.error(f"[{request_id}] Unexpected error: {str(e)}", exc_info=True)
        return create_error_response(500, 'Internal server error', request_id)


def generate_intelligent_recommendation(category, age, gender, location, quiz_id, request_id):
    """
    Genera recomendación usando el sistema inteligente de evidencia

    Esta función llama al orchestration endpoint que:
    1. Busca estudios REALES en PubMed
    2. Pasa esos estudios a Claude para análisis
    3. Retorna evidencia de alta calidad basada en datos reales

    Args:
        category: Suplemento o categoría
        age, gender, location: Datos del usuario
        quiz_id: ID del quiz
        request_id: ID del request

    Returns:
        Recommendation object con evidencia inteligente
    """
    start_time = datetime.utcnow()

    try:
        logger.info(json.dumps({
            'event': 'CALLING_INTELLIGENT_SYSTEM',
            'requestId': request_id,
            'category': category,
            'enrichUrl': ENRICH_API_URL,
        }))

        # Llamar al sistema inteligente
        response = requests.post(
            ENRICH_API_URL,
            json={
                'supplementName': category,
                'category': category,
                'maxStudies': 20,  # Buscar hasta 20 estudios de PubMed
                'rctOnly': False,  # Incluir todos los tipos de estudios
                'yearFrom': 2010   # Últimos ~15 años
            },
            timeout=ENRICH_TIMEOUT  # 60 segundos
        )

        duration = (datetime.utcnow() - start_time).total_seconds() * 1000

        if not response.ok:
            logger.warning(json.dumps({
                'event': 'ENRICH_API_ERROR',
                'requestId': request_id,
                'statusCode': response.status_code,
                'duration': duration,
            }))

            # Fallback si está habilitado
            if FALLBACK_ENABLED:
                return generate_recommendation_fallback(category, age, gender, location, quiz_id, request_id)

            raise Exception(f"Enrich API returned {response.status_code}")

        data = response.json()

        if not data.get('success'):
            logger.warning(json.dumps({
                'event': 'ENRICH_API_FAILED',
                'requestId': request_id,
                'error': data.get('error'),
                'duration': duration,
            }))

            if FALLBACK_ENABLED:
                return generate_recommendation_fallback(category, age, gender, location, quiz_id, request_id)

            raise Exception(f"Enrich API failed: {data.get('error')}")

        # ✅ Datos enriquecidos con estudios REALES
        enriched_data = data.get('data', {})
        metadata = data.get('metadata', {})

        logger.info(json.dumps({
            'event': 'INTELLIGENT_ENRICHMENT_SUCCESS',
            'requestId': request_id,
            'category': category,
            'studiesUsed': metadata.get('studiesUsed', 0),
            'hasRealData': metadata.get('hasRealData', False),
            'duration': duration,
        }))

        # Transformar al formato de recomendación
        recommendation = transform_enriched_to_recommendation(
            enriched_data,
            metadata,
            category,
            age,
            gender,
            location,
            quiz_id,
            request_id
        )

        return recommendation

    except requests.exceptions.Timeout:
        logger.error(json.dumps({
            'event': 'ENRICH_API_TIMEOUT',
            'requestId': request_id,
            'timeout': ENRICH_TIMEOUT,
        }))

        if FALLBACK_ENABLED:
            return generate_recommendation_fallback(category, age, gender, location, quiz_id, request_id)

        raise

    except Exception as e:
        logger.error(json.dumps({
            'event': 'INTELLIGENT_ENRICHMENT_ERROR',
            'requestId': request_id,
            'error': str(e),
        }))

        if FALLBACK_ENABLED:
            return generate_recommendation_fallback(category, age, gender, location, quiz_id, request_id)

        raise


def transform_enriched_to_recommendation(enriched_data, metadata, category, age, gender, location, quiz_id, request_id):
    """
    Transforma datos del sistema inteligente al formato de recomendación esperado

    Args:
        enriched_data: Datos de content-enricher
        metadata: Metadata del sistema inteligente
        category, age, gender, location, quiz_id, request_id: Datos del request

    Returns:
        Recommendation object
    """
    works_for = enriched_data.get('worksFor', [])
    ingredients = enriched_data.get('ingredients', [])
    dosage = enriched_data.get('dosage', {})
    safety = enriched_data.get('safety', {})

    # Calcular métricas de evidencia
    total_studies = sum(ing.get('studyCount', 0) for ing in ingredients)
    total_participants = sum(ing.get('participants', 0) for ing in ingredients) if ingredients else 0
    efficacy = calculate_efficacy_from_works_for(works_for)

    # Construir evidence_summary
    evidence_summary = {
        'totalStudies': total_studies or metadata.get('studiesUsed', 0),
        'totalParticipants': total_participants,
        'efficacyPercentage': efficacy,
        'researchSpanYears': 15,  # 2010-2025
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

    # Construir recomendación
    recommendation = {
        'recommendation_id': f'rec_{request_id[:8]}_{int(datetime.utcnow().timestamp())}',
        'quiz_id': quiz_id,
        'category': category,
        'age': age,
        'gender': gender,
        'location': location,

        # Evidencia basada en estudios REALES
        'evidence_summary': evidence_summary,

        # Ingredientes con detalles
        'ingredients': ingredients,

        # Información adicional del sistema inteligente
        'dosage': dosage,
        'safety': safety,
        'worksFor': works_for,
        'doesntWorkFor': enriched_data.get('doesntWorkFor', []),
        'limitedEvidence': enriched_data.get('limitedEvidence', []),

        # Productos (agregar tu lógica aquí)
        'products': [],  # TODO: Integrar con tu sistema de productos

        # Metadata del sistema inteligente
        '_enrichment_metadata': {
            'studiesUsed': metadata.get('studiesUsed', 0),
            'hasRealData': metadata.get('hasRealData', False),
            'intelligentSystem': True,
            'studiesSource': metadata.get('studiesSource', 'PubMed'),
            'enrichedAt': datetime.utcnow().isoformat(),
        }
    }

    return recommendation


def calculate_efficacy_from_works_for(works_for):
    """
    Calcula efficacy percentage basado en grades de worksFor

    Grades más altas (A, B) = mayor efficacy
    """
    if not works_for:
        return 50  # Neutral

    grade_weights = {
        'A': 90,
        'B': 75,
        'C': 60,
        'D': 40,
        'E': 25,
        'F': 10
    }

    total_weight = sum(
        grade_weights.get(item.get('evidenceGrade', 'C'), 60)
        for item in works_for
    )

    return int(total_weight / len(works_for))


def generate_recommendation_fallback(category, age, gender, location, quiz_id, request_id):
    """
    Fallback cuando el sistema inteligente no está disponible

    NOTA: Este método NO tiene estudios reales de PubMed.
    Es solo un fallback para asegurar que el sistema siempre funcione.
    """
    logger.warning(json.dumps({
        'event': 'USING_FALLBACK',
        'requestId': request_id,
        'category': category,
    }))

    return {
        'recommendation_id': f'rec_fallback_{request_id[:8]}',
        'quiz_id': quiz_id,
        'category': category,
        'age': age,
        'gender': gender,
        'location': location,
        'evidence_summary': {
            'totalStudies': 0,
            'totalParticipants': 0,
            'efficacyPercentage': 50,
            'researchSpanYears': 0,
            'ingredients': []
        },
        'ingredients': [],
        'products': [],
        '_enrichment_metadata': {
            'studiesUsed': 0,
            'hasRealData': False,
            'intelligentSystem': False,
            'fallbackMode': True,
            'warning': 'Using fallback data - intelligent system unavailable'
        }
    }


def create_error_response(status_code, error_message, request_id):
    """Helper para crear respuestas de error"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps({
            'success': False,
            'error': error_message,
            'requestId': request_id
        })
    }


def get_cors_headers():
    """Headers CORS para API Gateway"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID'
    }


# Para testing local
if __name__ == '__main__':
    # Test con query válida
    test_event = {
        'body': json.dumps({
            'category': 'ashwagandha',
            'age': 30,
            'gender': 'male',
            'location': 'CDMX',
            'quiz_id': 'quiz_test_123'
        }),
        'headers': {
            'User-Agent': 'Test Client'
        }
    }

    # Mock context
    class MockContext:
        request_id = 'test-request-123'
        function_name = 'test-function'

    context = MockContext()

    print("=== TEST: Recomendación con Sistema Inteligente ===")
    response = lambda_handler(test_event, context)
    result = json.loads(response['body'])

    print(f"\nStatus: {response['statusCode']}")
    print(f"Success: {result.get('success')}")

    if result.get('success'):
        rec = result.get('recommendation', {})
        metadata = rec.get('_enrichment_metadata', {})

        print(f"\nRecommendation ID: {rec.get('recommendation_id')}")
        print(f"Category: {rec.get('category')}")
        print(f"\nIntelligent System:")
        print(f"  - Studies Used: {metadata.get('studiesUsed')}")
        print(f"  - Has Real Data: {metadata.get('hasRealData')}")
        print(f"  - Intelligent System: {metadata.get('intelligentSystem')}")

        evidence = rec.get('evidence_summary', {})
        print(f"\nEvidence Summary:")
        print(f"  - Total Studies: {evidence.get('totalStudies')}")
        print(f"  - Efficacy: {evidence.get('efficacyPercentage')}%")
        print(f"  - Ingredients: {len(evidence.get('ingredients', []))}")
    else:
        print(f"\nError: {result.get('error')}")
