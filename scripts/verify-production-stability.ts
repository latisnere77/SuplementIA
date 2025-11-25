#!/usr/bin/env tsx

/**
 * Production Stability Verification Script
 * 
 * This script verifies that the intelligent supplement search system
 * meets all production stability requirements:
 * - Error rate < 1%
 * - Latency P95 < 200ms
 * - Cache hit rate >= 85%
 * - AWS costs within budget ($25/month)
 */

import { CloudWatchClient, GetMetricStatisticsCommand, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { ElastiCacheClient, DescribeCacheClustersCommand } from '@aws-sdk/client-elasticache';

const REGION = process.env.AWS_REGION || 'us-east-1';
const ENVIRONMENT = process.env.ENVIRONMENT || 'production';
const LOOKBACK_HOURS = 24; // Analyze last 24 hours

interface MetricResult {
  name: string;
  value: number | string;
  threshold: number | string;
  passed: boolean;
  severity: 'critical' | 'warning' | 'info';
}

interface StabilityReport {
  timestamp: string;
  environment: string;
  metrics: MetricResult[];
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  recommendations: string[];
}

const cloudwatch = new CloudWatchClient({ region: REGION });
const logs = new CloudWatchLogsClient({ region: REGION });
const dynamodb = new DynamoDBClient({ region: REGION });

async function getMetricStatistics(
  namespace: string,
  metricName: string,
  statistic: string,
  period: number = 300
): Promise<number | null> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  try {
    const command = new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: metricName,
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Statistics: [statistic],
    });

    const response = await cloudwatch.send(command);
    
    if (!response.Datapoints || response.Datapoints.length === 0) {
      return null;
    }

    // Get the most recent datapoint
    const sortedDatapoints = response.Datapoints.sort((a, b) => 
      (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
    );

    const value = sortedDatapoints[0][statistic as keyof typeof sortedDatapoints[0]];
    return typeof value === 'number' ? value : null;
  } catch (error) {
    console.error(`Error fetching metric ${metricName}:`, error);
    return null;
  }
}

async function getExtendedStatistic(
  namespace: string,
  metricName: string,
  extendedStatistic: string,
  period: number = 300
): Promise<number | null> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  try {
    const command = new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: metricName,
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      ExtendedStatistics: [extendedStatistic],
    });

    const response = await cloudwatch.send(command);
    
    if (!response.Datapoints || response.Datapoints.length === 0) {
      return null;
    }

    const sortedDatapoints = response.Datapoints.sort((a, b) => 
      (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
    );

    const value = sortedDatapoints[0].ExtendedStatistics?.[extendedStatistic];
    return typeof value === 'number' ? value : null;
  } catch (error) {
    console.error(`Error fetching extended statistic ${extendedStatistic}:`, error);
    return null;
  }
}

async function checkErrorRate(): Promise<MetricResult> {
  console.log('📊 Checking error rate...');
  
  const errors = await getMetricStatistics('AWS/Lambda', 'Errors', 'Sum');
  const invocations = await getMetricStatistics('AWS/Lambda', 'Invocations', 'Sum');

  if (errors === null || invocations === null || invocations === 0) {
    return {
      name: 'Error Rate',
      value: 'N/A',
      threshold: '< 1%',
      passed: false,
      severity: 'warning',
    };
  }

  const errorRate = (errors / invocations) * 100;
  const passed = errorRate < 1.0;

  return {
    name: 'Error Rate',
    value: `${errorRate.toFixed(2)}%`,
    threshold: '< 1%',
    passed,
    severity: passed ? 'info' : 'critical',
  };
}

async function checkLatency(): Promise<MetricResult[]> {
  console.log('📊 Checking latency metrics...');
  
  const results: MetricResult[] = [];

  // P50 Latency
  const p50 = await getExtendedStatistic('AWS/Lambda', 'Duration', 'p50');
  if (p50 !== null) {
    results.push({
      name: 'P50 Latency',
      value: `${p50.toFixed(2)}ms`,
      threshold: '< 100ms',
      passed: p50 < 100,
      severity: 'info',
    });
  }

  // P95 Latency (Critical)
  const p95 = await getExtendedStatistic('AWS/Lambda', 'Duration', 'p95');
  if (p95 !== null) {
    const passed = p95 < 200;
    results.push({
      name: 'P95 Latency',
      value: `${p95.toFixed(2)}ms`,
      threshold: '< 200ms',
      passed,
      severity: passed ? 'info' : 'critical',
    });
  } else {
    results.push({
      name: 'P95 Latency',
      value: 'N/A',
      threshold: '< 200ms',
      passed: false,
      severity: 'warning',
    });
  }

  // P99 Latency
  const p99 = await getExtendedStatistic('AWS/Lambda', 'Duration', 'p99');
  if (p99 !== null) {
    results.push({
      name: 'P99 Latency',
      value: `${p99.toFixed(2)}ms`,
      threshold: '< 300ms',
      passed: p99 < 300,
      severity: 'info',
    });
  }

  return results;
}

