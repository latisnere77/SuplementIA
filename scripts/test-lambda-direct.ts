#!/usr/bin/env tsx

/**
 * Test directo del Lambda content-enricher deployado
 * Para diagnosticar el error "Cannot access 'P' before initialization"
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

async function testLambda() {
  console.log('🧪 Testing Lambda: suplementia-content-enricher-dev\n');
  
  const payload = {
    supplementName: 'ashwagandha',
    studies: [
      {
        pmid: '12345',
        title: 'Test study on ashwagandha',
        abstract: 'This is a test abstract about ashwagandha benefits.',
        authors: ['Smith J'],
        journal: 'Test Journal',
        year: 2023,
        relevanceScore: 0.9
      }
    ]
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  console.log('\n⏳ Invocando Lambda...\n');

  try {
    const command = new InvokeCommand({
      FunctionName: 'suplementia-content-enricher-dev',
      Payload: JSON.stringify(payload),
      LogType: 'Tail' // Incluir logs en la respuesta
    });

    const response = await lambda.send(command);
    
    // Decodificar logs
    if (response.LogResult) {
      const logs = Buffer.from(response.LogResult, 'base64').toString('utf-8');
      console.log('📋 LOGS DEL LAMBDA:');
      console.log('─'.repeat(80));
      console.log(logs);
      console.log('─'.repeat(80));
      console.log();
    }

    // Decodificar respuesta
    if (response.Payload) {
      const result = JSON.parse(Buffer.from(response.Payload).toString('utf-8'));
      
      if (response.FunctionError) {
        console.log('❌ ERROR EN LAMBDA:');
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✅ RESPUESTA EXITOSA:');
        console.log(JSON.stringify(result, null, 2));
      }
    }

    console.log('\n📊 Metadata:');
    console.log(`   Status: ${response.StatusCode}`);
    console.log(`   ExecutedVersion: ${response.ExecutedVersion}`);
    if (response.FunctionError) {
      console.log(`   FunctionError: ${response.FunctionError}`);
    }

  } catch (error: any) {
    console.error('❌ Error invocando Lambda:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testLambda();
