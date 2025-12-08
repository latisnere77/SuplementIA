# 🚀 Lambda Functions

## 📦 Active Lambda Functions

### 1. Content Enricher
**Path**: `content-enricher/`

Generates enriched supplement content using AWS Bedrock (Claude 3.5 Sonnet).

**Features**:
- Dual format support: Standard & Examine-style
- Real PubMed studies integration
- DynamoDB caching
- X-Ray tracing
- Prompt caching optimization

**Deployment**:
```bash
cd content-enricher
npm run build
npm run deploy
```

**Documentation**: [content-enricher/README.md](content-enricher/README.md)

---

### 2. Studies Fetcher
**Path**: `studies-fetcher/`

Fetches and ranks scientific studies from PubMed.

**Features**:
- Intelligent search with query expansion
- Study ranking and scoring
- Multiple study types support
- Sentiment analysis
- Caching layer

**Deployment**:
```bash
cd studies-fetcher
npm run build
npm run deploy
```

**Documentation**: [studies-fetcher/README.md](studies-fetcher/README.md)

---

### 3. Query Expander
**Path**: `query-expander/`

Expands user queries with synonyms and related terms.

**Features**:
- Abbreviation expansion
- Synonym generation
- Medical term normalization

**Deployment**:
```bash
cd query-expander
npm run build
npm run deploy
```

---

### 4. Enrich Proxy
**Path**: `enrich-proxy/`

Proxy layer for content enrichment with async job management.

**Features**:
- Async job creation
- Status tracking
- Error handling
- Timeout management

**Deployment**:
```bash
cd enrich-proxy
npm run build
npm run deploy
```

---

## 🗂️ Deployment Scripts

### Individual Deployment
```bash
# Deploy specific lambda
cd <lambda-name>
npm run build
npm run deploy
```

### Batch Deployment
```bash
# Deploy all lambdas
./deploy-all.sh
```

### Docker Deployment
```bash
# Deploy using Docker (for large dependencies)
./deploy-docker.sh <lambda-name>
```

---

## 📊 Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enrich Proxy   │  ← Async job management
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Query Expander  │  │ Studies Fetcher │  │Content Enricher │
│                 │  │                 │  │                 │
│ - Synonyms      │  │ - PubMed API    │  │ - Bedrock       │
│ - Abbreviations │  │ - Ranking       │  │ - Caching       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 🔧 Common Tasks

### View Logs
```bash
# CloudWatch logs
aws logs tail /aws/lambda/<function-name> --follow

# Specific time range
aws logs tail /aws/lambda/<function-name> \
  --since 1h \
  --follow
```

### View Metrics
```bash
# Invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time 2025-11-22T00:00:00Z \
  --end-time 2025-11-22T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### Update Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name <function-name> \
  --environment Variables={KEY1=value1,KEY2=value2}
```

---

## 📝 Development Guidelines

### Code Structure
```
lambda-name/
├── src/
│   ├── index.ts          # Main handler
│   ├── types.ts          # TypeScript types
│   ├── config.ts         # Configuration
│   └── ...               # Other modules
├── package.json
├── tsconfig.json
├── README.md
└── deploy.sh
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Best Practices
1. **Error Handling**: Always catch and log errors
2. **Logging**: Use structured JSON logging
3. **X-Ray**: Add annotations and metadata
4. **Timeouts**: Set appropriate timeouts
5. **Memory**: Monitor and adjust memory settings
6. **Caching**: Use DynamoDB for caching when possible

---

## 🗄️ Archived

Legacy code and documentation in `archive/`:
- Old Python implementations
- Deprecated deployment scripts
- Historical documentation

---

## 📚 Documentation

- **[Content Enricher](content-enricher/README.md)**
- **[Studies Fetcher](studies-fetcher/README.md)**
- **[Examine-Style Format](../../docs/examine-style/)**
- **[Intelligent Search](../../docs/intelligent-search/)**

---

*Última actualización: 22 de Noviembre, 2025*
