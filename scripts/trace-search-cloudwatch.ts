/**
 * CloudWatch Logs Tracer
 * 
 * Queries CloudWatch Logs to trace a specific search query through the system.
 * 
 * Usage:
 *   npx tsx scripts/trace-search-cloudwatch.ts "jengibre"
 *   npx tsx scripts/trace-search-cloudwatch.ts --requestId "abc-123"
 *   npx tsx scripts/trace-search-cloudwatch.ts "jengibre" --hours 48
 */

import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import * as fs from 'fs';
import * as path from 'path';

interface LogEvent {
  timestamp: number;
  message: string;
  logStream: string;
  parsed?: any;
}

interface TraceSummary {
  supplementName?: string;
  requestId?: string;
  correlationId?: string;
  originalQuery?: string;
  translatedQuery?: string;
  events: LogEvent[];
  timeline: Array<{
    timestamp: number;
    event: string;
    details: any;
  }>;
  errors: Array<{
    timestamp: number;
    event: string;
    error: string;
  }>;
  studiesFound?: number;
  hasRealData?: boolean;
}

// Log groups to search
const LOG_GROUPS = [
  '/aws/lambda/suplementia-studies-fetcher-dev',
  '/aws/lambda/suplementia-studies-fetcher-staging',
  '/aws/lambda/suplementia-studies-fetcher-prod',
  '/aws/lambda/suplementia-content-enricher-dev',
  '/aws/lambda/suplementia-content-enricher-staging',
  '/aws/lambda/suplementia-content-enricher-production',
];

async function queryCloudWatchLogs(
  client: CloudWatchLogsClient,
  logGroupName: string,
  filterPattern: string,
  startTime: number,
  endTime: number
): Promise<LogEvent[]> {
  try {
    const command = new FilterLogEventsCommand({
      logGroupName,
      filterPattern,
      startTime,
      endTime,
      limit: 1000,
    });

    const response = await client.send(command);
    const events: LogEvent[] = [];

    if (response.events) {
      for (const event of response.events) {
        if (event.message) {
          try {
            const parsed = JSON.parse(event.message);
            events.push({
              timestamp: event.timestamp || 0,
              message: event.message,
              logStream: event.logStreamName || 'unknown',
              parsed,
            });
          } catch {
            // Not JSON, keep as plain message
            events.push({
              timestamp: event.timestamp || 0,
              message: event.message,
              logStream: event.logStreamName || 'unknown',
            });
          }
        }
      }
    }

    return events;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      // Log group doesn't exist, skip it
      return [];
    }
    console.error(`Error querying ${logGroupName}:`, error.message);
    return [];
  }
}

function extractTraceInfo(events: LogEvent[]): TraceSummary {
  const summary: TraceSummary = {
    events: [],
    timeline: [],
    errors: [],
  };

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sortedEvents) {
    summary.events.push(event);

    if (event.parsed) {
      const parsed = event.parsed;

      // Extract key information
      if (parsed.event) {
        summary.timeline.push({
          timestamp: event.timestamp,
          event: parsed.event,
          details: parsed,
        });

        // Extract supplement name
        if (parsed.supplementName && !summary.supplementName) {
          summary.supplementName = parsed.supplementName;
        }
        if (parsed.originalQuery && !summary.originalQuery) {
          summary.originalQuery = parsed.originalQuery;
        }
        if (parsed.translatedQuery && !summary.translatedQuery) {
          summary.translatedQuery = parsed.translatedQuery;
        }
        if (parsed.requestId && !summary.requestId) {
          summary.requestId = parsed.requestId;
        }
        if (parsed.correlationId && !summary.correlationId) {
          summary.correlationId = parsed.correlationId;
        }
        if (parsed.studiesFound !== undefined) {
          summary.studiesFound = parsed.studiesFound;
        }
        if (parsed.hasRealData !== undefined) {
          summary.hasRealData = parsed.hasRealData;
        }

        // Track errors
        if (parsed.event.includes('ERROR') || parsed.event.includes('FAILED')) {
          summary.errors.push({
            timestamp: event.timestamp,
            event: parsed.event,
            error: parsed.error || parsed.message || 'Unknown error',
          });
        }
      }
    }
  }

  return summary;
}

