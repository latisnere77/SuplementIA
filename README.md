# SuplementIA

Evidence-based health supplement recommendations powered by scientific research.

## Features

- 🔍 Search-first interface (inspired by Examine.com)
- 🌍 Bilingual support (English/Spanish)
- 📊 Evidence analysis with study counts and grades
- 🎯 Personalized recommendations for LATAM
- 💳 Subscription-based monetization
- 🔗 Affiliate links and direct sales

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS
- AWS Cognito (authentication)
- Stripe (payments)
- DynamoDB (data storage)
- AWS Lambda (backend API)

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

## Documentation

📚 **[Complete Documentation Index](docs/INDEX.md)**

### Quick Links:
- **[Examine-Style Format](docs/examine-style/EXAMINE-STYLE-INDEX.md)** - New quantitative content format
- **[Intelligent Search](docs/intelligent-search/INTELLIGENT-SEARCH-INDEX.md)** - Advanced search system
- **[Architecture Specs](.kiro/specs/modern-architecture/)** - System architecture
- **[Fixes & Solutions](docs/fixes/)** - Troubleshooting guides

## Project Structure

```
suplementia/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Shared utilities
├── backend/               # AWS Lambda functions
│   └── lambda/
│       ├── content-enricher/    # Content generation
│       └── studies-fetcher/     # PubMed integration
├── docs/                  # Documentation
│   ├── examine-style/     # Examine-style format docs
│   ├── intelligent-search/# Search system docs
│   ├── fixes/            # Problem solutions
│   └── archive/          # Historical docs
└── scripts/              # Utility scripts
```

## Deployment

### Lambda Functions:
```bash
# Content Enricher
cd backend/lambda/content-enricher
npm run build
./deploy.sh

# Studies Fetcher
cd backend/lambda/studies-fetcher
npm run build
./deploy.sh
```

### Frontend:
```bash
# Vercel deployment
vercel --prod
```

See [docs/examine-style/EXAMINE-STYLE-READY-TO-DEPLOY.md](docs/examine-style/EXAMINE-STYLE-READY-TO-DEPLOY.md) for detailed deployment guide.
