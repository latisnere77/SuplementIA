# Implementation Tasks

**Feature:** Modern Architecture for SuplementIA  
**Status:** 📋 Ready for Implementation  
**Total Effort:** 2-3 weeks  
**Team Size:** 1-2 developers

---

## 🎯 Phase 1: Critical Path - Eliminate Timeout (P0)

**Goal:** Make system functional, eliminate 504 errors  
**Duration:** 2-3 days  
**Priority:** 🔴 Critical

### Task 1.1: Optimize Content Enricher Lambda
**Acceptance Criteria:** #[[file:requirements.md#AC-1.1]]

**Subtasks:**
- [ ] **T1.1.1:** Switch from Sonnet to Haiku
  - Update model ID in Lambda
  - Test output quality
  - Verify cost reduction
  - **Effort:** 1 hour
  - **Owner:** Backend Dev

- [ ] **T1.1.2:** Reduce input tokens by 60%
  - Implement study summarization
  - Test with 10 studies
  - Verify quality maintained
  - **Effort:** 3 hours
  - **Owner:** Backend Dev

- [ ] **T1.1.3:** Add timeout protection
  - Set Lambda timeout to 30s
  - Add graceful degradation
  - Test timeout scenarios
  - **Effort:** 2 hours
  - **Owner:** Backend Dev

**Deliverables:**
- ✅ Lambda completes in <20 seconds
- ✅ No 504 timeout errors
- ✅ Cost reduced by 80%

**Testing:**
```bash
# Test with saw palmetto
curl -X POST https://suplementia.vercel.app/api/portal/enrich \
  -H "Content-Type: application/json" \
  -d '{"supplementName":"saw palmetto"}' \
  -w "\nTime: %{time_total}s\n"

# Expected: <20s response time
```

---

### Task 1.2: Implement DynamoDB Cache Check
**Acceptance Criteria:** #[[file:requirements.md#FR-2.1]]

**Subtasks:**
- [ ] **T1.2.1:** Add cache check before generation
  - Query DynamoDB first
  - Return cached if fresh (<7 days)
  - Log cache hit/miss
  - **Effort:** 2 hours
  - **Owner:** Backend Dev

- [ ] **T1.2.2:** Implement cache warming
  - Create list of top 100 supplements
  - Background job to pre-generate
  - Schedule daily refresh
  - **Effort:** 3 hours
  - **Owner:** Backend Dev

- [ ] **T1.2.3:** Add cache metrics
  - Track hit rate
  - Track latency
  - Alert if hit rate <80%
  - **Effort:** 2 hours
  - **Owner:** DevOps

**Deliverables:**
- ✅ Cache hit rate >80%
- ✅ Cached requests <100ms
- ✅ Monitoring dashboard

**Testing:**
```bash
# First request (cache miss)
time curl -X POST .../enrich -d '{"supplementName":"vitamin d"}'

# Second request (cache hit)
time curl -X POST .../enrich -d '{"supplementName":"vitamin d"}'

# Expected: Second request <100ms
```

---

### Task 1.3: Deploy and Monitor
**Acceptance Criteria:** #[[file:requirements.md#NFR-3.1]]

**Subtasks:**
- [ ] **T1.3.1:** Deploy to staging
  - Test all endpoints
  - Verify no regressions
  - Load test with 100 requests
  - **Effort:** 2 hours
  - **Owner:** DevOps

- [ ] **T1.3.2:** Deploy to production
  - Blue-green deployment
  - Monitor error rates
  - Rollback plan ready
  - **Effort:** 2 hours
  - **Owner:** DevOps

- [ ] **T1.3.3:** Monitor for 24 hours
  - Watch CloudWatch metrics
  - Check error logs
  - Verify cost reduction
  - **Effort:** 1 hour/day
  - **Owner:** Team

**Deliverables:**
- ✅ Zero downtime deployment
- ✅ Error rate <0.1%
- ✅ Cost reduced by 80%

---

