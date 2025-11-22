/**
 * Test: Panax Ginseng Issue
 * 
 * Diagnóstico del problema donde "panax ginseng" retorna 404
 * pero PubMed tiene 5 estudios disponibles
 */

async function testPanaxGinseng() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO: PANAX GINSENG');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  // Test 1: PubMed directo con "panax ginseng"
  console.log('🔍 Test 1: PubMed con "panax ginseng"');
  const startTime1 = Date.now();
  const response1 = await fetch(
    'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'panax ginseng',
        maxResults: 5,
        filters: { rctOnly: false, yearFrom: 2010, humanStudiesOnly: true },
      }),
    }
  );
  const data1 = await response1.json();
  const duration1 = Date.now() - startTime1;
  console.log(`   Status: ${response1.status}`);
  console.log(`   Estudios: ${data1.data?.totalFound || 0}`);
  console.log(`   Duración: ${duration1}ms\n`);
  
  // Test 2: PubMed directo con "ginseng"
  console.log('🔍 Test 2: PubMed con "ginseng"');
  const startTime2 = Date.now();
  const response2 = await fetch(
    'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'ginseng',
        maxResults: 5,
        filters: { rctOnly: false, yearFrom: 2010, humanStudiesOnly: true },
      }),
    }
  );
  const data2 = await response2.json();
  const duration2 = Date.now() - startTime2;
  console.log(`   Status: ${response2.status}`);
  console.log(`   Estudios: ${data2.data?.totalFound || 0}`);
  console.log(`   Duración: ${duration2}ms\n`);
  
  // Test 3: Enrich con "panax ginseng"
  console.log('🔍 Test 3: /api/portal/enrich con "panax ginseng"');
  const startTime3 = Date.now();
  const response3 = await fetch(
    'https://www.suplementai.com/api/portal/enrich',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'panax ginseng',
        maxStudies: 5,
      }),
    }
  );
  const data3 = await response3.json();
  const duration3 = Date.now() - startTime3;
  console.log(`   Status: ${response3.status}`);
  console.log(`   Success: ${data3.success}`);
  console.log(`   Duración: ${duration3}ms`);
  if (data3.metadata) {
    console.log(`   Original: ${data3.metadata.originalQuery}`);
    console.log(`   Traducido: ${data3.metadata.translatedQuery}`);
    console.log(`   Final: ${data3.metadata.finalSearchTerm}`);
    console.log(`   Estudios: ${data3.metadata.studiesUsed}`);
  }
  console.log('');
  
  // Test 4: Quiz con "panax ginseng"
  console.log('🔍 Test 4: /api/portal/quiz con "panax ginseng"');
  const startTime4 = Date.now();
  const response4 = await fetch(
    'https://www.suplementai.com/api/portal/quiz',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'panax ginseng',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    }
  );
  const data4 = await response4.json();
  const duration4 = Date.now() - startTime4;
  console.log(`   Status: ${response4.status}`);
  console.log(`   Success: ${data4.success}`);
  console.log(`   Duración: ${duration4}ms`);
  if (data4.error) {
    console.log(`   Error: ${data4.error}`);
    console.log(`   Message: ${data4.message}`);
  }
  console.log('');
  
  // Análisis
  console.log('='.repeat(80));
  console.log('ANÁLISIS');
  console.log('='.repeat(80));
  
  const pubmedWorks = data1.data?.totalFound > 0 || data2.data?.totalFound > 0;
  const enrichWorks = response3.ok && data3.success;
  const quizWorks = response4.ok && data4.success;
  
  console.log(`\n✅ PubMed tiene estudios: ${pubmedWorks ? 'SÍ' : 'NO'}`);
  console.log(`${enrichWorks ? '✅' : '❌'} Enrich funciona: ${enrichWorks ? 'SÍ' : 'NO'}`);
  console.log(`${quizWorks ? '✅' : '❌'} Quiz funciona: ${quizWorks ? 'SÍ' : 'NO'}`);
  
  if (pubmedWorks && !quizWorks) {
    console.log('\n⚠️  PROBLEMA DETECTADO:');
    console.log('   PubMed tiene estudios pero el sistema retorna 404');
    console.log('\n🔍 CAUSA RAÍZ PROBABLE:');
    console.log('   1. LLM timeout (>8s) al traducir "panax ginseng"');
    console.log('   2. Sistema usa término original "panax ginseng"');
    console.log('   3. PubMed no encuentra con término exacto');
    console.log('   4. Sistema retorna 404');
    console.log('\n💡 SOLUCIÓN:');
    console.log('   Agregar "panax ginseng" → "ginseng" al mapa estático');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Diagnóstico completado: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
}

testPanaxGinseng().catch(console.error);
