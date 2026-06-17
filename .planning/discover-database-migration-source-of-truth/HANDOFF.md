# HANDOFF - Discover Database Migration Source Of Truth

## Physical State

- Branch: `codex/reconcile-queue-pr-state`
- PR: #180 https://github.com/latisnere77/SuplementIA/pull/180
- Base: `main`
- Status: ready for review

## Discovery Result

- Current documented operational migration: `infrastructure/migrations/001_setup_pgvector.sql`.
- `run-migration.sh` defaults to `001_setup_pgvector.sql`.
- `run-migrations.ts` applies every `.sql` file alphabetically and can attempt both overlapping initial migrations.
- `npm run migrate` should not be used blindly until production/staging migration history is reconciled.

## Validation

Passed:

```bash
git diff --check
rg -n "Current Operational Source Of Truth|Do Not Run Both Initial Migrations Blindly|001_setup_pgvector.sql" infrastructure/migrations/README.md infrastructure/migrations/SOURCE_OF_TRUTH.md OBSERVATIONS.md
```

## Gates

- No migrations run.
- No database connection attempted.
- No merge performed.
- No deploy performed.
- No AWS, Lambda, Terraform, EventBridge, Bedrock, or feature flag changes.

## Next Safe Action

Continue with `Classify Portal And API Logging`.
