/**
 * Metrics Endpoint
 * Exposes job metrics for monitoring dashboard
 */

import { NextResponse } from 'next/server';
import { jobMetrics } from '@/lib/portal/job-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = jobMetrics.exportMetrics();
    
    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
      },
      { status: 500 }
    );
  }
}
