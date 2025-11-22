/**
 * Status API Route
 * Check if enrichment is complete for a given job
 */

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CACHE_TABLE = 'suplementia-content-enricher-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  const supplementName = request.nextUrl.searchParams.get('supplement');

  console.log(`🔍 Status check - Job ID: ${jobId}, Supplement: ${supplementName}`);

  if (!supplementName) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing supplement parameter',
      },
      { status: 400 }
    );
  }

  try {
    // Check if result is in cache
    const result = await docClient.send(
      new GetCommand({
        TableName: CACHE_TABLE,
        Key: { supplementId: supplementName },
      })
    );

    if (result.Item) {
      console.log(`✅ Cache hit for ${supplementName} - Job ${jobId}`);
      
      // Return the cached enrichment data
      return NextResponse.json({
        success: true,
        status: 'completed',
        jobId,
        supplement: supplementName,
        data: result.Item.enrichedData,
        metadata: {
          cachedAt: result.Item.createdAt,
          ttl: result.Item.ttl,
        },
      });
    }

    // Not in cache yet - still processing
    console.log(`⏳ Still processing ${supplementName} - Job ${jobId}`);
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      supplement: supplementName,
      message: 'Enrichment in progress',
    });
  } catch (error: any) {
    console.error(`❌ Status check error - Job ${jobId}:`, error);
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        jobId,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
