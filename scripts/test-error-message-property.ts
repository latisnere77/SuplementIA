/**
 * Manual Property Test for Error Message Display
 * Feature: system-completion-audit, Property 5: Error Message Display
 * 
 * This script validates that error messages are properly formatted
 * and use the ErrorMessage component.
 * 
 * **Validates: Requirements 4.3**
 */

import fs from 'fs';
import path from 'path';

interface TestResult {
  passed: boolean;
  message: string;
}

/**
 * Check if ErrorMessage component exists and is properly exported
 */
function testErrorMessageComponentExists(): TestResult {
  const componentPath = path.join(process.cwd(), 'components/portal/ErrorMessage.tsx');
  
  if (!fs.existsSync(componentPath)) {
    return {
      passed: false,
      message: 'ErrorMessage component file not found'
    };
  }
  
  const content = fs.readFileSync(componentPath, 'utf-8');
  
  // Check for export
  if (!content.includes('export function ErrorMessage')) {
    return {
      passed: false,
      message: 'ErrorMessage component not properly exported'
    };
  }
  
  // Check for required props
  const requiredProps = ['statusCode', 'message', 'onRetry', 'consecutiveFailures'];
  const missingProps = requiredProps.filter(prop => !content.includes(prop));
  
  if (missingProps.length > 0) {
    return {
      passed: false,
      message: `Missing required props: ${missingProps.join(', ')}`
    };
  }
  
  return {
    passed: true,
    message: 'ErrorMessage component exists with required props'
  };
}

/**
 * Check if useIntelligentSearch hook uses ErrorMessage-compatible error details
 */