async function checkCacheHitRate(): Promise<MetricResult> {
  console.log('📊 Checking cache hit rate...');
  
  // Try to get custom metric first
  let cacheHitRate = await getMetricStatistics('IntelligentSearch', 'CacheHitRate', 'Average');

  // If custom metric not available, calculate from logs
  if (cacheHitRate === null) {
    console.log('   Custom metric not found, analyzing logs...');
    cacheHitRate = await calculateCacheHitRateFromLogs();
  }

  if (cacheHitRate === null) {
    return {
      name: 'Cache Hit Rate',
      value: 'N/A',
      threshold: '>= 85%',
      passed: false,
      severity: 'warning',
    };
  }

  const passed = cacheHitRate >= 85;

  return {
    name: 'Cache Hit Rate',
    value: `${cacheHitRate.toFixed(2)}%`,
    threshold: '>= 85%',
    passed,
    severity: passed ? 'info' : 'critical',
  };
}

async function calculateCacheHitRateFromLogs(): Promise<number | null> {
  try {
    const endTime = Date.now();
    const startTime = endTime - (LOOKBACK_HOURS * 60 * 60 * 1000);

    const command = new FilterLogEventsCommand({
      logGroupName: `/aws/lambda/${ENVIRONMENT}-search-api`,
      startTime,
      endTime,
      filterPattern: '"cache_hit" OR "cache_miss"',
      limit: 1000,
    });

    const response = await logs.send(command);
    
    if (!response.events || response.events.length === 0) {
      return null;
    }

    let hits = 0;
    let misses = 0;

    for (const event of response.events) {
      if (event.message?.includes('cache_hit')) hits++;
      if (event.message?.includes('cache_miss')) misses++;
    }

    const total = hits + misses;
    if (total === 0) return null;

    return (hits / total) * 100;
  } catch (error) {
    console.error('Error calculating cache hit rate from logs:', error);
    return null;
  }
}

async function estimateMonthlyCosts(): Promise<MetricResult> {
  console.log('📊 Estimating monthly AWS costs...');
  
  try {
    // Get Lambda invocations
    const invocations = await getMetricStatistics('AWS/Lambda', 'Invocations', 'Sum');
    const avgDuration = await getMetricStatistics('AWS/Lambda', 'Duration', 'Average');

    // Estimate costs based on usage
    let estimatedCost = 0;

    // Lambda costs (free tier: 1M requests, 400K GB-seconds)
    if (invocations && avgDuration) {
      const monthlyInvocations = (invocations / LOOKBACK_HOURS) * 24 * 30;
      const gbSeconds = (monthlyInvocations * avgDuration * 0.512) / 1000; // Assuming 512MB memory
      
      // After free tier
      const billableInvocations = Math.max(0, monthlyInvocations - 1000000);
      const billableGBSeconds = Math.max(0, gbSeconds - 400000);
      
      estimatedCost += (billableInvocations * 0.0000002); // $0.20 per 1M requests
      estimatedCost += (billableGBSeconds * 0.0000166667); // $0.0000166667 per GB-second
    }

    // DynamoDB costs (estimate based on typical usage)
    estimatedCost += 5; // Base cost for tables

    // ElastiCache Redis (cache.t3.micro)
    estimatedCost += 12;

    // RDS Postgres (db.t3.micro - free tier first 12 months)
    // estimatedCost += 0; // Free tier

    // EFS (1GB)
    estimatedCost += 1;

    // CloudFront
    estimatedCost += 3;

    const passed = estimatedCost <= 25;

    return {
      name: 'Estimated Monthly Cost',
      value: `$${estimatedCost.toFixed(2)}`,
      threshold: '<= $25',
      passed,
      severity: passed ? 'info' : 'warning',
    };
  } catch (error) {
    console.error('Error estimating costs:', error);
    return {
      name: 'Estimated Monthly Cost',
      value: 'N/A',
      threshold: '<= $25',
      passed: false,
      severity: 'warning',
    };
  }
}

