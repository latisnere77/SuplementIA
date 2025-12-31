# AWS Profile Configuration for Suplementia

## AWS Account Details
- **Target Account ID**: 643942183354
- **Organization**: AWS Organizations setup
- **Role**: OrganizationAccountAccessRole

## AWS Profile to Use
Always use the `suplementai` profile for all AWS operations:

```bash
aws --profile suplementai <command>
```

## Why This Profile?
The `suplementai` profile is configured to assume the OrganizationAccountAccessRole in account 643942183354. This gives access to:
- Lambda functions (production-content-enricher, production-studies-fetcher)
- DynamoDB tables (suplementai-async-jobs, suplementai-enriched-content)
- IAM roles and policies (AmplifySSRComputeRole, AmplifyLambdaInvokeAccess)
- CloudWatch logs for debugging

## Common Commands

### Deploy Lambda Function
```bash
aws --profile suplementai lambda update-function-code \
  --function-name production-content-enricher \
  --zip-file fileb://path/to/lambda.zip \
  --region us-east-1
```

### Check Lambda Status
```bash
aws --profile suplementai lambda get-function \
  --function-name production-content-enricher \
  --region us-east-1
```

### View CloudWatch Logs
```bash
aws --profile suplementai logs tail /aws/lambda/production-content-enricher \
  --follow \
  --region us-east-1
```

### Update IAM Policy
```bash
aws --profile suplementai iam put-role-policy \
  --role-name AmplifySSRComputeRole \
  --policy-name AmplifyLambdaInvokeAccess \
  --policy-document file://policy.json \
  --region us-east-1
```

## IMPORTANT
Never use the default profile or MCP's default account (239378269775). Always explicitly use `--profile suplementai` for all Suplementia operations.
