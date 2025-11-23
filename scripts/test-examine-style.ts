/**
 * Test script for Examine-style content generation
 * 
 * Tests the new examine-style format vs standard format
 */

import axios from 'axios';

const LAMBDA_URL = process.env.LAMBDA_URL || 'https://your-lambda-url.amazonaws.com';

interface TestResult {
  format: 'standard' | 'examine-style';
  success: boolean;
  duration: number;
  tokensUsed?: number;
  contentPreview?: any;
  error?: string;
}

async function testFormat(
  supplementId: string,
  contentType: 'standard' | 'examine-style'
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 Testing ${contentType} format for: ${supplementId}`);
    
    const response = await axios.post(LAMBDA_URL, {
      supplementId,
      category: 'general',
      forceRefresh: true,
      contentType,
    });

    const duration = Date.now() - startTime;
    const data = response.data;

    if (!data.success) {
      return {
        format: contentType,
        success: false,
        duration,
        error: data.error || 'Unknown error',
      };
    }

    // Preview content structure
    const content = data.data;
    const preview = contentType === 'examine-style'
      ? {
          overview: content.overview?.whatIsIt?.substring(0, 100),
          benefitsCount: content.benefitsByCondition?.length || 0,
          mechanismsCount: content.mechanisms?.length || 0,
          firstBenefit: content.benefitsByCondition?.[0],
        }
      : {
          whatIsIt: content.whatIsIt?.substring(0, 100),
          worksForCount: content.worksFor?.length || 0,
          mechanismsCount: content.mechanisms?.length || 0,
          firstWorksFor: content.worksFor?.[0],
        };

    return {
      format: contentType,
      success: true,
      duration,
      tokensUsed: data.metadata?.tokensUsed,
      contentPreview: preview,
    };
  } catch (error: any) {
    return {
      format: contentType,
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function runComparison(supplementId: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 COMPARING FORMATS FOR: ${supplementId}`);
  console.log('='.repeat(60));

  // Test standard format
  const standardResult = await testFormat(supplementId, 'standard');
  
  // Test examine-style format
  const examineResult = await testFormat(supplementId, 'examine-style');

  // Display results
  console.log('\n📈 RESULTS:');
  console.log('\n1️⃣  STANDARD FORMAT:');
  console.log(`   ✅ Success: ${standardResult.success}`);
  console.log(`   ⏱️  Duration: ${standardResult.duration}ms`);
  console.log(`   🎯 Tokens: ${standardResult.tokensUsed || 'N/A'}`);
  if (standardResult.contentPreview) {
    console.log(`   📝 Preview:`, JSON.stringify(standardResult.contentPreview, null, 2));
  }
  if (standardResult.error) {
    console.log(`   ❌ Error: ${standardResult.error}`);
  }

  console.log('\n2️⃣  EXAMINE-STYLE FORMAT:');
  console.log(`   ✅ Success: ${examineResult.success}`);
  console.log(`   ⏱️  Duration: ${examineResult.duration}ms`);
  console.log(`   🎯 Tokens: ${examineResult.tokensUsed || 'N/A'}`);
  if (examineResult.contentPreview) {
    console.log(`   📝 Preview:`, JSON.stringify(examineResult.contentPreview, null, 2));
  }
  if (examineResult.error) {
    console.log(`   ❌ Error: ${examineResult.error}`);
  }

  // Comparison
  console.log('\n📊 COMPARISON:');
  if (standardResult.success && examineResult.success) {
    const durationDiff = examineResult.duration - standardResult.duration;
    const tokenDiff = (examineResult.tokensUsed || 0) - (standardResult.tokensUsed || 0);
    
    console.log(`   ⏱️  Duration difference: ${durationDiff > 0 ? '+' : ''}${durationDiff}ms`);
    console.log(`   🎯 Token difference: ${tokenDiff > 0 ? '+' : ''}${tokenDiff}`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run tests
async function main() {
  const supplements = [
    'magnesium',
    'vitamin-d',
    'ashwagandha',
  ];

  for (const supplement of supplements) {
    await runComparison(supplement);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ All tests completed!');
}

main().catch(console.error);
