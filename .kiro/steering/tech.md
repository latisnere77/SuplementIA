---
inclusion: always
---

# Tech Stack & Development Guide

## Frontend Stack

- **Framework**: Next.js 14 (App Router)
- **React**: 18.3.1
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **State Management**: React hooks + context
- **Authentication**: AWS Cognito
- **Payments**: Stripe
- **Monitoring**: Sentry

## Backend Stack (AWS Serverless)

- **Edge Computing**: CloudFront + Lambda@Edge (450+ locations)
- **Vector Database**: RDS Postgres + pgvector (HNSW index)
- **L1 Cache**: DynamoDB + DAX (< 1ms latency)
- **L2 Cache**: ElastiCache Redis (< 5ms latency)
- **Compute**: AWS Lambda (Python 3.9+)
- **ML Models**: Sentence Transformers (all-MiniLM-L6-v2, 384-dim embeddings)
- **Model Storage**: EFS
- **API Gateway**: REST API
- **Monitoring**: CloudWatch + X-Ray

## Project Structure

```
suplementia/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── portal/            # Portal pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── portal/           # Portal-specific components
│   └── ui/               # Reusable UI components
├── lib/                   # Shared utilities
│   ├── portal/           # Portal business logic
│   ├── services/         # External service integrations
│   ├── cache/            # Caching utilities
│   └── utils/            # Helper functions
├── backend/              # AWS Lambda functions
│   └── lambda/
│       ├── search-api/          # Vector search endpoint
│       ├── embedding-generator/ # ML embeddings
│       ├── discovery-worker/    # Auto-discovery
│       ├── content-enricher/    # Content generation
│       └── studies-fetcher/     # PubMed integration
├── infrastructure/       # CloudFormation templates
├── scripts/             # Utility scripts
└── docs/                # Documentation
```

## Common Commands

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run validate         # Type-check + build + test
```

### Deployment
```bash
# Frontend (Vercel)
vercel --prod

# Backend (AWS)
cd infrastructure
./deploy-staging.sh                    # Deploy staging
./deploy-production-10-percent.sh      # Gradual rollout
./deploy-production-100-percent.sh     # Full production

# Lambda functions
cd backend/lambda
./deploy-staging-lambdas.sh
```

## Code Conventions

### TypeScript/React

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use `async/await` over promises
- Export types alongside implementations
- Use Zod for runtime validation

```typescript
// Good
export async function fetchSupplement(id: string): Promise<Supplement> {
  const response = await fetch(`/api/supplements/${id}`);
  return response.json();
}

// Bad - no types, no async/await
export function fetchSupplement(id) {
  return fetch(`/api/supplements/${id}`).then(r => r.json());
}
```

### Python (Lambda Functions)

- Use type hints
- Document with docstrings
- Connection pooling for databases
- Structured logging with context
- CloudWatch metrics for observability

```python
# Good
def vector_search(embedding: List[float]) -> Optional[Dict]:
    """
    Search RDS Postgres using pgvector similarity
    
    Returns:
        Best matching supplement or None
    """
    try:
        # Implementation
        pass
    except Exception as e:
        print(f'Vector search error: {str(e)}')
        raise
```

### Error Handling

- Use structured error responses (see `lib/portal/error-responses.ts`)
- User-friendly Spanish messages for frontend
- Sanitize sensitive data in errors
- Include correlation IDs for tracing

```typescript
// Good
import { formatErrorResponse } from '@/lib/portal/error-responses';

const { response, statusCode } = formatErrorResponse('JOB_EXPIRED', {
  correlationId: request.headers.get('X-Correlation-ID'),
  details: { jobId }
});
return NextResponse.json(response, { status: statusCode });
```

### Component Patterns

- Use `ErrorMessage` component for consistent error display
- Implement retry logic with exponential backoff
- Track consecutive failures for support escalation
- Clear errors on successful retry

```typescript
// Good
<ErrorMessage
  statusCode={408}
  message="La búsqueda está tomando más tiempo del esperado."
  onRetry={handleRetry}
  consecutiveFailures={retryCount}
  variant="card"
/>
```

## Performance Targets

### Latency
- Edge cache hit: < 50ms
- DAX cache hit: < 1ms
- Redis cache hit: < 5ms
- Database query: < 50ms
- Total response: < 200ms

### Reliability
- Error rate: < 1%
- Cache hit rate: ≥ 85%
- Uptime: 99.9%

## Core Workflow Guardrails

### Planning
- PLAN thoroughly before every action
- USE TOOLS, never guess
- REFLECT on outcomes
- PERSIST until complete

### File Management
**FORBIDDEN suffixes**: -v2, -new, -old, -legacy, -temp, -backup, -compat, -sample, -enhanced, -improved, -optimized, -simple, -basic, -comprehensive

Search before creating:
```bash
find . -name "*pattern*" -type f | grep -v node_modules
```

### Quality Standards
- Treat all warnings as errors
- Never suppress errors without fixing root causes
- **FORBIDDEN**: `@ts-ignore`, `# type: ignore`, `@SuppressWarnings`

### Testing Strategy
- **Unit Tests (Most)**: 70-80%, fast, isolated, 80%+ coverage
- **Integration Tests (Some)**: 15-25%, real dependencies
- **E2E Tests (Fewest)**: 5-10%, complete journeys
- Each test must run in isolation with proper setup/teardown
- Zero tolerance for flaky tests

### Task Completion Checklist
Not done until:
- [ ] All tests pass with clean output
- [ ] Build completes without warnings
- [ ] Documentation updated
- [ ] No regressions introduced

### Workspace Ownership
YOU are the owner of the whole workspace. Fix issues you encounter or create tasks for later.

## Key Documentation

- **API Reference**: `API.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Cost Optimization**: `COST-OPTIMIZATION.md`
- **Infrastructure Quick Start**: `infrastructure/QUICK-START.md`
- **Specs**: `.kiro/specs/` (requirements, design, tasks)