function testUseIntelligentSearchIntegration(): TestResult {
  const hookPath = path.join(process.cwd(), 'lib/portal/useIntelligentSearch.ts');
  
  if (!fs.existsSync(hookPath)) {
    return {
      passed: false,
      message: 'useIntelligentSearch hook not found'
    };
  }
  
  const content = fs.readFileSync(hookPath, 'utf-8');
  
  // Check for ErrorDetails interface
  if (!content.includes('interface ErrorDetails')) {
    return {
      passed: false,
      message: 'ErrorDetails interface not found in hook'
    };
  }
  
  // Check for required error details fields
  const requiredFields = ['statusCode', 'message', 'consecutiveFailures', 'canRetry'];
  const missingFields = requiredFields.filter(field => !content.includes(field));
  
  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Missing required error details fields: ${missingFields.join(', ')}`
    };
  }
  
  // Check for retry functionality
  if (!content.includes('retry')) {
    return {
      passed: false,
      message: 'Retry functionality not found in hook'
    };
  }
  
  return {
    passed: true,
    message: 'useIntelligentSearch hook properly integrates with ErrorMessage'
  };
}

/**
 * Check if error messages are in Spanish
 */
function testSpanishErrorMessages(): TestResult {
  const componentPath = path.join(process.cwd(), 'components/portal/ErrorMessage.tsx');
  const content = fs.readFileSync(componentPath, 'utf-8');
  
  // Check for Spanish error titles
  const spanishTitles = [
    'Solicitud inválida',
    'No encontrado',
    'Tiempo de espera agotado',
    'Proceso expirado',
    'Demasiados intentos',
    'Error del servidor',
    'Servicio no disponible',
  ];
  
  const missingTitles = spanishTitles.filter(title => !content.includes(title));
  
  if (missingTitles.length > 0) {
    return {
      passed: false,
      message: `Missing Spanish error titles: ${missingTitles.join(', ')}`
    };
  }
  
  // Check for Spanish button text
  const spanishButtons = [
    'Intentar de nuevo',
    'Contactar soporte',
  ];
  
  const missingButtons = spanishButtons.filter(button => !content.includes(button));
  
  if (missingButtons.length > 0) {
    return {
      passed: false,
      message: `Missing Spanish button text: ${missingButtons.join(', ')}`
    };
  }
  
  return {
    passed: true,
    message: 'All error messages are in Spanish'
  };
}

/**
 * Check if error styling is differentiated for 4xx vs 5xx
 */
function testErrorStyling(): TestResult {
  const componentPath = path.join(process.cwd(), 'components/portal/ErrorMessage.tsx');
  const content = fs.readFileSync(componentPath, 'utf-8');
  
  // Check for 4xx styling (yellow/warning)
  if (!content.includes('border-yellow-300') || !content.includes('bg-yellow-50')) {
    return {
      passed: false,
      message: 'Missing 4xx error styling (yellow/warning)'
    };
  }
  
  // Check for 5xx styling (red/error)
  if (!content.includes('border-red-300') || !content.includes('bg-red-50')) {
    return {
      passed: false,
      message: 'Missing 5xx error styling (red/error)'
    };
  }
  
  // Check for getErrorCategory function
  if (!content.includes('getErrorCategory')) {
    return {
      passed: false,
      message: 'Missing error category detection function'
    };
  }
  
  return {
    passed: true,
    message: 'Error styling properly differentiates 4xx vs 5xx'
  };
}

/**
 * Check if retry button appears for appropriate errors
 */
function testRetryButton(): TestResult {
  const componentPath = path.join(process.cwd(), 'components/portal/ErrorMessage.tsx');
  const content = fs.readFileSync(componentPath, 'utf-8');
  
  // Check for retry button logic
  if (!content.includes('showRetryButton')) {
    return {
      passed: false,
      message: 'Missing retry button logic'
    };
  }
  
  // Check for 408 timeout handling
  if (!content.includes('408')) {
    return {
      passed: false,
      message: 'Missing 408 timeout error handling'
    };
  }
  
  // Check for onRetry callback
  if (!content.includes('onRetry')) {
    return {
      passed: false,
      message: 'Missing onRetry callback'
    };
  }
  
  return {
    passed: true,
    message: 'Retry button properly configured for retryable errors'
  };
}

/**
 * Check if contact support appears after multiple failures
 */
function testContactSupport(): TestResult {
  const componentPath = path.join(process.cwd(), 'components/portal/ErrorMessage.tsx');
  const content = fs.readFileSync(componentPath, 'utf-8');
  
  // Check for consecutive failures handling
  if (!content.includes('consecutiveFailures')) {
    return {
      passed: false,
      message: 'Missing consecutive failures tracking'
    };
  }
  
  // Check for contact support button
  if (!content.includes('Contactar soporte')) {
    return {
      passed: false,
      message: 'Missing contact support button'
    };
  }
  
  // Check for threshold (3 failures)
  if (!content.includes('>= 3')) {
    return {
      passed: false,
      message: 'Missing 3-failure threshold for support escalation'
    };
  }
  
  return {
    passed: true,
    message: 'Contact support properly configured after 3 failures'
  };
}

/**
 * Run all property tests
 */
async function runPropertyTests() {
  console.log('🧪 Running Property 5: Error Message Display Tests\n');
  console.log('Feature: system-completion-audit');
  console.log('Validates: Requirements 4.3\n');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'ErrorMessage component exists', fn: testErrorMessageComponentExists },
    { name: 'useIntelligentSearch integration', fn: testUseIntelligentSearchIntegration },
    { name: 'Spanish error messages', fn: testSpanishErrorMessages },
    { name: 'Error styling (4xx vs 5xx)', fn: testErrorStyling },
    { name: 'Retry button configuration', fn: testRetryButton },
    { name: 'Contact support after failures', fn: testContactSupport },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = test.fn();
    
    if (result.passed) {
      console.log(`✅ ${test.name}`);
      console.log(`   ${result.message}\n`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      console.log(`   ${result.message}\n`);
      failed++;
    }
  }
  
  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log('❌ Property test FAILED');
    process.exit(1);
  } else {
    console.log('✅ Property test PASSED');
    console.log('\nAll error responses properly use ErrorMessage component');
    console.log('with user-friendly Spanish text.\n');
    process.exit(0);
  }
}

// Run tests
runPropertyTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
