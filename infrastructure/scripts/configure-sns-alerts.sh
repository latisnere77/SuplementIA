#!/bin/bash

# Configure SNS Email Alerts

TOPIC_ARN="arn:aws:sns:us-east-1:239378269775:production-intelligent-search-alerts"
REGION="us-east-1"

echo "📧 Configurando alertas SNS"
echo ""
echo "Topic ARN: $TOPIC_ARN"
echo ""

read -p "Ingresa tu email para alertas: " EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ Email requerido"
    exit 1
fi

echo ""
echo "Suscribiendo $EMAIL al topic..."

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint $EMAIL \
  --region $REGION

echo ""
echo "✅ Suscripción creada"
echo ""
echo "⚠️  IMPORTANTE: Revisa tu email y confirma la suscripción"
echo ""
echo "Recibirás alertas cuando:"
echo "  - Error rate > 1%"
echo "  - Latency p95 > 300ms"
echo "  - Cache hit rate < 80%"