function generateMarkdownReport(summary: TraceSummary, searchTerm: string): string {
  const lines: string[] = [];

  lines.push('# CloudWatch Logs Trace Report');
  lines.push('');
  lines.push(`**Search Term:** ${searchTerm}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  if (summary.supplementName) {
    lines.push(`**Supplement Name:** ${summary.supplementName}`);
  }
  if (summary.originalQuery) {
    lines.push(`**Original Query:** ${summary.originalQuery}`);
  }
  if (summary.translatedQuery) {
    lines.push(`**Translated Query:** ${summary.translatedQuery}`);
  }
  if (summary.requestId) {
    lines.push(`**Request ID:** ${summary.requestId}`);
  }
  if (summary.correlationId) {
    lines.push(`**Correlation ID:** ${summary.correlationId}`);
  }
  if (summary.studiesFound !== undefined) {
    lines.push(`**Studies Found:** ${summary.studiesFound}`);
  }
  if (summary.hasRealData !== undefined) {
    lines.push(`**Has Real Data:** ${summary.hasRealData ? '✅ Yes' : '❌ No'}`);
  }
  lines.push('');

  // Timeline
  lines.push('## Timeline');
  lines.push('');
  lines.push('| Timestamp | Event | Details |');
  lines.push('|-----------|-------|---------|');

  for (const item of summary.timeline) {
    const timestamp = new Date(item.timestamp).toISOString();
    const event = item.event;
    const details = JSON.stringify(item.details, null, 2).substring(0, 100).replace(/\n/g, ' ');
    lines.push(`| ${timestamp} | ${event} | ${details}... |`);
  }
  lines.push('');

  // Errors
  if (summary.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of summary.errors) {
      const timestamp = new Date(error.timestamp).toISOString();
      lines.push(`### ${error.event} (${timestamp})`);
      lines.push('');
      lines.push(`**Error:** ${error.error}`);
      lines.push('');
    }
  } else {
    lines.push('## Errors');
    lines.push('');
    lines.push('✅ No errors found');
    lines.push('');
  }

  // Raw Events
  lines.push('## Raw Events');
  lines.push('');
  lines.push(`Total events: ${summary.events.length}`);
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(summary.events.slice(0, 50), null, 2)); // First 50 events
  lines.push('```');

  return lines.join('\n');
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
    console.error('Usage: npx tsx scripts/trace-search-cloudwatch.ts <searchTerm> [--requestId <id>] [--hours <hours>]');
    process.exit(1);
  }

  const client = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const endTime = Date.now();
  const startTime = endTime - (hours * 60 * 60 * 1000);

  console.log(`Searching CloudWatch Logs...`);
  console.log(`Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  console.log(`Search term: ${searchTerm || 'N/A'}`);
  console.log(`Request ID: ${requestId || 'N/A'}`);
  console.log('');

  // Build filter pattern
  let filterPattern = '';
  if (requestId) {
    filterPattern = `"${requestId}"`;
  } else if (searchTerm) {
    // Search for the term in various fields
    const lowerTerm = searchTerm.toLowerCase();
    filterPattern = `"${searchTerm}" OR "${lowerTerm}"`;
  }

  const allEvents: LogEvent[] = [];

  // Query each log group
  for (const logGroup of LOG_GROUPS) {
    console.log(`Querying ${logGroup}...`);
    const events = await queryCloudWatchLogs(client, logGroup, filterPattern, startTime, endTime);
    allEvents.push(...events);
    console.log(`  Found ${events.length} events`);
  }

  console.log('');
  console.log(`Total events found: ${allEvents.length}`);

  if (allEvents.length === 0) {
    console.log('No events found. Try:');
    console.log('  - Expanding the time range with --hours 48');
    console.log('  - Using a different search term');
    console.log('  - Using --requestId if you have one');
    process.exit(0);
  }

  // Extract trace information
  const summary = extractTraceInfo(allEvents);

  // Generate report
  const report = generateMarkdownReport(summary, searchTerm || requestId || 'unknown');

  // Save report
  const reportPath = path.join(process.cwd(), `trace-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);
  console.log('');
  console.log(`✅ Report saved to: ${reportPath}`);

  // Print summary
  console.log('');
  console.log('=== Summary ===');
  if (summary.supplementName) console.log(`Supplement: ${summary.supplementName}`);
  if (summary.originalQuery) console.log(`Original Query: ${summary.originalQuery}`);
  if (summary.translatedQuery) console.log(`Translated Query: ${summary.translatedQuery}`);
  if (summary.studiesFound !== undefined) console.log(`Studies Found: ${summary.studiesFound}`);
  if (summary.hasRealData !== undefined) console.log(`Has Real Data: ${summary.hasRealData ? 'Yes' : 'No'}`);
  console.log(`Events: ${summary.events.length}`);
  console.log(`Errors: ${summary.errors.length}`);
}

main().catch(console.error);

