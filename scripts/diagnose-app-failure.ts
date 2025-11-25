/**
 * Diagnose why the app is returning "No pudimos encontrar información"
 * for all searches
 */

async function diagnoseAppFailure() {
  console.log('🔍 DIAGNOSING APP FAILURE\n');
  
  const testQueries = [
    'ashwagandha',
    'omega-3',
    'vitamin d',
    'magnesium',
    'reishi',
  ];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  for (const query of testQueries) {
    console.log(`\n📋 Testing: "${query}"`);
    console.log('─'.repeat(60));
    
    try {
      const response = await fetch(`${baseUrl}/api/portal/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: query,
          age: 35,
          gender: 'male',
          location: 'CDMX',
        }),
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (!data.success) {
        console.log('❌ FAILED');
        console.log('Error:', data.error);
        console.log('Message:', data.message);
      } else {
        console.log('✅ SUCCESS');
        console.log('Supplement:', data.recommendation?.supplement?.name);
      }
      
    } catch (error: any) {
      console.log('❌ REQUEST FAILED');
      console.log('Error:', error.message);
    }
  }
}

diagnoseAppFailure().catch(console.error);
