/**
 * Test Kefir through complete flow: quiz -> recommend -> enrich
 * This tests the entire chain to identify where metadata is lost
 */

const QUIZ_API_URL = process.env.QUIZ_API_URL || 'https://www.suplementai.com/api/portal/quiz';

async function testKefirFullFlow() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Kefir Full Flow (Quiz -> Recommend -> Enrich)');
  console.log('='.repeat(60));
  console.log('');

  const requestId = `test-full-${Date.now()}`;
  
  console.log(`📝 Calling: ${QUIZ_API_URL}`);
  console.log(`📝 Request ID: ${requestId}`);
  console.log('');

  try {
    const startTime = Date.now();
    
    const response = await fetch(QUIZ_API_URL, {
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
    if (data.success) {
      console.log('✅ Request successful');
      console.log('');
      
      if (data.recommendation) {
        const recommendation = data.recommendation;
        const metadata = recommendation._enrichment_metadata || {};
        
        console.log('📊 Recommendation Metadata:');
        console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
        console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
        console.log(`   Intelligent System: ${metadata.intelligentSystem || false}`);
        console.log(`   Source: ${metadata.source || 'N/A'}`);
        console.log('');
        
        console.log('📊 Evidence Summary:');
        const evidenceSummary = recommendation.evidence_summary || {};
        console.log(`   Total Studies: ${evidenceSummary.totalStudies || 0}`);
        console.log(`   Total Participants: ${evidenceSummary.totalParticipants || 0}`);
        console.log('');
        
        // Check frontend validation criteria
        const hasRealData = metadata.hasRealData && metadata.studiesUsed > 0;
        const totalStudies = evidenceSummary.totalStudies || 0;
        
        if (hasRealData && totalStudies > 0) {
          console.log('✅ SUCCESS: Metadata is correct and will pass frontend validation!');
          console.log(`   Studies: ${metadata.studiesUsed}`);
          console.log(`   Total Studies in Summary: ${totalStudies}`);
        } else {
          console.log('❌ PROBLEM: Metadata will fail frontend validation');
          console.log(`   Has Real Data: ${metadata.hasRealData || false}`);
          console.log(`   Studies Used: ${metadata.studiesUsed || 0}`);
          console.log(`   Total Studies: ${totalStudies}`);
          console.log('');
          console.log('🔍 Frontend checks:');
          console.log(`   metadata.hasRealData && metadata.studiesUsed > 0: ${hasRealData}`);
          console.log(`   totalStudies > 0: ${totalStudies > 0}`);
          console.log('');
          console.log('🔍 Full metadata:', JSON.stringify(metadata, null, 2));
        }
      } else if (data.recommendation_id) {
        console.log('⏳ Async processing mode');
        console.log(`   Recommendation ID: ${data.recommendation_id}`);
        console.log(`   Status: ${data.status || 'processing'}`);
      }
    } else {
      console.log('❌ Request failed');
      console.log(`   Error: ${data.error || 'Unknown'}`);
      console.log(`   Message: ${data.message || 'N/A'}`);
      
      if (data.error === 'insufficient_data') {
        console.log('');
        console.log('💡 This means no studies were found or validation failed');
      }
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

testKefirFullFlow().catch(console.error);