## 🚀 Phase 2: Performance Optimization (P1)

**Goal:** Achieve 5-8s latency, 94% cost reduction  
**Duration:** 3-4 days  
**Priority:** 🟡 High

### Task 2.1: Implement Two-Stage LLM Pipeline
**Acceptance Criteria:** #[[file:requirements.md#FR-3]]

**Subtasks:**
- [ ] **T2.1.1:** Create study summarization service
  - Parallel summarization
  - Use Haiku for speed
  - 2-3 sentences per study
  - **Effort:** 4 hours
  - **Owner:** Backend Dev
  - **File:** `lib/services/study-summarizer.ts`

```typescript
// lib/services/study-summarizer.ts
export async function summarizeStudies(
  studies: Study[]
): Promise<StudySummary[]> {
  return await Promise.all(
    studies.map(async (study) => {
      const summary = await summarizeWithHaiku(study);
      return {
        pmid: study.pmid,
        summary,
        title: study.title,
      };
    })
  );
}
```

- [ ] **T2.1.2:** Update content generator
  - Accept summaries instead of full studies
  - Reduce prompt size
  - Test output quality
  - **Effort:** 3 hours
  - **Owner:** Backend Dev
  - **File:** `lib/services/content-generator.ts`

- [ ] **T2.1.3:** Integration testing
  - Test end-to-end flow
  - Verify quality maintained
  - Measure latency improvement
  - **Effort:** 2 hours
  - **Owner:** QA

**Deliverables:**
- ✅ Latency reduced to 8-10s
- ✅ Token usage reduced 60%
- ✅ Quality maintained

---

### Task 2.2: Implement Prompt Caching
**Acceptance Criteria:** #[[file:requirements.md#FR-5]]

**Subtasks:**
- [ ] **T2.2.1:** Design system prompt (>3000 tokens)
  - Include instructions
  - Add 50+ examples
  - Test cache eligibility
  - **Effort:** 3 hours
  - **Owner:** Backend Dev

- [ ] **T2.2.2:** Enable cache_control
  - Add to API calls
  - Log cache metrics
  - Verify cost savings
  - **Effort:** 2 hours
  - **Owner:** Backend Dev

- [ ] **T2.2.3:** Monitor cache performance
  - Track hit rate
  - Track cost savings
  - Alert if savings <80%
  - **Effort:** 2 hours
  - **Owner:** DevOps

**Deliverables:**
- ✅ Cache hit rate >90%
- ✅ Cost reduced by 90%
- ✅ Latency reduced to 5-8s

**Testing:**
```bash
# Check cache metrics in logs
aws logs tail /aws/lambda/content-enricher --follow | grep cacheHit
```

---

### Task 2.3: Parallel Processing
**Acceptance Criteria:** #[[file:requirements.md#FR-4]]

**Subtasks:**
- [ ] **T2.3.1:** Parallel study fetching
  - Fetch multiple search terms in parallel
  - Merge and deduplicate results
  - **Effort:** 3 hours
  - **Owner:** Backend Dev

- [ ] **T2.3.2:** Parallel summarization
  - Process all studies concurrently
  - Handle errors gracefully
  - **Effort:** 2 hours
  - **Owner:** Backend Dev

- [ ] **T2.3.3:** Parallel cache check + expansion
  - Run both operations simultaneously
  - Save 1-2 seconds
  - **Effort:** 2 hours
  - **Owner:** Backend Dev

**Deliverables:**
- ✅ Latency reduced to 5-8s
- ✅ Better resource utilization
- ✅ More resilient to failures

---

## 🎨 Phase 3: UX Enhancement (P2)

**Goal:** Streaming response, progress indicators  
**Duration:** 4-5 days  
**Priority:** 🟢 Medium

### Task 3.1: Implement Server-Sent Events
**Acceptance Criteria:** #[[file:requirements.md#FR-1]]

