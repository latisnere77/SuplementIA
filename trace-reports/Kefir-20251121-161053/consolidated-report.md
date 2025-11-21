# Full Flow Trace Report

**Search Term:** Kefir
**Generated:** 2025-11-21T22:10:56Z
**Time Range:** Last 24 hours

## Overview

This report consolidates traces from both CloudWatch Logs and AWS X-Ray to provide a complete view of the request flow.

## Reports


## How to Use This Report

1. **Start with CloudWatch Logs**: Review the CloudWatch report to see detailed logs from each Lambda function
2. **Check X-Ray Traces**: Review the X-Ray report to see the service map and timing information
3. **Look for Errors**: Both reports highlight errors - check the Errors sections
4. **Timeline Analysis**: Use the timeline sections to understand the flow and identify bottlenecks

## Common Issues

### No Studies Found
- Check if the query was translated correctly (e.g., "jengibre" → "ginger")
- Verify PubMed search filters in CloudWatch logs
- Check if all 3 search attempts (strict/relaxed/ultra-relaxed) failed

### No Real Data
- Verify that studies were found (check  in logs)
- Check if content-enricher received the studies
- Verify  flag in metadata

### Timeouts
- Check X-Ray traces for slow segments
- Look for Bedrock API calls taking too long
- Verify Lambda timeout settings

## Next Steps

If you found an issue:
1. Note the requestId or correlationId from the reports
2. Use these IDs to search for more specific traces
3. Check AWS Console for additional details:
   - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
   - X-Ray: https://console.aws.amazon.com/xray/home?region=us-east-1#/traces

