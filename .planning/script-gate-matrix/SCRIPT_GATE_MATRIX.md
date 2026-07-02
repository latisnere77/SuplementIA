# SCRIPT_GATE_MATRIX

Date: 2026-07-01

This matrix is an execution guard. It classifies scripts that can cross gates. No listed
script was executed during this task.

## Global Rule

Before any AWS-related command, confirm identity:

```bash
aws sts get-caller-identity --profile suplementai-admin --output json
```

The command must exit 0 and return account `643942183354`. Writes still require a
TASK_SPEC for that exact action.

## Package Scripts

| Entrypoint | Gate | Rollback | Harness |
| --- | --- | --- | --- |
| `npm run deploy` | PROHIBITED without explicit merge/deploy GO; pushes `main`. | Revert/restore branch state; no agent auto-merge. | `npm run validate` before any human deploy. |
| `npm run migrate` | AWS/DB write gate; requires explicit migration TASK_SPEC. | Migration-specific rollback SQL/runbook. | migration dry-run or focused tests before write. |

## GSD Scripts

| Entrypoint | Gate | Rollback | Harness |
| --- | --- | --- | --- |
| `scripts/gsd/invariant-ratchet.mjs` | AUTONOMOUS read/local validation. | Revert script change. | `npm run gsd:invariants`. |
| `scripts/gsd/offline-certify.mjs` | AUTONOMOUS read/local validation. | Revert script change. | `npm run gsd:offline-certify -- --quick`. |
| `scripts/gsd/done-oracle.mjs` | AUTONOMOUS local validation. | Revert script change. | `npm run gsd:done -- --audit-pass-file <file>`. |
| `scripts/gsd/pre-tool-policy.mjs` | HIGH governance; edits require digest visibility. | Revert script change. | `npm run gsd:invariants`. |
| `scripts/autonomy-loop.sh`, `scripts/gsd-autonomous`, `scripts/gsd-autonomous.mjs` | AUTONOMOUS driver; must not cross gates itself. | Revert script change. | `node scripts/gsd-autonomous.mjs --recon`. |

## Research-Audit Scripts

| Entrypoint | Gate | Rollback | Harness |
| --- | --- | --- | --- |
| `scripts/research-audit/run-fixture-audit.ts` | AUTONOMOUS local/report-only if provider disabled. | Delete local `.research-audit-reports` output. | focused research-audit Jest tests. |
| `scripts/research-audit/run-event-audit.ts` | AUTONOMOUS local/report-only with aggregate input; AWS secret read only with explicit scope. | Delete local reports. | `npm test -- --runInBand --runTestsByPath lib/research-audit/events.test.ts lib/research-audit/redaction.test.ts`. |
| `scripts/research-audit/run-provider-audit.ts` | Provider/API-cost gate when provider enabled. | Delete local reports; revoke local key if leaked. | provider-runner/kimi-provider tests with mocks. |
| `scripts/research-audit/render-weekly-issue.ts` | Real GitHub issue gate; default dry-run only. | Close/delete manual issue only with human GO. | `npm test -- --runInBand --runTestsByPath lib/research-audit/github-issue-publisher.test.ts`. |
| `scripts/research-audit/import-seo-export.ts` | AUTONOMOUS local if input is aggregate export and output is local. | Delete generated local JSON/JSONL. | `npm test -- --runInBand --runTestsByPath lib/research-audit/seo-export-importer.test.ts`. |

## LanceDB/Bedrock Mutation Scripts

| Entrypoint | Gate | Rollback | Harness |
| --- | --- | --- | --- |
| `scripts/add-vitamin-b-complex-to-lancedb.ts` | PROHIBITED without explicit Bedrock + LanceDB mutation GO. | Restore prior LanceDB artifact/snapshot. | local mocked test or manual smoke in TASK_SPEC. |
| `scripts/add-vitamins-c-d-to-lancedb.ts` | PROHIBITED without explicit Bedrock + LanceDB mutation GO. | Restore prior LanceDB artifact/snapshot. | local mocked test or manual smoke in TASK_SPEC. |
| `scripts/enrich-lancedb-autocomplete.ts` | PROHIBITED without explicit LanceDB mutation GO. | Restore prior LanceDB artifact/snapshot. | local mocked test or export diff review. |
| `scripts/test-vitamin-b-search.ts` | Read/search path; requires LanceDB environment guard. | No persistent rollback if read-only. | local search test in TASK_SPEC. |

## Infrastructure Deploy/Write Scripts

All entries in this section require explicit human GO, STS account confirmation, TASK_SPEC,
rollback, and cost boundary before execution.

