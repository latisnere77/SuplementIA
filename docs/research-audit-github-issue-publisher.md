# Frontier Agent GitHub Issue Publisher Plan

## Goal

Convert Frontier Agent report-only audit outputs into one consolidated weekly GitHub Issue for human review and traceability.

This phase must not create PRs, modify code, write databases, change clinical content, touch runtime routes, or expose findings to users. The publisher is a communication layer over existing report-only S3 artifacts.

## Recommended Architecture

Use a separate publisher from the audit runner:

```text
Audit Lambda
        |
        v
S3 report-only artifacts
  - provider-audit-*.json
  - provider-audit-*.md
  - summary-*.json
        |
        v
Issue Publisher Lambda
        |
        v
GitHub Issue weekly consolidated review
        |
        v
Human reviewer decides follow-up issues or PRs
```

The audit Lambda remains responsible for event parsing, redaction, provider execution, PubMed verifier execution, Zod validation, cost caps, and S3 report output. The issue publisher reads only completed S3 report artifacts and creates or updates a GitHub Issue.

Keep the publisher separate so GitHub failures do not rerun provider calls, PubMed verifier calls, or report generation.

## Manual-First Flow

Phase 1 must be manual:

1. Run the Frontier Agent audit manually.
2. Confirm S3 contains JSON, Markdown, and summary report artifacts.
3. Invoke the Issue Publisher manually with the S3 report locations.
4. Create or update one weekly GitHub Issue.
5. Human reviewer triages findings and decides follow-up work.

Do not add EventBridge in this phase.

Phase 2 may add weekly EventBridge only after manual runs prove that findings are useful, low-noise, and stable.

## Publisher Input

The manual publisher event should reference existing report-only artifacts:

```json
{
  "weekId": "2026-W23",
  "repository": "latisnere77/SuplementIA",
  "reports": {
    "json": {
      "bucket": "suplementai-research-audit-reports",
      "key": "report-only/provider-smoke/2026-06-03/provider-audit-2026-06-03T00-19-04-914Z.json"
    },
    "markdown": {
      "bucket": "suplementai-research-audit-reports",
      "key": "report-only/provider-smoke/2026-06-03/provider-audit-2026-06-03T00-19-04-914Z.md"
    },
    "summary": {
      "bucket": "suplementai-research-audit-reports",
      "key": "report-only/provider-smoke/2026-06-03/summary-2026-06-03T00-19-04-914Z.json"
    }
  },
  "dryRun": true,
  "createIssue": false
}
```

Defaults must be dry-run/report-only. A real issue should require an explicit manual `createIssue=true` or equivalent flag.

## Issue Title

Use one deterministic title per week:

```text
[Frontier Audit] Weekly findings - 2026-W23
```

Do not include provider names, cost, or clinical terms in the title. Keep those in the body.

## Issue Labels

Base labels:

```text
frontier-agent
research-audit
weekly-review
needs-review
```

Conditional labels:

```text
clinical-review
seo
product
low-confidence
provider-error
```

The publisher may attach conditional labels only from the summary/report metadata. It must not run a model to decide labels.

## Issue Body Template

```markdown
## Summary
- Week: 2026-W23
- Report window:
- Events audited:
- Valid findings:
- Rejected findings:
- External calls:
- Estimated cost:
- Provider:
- PubMed verifier used:
- Dry-run/report-only:

## Top Actionable Findings
1. Finding:
   - Type:
   - Severity:
   - Why it matters:
   - Recommended human action:

## Clinical / Editorial Review Needed
- Finding:
- Clinical risk:
- Evidence boundary:
- Candidate PMIDs:
- Validated PMIDs:
- Matched PMIDs:
- Human review required:

## SEO / Product Opportunities
- Page:
- Query:
- Country/channel:
- CTR / impressions / position:
- Recommended internal action:

## Noise / Rejected Findings
- Rejected count:
- Common rejection reasons:
- Prompt/schema concerns:
- Suggested tuning:

## Cost / Reliability
- Estimated cost:
- Provider calls:
- Provider errors:
- Timeouts:
- PubMed verifier calls:

## Reports
- JSON report: s3://...
- Markdown report: s3://...
- Summary: s3://...

## Review Decision
- [ ] Actionable
- [ ] Needs more data
- [ ] Noisy / reject
- [ ] Create follow-up issue
- [ ] Create PR after human review
```

Do not include raw provider responses, raw request payloads, secrets, authorization headers, account IDs, org IDs, billing metadata, emails, IPs, user IDs, session IDs, or full URLs.

## When To Create An Issue

Create or update the weekly issue when at least one condition is true:

- `validFindings > 0`
- Any finding has severity `high` or `critical`.
- Any finding has `clinicalRisk` other than `none`.
- There are actionable SEO findings.
- Provider errors or timeouts exceed the configured threshold.
- Estimated cost exceeds the expected weekly range.
- Rejected/noisy findings indicate prompt/schema tuning is needed.

Do not create a new issue when:

- The audit was disabled and produced only skipped rows.
- There are no actionable findings, no high-risk signals, and no operational anomaly.
- The publisher is running in dry-run mode.

