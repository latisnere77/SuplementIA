# ANKOSOFT Education Portal - Setup Guide

## Overview

The Education Portal is a separate monetization track that recommends finished products (not formulas) based on scientific evidence. It uses a search-first approach similar to Examine.com.

## Architecture

- **Frontend**: Next.js 14.2.18 on Vercel
- **Backend**: AWS Lambda (reuses existing `formulation-api`)
- **Database**: DynamoDB (4 new tables)
- **APIs**: OpenAlex, ChEMBL, COCONUT (reused from FormulationLab)

## Setup Steps

### 1. Deploy AWS Cognito User Pool

Deploy Cognito for user authentication:

```bash
aws cloudformation create-stack \
  --stack-name ankosoft-portal-cognito-staging \
  --template-body file://infrastructure/cloudformation/portal-cognito.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging
```

Get the outputs:
- UserPoolId
- UserPoolClientId
- IdentityPoolId

### 2. Deploy DynamoDB Tables

Deploy the CloudFormation template:

```bash
aws cloudformation create-stack \
  --stack-name ankosoft-portal-tables-staging \
  --template-body file://infrastructure/cloudformation/portal-tables.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging
```

Tables created:
- `ankosoft-portal-quizzes-staging`
- `ankosoft-portal-recommendations-staging`
- `ankosoft-portal-checkins-staging`
- `ankosoft-portal-referrals-staging`

### 3. Deploy Subscriptions Table

```bash
aws cloudformation create-stack \
  --stack-name ankosoft-portal-subscriptions-staging \
  --template-body file://infrastructure/cloudformation/portal-subscriptions-table.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging
```

### 4. Deploy Check-in Schedule Table

```bash
aws cloudformation create-stack \
  --stack-name ankosoft-portal-checkin-schedule-staging \
  --template-body file://infrastructure/cloudformation/portal-checkin-schedule-table.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging
```

### 5. Configure Environment Variables

Add to your Lambda environment variables:

```bash
PORTAL_QUIZZES_TABLE=ankosoft-portal-quizzes-staging
PORTAL_RECOMMENDATIONS_TABLE=ankosoft-portal-recommendations-staging
PORTAL_CHECKINS_TABLE=ankosoft-portal-checkins-staging
PORTAL_REFERRALS_TABLE=ankosoft-portal-referrals-staging
PORTAL_SUBSCRIPTIONS_TABLE=ankosoft-portal-subscriptions-staging
PORTAL_API_URL=https://your-api-gateway-url/portal/recommend
```

Add to `.env.local` (Next.js):

```bash
# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
```

### 6. Configure Stripe

1. Get Stripe API keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products and prices for:
   - **Pro Monthly**: $9.99/month
   - **Premium Monthly**: $19.99/month
   - **Pro Annual**: $99.99/year (save 17%)
3. Set up webhook endpoint: `https://your-domain.com/api/portal/subscription/webhook`
4. Add webhook secret to `.env.local`

### 7. Install Dependencies

```bash
npm install stripe amazon-cognito-identity-js
```

### 8. Deploy Lambda Function

The portal endpoint is already integrated into `formulation-api` Lambda. Just deploy:

```bash
cd infrastructure/lambda/formulation-api
# Deploy using your existing deployment process
```

### 9. Deploy Frontend

Deploy to Vercel:

```bash
vercel --prod
```

## Subscription Plans

1. **Free**: 1 recommendation/day, budget products only
2. **Pro** ($9.99/mes): Unlimited recommendations, all products, full features
3. **Premium** ($19.99/mes): Everything in Pro + priority support + PDF export
4. **Pro Annual** ($99.99/year): Pro features, save 17%

## Usage

### User Flow

1. User visits `/portal`
2. User searches for health goal (e.g., "build muscle", "improve sleep")
3. System generates recommendation using OpenAlex/ChEMBL/COCONUT APIs
4. User sees:
   - Evidence summary (studies, participants, efficacy)
   - Personalization factors (altitude, climate, demographics)
   - 3 product recommendations (Budget, Value, Premium ANKONERE)
5. Free users see paywall for Value/Premium options
6. Pro users ($9.99/mes) get full access
7. Week 4 & 8 check-ins scheduled automatically

### API Endpoints

- `POST /api/portal/quiz` - Submit search query, generate recommendation
- `GET /api/portal/recommendation/[id]` - Get recommendation details
- `POST /api/portal/checkin` - Submit week 4/8 check-in
- `POST /api/portal/referral` - Create/track referral
- `GET /api/portal/subscription/plans` - Get available subscription plans
- `POST /api/portal/subscription/checkout` - Create Stripe checkout session
- `GET /api/portal/subscription/status` - Get user subscription status
- `POST /api/portal/subscription/webhook` - Stripe webhook handler

### Lambda Endpoint

- `POST /portal/recommend` - Generate recommendation (called by Next.js API)

## Monetization

1. **Pro Subscriptions**: $9.99/month via Stripe
2. **Affiliate Links**: Amazon Associates (8% commission)
3. **ANKONERE Direct Sales**: Premium product option
4. **B2B White-label**: Future revenue stream

## Cost Estimate

- **AWS Incremental**: $5-15/mes (DynamoDB tables, Lambda invocations)
- **Vercel**: $0 (same plan, no additional cost)
- **Stripe**: 2.9% + $0.30 per transaction
- **Total Monthly**: ~$15-20 infrastructure + transaction fees

## Success Metrics

- Free → Pro conversion: 15-20% (Month 1)
- Engagement: 30%+ of free users complete search
- Affiliate CTR: 20-30% of Pro users
- ANKONERE conversion: 10-15% of recommendations
- Viral: 5-10% share rate
- Retention: 60%+ of Pro subscribers renew Month 2

## Notes

- Portal reuses existing Lambda infrastructure (OpenAlex, ChEMBL, COCONUT APIs)
- No new AWS infrastructure needed (cost optimization)
- Search-first approach (like Examine.com) instead of traditional quiz
- Pre-populated categories for common health goals

