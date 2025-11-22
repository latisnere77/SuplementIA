# Requirements: Modern Architecture for SuplementIA

**Feature:** High-Performance Content Enrichment System  
**Status:** 📋 Planning  
**Priority:** 🔴 Critical  
**Owner:** Engineering Team  
**Created:** 2024-11-22

---

## 🎯 Problem Statement

### Current Issues

**AC-1: System Timeout**
- **Given** a user searches for "saw palmetto"
- **When** the system attempts to generate enriched content
- **Then** the request times out after 60 seconds
- **But** the content-enricher Lambda takes 119 seconds to complete
- **Result:** User receives 504 Gateway Timeout error

**AC-2: High Costs**
- **Given** the system processes 1000 requests per day
- **When** using Claude 3.5 Sonnet without caching
- **Then** the monthly cost is $1,500
- **But** 90% of requests are for the same supplements
- **Result:** Unnecessary LLM costs for cached content

**AC-3: Poor User Experience**
- **Given** a user submits a search request
- **When** waiting for results
- **Then** there is no feedback or progress indication
- **And** the wait time is 2+ minutes
- **Result:** User abandons the search

**AC-4: Limited Scalability**
- **Given** the system receives concurrent requests
- **When** each request takes 119 seconds
- **Then** throughput is limited to 0.008 requests/second
- **Result:** System cannot handle growth

---

## 🎯 Goals

### Primary Goals

**G-1: Eliminate Timeouts**
- All requests must complete within 30 seconds
- 95th percentile latency < 10 seconds
- 99th percentile latency < 15 seconds

**G-2: Reduce Costs by 90%+**
- Target: $150/month for 1000 requests/day
- Implement aggressive caching strategy
- Use cost-effective LLM models

**G-3: Improve User Experience**
- Provide immediate feedback (< 1 second)
- Show progress indicators
- Stream results as they become available

**G-4: Increase Scalability**
- Support 10+ concurrent requests
- Handle 10,000+ requests/day
- Auto-scale based on demand

### Secondary Goals

**G-5: Maintain Quality**
- Content quality must match or exceed current system
- Evidence-based recommendations
- Accurate study citations

**G-6: Improve Observability**
- Detailed performance metrics
- Cost tracking per request
- Error rate monitoring

---

## 📋 Functional Requirements

### FR-1: Streaming Response

**FR-1.1: Server-Sent Events (SSE)**
- **Given** a user submits a search request
- **When** the system begins processing
- **Then** the API must return a streaming response using SSE
- **And** send progress updates every 1-2 seconds

**FR-1.2: Progressive Content Delivery**
- **Given** content is being generated
- **When** each section completes
- **Then** stream that section to the client immediately
- **And** allow user to start reading while generation continues

**FR-1.3: Error Handling in Streams**
- **Given** an error occurs during streaming
- **When** the error is detected
- **Then** send an error event to the client
- **And** close the stream gracefully

### FR-2: Multi-Layer Caching

**FR-2.1: DynamoDB Cache**
- **Given** a supplement has been enriched before
- **When** a user searches for it again
- **Then** return cached content from DynamoDB
- **And** complete the request in < 100ms

**FR-2.2: Cache Invalidation**
- **Given** cached content exists
- **When** TTL expires (7 days)
- **Then** regenerate content on next request
- **And** update cache with fresh data

**FR-2.3: Cache Warming**
- **Given** a list of popular supplements
- **When** cache is empty or expired
- **Then** proactively generate and cache content
- **And** ensure high cache hit rate

### FR-3: Two-Stage LLM Pipeline

**FR-3.1: Study Summarization**
- **Given** 10 full PubMed studies
- **When** preparing for content generation
- **Then** summarize each study to 2-3 sentences using Claude Haiku
- **And** reduce total tokens by 60%

**FR-3.2: Content Generation**
- **Given** summarized studies
- **When** generating enriched content
- **Then** use Claude Haiku with prompt caching
- **And** complete generation in < 5 seconds

**FR-3.3: Quality Validation**
- **Given** generated content
- **When** validating output
- **Then** ensure all required fields are present
- **And** verify study citations are accurate

### FR-4: Parallel Processing

**FR-4.1: Concurrent Study Fetching**
- **Given** multiple search terms (original + alternatives)
- **When** fetching studies
- **Then** execute all PubMed searches in parallel
- **And** merge results with deduplication

**FR-4.2: Parallel Summarization**
- **Given** 10 studies to summarize
- **When** processing studies
- **Then** summarize all studies in parallel
- **And** complete in < 3 seconds total

**FR-4.3: Cache Check Parallelization**
- **Given** a search request
- **When** processing begins
- **Then** check cache and expand abbreviations in parallel
- **And** save 1-2 seconds of latency

### FR-5: Prompt Caching

**FR-5.1: System Prompt Caching**
- **Given** a system prompt > 3000 tokens
- **When** calling Claude API
- **Then** enable prompt caching with cache_control
- **And** achieve 90% cost reduction on cached requests

**FR-5.2: Cache Metrics Logging**
- **Given** an LLM API call completes
- **When** logging metrics
- **Then** include cache hit/miss status
- **And** track cache savings percentage

**FR-5.3: Cache Optimization**
- **Given** cache hit rate < 80%
- **When** analyzing performance
- **Then** identify opportunities to increase cacheable content
- **And** adjust system prompts accordingly

---

## 📋 Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1: Latency Targets**
- P50 latency: < 5 seconds (first request)
- P95 latency: < 10 seconds (first request)
- P99 latency: < 15 seconds (first request)
- Cached requests: < 100ms

**NFR-1.2: Throughput**
- Minimum: 10 requests/second
- Target: 50 requests/second
- Peak: 100 requests/second

**NFR-1.3: Cold Start**
- Lambda cold start: < 1 second
- API route cold start: < 500ms