**Subtasks:**
- [ ] **T3.1.1:** Create SSE endpoint
  - Streaming response
  - Event types: expansion, studies, content, complete, error
  - Keep-alive mechanism
  - **Effort:** 4 hours
  - **Owner:** Backend Dev
  - **File:** `app/api/portal/enrich/route.ts`

```typescript
// app/api/portal/enrich/route.ts
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send immediate response
        controller.enqueue(encoder.encode('data: {"event":"start"}\n\n'));
        
        // Stage 1: Expansion
        const expansion = await expandAbbreviation(term);
        controller.enqueue(encoder.encode(`data: {"event":"expansion","data":${JSON.stringify(expansion)}}\n\n`));
        
        // Stage 2: Studies
        const studies = await fetchStudies(term);
        controller.enqueue(encoder.encode(`data: {"event":"studies","data":{"count":${studies.length}}}\n\n`));
        
        // Stage 3: Content (stream as generated)
        await streamContent(studies, (chunk) => {
          controller.enqueue(encoder.encode(`data: {"event":"content","data":${JSON.stringify(chunk)}}\n\n`));
        });
        
        // Complete
        controller.enqueue(encoder.encode('data: {"event":"complete"}\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: {"event":"error","data":{"message":"${error.message}"}}\n\n`));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **T3.1.2:** Test SSE reliability
  - Test connection drops
  - Test reconnection
  - Test error handling
  - **Effort:** 3 hours
  - **Owner:** QA

**Deliverables:**
- ✅ Streaming working
- ✅ No timeout issues
- ✅ Graceful error handling

---

### Task 3.2: Frontend Streaming Components
**Acceptance Criteria:** #[[file:frontend-improvements.md]]

**Subtasks:**
- [ ] **T3.2.1:** Create StreamingResults component
  - Handle SSE events
  - Progressive content display
  - Animations
  - **Effort:** 6 hours
  - **Owner:** Frontend Dev
  - **File:** `components/portal/StreamingResults.tsx`

- [ ] **T3.2.2:** Create progress indicators
  - Stage-by-stage feedback
  - Progress bar
  - Time estimates
  - **Effort:** 4 hours
  - **Owner:** Frontend Dev

- [ ] **T3.2.3:** Enhanced error states
  - Specific error messages
  - Retry button
  - Alternative suggestions
  - **Effort:** 3 hours
  - **Owner:** Frontend Dev
  - **File:** `components/portal/ErrorState.tsx`

**Deliverables:**
- ✅ Real-time progress updates
- ✅ Streaming content display
- ✅ Better error handling

---

### Task 3.3: Loading Skeletons
**Acceptance Criteria:** #[[file:frontend-improvements.md]]

**Subtasks:**
- [ ] **T3.3.1:** Create ResultsSkeleton component
  - Match final layout
  - Smooth animations
  - **Effort:** 2 hours
  - **Owner:** Frontend Dev

- [ ] **T3.3.2:** Integrate with loading states
  - Show skeleton while loading
  - Fade to real content
  - **Effort:** 2 hours
  - **Owner:** Frontend Dev

**Deliverables:**
- ✅ Professional loading states
- ✅ Perceived performance improvement

---

## 🧹 Phase 4: Code Cleanup (P3)

**Goal:** Remove legacy code, improve maintainability  
**Duration:** 2-3 days  
**Priority:** 🔵 Low

### Task 4.1: Delete Legacy Files
**Acceptance Criteria:** #[[file:legacy-cleanup.md]]

**Subtasks:**
- [ ] **T4.1.1:** Verify files are unused
  - Grep codebase
  - Check git history
  - Confirm with team
  - **Effort:** 2 hours
  - **Owner:** Tech Lead

- [ ] **T4.1.2:** Delete files
  - `app/api/portal/enrich-v2/route.ts`
  - `app/api/portal/test-config/route.ts`
  - `app/portal/page-simple.tsx`
  - **Effort:** 1 hour
  - **Owner:** Any Dev