Even when no issue is created, the S3 report artifacts remain the source of truth.

## No Actionable Findings

For manual phase:

```text
No GitHub Issue.
Keep S3 summary.
Log sanitized "no actionable findings" status.
```

For future scheduled phase:

```text
Option A: no weekly issue if no findings.
Option B: update a single monthly "Frontier Audit Activity" issue.
```

Use Option A until the team explicitly wants activity tracking with no findings.

## Secrets Manager

Recommended secrets:

```text
suplementia/research-audit/moonshot-api-key
suplementia/research-audit/github-issue-token
```

Secret separation:

- Audit Lambda may read the Moonshot/Kimi secret only when provider calls are explicitly enabled.
- Issue Publisher Lambda may read only the GitHub issue token secret.
- The publisher does not need the Moonshot/Kimi secret.

Do not store GitHub tokens in Lambda environment variables, code, S3 reports, issue bodies, logs, or local fixtures.

## Minimum IAM

Issue Publisher Lambda:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadReportOnlyArtifacts",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::suplementai-research-audit-reports/report-only/*"
    },
    {
      "Sid": "ReadGitHubIssueToken",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:643942183354:secret:suplementia/research-audit/github-issue-token-*"
    },
    {
      "Sid": "WriteOwnLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:643942183354:log-group:/aws/lambda/suplementai-research-audit-issue-publisher:*"
    }
  ]
}
```

The publisher must not have:

- `s3:PutObject`
- `dynamodb:*`
- `rds:*`
- `lambda:InvokeFunction`
- `events:*`
- broad `secretsmanager:*`
- app runtime permissions
- product, affiliate, checkout, recommendation, or clinical resources

## GitHub Permissions

Preferred: GitHub App installed only on `latisnere77/SuplementIA`.

Minimum GitHub App permissions:

```text
Metadata: read
Issues: read/write
```

If using a temporary fine-grained PAT:

```text
Repository access: latisnere77/SuplementIA only
Issues: read/write
Metadata: read
Contents: read only if issue search implementation requires it
```

Do not grant:

- Pull requests write.
- Contents write.
- Actions write.
- Administration.
- Organization-wide repository access.

## Idempotency

Use the week ID as the idempotency key:

```text
frontier-audit-week-2026-W23
```

Expected behavior:

1. Search for an existing issue with exact title:
   ```text
   [Frontier Audit] Weekly findings - 2026-W23
   ```
2. If it exists, update the body or add one rerun comment.
3. If it does not exist and `createIssue=true`, create it.
4. If `dryRun=true`, render the proposed issue body without calling GitHub.

The issue body should include:

```text
Week ID:
Report run ID:
S3 summary key:
S3 markdown key:
Config version:
Publisher dry-run:
```

Never create multiple issues for the same week unless a human manually requests a split.

## S3 Links

Use internal S3 URIs by default:

```text
s3://suplementai-research-audit-reports/report-only/...
```

Do not generate public links.

Pre-signed URLs are not recommended for the first phase. If later allowed, use short expiration, never include secrets, and never link raw provider responses.

## Failure Behavior

If GitHub create/update fails:

- Do not rerun the audit.
- Do not rerun provider calls.
- Do not rerun PubMed verifier calls.
- Log a sanitized error.
- Return a failure result that can be retried against the same S3 report artifacts.

If S3 report artifacts are missing:

- Fail closed.
- Do not create a partial issue.
- Log only bucket/key metadata and sanitized error type.

If GitHub token is missing:

- Fail closed.
- Do not print token values.
- Do not create issue.

If the issue already exists:

- Update/comment once according to idempotency rules.
- Do not duplicate.

## Metrics For Weekly Automation

Automate with EventBridge only after 2-3 manual weeks meet these thresholds:

- At least 60-70% of valid findings are useful after human review.
- Repeated false positives are low or declining.
- Weekly cost remains below cap.
- Provider errors and timeouts are rare and sanitized.
- GitHub issue idempotency works without duplicates.
- No secrets, account IDs, org IDs, billing metadata, raw provider errors, or unsafe user data appear in issues.
- Reviewers can convert findings into clear decisions.
- No finding is treated as production-approved without human review.

## EventBridge Later

When approved, EventBridge should trigger:

```text
weekly aggregate input collection
        |
        v
Audit Lambda
        |
        v
Issue Publisher Lambda
```

Keep EventBridge disabled until manual publisher runs are stable. The first scheduled version should still be report-only and should not create PRs.

## Next Implementation PR Criteria

The next PR may implement a local/manual Issue Publisher only if it:

- Reads local or mocked S3 report artifacts.
- Renders the GitHub Issue title/body deterministically.
- Applies idempotency by week ID.
- Uses mocks for GitHub API calls by default.
- Does not create real issues unless explicitly authorized.
- Does not call LLMs.
- Does not call PubMed.
- Does not write DB.
- Does not touch runtime clinical/product/core code.
- Includes tests for no-actionable findings, idempotency, missing reports, missing token, and sanitized GitHub failures.
