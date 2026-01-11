/**
 * Metrics API Endpoint
 * Exposes current metrics for monitoring dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring/metrics-collector';

export async function GET(request: NextRequest) {
  try {
    // Get all metrics
    const metrics = metricsCollector.getAllMetrics();

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve metrics',
      },
      { status: 500 }
    );
  }
}

/**
 * Export metrics in CloudWatch format
 */
export async function POST(request: NextRequest) {
  try {
    const cloudwatchMetrics = metricsCollector.exportForCloudWatch();

    return NextResponse.json({
      success: true,
      cloudwatch: cloudwatchMetrics,
    });
  } catch (error) {
    console.error('Failed to export metrics:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export metrics',
      },
      { status: 500 }
    );
  }
}
