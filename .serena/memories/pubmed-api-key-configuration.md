# PubMed API Key Configuration

## Status: CONFIGURED ✅

### Secret Management
- **Secret Name:** `suplementia/pubmed/api-key`
- **Secret ARN:** `arn:aws:secretsmanager:us-east-1:239378269775:secret:suplementia/pubmed/api-key-ymPmia`
- **Region:** us-east-1
- **Storage:** AWS Secrets Manager (secure, encrypted)

### Lambda Configuration
- **Lambda Function:** `suplementia-studies-fetcher-prod`
- **IAM Role:** `suplementia-lambda-execution-role-prod`
- **Environment Variable:** `PUBMED_API_KEY_SECRET_ARN`
- **Permissions:** SecretsManagerAccessPolicy (allows GetSecretValue)

### How It Works
1. Lambda environment variable contains the secret ARN (not the actual key)
2. Lambda code reads the secret from Secrets Manager at runtime
3. Secret is injected into the PubMed API client
4. No API keys stored in code or visible in logs

### Next Steps
- Lambda code needs to be updated to read the secret at runtime
- Once code update is deployed, PubMed rate limiting will be bypassed
- Intelligent ranking section should appear on results page

### Security Notes
- API key is encrypted in AWS Secrets Manager
- Never commit secrets to Git
- Lambda has minimal IAM permissions (only read the specific secret)
- Rotate key periodically for security
