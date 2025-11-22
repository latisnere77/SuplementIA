/**
 * Diagnóstico Completo: Berberina
 * 
 * Valida sistemáticamente todo el flujo de búsqueda para "berberina"
 * usando todas las herramientas de observabilidad disponibles.
 */

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  statusCode?: number;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testStep(
  step: string,
  testFn: () => Promise<{ success: boolean; statusCode?: number; data?: any; error?: string }>
): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🔍 Testing: ${step}...`);
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({
      step,
      success: result.success,
      duration,
      statusCode: result.statusCode,
      data: result.data,
      error: result.error,
    });
    
    if (result.success) {
      console.log(`✅ ${step} - OK (${duration}ms)`);
    } else {
      console.log(`❌ ${step} - FAILED (${duration}ms)`);
      console.log(`   Error: ${result.error}`);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      step,
      success: false,
      duration,
      error: error.message,
    });
    console.log(`❌ ${step} - EXCEPTION (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('DIAGNÓSTICO COMPLETO: BERBERINA');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // PASO 1: Verificar Lambda studies-fetcher
  await testStep('Lambda studies-fetcher (berberina)', async () => {
    const response = await fetch(
      'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: 'berberina',
          maxResults: 5,
          filters: {
            rctOnly: false,
            yearFrom: 2010,
            humanStudiesOnly: true,
          },
        }),
      }
    );
    
    const data = await response.json();
    const studiesFound = data.data?.studies?.length || 0;
    
    return {
      success: response.ok && studiesFound > 0,
      statusCode: response.status,
      data: {
        studiesFound,
        totalFound: data.data?.totalFound,
        searchQuery: data.data?.searchQuery,
      },
      error: !response.ok ? data.error || 'Unknown error' : studiesFound === 0 ? 'No studies found' : undefined,
    };
  });
  
  // PASO 2: Verificar Lambda content-enricher
  await testStep('Lambda content-enricher (con estudios reales)', async () => {
    // Primero obtener estudios
    const studiesResponse = await fetch(
      'https://ctl2qa3wji.execute-api.us-east-1.amazonaws.com/dev/studies/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementName: 'berberina',
          maxResults: 2,
          filters: { rctOnly: false, yearFrom: 2010, humanStudiesOnly: true },
        }),
      }
    );
    
    const studiesData = await studiesResponse.json();
    const studies = studiesData.data?.studies || [];
    
    if (studies.length === 0) {
      return {
        success: false,
        error: 'No studies to enrich',
      };
    }
    
    // Ahora enriquecer con estudios reales
    const enrichResponse = await fetch(
      'https://l7mve4qnytdpxfcyu46cyly5le0vdqgx.lambda-url.us-east-1.on.aws/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementId: 'berberina',
          category: 'general',
          forceRefresh: false,
          studies,
        }),
      }
    );
    
    const enrichData = await enrichResponse.json();
    
    return {
      success: enrichResponse.ok && enrichData.success,
      statusCode: enrichResponse.status,
      data: {
        hasData: !!enrichData.data,
        hasRealData: enrichData.metadata?.hasRealData,
        studiesUsed: enrichData.metadata?.studiesUsed,
        cached: enrichData.metadata?.cached,
      },
      error: !enrichResponse.ok ? enrichData.error || 'Unknown error' : undefined,
    };
  });
  
  // PASO 3: Verificar endpoint /api/portal/enrich
  await testStep('API /api/portal/enrich', async () => {
    const response = await fetch('https://www.suplementai.com/api/portal/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplementName: 'berberina',
        maxStudies: 5,
      }),
    });
    
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      statusCode: response.status,
      data: {
        hasData: !!data.data,
        hasRealData: data.metadata?.hasRealData,
        studiesUsed: data.metadata?.studiesUsed,
        orchestrationDuration: data.metadata?.orchestrationDuration,
      },
      error: !response.ok ? data.error || 'Unknown error' : undefined,
    };
  });
  
  // PASO 4: Verificar endpoint /api/portal/recommend
  await testStep('API /api/portal/recommend', async () => {
    const response = await fetch('https://www.suplementai.com/api/portal/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'berberina',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });
    
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      statusCode: response.status,
      data: {
        hasRecommendation: !!data.recommendation,
        hasRealData: data.recommendation?._enrichment_metadata?.hasRealData,
        studiesUsed: data.recommendation?._enrichment_metadata?.studiesUsed,
      },
      error: !response.ok ? data.error || data.message || 'Unknown error' : undefined,
    };
  });
  
  // PASO 5: Verificar endpoint /api/portal/quiz (flujo completo)
  await testStep('API /api/portal/quiz (flujo completo)', async () => {
    const response = await fetch('https://www.suplementai.com/api/portal/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'berberina',
        age: 35,
        gender: 'male',
        location: 'CDMX',
      }),
    });
    
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      statusCode: response.status,
      data: {
        hasRecommendation: !!data.recommendation,
        hasRealData: data.recommendation?._enrichment_metadata?.hasRealData,
        studiesUsed: data.recommendation?._enrichment_metadata?.studiesUsed,
        demo: data.demo,
        fallback: data.fallback,
      },
      error: !response.ok ? data.error || data.message || 'Unknown error' : undefined,
    };
  });
  
  // RESUMEN
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\nTotal de pruebas: ${totalTests}`);
  console.log(`✅ Exitosas: ${passedTests}`);
  console.log(`❌ Fallidas: ${failedTests}`);
  console.log(`📊 Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n' + '-'.repeat(80));
  console.log('DETALLES POR PASO:');
  console.log('-'.repeat(80));
  
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    console.log(`\n${icon} ${result.step}`);
    console.log(`   Duración: ${result.duration}ms`);
    if (result.statusCode) {
      console.log(`   Status Code: ${result.statusCode}`);
    }
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2).split('\n').join('\n   ')}`);
    }
    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }
  }
  
  // DIAGNÓSTICO
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNÓSTICO');
  console.log('='.repeat(80));
  
  if (failedTests === 0) {
    console.log('\n✅ SISTEMA FUNCIONANDO CORRECTAMENTE');
    console.log('   Todos los componentes están operativos.');
    console.log('   El error reportado puede ser:');
    console.log('   - Un problema temporal que ya se resolvió');
    console.log('   - Un problema específico del frontend');
    console.log('   - Un problema de caché del navegador');
  } else {
    console.log('\n❌ SE DETECTARON PROBLEMAS');
    console.log('\nComponentes fallidos:');
    for (const result of results.filter(r => !r.success)) {
      console.log(`   - ${result.step}: ${result.error}`);
    }
    
    // Análisis de causa raíz
    console.log('\n🔍 ANÁLISIS DE CAUSA RAÍZ:');
    
    const studiesFailed = results.find(r => r.step.includes('studies-fetcher') && !r.success);
    const enricherFailed = results.find(r => r.step.includes('content-enricher') && !r.success);
    const enrichApiFailed = results.find(r => r.step.includes('/api/portal/enrich') && !r.success);
    const recommendFailed = results.find(r => r.step.includes('/api/portal/recommend') && !r.success);
    const quizFailed = results.find(r => r.step.includes('/api/portal/quiz') && !r.success);
    
    if (studiesFailed) {
      console.log('   ⚠️  PROBLEMA EN LAMBDA STUDIES-FETCHER');
      console.log('      - PubMed no está retornando estudios para "berberina"');
      console.log('      - Verificar conectividad con PubMed API');
      console.log('      - Verificar query de búsqueda en PubMed');
    }
    
    if (enricherFailed && !studiesFailed) {
      console.log('   ⚠️  PROBLEMA EN LAMBDA CONTENT-ENRICHER');
      console.log('      - Los estudios se obtienen correctamente');
      console.log('      - Pero el enriquecimiento con Claude/Bedrock falla');
      console.log('      - Verificar logs de Lambda content-enricher');
      console.log('      - Verificar cuota de Bedrock');
    }
    
    if (enrichApiFailed && !studiesFailed && !enricherFailed) {
      console.log('   ⚠️  PROBLEMA EN ORQUESTACIÓN (/api/portal/enrich)');
      console.log('      - Las Lambdas funcionan correctamente');
      console.log('      - Pero la orquestación en Next.js falla');
      console.log('      - Verificar logs de Vercel');
    }
    
    if (recommendFailed && !enrichApiFailed) {
      console.log('   ⚠️  PROBLEMA EN TRANSFORMACIÓN (/api/portal/recommend)');
      console.log('      - El enriquecimiento funciona');
      console.log('      - Pero la transformación a formato de recomendación falla');
      console.log('      - Verificar validación de metadata');
    }
    
    if (quizFailed && !recommendFailed) {
      console.log('   ⚠️  PROBLEMA EN ENDPOINT QUIZ');
      console.log('      - El recommend funciona');
      console.log('      - Pero el quiz endpoint falla');
      console.log('      - Verificar lógica de quiz route');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Diagnóstico completado: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  
  // Exit code
  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Error fatal en diagnóstico:', error);
  process.exit(1);
});
