"""
AWS Lambda Handler con Guardrails
Sistema de validación de queries antes de llamar a Bedrock

IMPORTANTE: Este es un TEMPLATE/EJEMPLO
- Adapta este código a tu Lambda existente
- La lógica de Bedrock y recomendaciones debe agregarse donde dice "# TODO"
"""

import json
import logging
import os
from datetime import datetime
from query_validator import validate_supplement_query, sanitize_query

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configuración
BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-v2')


def lambda_handler(event, context):
    """
    Main Lambda handler con validación de guardrails

    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda

    Returns:
        Response para API Gateway
    """
    # Extraer request ID para tracking
    request_id = context.request_id

    try:
        # Parsear body
        body = json.loads(event.get('body', '{}'))
        category = body.get('category')
        age = body.get('age')
        gender = body.get('gender')
        location = body.get('location')

        # Log del request (sin exponer datos sensibles)
        logger.info(json.dumps({
            'requestId': request_id,
            'category': category,
            'timestamp': datetime.utcnow().isoformat(),
            'userAgent': event.get('headers', {}).get('User-Agent'),
        }))

        # ========================================
        # GUARDRAILS: VALIDACIÓN DE QUERY
        # ========================================

        # Validar que category existe
        if not category:
            logger.warning(f"[{request_id}] Missing category")
            return create_error_response(400, 'Missing required field: category', request_id)

        # VALIDAR QUERY CON GUARDRAILS
        validation = validate_supplement_query(category)

        if not validation.valid:
            # Log del intento bloqueado
            logger.warning(json.dumps({
                'event': 'QUERY_BLOCKED',
                'requestId': request_id,
                'category': category,
                'error': validation.error,
                'severity': validation.severity,
                'timestamp': datetime.utcnow().isoformat(),
            }))

            # Retornar error 400
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

        # Sanitizar categoría para seguridad
        sanitized_category = sanitize_query(category)

        logger.info(json.dumps({
            'event': 'QUERY_VALIDATED',
            'requestId': request_id,
            'sanitizedCategory': sanitized_category,
            'timestamp': datetime.utcnow().isoformat(),
        }))

        # ========================================
        # LÓGICA DE NEGOCIO (TODO: Adaptar a tu código)
        # ========================================

        # TODO: Aquí va tu lógica existente de:
        # 1. Llamar a Bedrock
        # 2. Generar recomendación
        # 3. Guardar en DynamoDB
        # 4. etc.

        # EJEMPLO PLACEHOLDER:
        recommendation = generate_recommendation_placeholder(
            sanitized_category,
            age,
            gender,
            location,
            request_id
        )

        # ========================================
        # RESPUESTA EXITOSA
        # ========================================

        logger.info(json.dumps({
            'event': 'RECOMMENDATION_GENERATED',
            'requestId': request_id,
            'category': sanitized_category,
            'timestamp': datetime.utcnow().isoformat(),
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


def generate_recommendation_placeholder(category, age, gender, location, request_id):
    """
    PLACEHOLDER - Reemplaza esto con tu lógica real

    TODO: Implementar tu lógica de:
    - Llamada a Bedrock
    - Generación de recomendación
    - Cálculo de evidencia
    - etc.
    """
    return {
        'recommendation_id': f'rec_{request_id[:8]}',
        'category': category,
        'message': 'PLACEHOLDER - Implementa tu lógica de Bedrock aquí',
        'evidence_summary': {
            'totalStudies': 0,
            'efficacyPercentage': 0,
        },
        'ingredients': [],
        'products': []
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
    test_event_valid = {
        'body': json.dumps({
            'category': 'ashwagandha',
            'age': 30,
            'gender': 'male',
            'location': 'CDMX'
        }),
        'headers': {
            'User-Agent': 'Test Client'
        }
    }

    # Test con query bloqueada
    test_event_blocked = {
        'body': json.dumps({
            'category': 'pizza recipe',
            'age': 30,
            'gender': 'male',
            'location': 'CDMX'
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

    print("=== TEST 1: Query válida (ashwagandha) ===")
    response1 = lambda_handler(test_event_valid, context)
    print(json.dumps(json.loads(response1['body']), indent=2))

    print("\n=== TEST 2: Query bloqueada (pizza recipe) ===")
    response2 = lambda_handler(test_event_blocked, context)
    print(json.dumps(json.loads(response2['body']), indent=2))
