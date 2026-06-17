# TASK_SPEC - Discover Database Migration Source Of Truth

Generated: 2026-06-17

## Objective

Identify the current migration source of truth without running migrations, touching database state, or changing SQL behavior.

## Reconciliation Against `origin/main`

- `package.json` exposes `npm run migrate` as `tsx infrastructure/migrations/run-migrations.ts`.
- `run-migrations.ts` applies every `.sql` file in `infrastructure/migrations/` alphabetically and records filenames in `schema_migrations`.
- `infrastructure/migrations/README.md` and `run-migration.sh` document/manual-default `001_setup_pgvector.sql`.
- `001_initial_schema.sql` and `001_setup_pgvector.sql` both create `supplements`, vector extension, indexes, trigger/function, and search-count function with overlapping but non-identical definitions.

## IN SCOPE

- `infrastructure/migrations/README.md`
- `infrastructure/migrations/SOURCE_OF_TRUTH.md`
- `OBSERVATIONS.md`
- `TASKS.md`
- `.planning/discover-database-migration-source-of-truth/**`

## OUT OF SCOPE

- Running `npm run migrate`
- Running `infrastructure/migrations/run-migration.sh`
- SQL schema edits
- Database connections
- AWS writes or CloudFormation changes
- Merge, deploy, Lambda, Terraform, EventBridge, Bedrock, feature flags

## Implementation Plan

1. Document the observed migration entrypoints and conflict.
2. State the current operational source of truth as the manual `001_setup_pgvector.sql` path documented by the migrations README and shell runner.
3. Mark the generic all-SQL runner as unsafe for fresh application until an explicit migration reconciliation task is approved.
4. Update observations and task state.

## Validation Harness

```bash
git diff --check
rg -n "Current Operational Source Of Truth|Do Not Run Both Initial Migrations Blindly|001_setup_pgvector.sql" infrastructure/migrations/README.md infrastructure/migrations/SOURCE_OF_TRUTH.md OBSERVATIONS.md
```

## Risks

- Risk: documenting source of truth could be misread as approval to run it.
- Mitigation: explicitly state no migrations were run and database/AWS changes remain gated.
