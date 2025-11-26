---
inclusion: always
---

# Project Structure & Organization

## Directory Layout

### Frontend (`app/`, `components/`, `lib/`)

```
app/
├── api/                    # Next.js API routes
│   ├── analyze-studies/   # Study analysis endpoints
│   ├── cache/             # Cache management
│   ├── monitoring/        # Health checks & metrics
│   ├── portal/            # Portal-specific APIs
│   │   ├── quiz/          # Quiz/recommendation flow
│   │   ├── search/        # Supplement search
│   │   ├── enrich-async/  # Async enrichment
│   │   └── enrichment-status/ # Job status polling
│   └── supplements/       # Supplement CRUD
├── portal/                # Portal pages
│   ├── checkin/          # User check-in flow
│   ├── results/          # Search results
│   ├── subscription/     # Subscription management
│   └── page.tsx          # Portal home
├── globals.css           # Global styles
└── layout.tsx            # Root layout

components/
├── portal/               # Portal-specific components
│   ├── AsyncEnrichmentLoader.tsx    # Async job polling
│   ├── ErrorMessage.tsx             # Standardized errors
│   ├── StreamingResults.tsx         # Real-time results
│   ├── EvidenceAnalysisPanel.tsx    # Study evidence
│   └── ProductRecommendationsGrid.tsx
└── ui/                   # Reusable UI primitives
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    └── ...

lib/
├── portal/               # Portal business logic
│   ├── error-responses.ts          # Error formatting
│   ├── input-validation.ts         # Input sanitization
│   ├── job-store.ts                # In-memory job tracking
│   ├── retry-logic.ts              # Exponential backoff
│   ├── structured-logger.ts        # Logging utilities
│   ├── failure-pattern-detector.ts # Error pattern detection
│   └── useIntelligentSearch.ts     # Search hook
├── services/             # External integrations
│   ├── aws/             # AWS SDK wrappers
│   ├── stripe/          # Payment processing
│   └── pubmed/          # PubMed API
├── cache/               # Caching utilities
├── utils/               # Helper functions
└── utils.ts             # Common utilities
```

### Backend (`backend/`)

```
backend/
├── lambda/              # AWS Lambda functions
│   ├── search-api/              # Vector search endpoint
│   │   └── lambda_function.py
│   ├── embedding-generator/     # ML embeddings
│   │   └── lambda_function.py
│   ├── discovery-worker/        # Auto-discovery
│   │   └── lambda_function.py
│   ├── content-enricher/        # Content generation
│   │   └── lambda_function.py
│   ├── studies-fetcher/         # PubMed integration
│   │   └── lambda_function.py
│   ├── deploy-staging-lambdas.sh
│   └── requirements.txt
└── shared/              # Shared utilities
    └── query-utils.js
```

### Infrastructure (`infrastructure/`)

```
infrastructure/
├── cloudformation/      # CloudFormation stacks
│   ├── intelligent-search-staging.yml
│   ├── intelligent-search-production.yml
│   └── cloudfront-traffic-routing.yml
├── migrations/          # Database migrations
├── deploy-staging.sh
├── deploy-production-10-percent.sh
├── deploy-production-50-percent.sh
├── deploy-production-100-percent.sh
├── smoke-tests.sh
└── QUICK-START.md
```

### Documentation (`docs/`)

```
docs/
├── INDEX.md             # Documentation index
├── archive/             # Historical docs
├── deployments/         # Deployment logs
├── examine-style/       # Content format specs
├── fixes/               # Bug fix documentation
├── intelligent-search/  # Search system docs
└── investigations/      # Root cause analyses
```

### Scripts (`scripts/`)

```
scripts/
├── test-*.ts            # Testing scripts
├── diagnose-*.ts        # Diagnostic scripts
├── clear-*-cache.ts     # Cache management
├── verify-*.ts          # Verification scripts
└── MANUAL-TESTING-GUIDE.md
```

### Specs (`.kiro/specs/`)

```
.kiro/specs/
├── intelligent-supplement-search/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
└── frontend-error-display-fix/
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## File Naming Conventions

### TypeScript/React
- Components: PascalCase (`ErrorMessage.tsx`)
- Hooks: camelCase with `use` prefix (`useIntelligentSearch.ts`)
- Utilities: kebab-case (`error-responses.ts`)
- Tests: Same name + `.test.tsx` or `.test.ts`
- Types: Same name + `.d.ts` for declarations

### Python
- Modules: snake_case (`lambda_function.py`)
- Classes: PascalCase
- Functions: snake_case

### Documentation
- Markdown: UPPERCASE or kebab-case (`README.md`, `api-guide.md`)
- Usage guides: `*_USAGE.md` (e.g., `ERROR_MESSAGE_USAGE.md`)

## Import Patterns

### Use path aliases
```typescript
// Good
import { formatErrorResponse } from '@/lib/portal/error-responses';
import { ErrorMessage } from '@/components/portal/ErrorMessage';

// Bad
import { formatErrorResponse } from '../../../lib/portal/error-responses';
```

### Group imports
```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 2. Internal utilities
import { formatErrorResponse } from '@/lib/portal/error-responses';
import { validateInput } from '@/lib/portal/input-validation';

// 3. Components
import { ErrorMessage } from '@/components/portal/ErrorMessage';

// 4. Types
import type { Supplement } from '@/types';
```

## Key Files to Know

### Configuration
- `package.json` - Dependencies & scripts
- `tsconfig.json` - TypeScript config
- `next.config.js` - Next.js config
- `tailwind.config.ts` - Tailwind config
- `.env.local` - Local environment variables
- `.env.production` - Production environment variables

### Entry Points
- `app/layout.tsx` - Root layout
- `app/page.tsx` - Home page
- `app/portal/page.tsx` - Portal home
- `app/api/portal/quiz/route.ts` - Quiz endpoint
- `app/api/portal/search/route.ts` - Search endpoint

### Core Utilities
- `lib/portal/error-responses.ts` - Error formatting
- `lib/portal/job-store.ts` - Job tracking
- `lib/portal/retry-logic.ts` - Retry logic
- `lib/utils.ts` - Common utilities
- `components/portal/ErrorMessage.tsx` - Error display

### Backend Entry Points
- `backend/lambda/search-api/lambda_function.py` - Search API
- `backend/lambda/embedding-generator/lambda_function.py` - Embeddings
- `backend/lambda/content-enricher/lambda_function.py` - Content generation

## Archive Strategy

### Active Development
- Keep in main directories (`app/`, `components/`, `lib/`)

### Completed Features
- Move docs to `docs/archive/`
- Keep code in place (don't archive working code)

### Legacy Systems
- Move to `_archived/` at project root
- Include date in folder name (e.g., `_archived/legacy-docs-2024-11/`)

### Diagnostic Files
- Keep recent diagnostics in `scripts/`
- Archive old diagnostics to `_archived/diagnostics-{date}/`

## Where to Add New Code

### New API Endpoint
→ `app/api/portal/{feature}/route.ts`

### New Portal Page
→ `app/portal/{page}/page.tsx`

### New Component
→ `components/portal/{ComponentName}.tsx`

### New Utility
→ `lib/portal/{utility-name}.ts`

### New Lambda Function
→ `backend/lambda/{function-name}/lambda_function.py`

### New Infrastructure
→ `infrastructure/cloudformation/{stack-name}.yml`

### New Documentation
→ `docs/{category}/{doc-name}.md`

### New Spec
→ `.kiro/specs/{feature-name}/requirements.md`
