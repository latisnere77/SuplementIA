#!/usr/bin/env tsx
/**
 * Test "vitamina d" with streaming endpoint
 */

async function testVitaminaDStreaming() {
  console.log('🧪 STREAMING TEST: "vitamina d" search\n');
  console.log('='.repeat(60));

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suplementia.vercel.app';
  const testQuery = 'vitamina d';

  console.log(`\n📍 Testing against: ${API_URL}`);
  console.log(`🔍 Search query: "${testQuery}"\n`);

  try {
    console.log('STEP 1: Calling /api/portal/enrich-stream');
    console.log('─'.repeat(60));

    const streamStart = Date.now();
    const response = await fetch(`${API_URL}/api/portal/enrich-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        supplementName: testQuery,
        maxStudies: 10,
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status}`);
      const errorText = await response.text();
      console.error(errorText);
      return;
    }

    if (!response.body) {
      console.error('❌ No response body');
      return;
    }

    console.log('✅ Stream started, reading events...\n');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;
    let lastProgress = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n✅ Stream completed');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            console.log('\n✅ Received [DONE] signal');
            continue;
          }

          try {
            const event = JSON.parse(data);
            
            if (event.type === 'progress') {
              if (event.progress > lastProgress) {
                console.log(`📊 Progress: ${event.progress}% - ${event.stage}`);
                lastProgress = event.progress;
              }
            } else if (event.type === 'complete') {
              console.log(`\n✅ COMPLETE!`);
              console.log(`   - Supplement ID: ${event.supplementId}`);
              console.log(`   - Has Real Data: ${event.metadata?.hasRealData}`);
              console.log(`   - Studies Used: ${event.metadata?.studiesUsed}`);
              console.log(`   - Duration: ${Date.now() - streamStart}ms`);
            } else if (event.type === 'error') {
              console.error(`\n❌ ERROR: ${event.error}`);
              console.error(`   Message: ${event.message}`);
            }
          } catch (e) {
            // Ignore parse errors for partial data
          }
        }
      }
    }

    const totalDuration = Date.now() - streamStart;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ STREAMING TEST COMPLETED`);
    console.log(`   - Total Events: ${eventCount}`);
    console.log(`   - Total Duration: ${totalDuration}ms`);
    console.log(`${'='.repeat(60)}`);

  } catch (error: any) {
    console.error(`\n❌ TEST FAILED WITH ERROR:`);
    console.error(error.message);
    console.error(error.stack);
  }
}

testVitaminaDStreaming().catch(console.error);
