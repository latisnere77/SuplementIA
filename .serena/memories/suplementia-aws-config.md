# Suplementia AWS Configuration

## AWS Account Information
- **AWS Account ID:** 643942183354
- **Primary Region:** us-east-1
- **Deployment Platform:** AWS Amplify

## Amplify Configuration
- **App ID:** d2yn3faih4ykom
- **Production Domain:** www.suplementai.com  
- **Amplify Domain:** d2yn3faih4ykom.amplifyapp.com
- **GitHub Repository:** https://github.com/latisnere77/SuplementIA

## Deployment Details
- **Build Configuration:** amplify.yml in repository root
- **Build Command:** npm run build
- **Framework:** Next.js 14.2.35 (App Router)
- **Output Directory:** .next

## Important Notes
- Deployment is triggered automatically via GitHub webhook
- CloudFront CDN cache can take 2-5 minutes to propagate
- Always verify deployments on www.suplementai.com (not Vercel!)
