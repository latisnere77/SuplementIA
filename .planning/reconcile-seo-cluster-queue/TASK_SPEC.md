# TASK_SPEC: reconcile stale SEO cluster queue

## Context

The user asked to review the Codex long-running work pattern and remove work that is no longer needed. The queue still listed T2-T14 SEO cluster tasks as `PENDING`, but `origin/main` already contains the integrated implementation and tests from PR #169.

## Substitution test

If this edit is not made, the autonomous queue will keep selecting SEO cluster tasks that are already implemented. That creates duplicate branches and unnecessary portal validation work.

## In scope

- `TASK_QUEUE.md`
- `.planning/reconcile-seo-cluster-queue/TASK_SPEC.md`
- `.planning/reconcile-seo-cluster-queue/AUDIT_FANOUT.md`
- `.planning/reconcile-seo-cluster-queue/CHANGE_MANIFEST.md`

## Out of scope

- Product code in `app/[locale]/portal/category/[slug]/seo.ts`
- Tests in `app/[locale]/portal/category/[slug]/seo.test.ts`
- Portal rendering, cards, links, enricher, AWS, Lambda, Terraform, Bedrock, checkout, auth, dependencies, CI/CD, deploy, or merge

## Evidence checked before edit

- `git fetch origin main`
- `git log --oneline -- app/[locale]/portal/category/[slug]/seo.ts app/[locale]/portal/category/[slug]/seo.test.ts TASK_QUEUE.md`
- `gh pr list --state all --search "anxiety seo cluster" --json number,title,headRefName,baseRefName,state,isDraft,url,mergedAt`
- `rg` confirmed targeted copy/content entries for T2-T14 in `seo.ts`.
- `seo.test.ts` contains `integratedClusterCases` covering T2-T14 with unsafe wording and Product JSON-LD guards.

## Validation

- `npm test -- app/[locale]/portal/category/[slug]/seo.test.ts`
- `npm run type-check`
- `npm run lint`

Full Playwright is not required for this reconciliation PR because no portal render, SEO implementation, card, or link code is modified.

## Stop rules

- Do not modify SEO product code while reconciling the queue.
- If evidence does not show a merged PR for these clusters, leave the task open instead of marking it done.
- Do not merge the PR.