| Entrypoint | Gate | Rollback | Harness |
| --- | --- | --- | --- |
| `infrastructure/Makefile` deploy targets | AWS write/deploy gate. | CloudFormation rollback or stack-specific rollback. | `make pre-check` only after STS. |
| `infrastructure/deploy-staging.sh` | AWS write gate. | Delete/rollback staging stack. | staging smoke in TASK_SPEC. |
| `infrastructure/deploy-database.sh` | DB/AWS write gate. | DB rollback/migration rollback. | mocked infra tests first. |
| `infrastructure/deploy-cloudwatch-alarms.sh` | CloudWatch/SNS write gate. | Delete alarm stack. | CloudFormation validate-template. |
| `infrastructure/deploy-cloudwatch-monitoring.sh` | CloudWatch write gate. | Delete dashboard/alarms created. | validate-template or dry-run if supported. |
| `infrastructure/deploy-production-10-percent.sh` | PRODUCTION deploy/traffic gate. | `infrastructure/rollback-traffic.sh`. | production smoke matrix after human GO. |
| `infrastructure/deploy-production-10-percent-simplified.sh` | PRODUCTION deploy/traffic gate. | rollback traffic script. | production smoke matrix after human GO. |
| `infrastructure/deploy-production-50-percent.sh` | PRODUCTION traffic gate. | rollback traffic script. | production smoke matrix after human GO. |
| `infrastructure/deploy-production-100-percent.sh` | PRODUCTION traffic gate. | rollback traffic script. | production smoke matrix after human GO. |
| `infrastructure/rollback-traffic.sh` | PRODUCTION traffic mutation gate. | restore previous traffic split. | post-rollback smoke. |
| `infrastructure/decommission-legacy-system.sh` | Destructive production gate. | documented restoration plan required. | manual checklist only. |
| `infrastructure/init-rds-pgvector.sh` | DB write gate. | DB snapshot/rollback SQL. | migration test. |
| `infrastructure/upload-model-to-efs.sh` | EFS write gate. | remove uploaded model or restore EFS snapshot. | EFS verification script. |
| `infrastructure/create-efs-directories.sh` | EFS write gate. | remove created directories if empty. | `infrastructure/verify-efs-directories.sh`. |
| `infrastructure/configure-efs-mount.sh` | EC2/EFS config gate. | reverse mount config. | EFS verification script. |
| `infrastructure/enable-xray-tracing.sh` | Lambda config write gate. | disable X-Ray on same functions. | Lambda config readback. |
| `infrastructure/scripts/deploy-new-account.sh` | AWS account bootstrap gate. | account-specific teardown runbook. | pre-deployment check. |
| `infrastructure/scripts/deploy-optimized-stack.sh` | AWS write/deploy gate. | CloudFormation rollback/delete stack. | `infrastructure/scripts/pre-deployment-check.sh`. |
| `infrastructure/scripts/deploy-optimized-lambdas.sh` | Lambda update gate. | previous Lambda version/artifact rollback. | post-deployment verify. |
| `infrastructure/scripts/setup-nat-and-run-codebuild.sh` | VPC/NAT/CodeBuild write gate. | delete created NAT/CodeBuild resources. | dry-run/spec review. |
| `infrastructure/scripts/run-codebuild-efs-setup.sh` | CodeBuild write/execution gate. | stop build/delete temp resources. | buildspec review first. |
| `infrastructure/scripts/setup-efs-with-ec2.sh` | EC2/EFS write gate. | terminate temp EC2/delete temp resources. | post-deployment verify. |
| `infrastructure/scripts/setup-efs-data.sh` | EFS/LanceDB write gate. | restore EFS/LanceDB snapshot. | verify EFS directories. |
| `infrastructure/scripts/delete-all-staging-resources.sh` | Destructive AWS delete gate. | recreate from IaC; no autonomous execution. | explicit human checklist. |
| `infrastructure/scripts/delete-staging-stack.sh` | Destructive AWS delete gate. | redeploy staging stack. | explicit human checklist. |
| `infrastructure/scripts/cleanup-unused-resources.sh` | Destructive AWS delete gate. | resource-specific restore plan. | explicit human checklist. |
| `infrastructure/scripts/configure-sns-alerts.sh` | SNS write gate. | remove subscriptions/topics created. | readback confirmation. |

## Infrastructure Read/Verify Scripts

| Entrypoint | Gate | Rollback | Harness |
| --- | --- | --- | --- |
| `infrastructure/check-stack-status.sh` | AWS read-only after STS confirmation. | None. | command exits 0. |
| `infrastructure/verify-deployment.sh` | AWS read-only plus possible endpoint checks after STS. | None if read-only. | command exits 0. |
| `infrastructure/verify-efs-directories.sh` | AWS/EFS read-only after STS. | None if read-only. | command exits 0. |
| `infrastructure/monitor-production-24h.sh`, `monitor-production-1-week.sh` | AWS read-only after STS. | None if read-only. | command exits 0. |
| `infrastructure/scripts/post-deployment-verify.sh` | Mostly read-only but includes Lambda invoke in file; treat as Lambda invoke gate. | None/readback only if no invoke. | TASK_SPEC-specific. |
| `infrastructure/scripts/monitor-lancedb-metrics.sh` | AWS read-only after STS. | None. | command exits 0. |
| `infrastructure/scripts/calculate-costs.sh` | Local/AWS read-only depending implementation; STS if AWS. | None. | command exits 0. |
| `infrastructure/scripts/pre-deployment-check.sh` | Read/preflight after STS if AWS calls exist. | None. | command exits 0. |
| `infrastructure/smoke-tests.sh`, `infrastructure/scripts/smoke-tests-optimized.sh` | Remote smoke gate; production smoke requires explicit scope. | None if read-only. | command exits 0. |

## Template/Config Files

CloudFormation/YAML/TS config files under `infrastructure/**` are not executable by
themselves. Edits to these files are medium/high risk and require validation with
CloudFormation template validation or focused Jest where available before any deploy.