### NFR-2: Cost

**NFR-2.1: Cost Targets**
- First request: < $0.005 per request
- Cached request: < $0.00001 per request
- Monthly (1000 req/day): < $150

**NFR-2.2: Cost Monitoring**
- Track cost per request in real-time
- Alert if cost exceeds $0.01 per request
- Weekly cost reports

### NFR-3: Reliability

**NFR-3.1: Availability**
- Uptime: 99.9% (< 43 minutes downtime/month)
- Error rate: < 0.1%
- Timeout rate: < 0.01%

**NFR-3.2: Fault Tolerance**
- Graceful degradation if LLM fails
- Retry logic with exponential backoff
- Fallback to cached content when possible

**NFR-3.3: Data Consistency**
- Cache consistency across regions
- Atomic cache updates
- No stale data served

### NFR-4: Scalability

**NFR-4.1: Horizontal Scaling**
- Auto-scale Lambda functions based on load
- Support 10x traffic increase without code changes
- No single point of failure

**NFR-4.2: Resource Limits**
- Lambda memory: 1024-3008 MB (configurable)
- Lambda timeout: 60 seconds max
- DynamoDB: On-demand billing (auto-scale)

### NFR-5: Observability

**NFR-5.1: Logging**
- Structured JSON logs
- Request ID tracking across services
- Log retention: 7 days

**NFR-5.2: Metrics**
- Latency (P50, P95, P99)
- Cost per request
- Cache hit rate
- Error rate
- LLM token usage

**NFR-5.3: Tracing**
- AWS X-Ray integration
- End-to-end request tracing
- Performance bottleneck identification

### NFR-6: Security

**NFR-6.1: API Security**
- Rate limiting: 100 requests/minute per IP
- API key authentication for internal services
- CORS configuration for frontend

**NFR-6.2: Data Privacy**
- No PII stored in logs
- Encrypted data at rest (DynamoDB)
- Encrypted data in transit (TLS 1.3)

---

## 🚫 Out of Scope

### OS-1: Not Included in This Phase

- Real-time collaboration features
- User accounts and authentication
- Payment processing
- Mobile app development
- Multi-language support (beyond Spanish/English)
- Custom supplement formulation tools
- Integration with e-commerce platforms

### OS-2: Future Considerations

- GraphQL API
- WebSocket support for real-time updates
- Machine learning model training
- A/B testing framework
- Advanced analytics dashboard

---

## 📊 Success Metrics

### Primary Metrics

**M-1: Latency Reduction**
- **Current:** 119 seconds (timeout)
- **Target:** 5-8 seconds (95% improvement)
- **Measurement:** P95 latency in CloudWatch

**M-2: Cost Reduction**
- **Current:** $1,500/month (1000 req/day)
- **Target:** $90/month (94% reduction)
- **Measurement:** AWS Cost Explorer

**M-3: Cache Hit Rate**
- **Current:** 0% (no cache)
- **Target:** 90%+
- **Measurement:** Custom CloudWatch metric

**M-4: Error Rate**
- **Current:** 100% (all timeout)
- **Target:** < 0.1%
- **Measurement:** CloudWatch Logs Insights

### Secondary Metrics

**M-5: User Satisfaction**
- Time to first byte: < 1 second
- Perceived performance: "Fast" rating > 90%
- Abandonment rate: < 5%

**M-6: System Efficiency**
- Throughput: 10+ req/s
- CPU utilization: < 70%
- Memory utilization: < 80%

---

## 🔗 Dependencies

### External Dependencies

**D-1: AWS Services**
- AWS Lambda (compute)
- DynamoDB (cache storage)
- CloudWatch (logging/metrics)
- X-Ray (tracing)
- Bedrock (LLM API)

**D-2: Third-Party APIs**
- PubMed E-utilities API
- Anthropic Claude API (via Bedrock)

**D-3: Infrastructure**
- Vercel (hosting)
- GitHub (version control)
- npm (package management)

### Internal Dependencies

**D-4: Existing Services**
- abbreviation-expander service (already optimized)
- studies-fetcher Lambda (working)
- content-enricher Lambda (needs optimization)

**D-5: Shared Libraries**
- AWS SDK v3
- Next.js 14
- TypeScript 5.x

---

## 🎯 Acceptance Criteria Summary

### Phase 1: Quick Wins (MUST HAVE)

- [ ] **AC-1.1:** All requests complete within 30 seconds
- [ ] **AC-1.2:** No 504 timeout errors
- [ ] **AC-1.3:** Cost reduced to < $300/month
- [ ] **AC-1.4:** Content quality maintained

### Phase 2: Optimization (SHOULD HAVE)

- [ ] **AC-2.1:** P95 latency < 10 seconds
- [ ] **AC-2.2:** Cost reduced to < $100/month
- [ ] **AC-2.3:** Cache hit rate > 80%
- [ ] **AC-2.4:** Prompt caching implemented

### Phase 3: UX Enhancement (COULD HAVE)

- [ ] **AC-3.1:** Streaming response implemented
- [ ] **AC-3.2:** Progress indicators shown
- [ ] **AC-3.3:** Time to first byte < 1 second
- [ ] **AC-3.4:** User satisfaction > 90%

### Phase 4: Advanced Optimization (NICE TO HAVE)

- [ ] **AC-4.1:** P95 latency < 5 seconds
- [ ] **AC-4.2:** Cost reduced to < $50/month
- [ ] **AC-4.3:** Cache hit rate > 90%
- [ ] **AC-4.4:** Throughput > 50 req/s

---

## 📚 References

- [AWS Bedrock Prompt Caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Claude Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)

---

**Document Version:** 1.0  
**Last Updated:** 2024-11-22  
**Next Review:** After Phase 1 completion