async function checkActiveAlarms(): Promise<MetricResult> {
  console.log('📊 Checking active alarms...');
  
  try {
    const command = new DescribeAlarmsCommand({
      StateValue: 'ALARM',
      AlarmNamePrefix: ENVIRONMENT,
    });

    const response = await cloudwatch.send(command);
    const alarmCount = response.MetricAlarms?.length || 0;

    return {
      name: 'Active Alarms',
      value: alarmCount.toString(),
      threshold: '0',
      passed: alarmCount === 0,
      severity: alarmCount > 0 ? 'critical' : 'info',
    };
  } catch (error) {
    console.error('Error checking alarms:', error);
    return {
      name: 'Active Alarms',
      value: 'N/A',
      threshold: '0',
      passed: false,
      severity: 'warning',
    };
  }
}

async function runAllTests(): Promise<StabilityReport> {
  console.log('🔍 Starting Production Stability Verification');
  console.log('='.repeat(60));
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Region: ${REGION}`);
  console.log(`Analysis Period: Last ${LOOKBACK_HOURS} hours`);
  console.log('='.repeat(60));
  console.log('');

  const metrics: MetricResult[] = [];

  // Run all checks
  metrics.push(await checkErrorRate());
  metrics.push(...await checkLatency());
  metrics.push(await checkCacheHitRate());
  metrics.push(await estimateMonthlyCosts());
  metrics.push(await checkActiveAlarms());

  // Determine overall status
  const criticalFailures = metrics.filter(m => !m.passed && m.severity === 'critical');
  const warnings = metrics.filter(m => !m.passed && m.severity === 'warning');
  
  let overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  if (criticalFailures.length > 0) {
    overallStatus = 'FAIL';
  } else if (warnings.length > 0) {
    overallStatus = 'WARNING';
  } else {
    overallStatus = 'PASS';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  for (const metric of metrics) {
    if (!metric.passed) {
      if (metric.name === 'Error Rate') {
        recommendations.push('Investigate error logs to identify and fix recurring issues');
        recommendations.push('Review Lambda function code for error handling improvements');
      } else if (metric.name === 'P95 Latency') {
        recommendations.push('Optimize database queries and add appropriate indexes');
        recommendations.push('Review cache configuration to improve hit rates');
        recommendations.push('Consider increasing Lambda memory allocation');
      } else if (metric.name === 'Cache Hit Rate') {
        recommendations.push('Analyze cache eviction patterns');
        recommendations.push('Increase cache TTL for frequently accessed items');
        recommendations.push('Pre-populate cache with popular supplements');
      } else if (metric.name === 'Estimated Monthly Cost') {
        recommendations.push('Review resource utilization and right-size instances');
        recommendations.push('Implement more aggressive caching to reduce Lambda invocations');
        recommendations.push('Consider reserved capacity for predictable workloads');
      } else if (metric.name === 'Active Alarms') {
        recommendations.push('Review and resolve active CloudWatch alarms');
        recommendations.push('Check alarm history for recurring issues');
      }
    }
  }

  if (overallStatus === 'PASS') {
    recommendations.push('System is stable and meeting all production requirements');
    recommendations.push('Continue monitoring metrics for any degradation');
  }

  return {
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    metrics,
    overallStatus,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
}

function printReport(report: StabilityReport): void {
  console.log('');
  console.log('📊 Production Stability Report');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Environment: ${report.environment}`);
  console.log('');

  console.log('Metrics:');
  console.log('-'.repeat(60));
  
  for (const metric of report.metrics) {
    const icon = metric.passed ? '✅' : (metric.severity === 'critical' ? '❌' : '⚠️');
    const status = metric.passed ? 'PASS' : 'FAIL';
    console.log(`${icon} ${metric.name}: ${metric.value} (threshold: ${metric.threshold}) - ${status}`);
  }

  console.log('');
  console.log('Overall Status:');
  console.log('-'.repeat(60));
  
  if (report.overallStatus === 'PASS') {
    console.log('✅ PASS - All critical metrics within acceptable thresholds');
  } else if (report.overallStatus === 'WARNING') {
    console.log('⚠️  WARNING - Some non-critical metrics need attention');
  } else {
    console.log('❌ FAIL - Critical metrics outside acceptable thresholds');
  }

  if (report.recommendations.length > 0) {
    console.log('');
    console.log('Recommendations:');
    console.log('-'.repeat(60));
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log('');
  console.log('='.repeat(60));
}

// Main execution
async function main() {
  try {
    const report = await runAllTests();
    printReport(report);

    // Write report to file
    const fs = await import('fs/promises');
    const reportPath = `./production-stability-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(report.overallStatus === 'FAIL' ? 1 : 0);
  } catch (error) {
    console.error('❌ Error running stability verification:', error);
    process.exit(1);
  }
}

main();
