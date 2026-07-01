# PLAN — phase7-aws-report-only-spec

Date: 2026-07-01

1. Reconstruct repo, PR, queue, state, planning, and roadmap context.
2. Inspect existing research-audit AWS report-only docs and local runner/handler code.
3. Attempt the minimum allowed AWS identity read with `--profile suplementai-admin`.
4. If identity is confirmed and rollback/cost/PII boundaries are sufficient, proceed to
   scoped wiring.
5. If identity cannot be confirmed, stop before cloud changes and prepare a blocked
   SPEC/plan PR.
6. Preserve Phase 7 as `ESPERA_GATE` until a future session can confirm AWS identity and
   execute or review the cloud wiring safely.
