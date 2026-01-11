# SuplementIA - LanceDB Infrastructure Makefile

.PHONY: help deploy deploy-staging deploy-production verify monitor costs clean

# Default environment
ENV ?= production
REGION ?= us-east-1
ALERT_EMAIL ?= alerts@suplementia.com

help:
	@echo "SuplementIA - LanceDB Infrastructure"
	@echo ""
	@echo "Available commands:"
	@echo "  make pre-check           - Run pre-deployment checks"
	@echo "  make deploy              - Deploy complete stack (production)"
	@echo "  make deploy-staging      - Deploy to staging"
	@echo "  make deploy-production   - Deploy to production"
	@echo "  make post-verify         - Verify deployment"
	@echo "  make verify              - Verify LanceDB setup"
	@echo "  make monitor             - Monitor metrics"
	@echo "  make costs               - Calculate costs"
	@echo "  make test                - Test Lambda functions"
	@echo "  make logs                - View recent logs"
	@echo "  make clean               - Clean deployment artifacts"
	@echo ""
	@echo "Environment variables:"
	@echo "  ENV=production           - Target environment"
	@echo "  ALERT_EMAIL=...          - Email for alerts"
	@echo ""

pre-check:
	@echo "Running pre-deployment checks..."
	./scripts/pre-deployment-check.sh $(ENV)

deploy: pre-check
	@echo "Deploying LanceDB stack to $(ENV)..."
	./deploy-lancedb-stack.sh $(ENV) $(ALERT_EMAIL)

post-verify:
	@echo "Verifying deployment..."
	./scripts/post-deployment-verify.sh $(ENV)

deploy-staging:
	@$(MAKE) deploy ENV=staging

deploy-production:
	@$(MAKE) deploy ENV=production

verify:
	@echo "Verifying LanceDB setup..."
	python3 ../backend/scripts/verify-lancedb-setup.py

monitor:
	@echo "Monitoring metrics for $(ENV)..."
	./scripts/monitor-lancedb-metrics.sh $(ENV)

costs:
	@echo "Calculating costs for $(ENV)..."
	./scripts/calculate-costs.sh $(ENV)

test:
	@echo "Testing Lambda functions..."
	@cd ../backend/lambda/search-api-lancedb && python3 test-local.py

logs:
	@echo "Viewing recent logs for $(ENV)..."
	@aws logs tail /aws/lambda/$(ENV)-search-api-lancedb --follow --region $(REGION)

logs-errors:
	@echo "Viewing recent errors for $(ENV)..."
	@aws logs filter-log-events \
		--log-group-name /aws/lambda/$(ENV)-search-api-lancedb \
		--filter-pattern "ERROR" \
		--start-time $$(($$(date +%s) - 3600))000 \
		--region $(REGION)

clean:
	@echo "Cleaning deployment artifacts..."
	@rm -rf ../backend/lambda/*/package
	@rm -rf ../backend/lambda/*/function.zip
	@rm -rf ../backend/lambda/*/__pycache__
	@echo "✓ Clean complete"

# Stack management
stack-status:
	@aws cloudformation describe-stacks \
		--stack-name $(ENV)-lancedb \
		--region $(REGION) \
		--query 'Stacks[0].StackStatus' \
		--output text

stack-outputs:
	@aws cloudformation describe-stacks \
		--stack-name $(ENV)-lancedb \
		--region $(REGION) \
		--query 'Stacks[0].Outputs'

stack-delete:
	@echo "⚠️  WARNING: This will delete the entire stack!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ]
	@aws cloudformation delete-stack \
		--stack-name $(ENV)-lancedb \
		--region $(REGION)
	@echo "Stack deletion initiated..."

# Lambda management
lambda-update-search:
	@cd ../backend/lambda/search-api-lancedb && ./deploy.sh $(ENV)

lambda-update-discovery:
	@cd ../backend/lambda/discovery-worker-lancedb && ./deploy.sh $(ENV)

lambda-invoke-search:
	@aws lambda invoke \
		--function-name $(ENV)-search-api-lancedb \
		--payload '{"queryStringParameters":{"q":"vitamin d"}}' \
		--region $(REGION) \
		response.json
	@cat response.json | jq .
	@rm response.json

# Data management
migrate-data:
	@echo "Migrating data to LanceDB..."
	@python3 ../backend/scripts/migrate-to-lancedb.py

download-model:
	@echo "Downloading model to EFS..."
	@python3 ../backend/scripts/download-model-to-efs.py

# Monitoring
alarms:
	@aws cloudwatch describe-alarms \
		--alarm-name-prefix $(ENV)- \
		--region $(REGION) \
		--query 'MetricAlarms[*].[AlarmName,StateValue,StateReason]' \
		--output table

metrics:
	@echo "Lambda Invocations (last hour):"
	@aws cloudwatch get-metric-statistics \
		--namespace AWS/Lambda \
		--metric-name Invocations \
		--dimensions Name=FunctionName,Value=$(ENV)-search-api-lancedb \
		--start-time $$(date -u -v-1H +"%Y-%m-%dT%H:%M:%S") \
		--end-time $$(date -u +"%Y-%m-%dT%H:%M:%S") \
		--period 3600 \
		--statistics Sum \
		--region $(REGION) \
		--query 'Datapoints[0].Sum' \
		--output text
