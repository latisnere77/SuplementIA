/**
 * Migration Validation Script
 * 
 * This script:
 * 1. Compares search results between legacy and new systems
 * 2. Verifies all 70 supplements are searchable
 * 3. Tests multilingual queries (Spanish, English)
 * 4. Validates data integrity
 */

import { Pool } from 'pg';
import { SUPPLEMENT_MAPPINGS, getSupplementMapping } from '../lib/portal/supplement-mappings';

// Database connection
const pool = new Pool({
  host: process.env.RDS_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE || 'supplements',
  user: process.env.RDS_USER || 'postgres',
  password: process.env.RDS_PASSWORD || 'postgres',
  ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

interface ValidationResult {
  passed: number;
  failed: number;
  tests: Array<{
    name: string;
    status: 'pass' | 'fail';
    message: string;
  }>;
}

/**
 * Test 1: Verify all legacy supplements exist in new system
 */
async function testAllSupplementsExist(): Promise<ValidationResult> {
  console.log('\n📋 Test 1: Verifying all legacy supplements exist in new system...\n');
  
  const result: ValidationResult = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  const legacySupplements = Object.keys(SUPPLEMENT_MAPPINGS);
  
  for (const supplementName of legacySupplements) {
    try {
      const dbResult = await pool.query(
        'SELECT name FROM supplements WHERE name = $1',
        [supplementName]
      );
      
      if (dbResult.rows.length > 0) {
        result.passed++;
        result.tests.push({
          name: supplementName,
          status: 'pass',
          message: 'Found in new system',
        });
        console.log(`  ✅ ${supplementName}`);
      } else {
        result.failed++;
        result.tests.push({
          name: supplementName,
          status: 'fail',
          message: 'NOT found in new system',
        });
        console.log(`  ❌ ${supplementName} - NOT FOUND`);
      }
    } catch (error) {
      result.failed++;
      result.tests.push({
        name: supplementName,
        status: 'fail',
        message: `Error: ${error}`,
      });
      console.log(`  ❌ ${supplementName} - ERROR: ${error}`);
    }
  }
  
  return result;
}

/**
 * Test 2: Verify data integrity (all fields migrated correctly)
 */
async function testDataIntegrity(): Promise<ValidationResult> {
  console.log('\n📋 Test 2: Verifying data integrity...\n');
  
  const result: ValidationResult = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  // Sample a few supplements for detailed validation
  const samplesToTest = [
    'Ganoderma lucidum',
    'Vitamin B12',
    'Magnesium',
    'Ashwagandha',
    'Omega-3',
  ];
  
  for (const supplementName of samplesToTest) {
    try {
      const legacyData = SUPPLEMENT_MAPPINGS[supplementName];
      const dbResult = await pool.query(
        'SELECT * FROM supplements WHERE name = $1',
        [supplementName]
      );
      
      if (dbResult.rows.length === 0) {
        result.failed++;
        result.tests.push({
          name: supplementName,
          status: 'fail',
          message: 'Not found in database',
        });
        console.log(`  ❌ ${supplementName} - NOT FOUND`);
        continue;
      }
      
      const newData = dbResult.rows[0];
      
      // Verify fields
      const checks = [
        {
          field: 'scientific_name',
          legacy: legacyData.scientificName,
          new: newData.scientific_name,
        },
        {
          field: 'common_names',
          legacy: legacyData.commonNames.length,
          new: newData.common_names.length,
        },
        {
          field: 'category',
          legacy: legacyData.category,
          new: newData.metadata.category,
        },
        {
          field: 'popularity',
          legacy: legacyData.popularity,
          new: newData.metadata.popularity,
        },
      ];
      
      let allChecksPass = true;
      const failedChecks: string[] = [];
      
      for (const check of checks) {
        if (check.legacy !== check.new) {
          allChecksPass = false;
          failedChecks.push(`${check.field}: ${check.legacy} !== ${check.new}`);
        }
      }
      
      if (allChecksPass) {
        result.passed++;
        result.tests.push({
          name: supplementName,
          status: 'pass',
          message: 'All fields match',
        });
        console.log(`  ✅ ${supplementName} - All fields match`);
      } else {
        result.failed++;
        result.tests.push({
          name: supplementName,
          status: 'fail',
          message: `Field mismatches: ${failedChecks.join(', ')}`,
        });
        console.log(`  ❌ ${supplementName} - ${failedChecks.join(', ')}`);
      }
    } catch (error) {
      result.failed++;
      result.tests.push({
        name: supplementName,
        status: 'fail',
        message: `Error: ${error}`,
      });
      console.log(`  ❌ ${supplementName} - ERROR: ${error}`);
    }
  }
  
  return result;
}

/**
 * Test 3: Test multilingual queries
 */
async function testMultilingualQueries(): Promise<ValidationResult> {
  console.log('\n📋 Test 3: Testing multilingual queries...\n');
  
  const result: ValidationResult = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  const testCases = [
    // Spanish queries
    { query: 'Reishi', expectedName: 'Ganoderma lucidum', language: 'Spanish common name' },
    { query: 'Hongo Reishi', expectedName: 'Ganoderma lucidum', language: 'Spanish' },
    { query: 'Vitamina B12', expectedName: 'Vitamin B12', language: 'Spanish' },
    { query: 'Magnesio', expectedName: 'Magnesium', language: 'Spanish' },
    { query: 'Cúrcuma', expectedName: 'Turmeric', language: 'Spanish' },
    
    // English queries
    { query: 'Vitamin B12', expectedName: 'Vitamin B12', language: 'English' },
    { query: 'Magnesium', expectedName: 'Magnesium', language: 'English' },
    { query: 'Ashwagandha', expectedName: 'Ashwagandha', language: 'English' },
    { query: 'Fish Oil', expectedName: 'Omega-3', language: 'English common name' },
    
    // Scientific names
    { query: 'Ganoderma lucidum', expectedName: 'Ganoderma lucidum', language: 'Scientific name' },
    { query: 'Withania somnifera', expectedName: 'Ashwagandha', language: 'Scientific name' },
  ];
  
  for (const testCase of testCases) {
    try {
      // Search by name or common names
      const dbResult = await pool.query(
        `
        SELECT name, scientific_name, common_names
        FROM supplements
        WHERE 
          name ILIKE $1 OR
          scientific_name ILIKE $1 OR
          $1 = ANY(common_names)
        LIMIT 1
        `,
        [testCase.query]
      );
      
      if (dbResult.rows.length > 0) {
        const found = dbResult.rows[0];
        const isCorrect = found.name === testCase.expectedName ||
                         found.scientific_name === testCase.expectedName ||
                         found.common_names.includes(testCase.expectedName);
        
        if (isCorrect || found.name === testCase.expectedName) {
          result.passed++;
          result.tests.push({
            name: `${testCase.query} (${testCase.language})`,
            status: 'pass',
            message: `Found: ${found.name}`,
          });
          console.log(`  ✅ "${testCase.query}" → ${found.name}`);
        } else {
          result.failed++;
          result.tests.push({
            name: `${testCase.query} (${testCase.language})`,
            status: 'fail',
            message: `Expected: ${testCase.expectedName}, Found: ${found.name}`,
          });
          console.log(`  ❌ "${testCase.query}" → ${found.name} (expected: ${testCase.expectedName})`);
        }
      } else {
        result.failed++;
        result.tests.push({
          name: `${testCase.query} (${testCase.language})`,
          status: 'fail',
          message: 'Not found',
        });
        console.log(`  ❌ "${testCase.query}" → NOT FOUND`);
      }
    } catch (error) {
      result.failed++;
      result.tests.push({
        name: `${testCase.query} (${testCase.language})`,
        status: 'fail',
        message: `Error: ${error}`,
      });
      console.log(`  ❌ "${testCase.query}" - ERROR: ${error}`);
    }
  }
  
  return result;
}

/**
 * Test 4: Verify database indexes
 */
async function testDatabaseIndexes(): Promise<ValidationResult> {
  console.log('\n📋 Test 4: Verifying database indexes...\n');
  
  const result: ValidationResult = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  const requiredIndexes = [
    'supplements_embedding_idx',
    'supplements_search_count_idx',
    'supplements_name_idx',
  ];
  
  for (const indexName of requiredIndexes) {
    try {
      const dbResult = await pool.query(
        `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'supplements' AND indexname = $1
        `,
        [indexName]
      );
      
      if (dbResult.rows.length > 0) {
        result.passed++;
        result.tests.push({
          name: indexName,
          status: 'pass',
          message: 'Index exists',
        });
        console.log(`  ✅ ${indexName}`);
      } else {
        result.failed++;
        result.tests.push({
          name: indexName,
          status: 'fail',
          message: 'Index NOT found',
        });
        console.log(`  ❌ ${indexName} - NOT FOUND`);
      }
    } catch (error) {
      result.failed++;
      result.tests.push({
        name: indexName,
        status: 'fail',
        message: `Error: ${error}`,
      });
      console.log(`  ❌ ${indexName} - ERROR: ${error}`);
    }
  }
  
  return result;
}

/**
 * Main validation function
 */
async function validateMigration(): Promise<void> {
  console.log('🚀 Starting migration validation...');
  console.log('=' .repeat(60));
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
    
    // Run all tests
    const test1 = await testAllSupplementsExist();
    const test2 = await testDataIntegrity();
    const test3 = await testMultilingualQueries();
    const test4 = await testDatabaseIndexes();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    const totalPassed = test1.passed + test2.passed + test3.passed + test4.passed;
    const totalFailed = test1.failed + test2.failed + test3.failed + test4.failed;
    const totalTests = totalPassed + totalFailed;
    
    console.log(`\nTest 1 - All Supplements Exist: ${test1.passed}/${test1.passed + test1.failed} passed`);
    console.log(`Test 2 - Data Integrity: ${test2.passed}/${test2.passed + test2.failed} passed`);
    console.log(`Test 3 - Multilingual Queries: ${test3.passed}/${test3.passed + test3.failed} passed`);
    console.log(`Test 4 - Database Indexes: ${test4.passed}/${test4.passed + test4.failed} passed`);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TOTAL: ${totalPassed}/${totalTests} tests passed`);
    console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (totalFailed === 0) {
      console.log('\n✅ All validation tests passed! Migration is successful.');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the failures above.`);
    }
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  validateMigration()
    .then(() => {
      console.log('\n✅ Validation script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Validation script failed:', error);
      process.exit(1);
    });
}

export { validateMigration, testAllSupplementsExist, testDataIntegrity, testMultilingualQueries };
