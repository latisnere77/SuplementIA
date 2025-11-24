/**
 * X-Ray Trace Tracer
 * 
 * Queries AWS X-Ray to trace a specific search query through the system.
 * 
 * Usage:
 *   npx tsx scripts/trace-search-xray.ts "jengibre"
 *   npx tsx scripts/trace-search-xray.ts --requestId "abc-123"
 *   npx tsx scripts/trace-search-xray.ts "jengibre" --hours 24
 */

import { XRayClient, GetTraceSummariesCommand, BatchGetTracesCommand } from '@aws-sdk/client-xray';
import * as fs from 'fs';
import * as path from 'path';

interface TraceSegment {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  annotations?: Record<string, any>;
  metadata?: Record<string, any>;
  subsegments?: TraceSegment[];
  error?: boolean;
  fault?: boolean;
  http?: {
    request?: {
      url?: string;
      method?: string;
    };
    response?: {
      status?: number;
    };
  };
}

interface TraceDocument {
  TraceId: string;
  Segments: TraceSegment[];
}

interface TraceSummary {
  traceId: string;
  duration: number;
  startTime: number;
  endTime: number;
  segments: TraceSegment[];
  modules: string[];
  supplementName?: string;
  requestId?: string;
  correlationId?: string;
  studiesFound?: number;
  hasRealData?: boolean;
  errors: Array<{
    segment: string;
    message: string;
    timestamp: number;
  }>;
}

function flattenSegments(segments: TraceSegment[]): TraceSegment[] {
  const flattened: TraceSegment[] = [];
  
  for (const segment of segments) {
    flattened.push(segment);
    if (segment.subsegments) {
      flattened.push(...flattenSegments(segment.subsegments));
    }
  }
  
  return flattened;
}

function extractTraceInfo(trace: TraceDocument): TraceSummary {
  const summary: TraceSummary = {
    traceId: trace.TraceId,
    duration: 0,
    startTime: Infinity,
    endTime: 0,
    segments: [],
    modules: [],
    errors: [],
  };

  const allSegments = flattenSegments(trace.Segments);

  for (const segment of allSegments) {
    summary.segments.push(segment);

    // Update time range
    if (segment.startTime < summary.startTime) {
      summary.startTime = segment.startTime;
    }
    if (segment.endTime && segment.endTime > summary.endTime) {
      summary.endTime = segment.endTime;
    }

    // Extract annotations
    if (segment.annotations) {
      if (segment.annotations.module && !summary.modules.includes(segment.annotations.module)) {
        summary.modules.push(segment.annotations.module);
      }
      if (segment.annotations.supplementName && !summary.supplementName) {
        summary.supplementName = segment.annotations.supplementName;
      }
      if (segment.annotations.requestId && !summary.requestId) {
        summary.requestId = segment.annotations.requestId;
      }
      if (segment.annotations.correlationId && !summary.correlationId) {
        summary.correlationId = segment.annotations.correlationId;
      }
      if (segment.annotations.studiesFound !== undefined) {
        summary.studiesFound = segment.annotations.studiesFound;
      }
      if (segment.annotations.hasRealData !== undefined) {
        summary.hasRealData = segment.annotations.hasRealData;
      }
    }

    // Track errors
    if (segment.error || segment.fault) {
      summary.errors.push({
        segment: segment.name,
        message: segment.annotations?.error || 'Unknown error',
        timestamp: segment.startTime,
      });
    }
  }

  summary.duration = summary.endTime - summary.startTime;

  return summary;
}

