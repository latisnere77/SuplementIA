#!/usr/bin/env tsx
/**
 * Production 404 Diagnostic Script
 * Uses observability tools to diagnose the issue
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 Diagnosing Production 404 Errors\n');

// Check if we have Vercel CLI
async function checkVercelCLI() {
  try {
    await execAsync('vercel --version');
    console.log('✅ Vercel CLI installed');
    return true;
  } catch {
    console.log('❌ Vercel CLI not installed');
    console.log('   Install with: npm i -g vercel');
    return false;
  }
}

// Check if we have AWS CLI
async function checkAWSCLI() {
  try {
    await execAsync('aws --version');
    console.log('✅ AWS CLI installed');
    return true;
  } catch {
    console.log('❌ AWS CLI not installed');
    console.log('   Install from: https://aws.amazon.com/cli/');
    return false;
  }
}

// Get recent Vercel logs
async function getVercelLogs() {
  console.log('\n📊 Fetching Vercel logs...\n');
  
  try {
    const { stdout } = await execAsync('vercel logs --follow=false --limit=50');
    console.log(stdout);
  } catch (error: any) {
    console.error('❌ Failed to fetch Vercel logs:', error.message);
    console.log('\n💡 Try manually:');
    console.log('   vercel logs');
    console.log('   Or check: https://vercel.com/dashboard');
  }
}

// Get CloudWatch logs for enrichment-status endpoint
async function getCloudWatchLogs() {
  console.log('\n📊 Fetching CloudWatch logs...\n');
  
  const logGroup = '/aws/lambda/enrichment-status';
  const startTime = Date.now() - (60 * 60 * 1000); // Last hour
  
  try {
    const command = `aws logs filter-log-events \
      --log-group-name "${logGroup}" \
      --start-time ${startTime} \
      --filter-pattern "404" \
      --limit 20`;
    
    const { stdout } = await execAsync(command);
    const events = JSON.parse(stdout);
    
    if (events.events && events.events.length > 0) {
      console.log(`Found ${events.events.length} 404 errors:\n`);
      events.events.forEach((event: any) => {
        console.log(`[${new Date(event.timestamp).toISOString()}]`);
        console.log(event.message);
        console.log('---');
      });
    } else {
      console.log('No 404 errors found in CloudWatch logs');
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch CloudWatch logs:', error.message);
    console.log('\n💡 Check manually:');
    console.log('   aws logs tail /aws/lambda/enrichment-status --follow');
  }
}

// Analyze the problem
async function analyzeProblem() {
  console.log('\n🔍 Problem Analysis\n');
  console.log('Based on the 404 errors, here\'s what\'s happening:\n');
  console.log('1. ❌ AsyncEnrichmentLoader calls /api/portal/enrich-async');
  console.log('2. ✅ enrich-async creates job with createJob(jobId)');
  console.log('3. ❌ enrich-async tries to fetch(\'/api/portal/enrich\') internally');
  console.log('4. ❌ Internal fetch fails in production (Next.js limitation)');
  console.log('5. ❌ Job is created but never processed');
  console.log('6. ❌ Frontend polls enrichment-status but job has no data');
  console.log('7. ❌ enrichment-status returns 404 (job exists but incomplete)\n');
  
  console.log('🎯 Root Cause:');
  console.log('   The enrich-async endpoint uses internal fetch() which doesn\'t');
  console.log('   work in production. We need to call the Lambda directly or');
  console.log('   use a different approach.\n');
  
  console.log('✅ Solution Options:\n');
  console.log('   Option 1: Call Lambda directly from enrich-async');
  console.log('   Option 2: Use the quiz endpoint directly (it already works)');
  console.log('   Option 3: Implement proper async job processing\n');
}

// Main execution
async function main() {
  const hasVercel = await checkVercelCLI();
  const hasAWS = await checkAWSCLI();
  
  console.log('');
  
  if (hasVercel) {
    await getVercelLogs();
  }
  
  if (hasAWS) {
    await getCloudWatchLogs();
  }
  
  await analyzeProblem();
  
  console.log('📝 Next Steps:\n');
  console.log('1. Review the logs above');
  console.log('2. Confirm the internal fetch() is failing');
  console.log('3. Implement one of the solution options');
  console.log('4. Test locally before deploying\n');
}

main().catch(console.error);
