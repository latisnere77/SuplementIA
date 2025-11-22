# Modern Architecture Spec

**Feature:** High-Performance Content Enrichment System  
**Status:** 📋 Ready for Implementation  
**Created:** 2024-11-22  
**Owner:** Engineering Team

---

## 📚 Spec Documents

This spec is organized into multiple documents for clarity:

### 1. [Requirements](./requirements.md)
- Problem statement
- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Success metrics

### 2. [Design](./design.md)
- System architecture
- Component design
- Data flow diagrams
- Technology stack

### 3. [Tasks](./tasks.md)
- Implementation phases
- Task breakdown
- Effort estimates
- Progress tracking

### 4. [Legacy Cleanup](./legacy-cleanup.md)
- Files to delete
- Code to refactor
- Directory reorganization
- Impact analysis

### 5. [Frontend Improvements](./frontend-improvements.md)
- UX enhancements
- Component designs
- Mobile optimizations
- Analytics tracking

---

## 🎯 Quick Summary

### Problem
- System times out after 60 seconds
- Content enricher takes 119 seconds
- Costs $1,500/month for 1000 requests/day
- Poor user experience (no feedback)

### Solution
- Streaming response (SSE)
- Two-stage LLM pipeline
- Aggressive caching (90%+ hit rate)
- Parallel processing
- Prompt caching (90% cost reduction)

### Results
- Latency: 119s → 5-8s (95% improvement)
- Cost: $1,500/month → $90/month (94% reduction)
- UX: Real-time progress, streaming content
- Scalability: 0.008 req/s → 50+ req/s

---

## 🚀 Implementation Phases

### Phase 1: Critical Path (2-3 days) 🔴
**Goal:** Eliminate timeout, make system functional

- Optimize content enricher Lambda
- Implement DynamoDB cache
- Deploy and monitor

**Result:** 15-20s latency, $300/month cost

### Phase 2: Performance (3-4 days) 🟡
**Goal:** Achieve target performance and cost

- Two-stage LLM pipeline
- Prompt caching
- Parallel processing

**Result:** 5-8s latency, $90/month cost

### Phase 3: UX Enhancement (3-4 days) 🟢
**Goal:** Improve user experience

- Server-Sent Events
- Streaming components
- Progress indicators

**Result:** <1s to first byte, >90% satisfaction

### Phase 4: Cleanup (2-3 days) 🔵
**Goal:** Remove legacy, improve maintainability

- Delete unused files
- Code quality improvements
- Documentation

**Result:** Clean codebase, low technical debt

---

## 📊 Success Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Latency (P95) | 119s (timeout) | 5-8s | 95% |
| Cost/month | $1,500 | $90 | 94% |
| Cache hit rate | 0% | 90%+ | ∞ |
| Error rate | 100% | <0.1% | 99.9% |
| Throughput | 0.008 req/s | 50+ req/s | 6250x |

---

## 🔗 Related Documents

### External References
- [AWS Bedrock Prompt Caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### Internal Documents
- [SAW-PALMETTO-DIAGNOSIS.md](../../../SAW-PALMETTO-DIAGNOSIS.md) - Root cause analysis
- [MODERN-ARCHITECTURE-PROPOSAL.md](../../../MODERN-ARCHITECTURE-PROPOSAL.md) - Detailed proposal
- [PROMPT-CACHING-SUCCESS.md](../../../PROMPT-CACHING-SUCCESS.md) - Proof of concept

---

## 👥 Team

### Roles
- **Tech Lead:** Architecture decisions, code reviews
- **Backend Dev:** Lambda optimization, API development
- **Frontend Dev:** React components, UX implementation
- **DevOps:** Deployment, monitoring, infrastructure
- **QA:** Testing, validation, performance testing

### Communication
- Daily standups: Progress updates
- Weekly reviews: Demo completed phases
- Slack channel: #modern-architecture
- Documentation: This spec (living document)

---

## 🎯 Getting Started

### For Developers

1. **Read the spec**
   ```bash
   # Read in order
   cat requirements.md
   cat design.md
   cat tasks.md
   ```

2. **Set up environment**
   ```bash
   npm install
   npm run dev
   ```

3. **Pick a task**
   - Check [tasks.md](./tasks.md)
   - Assign yourself
   - Create feature branch
   - Implement and test
   - Submit PR

### For Reviewers

1. **Understand the context**
   - Read [SAW-PALMETTO-DIAGNOSIS.md](../../../SAW-PALMETTO-DIAGNOSIS.md)
   - Review [requirements.md](./requirements.md)

2. **Review checklist**
   - [ ] Code follows design spec
   - [ ] Tests included
   - [ ] Documentation updated
   - [ ] Performance validated
   - [ ] No regressions

3. **Approve and merge**
   - Approve PR
   - Merge to main
   - Monitor deployment

---

## 📝 Change Log

### Version 1.0 (2024-11-22)
- Initial spec created
- All phases defined
- Tasks estimated
- Ready for implementation

---

## ❓ FAQ

### Q: Why not use Sonnet for better quality?
**A:** Haiku is 10x faster and 5x cheaper. Quality testing shows minimal difference for our use case. We can always upgrade specific cases to Sonnet if needed.

### Q: What if streaming doesn't work in production?
**A:** We have fallback to synchronous response. Streaming is progressive enhancement, not required.

### Q: How do we handle cache invalidation?
**A:** TTL-based (7 days). Manual invalidation available via admin API. Cache warming for popular supplements.

### Q: What about mobile performance?
**A:** Streaming works on mobile. We optimize bundle size and use lazy loading. Progressive enhancement ensures basic functionality always works.

### Q: How do we test streaming locally?
**A:** Use `curl` with `--no-buffer` flag or browser EventSource API. See [tasks.md](./tasks.md) for examples.

---

## 🚦 Status

- [x] Requirements defined
- [x] Design completed
- [x] Tasks estimated
- [x] Team assigned
- [ ] Phase 1 in progress
- [ ] Phase 2 pending
- [ ] Phase 3 pending
- [ ] Phase 4 pending

---

**Next Steps:**
1. Review and approve spec
2. Start Phase 1 implementation
3. Daily progress updates
4. Weekly demos

**Questions?** Ask in #modern-architecture Slack channel
