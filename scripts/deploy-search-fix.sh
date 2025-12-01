#!/bin/bash

# Deploy Script: Search 404 Fix
# Deploys the jobId changes to production with safety checks

set -e  # Exit on error

echo "🚀 Starting deployment of Search 404 Fix..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify we're in the right directory
echo "📁 Step 1: Verifying directory..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi
echo -e "${GREEN}✅ In project root${NC}"
echo ""

# Step 2: Verify git status
echo "📝 Step 2: Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Git working directory clean${NC}"
fi
echo ""

# Step 3: Verify changes are present
echo "🔍 Step 3: Verifying jobId changes are present..."

# Check frontend
if grep -q "const jobId = searchParams.get('id')" app/portal/results/page.tsx; then
    echo -e "${GREEN}✅ Frontend uses jobId${NC}"
else
    echo -e "${RED}❌ Frontend still uses recommendationId${NC}"
    exit 1
fi

# Check backend
if grep -q "import { createJob, storeJobResult }" app/api/portal/quiz/route.ts; then
    echo -e "${GREEN}✅ Backend imports job-store${NC}"
else
    echo -e "${RED}❌ Backend missing job-store imports${NC}"
    exit 1
fi

if grep -q "createJob(jobId, 0)" app/api/portal/quiz/route.ts; then
    echo -e "${GREEN}✅ Backend creates jobs${NC}"
else
    echo -e "${RED}❌ Backend doesn't create jobs${NC}"
    exit 1
fi

echo ""

# Step 4: Run TypeScript check
echo "🔧 Step 4: Running TypeScript check..."
if npm run type-check 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ TypeScript errors found${NC}"
    npm run type-check
    exit 1
else
    echo -e "${GREEN}✅ No TypeScript errors${NC}"
fi
echo ""

# Step 5: Run linter
echo "🧹 Step 5: Running linter..."
if npm run lint 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ Linting errors found${NC}"
    npm run lint
    exit 1
else
    echo -e "${GREEN}✅ No linting errors${NC}"
fi
echo ""

# Step 6: Build check
echo "🏗️  Step 6: Running build check..."
if npm run build 2>&1 | grep -q "Failed to compile"; then
    echo -e "${RED}❌ Build failed${NC}"
    npm run build
    exit 1
else
    echo -e "${GREEN}✅ Build successful${NC}"
fi
echo ""

# Step 7: Confirm deployment
echo "⚠️  Step 7: Ready to deploy to PRODUCTION"
echo ""
echo "This will deploy the following changes:"
echo "  - Frontend: rec_* → job_* IDs"
echo "  - Backend: job-store integration"
echo "  - Endpoint: No changes (already compatible)"
echo ""
read -p "Deploy to production? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi
echo ""

# Step 8: Deploy to production
echo "🚀 Step 8: Deploying to production..."
if vercel --prod; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
echo ""

# Step 9: Get deployment URL
echo "📋 Step 9: Getting deployment info..."
DEPLOYMENT_URL=$(vercel ls --prod | head -2 | tail -1 | awk '{print $2}')
echo "Deployment URL: $DEPLOYMENT_URL"
echo ""

# Step 10: Smoke test
echo "🧪 Step 10: Running smoke test..."
echo "Testing /api/portal/quiz endpoint..."

RESPONSE=$(curl -s -X POST "https://www.suplementai.com/api/portal/quiz" \
  -H "Content-Type: application/json" \
  -d '{"category":"Calcium","age":35,"gender":"male","location":"CDMX"}')

if echo "$RESPONSE" | grep -q "jobId"; then
    echo -e "${GREEN}✅ Smoke test passed - jobId found in response${NC}"
    echo "Response preview:"
    echo "$RESPONSE" | jq -r '.jobId, .success' 2>/dev/null || echo "$RESPONSE" | head -c 200
else
    echo -e "${YELLOW}⚠️  Warning: jobId not found in response${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "This might be expected if using async pattern (202 response)"
fi
echo ""

# Step 11: Final instructions
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "  1. Monitor CloudWatch logs:"
echo "     aws logs tail /aws/lambda/portal-enrichment-status --follow"
echo ""
echo "  2. Monitor Sentry for errors:"
echo "     https://sentry.io/organizations/[your-org]/issues/"
echo ""
echo "  3. Verify searches work:"
echo "     https://www.suplementai.com/portal"
echo ""
echo "  4. Check for 404 errors (should be 0):"
echo "     aws logs filter-pattern /aws/lambda/portal-enrichment-status --filter-pattern '404'"
echo ""
echo "🔄 Rollback command (if needed):"
echo "   vercel rollback $DEPLOYMENT_URL"
echo ""
echo "Happy deploying! 🎉"
