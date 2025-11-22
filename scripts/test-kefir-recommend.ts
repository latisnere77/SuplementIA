/**
 * Test Kefir through /api/portal/recommend endpoint
 * This tests the full flow including validation and transformation
 */

const RECOMMEND_API_URL = process.env.RECOMMEND_API_URL || 'https://www.suplementai.com/api/portal/recommend';

async function testKefirRecommend() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Kefir via /api/portal/recommend');
  console.log('='.repeat(60));
  console.log('');

  const requestId = `test-rec-${Date.now()}`;
  
  console.log(`📝 Calling: ${RECOMMEND_API_URL}`);
  console.log(`📝 Request ID: ${requestId}`);
  console.log('');

  try {
    const startTime = Date.now();
    
    const response = await fetch(RECOMMEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        category: 'Kefir',
        age: 35,
        gender: 'male',
        location: 'CDMX',
        quiz_id: `quiz-test-${Date.now()}`,
      }),
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('');

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.log('❌ Response is not JSON:');
      console.log(responseText.substring(0, 500));
      return;
    }

    // Check if successful
    if (data.success && data.recommendation) {
      console.log('✅ Request successful');
      console.log('');
      
      const recommendation = data.recommendation;
      const metadata = recommendation._enrichment_metadata || {};
      
      console.log('📊 Recommendation Metadata:');
      console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
      console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
      console.log(`   Intelligent System: ${metadata.intelligentSystem || false}`);
      console.log('');
      
      console.log('📊 Evidence Summary:');
      const evidenceSummary = recommendation.evidence_summary || {};
      console.log(`   Total Studies: ${evidenceSummary.totalStudies || 0}`);
      console.log(`   Total Participants: ${evidenceSummary.totalParticipants || 0}`);
      console.log('');
      
      if (metadata.hasRealData && metadata.studiesUsed > 0) {
        console.log('✅ SUCCESS: Metadata is correct!');
        console.log(`   Studies: ${metadata.studiesUsed}`);
        console.log(`   Has Real Data: ${metadata.hasRealData}`);
      } else {
        console.log('❌ PROBLEM: Metadata is missing or incorrect');
        console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
        console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
        console.log('');
        console.log('🔍 Full metadata:', JSON.stringify(metadata, null, 2));
      }
    } else if (data.error === 'insufficient_data') {
      console.log('❌ Request failed: Insufficient data');
      console.log(`   Error: ${data.error}`);
      console.log(`   Message: ${data.message || 'N/A'}`);
      console.log('');
      console.log('💡 This means no studies were found or validation failed');
      if (data.metadata) {
        console.log('📊 Error Metadata:');
        console.log(`   Studies Used: ${data.metadata.studiesUsed || 0}`);
        console.log(`   Has Real Data: ${data.metadata.hasRealData || false}`);
      }
    } else {
      console.log('❌ Request failed');
      console.log(`   Error: ${data.error || 'Unknown'}`);
      console.log(`   Message: ${data.message || 'N/A'}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('📋 Full Response (first 2000 chars):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(data, null, 2).substring(0, 2000));
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testKefirRecommend().catch(console.error);

