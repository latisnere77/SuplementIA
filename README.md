# SuplementIA

Evidence-based health supplement recommendations powered by scientific research.

## Features

- 🔍 **Intelligent Search** - Vector-based semantic search with typo tolerance
- 🌍 **Multilingual Support** - Search in 100+ languages (Spanish, English, Portuguese)
- 📊 **Evidence Analysis** - Study counts and grades from PubMed
- 🎯 **Personalized Recommendations** - Tailored for LATAM users
- ⚡ **Ultra-Fast** - < 50ms edge latency, < 200ms total response time
- 🤖 **Auto-Discovery** - Automatically indexes new supplements from searches
- 💳 **Subscription-based** - Monetization via Stripe
- 🔗 **Affiliate Links** - Direct sales integration

## Tech Stack

### Frontend
- Next.js 14
- React 18
- Tailwind CSS
- AWS Cognito (authentication)
- Stripe (payments)

### Backend (AWS Serverless Architecture)
- **CloudFront + Lambda@Edge** - Global edge computing (450+ locations)
- **RDS Postgres + pgvector** - Vector search for semantic supplement discovery
- **DynamoDB + DAX** - L1 cache (microsecond latency)
- **ElastiCache Redis** - L2 cache (millisecond latency)
- **Lambda + Sentence Transformers** - Local ML for embeddings (zero API cost)
- **EFS** - ML model storage
- **API Gateway** - RESTful API endpoints
- **CloudWatch + X-Ray** - Monitoring and tracing

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see `.env.example`)

3. Run development server:
```bash
npm run dev
```

## Performance Metrics

### Latency Targets
- **Edge Cache Hit**: < 50ms (CloudFront)
- **DAX Cache Hit**: < 1ms (DynamoDB DAX)
- **Redis Cache Hit**: < 5ms (ElastiCache)
- **Database Query**: < 50ms (RDS Postgres + pgvector)
- **Total Response**: < 200ms (cache miss)

### Reliability
- **Error Rate**: < 1% (target)
- **Cache Hit Rate**: ≥ 85% (target)
- **Uptime**: 99.9% (target)
- **Availability**: Multi-AZ RDS, Redis cluster mode

### Scalability
- **Supplements**: Tested with 1000+ supplements
- **Concurrent Users**: Auto-scaling Lambda
- **Global**: 450+ CloudFront edge locations
- **Languages**: 100+ supported via multilingual embeddings

## Documentation

📚 **[Complete Documentation Index](docs/INDEX.md)**

### Quick Links:
- **[Intelligent Search Spec](.kiro/specs/intelligent-supplement-search/)** - Vector search architecture
- **[Infrastructure Guide](infrastructure/QUICK-START.md)** - AWS deployment guide
- **[API Documentation](#api-endpoints)** - RESTful API reference
- **[Examine-Style Format](docs/examine-style/EXAMINE-STYLE-INDEX.md)** - Content format
- **[Fixes & Solutions](docs/fixes/)** - Troubleshooting guides

## Architecture Overview

```
User → CloudFront (Edge) → Lambda@Edge → DynamoDB DAX (L1) 
                                       → ElastiCache Redis (L2)
                                       → RDS Postgres + pgvector
                                       → Lambda (Embeddings)
                                       → PubMed API
```

### Key Components:
- **Vector Search**: Semantic similarity using 384-dim embeddings
- **Multi-Tier Cache**: DAX (< 1ms) → Redis (< 5ms) → RDS (< 50ms)
- **Auto-Discovery**: Background workers index new supplements
- **ML Local**: Sentence Transformers in Lambda (no API costs)
- **Global Edge**: 450+ CloudFront locations worldwide

## API Endpoints

### Search API
```
POST /api/supplements/search
{
  "query": "magnesium glycinate",
  "language": "es"
}

Response:
{
  "supplement": {
    "name": "Magnesium Glycinate",
    "scientificName": "Magnesium",
    "similarity": 0.95,
    "metadata": { ... }
  },
  "latency": 45,
  "cacheHit": true,
  "source": "dax"
}
```

### Supplement CRUD
```
POST /api/supplements          # Create supplement
GET /api/supplements/:id       # Get supplement
PUT /api/supplements/:id       # Update supplement
DELETE /api/supplements/:id    # Delete supplement
```

### Analytics
```
GET /api/analytics/metrics     # System metrics
GET /api/analytics/popular     # Popular supplements
```

## Project Structure

```
suplementia/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Shared utilities
├── backend/               # AWS Lambda functions
│   └── lambda/
│       ├── search-api/          # Vector search API
│       ├── embedding-generator/ # ML embeddings
│       ├── discovery-worker/    # Auto-discovery
│       ├── content-enricher/    # Content generation
│       └── studies-fetcher/     # PubMed integration
├── infrastructure/        # CloudFormation templates
│   ├── cloudformation/    # Stack definitions
│   ├── deploy-staging.sh  # Staging deployment
│   └── deploy-production-*.sh # Production rollout
├── docs/                  # Documentation
└── scripts/              # Utility scripts
```

## Deployment

### Infrastructure (AWS CloudFormation)
```bash
# Deploy staging environment
cd infrastructure
./deploy-staging.sh

# Deploy production (gradual rollout)
./deploy-production-10-percent.sh   # 10% traffic
./deploy-production-50-percent.sh   # 50% traffic
./deploy-production-100-percent.sh  # 100% traffic
```

### Lambda Functions
```bash
# Deploy all staging lambdas
cd backend/lambda
./deploy-staging-lambdas.sh

# Upload ML model to EFS
./upload-model-to-efs.sh
```

### Frontend (Vercel)
```bash
vercel --prod
```

See [infrastructure/QUICK-START.md](infrastructure/QUICK-START.md) for detailed deployment guide.

## Cost Optimization

### Monthly Costs (10K searches/day)
```
CloudFront + Lambda@Edge:  $3
DynamoDB + DAX:            $8
ElastiCache Redis:         $12
RDS Postgres:              $0 (free tier, then ~$15)
Lambda (embeddings):       $0 (free tier)
EFS (model storage):       $1
DynamoDB (queue):          $1
────────────────────────────
Total:                     ~$25/month
```

### Cost Scaling
- **1 user** (12 searches/month): $0/month (AWS free tier)
- **10K searches/day**: $25/month
- **100K searches/day**: $60/month
- **1M searches/day**: $180/month

### Optimization Strategies
1. **Multi-tier caching** - 85%+ cache hit rate reduces database costs
2. **Local ML** - Zero API costs for embeddings (vs $0.0001/embedding)
3. **DAX cluster** - 10x cost reduction vs direct DynamoDB reads
4. **Edge computing** - Reduced origin requests via CloudFront
5. **Serverless** - Pay only for actual usage, no idle costs

See [.kiro/specs/intelligent-supplement-search/design.md](.kiro/specs/intelligent-supplement-search/design.md) for detailed cost analysis.