function generateMarkdownReport(summaries: TraceSummary[], searchTerm: string): string {
  const lines: string[] = [];

  lines.push('# X-Ray Trace Report');
  lines.push('');
  lines.push(`**Search Term:** ${searchTerm}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Traces Found:** ${summaries.length}`);
  lines.push('');

  for (const summary of summaries) {
    lines.push(`## Trace ${summary.traceId.substring(0, 16)}...`);
    lines.push('');
    
    if (summary.supplementName) {
      lines.push(`**Supplement Name:** ${summary.supplementName}`);
    }
    if (summary.requestId) {
      lines.push(`**Request ID:** ${summary.requestId}`);
    }
    if (summary.correlationId) {
      lines.push(`**Correlation ID:** ${summary.correlationId}`);
    }
    if (summary.modules.length > 0) {
      lines.push(`**Modules:** ${summary.modules.join(', ')}`);
    }
    if (summary.studiesFound !== undefined) {
      lines.push(`**Studies Found:** ${summary.studiesFound}`);
    }
    if (summary.hasRealData !== undefined) {
      lines.push(`**Has Real Data:** ${summary.hasRealData ? '✅ Yes' : '❌ No'}`);
    }
    lines.push(`**Duration:** ${(summary.duration / 1000).toFixed(2)}s`);
    lines.push(`**Start Time:** ${new Date(summary.startTime).toISOString()}`);
    lines.push('');

    // Timeline
    lines.push('### Timeline');
    lines.push('');
    lines.push('| Segment | Duration (ms) | Annotations |');
    lines.push('|---------|---------------|-------------|');

    const sortedSegments = [...summary.segments].sort((a, b) => a.startTime - b.startTime);
    for (const segment of sortedSegments) {
      const duration = segment.duration || (segment.endTime ? segment.endTime - segment.startTime : 0);
      const annotations = segment.annotations ? JSON.stringify(segment.annotations).substring(0, 100) : 'N/A';
      lines.push(`| ${segment.name} | ${duration.toFixed(2)} | ${annotations}... |`);
    }
    lines.push('');

    // Errors
    if (summary.errors.length > 0) {
      lines.push('### Errors');
      lines.push('');
      for (const error of summary.errors) {
        const timestamp = new Date(error.timestamp).toISOString();
        lines.push(`- **${error.segment}** (${timestamp}): ${error.message}`);
      }
      lines.push('');
    }

    // Service Map
    lines.push('### Service Map');
    lines.push('');
    lines.push('```');
    for (const module of summary.modules) {
      lines.push(`  ${module}`);
      const moduleSegments = summary.segments.filter(s => 
        s.annotations?.module === module
      );
      for (const seg of moduleSegments) {
        const duration = seg.duration || (seg.endTime ? seg.endTime - seg.startTime : 0);
        lines.push(`    └─ ${seg.name} (${duration.toFixed(2)}ms)`);
      }
    }
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

async function queryXRayTraces(
  client: XRayClient,
  filterExpression: string,
  startTime: number,
  endTime: number
): Promise<string[]> {
  try {
    const command = new GetTraceSummariesCommand({
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
      FilterExpression: filterExpression,
      MaxResults: 100,
    });

    const response = await client.send(command);
    const traceIds: string[] = [];

    if (response.TraceSummaries) {
      for (const summary of response.TraceSummaries) {
        if (summary.Id) {
          traceIds.push(summary.Id);
        }
      }
    }

    return traceIds;
  } catch (error: any) {
    console.error(`Error querying X-Ray:`, error.message);
    return [];
  }
}

async function getTraceDetails(client: XRayClient, traceIds: string[]): Promise<TraceDocument[]> {
  if (traceIds.length === 0) return [];

  try {
    const command = new BatchGetTracesCommand({
      TraceIds: traceIds,
    });

    const response = await client.send(command);
    const traces: TraceDocument[] = [];

    if (response.Traces) {
      for (const trace of response.Traces) {
        if (trace.Id && trace.Segments) {
          const segments: TraceSegment[] = [];
          
          for (const segmentDoc of trace.Segments) {
            try {
              const segment = JSON.parse(segmentDoc.Document || '{}');
              segments.push(segment);
            } catch {
              // Skip invalid segments
            }
          }

          traces.push({
            TraceId: trace.Id,
            Segments: segments,
          });
        }
      }
    }

    return traces;
  } catch (error: any) {
    console.error(`Error getting trace details:`, error.message);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  let searchTerm: string | undefined;
  let requestId: string | undefined;
  let hours = 24;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--requestId' && args[i + 1]) {
      requestId = args[i + 1];
      i++;
    } else if (args[i] === '--hours' && args[i + 1]) {
      hours = parseInt(args[i + 1], 10);
      i++;
    } else if (!searchTerm && !args[i].startsWith('--')) {
      searchTerm = args[i];
    }
  }

  if (!searchTerm && !requestId) {
    console.error('Usage: npx tsx scripts/trace-search-xray.ts <searchTerm> [--requestId <id>] [--hours <hours>]');
    process.exit(1);
  }

  const client = new XRayClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const endTime = Date.now();
  const startTime = endTime - (hours * 60 * 60 * 1000);

  console.log(`Searching X-Ray traces...`);
  console.log(`Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  console.log(`Search term: ${searchTerm || 'N/A'}`);
  console.log(`Request ID: ${requestId || 'N/A'}`);
  console.log('');

  // Build filter expression
  let filterExpression = '';
  if (requestId) {
    filterExpression = `annotation.requestId = "${requestId}" OR annotation.correlationId = "${requestId}"`;
  } else if (searchTerm) {
    const lowerTerm = searchTerm.toLowerCase();
    filterExpression = `annotation.supplementName = "${searchTerm}" OR annotation.supplementName = "${lowerTerm}" OR annotation.searchQuery = "${searchTerm}" OR annotation.searchQuery = "${lowerTerm}"`;
  }

  console.log(`Filter expression: ${filterExpression}`);
  console.log('');

  // Query trace summaries
  const traceIds = await queryXRayTraces(client, filterExpression, startTime, endTime);
  console.log(`Found ${traceIds.length} trace(s)`);

  if (traceIds.length === 0) {
    console.log('No traces found. Try:');
    console.log('  - Expanding the time range with --hours 48');
    console.log('  - Using a different search term');
    console.log('  - Using --requestId if you have one');
    process.exit(0);
  }

  // Get trace details
  console.log('Fetching trace details...');
  const traces = await getTraceDetails(client, traceIds);
  console.log(`Retrieved ${traces.length} trace detail(s)`);
  console.log('');

  // Extract trace information
  const summaries: TraceSummary[] = [];
  for (const trace of traces) {
    summaries.push(extractTraceInfo(trace));
  }

  // Generate report
  const report = generateMarkdownReport(summaries, searchTerm || requestId || 'unknown');

  // Save report
  const reportPath = path.join(process.cwd(), `xray-trace-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Report saved to: ${reportPath}`);

  // Print summary
  console.log('');
  console.log('=== Summary ===');
  for (const summary of summaries) {
    console.log(`Trace: ${summary.traceId.substring(0, 16)}...`);
    if (summary.supplementName) console.log(`  Supplement: ${summary.supplementName}`);
    if (summary.modules.length > 0) console.log(`  Modules: ${summary.modules.join(', ')}`);
    if (summary.studiesFound !== undefined) console.log(`  Studies Found: ${summary.studiesFound}`);
    if (summary.hasRealData !== undefined) console.log(`  Has Real Data: ${summary.hasRealData ? 'Yes' : 'No'}`);
    console.log(`  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log(`  Errors: ${summary.errors.length}`);
    console.log('');
  }
}

main().catch(console.error);

