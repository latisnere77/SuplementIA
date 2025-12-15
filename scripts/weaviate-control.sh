#!/bin/bash
# Control script for Weaviate AWS deployment
# Usage: ./scripts/weaviate-control.sh [start|stop|status]

CLUSTER="suplementia-weaviate-oss-prod-cluster"
SERVICE="weaviate-service"

case "$1" in
  start)
    echo "🚀 Starting Weaviate service..."
    aws ecs update-service \
      --cluster $CLUSTER \
      --service $SERVICE \
      --desired-count 1 \
      --no-cli-pager
    echo "✅ Service starting. Wait ~2-3 minutes for full startup."
    echo "   Run './scripts/weaviate-control.sh status' to check progress."
    ;;
  
  stop)
    echo "🛑 Stopping Weaviate service..."
    aws ecs update-service \
      --cluster $CLUSTER \
      --service $SERVICE \
      --desired-count 0 \
      --no-cli-pager
    echo "✅ Service stopping. This saves ~$1/hour in AWS costs."
    ;;
  
  status)
    echo "📊 Checking Weaviate service status..."
    aws ecs describe-services \
      --cluster $CLUSTER \
      --services $SERVICE \
      --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount}' \
      --output table
    
    echo ""
    echo "📍 Getting Public IP (if running)..."
    TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --query 'taskArns[0]' --output text)
    
    if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
      ENI=$(aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN \
        --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
      
      if [ -n "$ENI" ]; then
        PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI \
          --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
        echo "🌐 Weaviate URL: http://$PUBLIC_IP:8080"
      fi
    else
      echo "⚠️  No tasks running."
    fi
    ;;
  
  *)
    echo "Usage: $0 {start|stop|status}"
    echo ""
    echo "Commands:"
    echo "  start   - Turn on Weaviate (costs ~$1/hour)"
    echo "  stop    - Turn off Weaviate (saves money)"
    echo "  status  - Check if running and get IP"
    exit 1
    ;;
esac