- [ ] **T4.1.3:** Archive old scripts
  - Move to `_archived/scripts-nov22/`
  - Update documentation
  - **Effort:** 1 hour
  - **Owner:** Any Dev

**Deliverables:**
- ✅ 10% code reduction
- ✅ Cleaner codebase
- ✅ Less confusion

---

### Task 4.2: Code Quality Improvements
**Acceptance Criteria:** #[[file:legacy-cleanup.md]]

**Subtasks:**
- [ ] **T4.2.1:** Fix TypeScript issues
  - Remove `any` types
  - Add type guards
  - Fix null checks
  - **Effort:** 4 hours
  - **Owner:** Any Dev

- [ ] **T4.2.2:** Standardize logging
  - Structured JSON logs
  - Consistent format
  - Add correlation IDs
  - **Effort:** 3 hours
  - **Owner:** Any Dev

- [ ] **T4.2.3:** Add retry logic utility
  - Exponential backoff
  - Configurable retries
  - Error handling
  - **Effort:** 2 hours
  - **Owner:** Backend Dev
  - **File:** `lib/utils/retry.ts`

**Deliverables:**
- ✅ Zero TypeScript errors
- ✅ Consistent code style
- ✅ Better error handling

---

### Task 4.3: Documentation
**Acceptance Criteria:** #[[file:legacy-cleanup.md]]

**Subtasks:**
- [ ] **T4.3.1:** Update README.md
  - New architecture diagram
  - Setup instructions
  - Deployment guide
  - **Effort:** 2 hours
  - **Owner:** Tech Lead

- [ ] **T4.3.2:** API documentation
  - Document SSE endpoints
  - Add examples
  - Update Postman collection
  - **Effort:** 2 hours
  - **Owner:** Backend Dev

- [ ] **T4.3.3:** Migration guide
  - Breaking changes
  - Upgrade path
  - Rollback procedure
  - **Effort:** 2 hours
  - **Owner:** Tech Lead

**Deliverables:**
- ✅ Complete documentation
- ✅ Easy onboarding
- ✅ Clear migration path

---

## 📊 Progress Tracking

### Phase 1: Critical Path
- [ ] Task 1.1: Optimize Content Enricher (6 hours)
- [ ] Task 1.2: Implement Cache (7 hours)
- [ ] Task 1.3: Deploy and Monitor (5 hours)
- **Total:** 18 hours (2-3 days)

### Phase 2: Performance
- [ ] Task 2.1: Two-Stage Pipeline (9 hours)
- [ ] Task 2.2: Prompt Caching (7 hours)
- [ ] Task 2.3: Parallel Processing (7 hours)
- **Total:** 23 hours (3-4 days)

### Phase 3: UX Enhancement
- [ ] Task 3.1: SSE Implementation (7 hours)
- [ ] Task 3.2: Frontend Components (13 hours)
- [ ] Task 3.3: Loading Skeletons (4 hours)
- **Total:** 24 hours (3-4 days)

### Phase 4: Cleanup
- [ ] Task 4.1: Delete Legacy (4 hours)
- [ ] Task 4.2: Code Quality (9 hours)
- [ ] Task 4.3: Documentation (6 hours)
- **Total:** 19 hours (2-3 days)

---

## 🎯 Success Metrics

### After Phase 1
- ✅ Latency: 15-20s (vs 119s)
- ✅ Cost: $300/month (vs $1,500)
- ✅ Error rate: <1%

### After Phase 2
- ✅ Latency: 5-8s (95% improvement)
- ✅ Cost: $90/month (94% reduction)
- ✅ Cache hit rate: >90%

### After Phase 3
- ✅ Time to first byte: <1s
- ✅ User satisfaction: >90%
- ✅ Abandonment rate: <5%

### After Phase 4
- ✅ Code quality: A grade
- ✅ Technical debt: Low
- ✅ Maintainability: High

---

**Total Effort:** 84 hours (2-3 weeks)  
**Team:** 1-2 developers  
**Risk:** Low - Incremental improvements
