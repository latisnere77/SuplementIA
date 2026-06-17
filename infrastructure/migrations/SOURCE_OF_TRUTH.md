# Database Migration Source Of Truth

Generated: 2026-06-17

## Current Operational Source Of Truth

For the existing RDS pgvector setup, the current documented operational migration is:

```text
infrastructure/migrations/001_setup_pgvector.sql
```

Evidence:

- `infrastructure/migrations/README.md` instructs operators to run `./run-migration.sh staging 001_setup_pgvector.sql`.
- `infrastructure/migrations/run-migration.sh` defaults `MIGRATION_FILE` to `001_setup_pgvector.sql`.
- The README documents `001_setup_pgvector.sql` as the initial setup of the pgvector extension and `supplements` table.

## Do Not Run Both Initial Migrations Blindly

`001_initial_schema.sql` and `001_setup_pgvector.sql` overlap. Both create:

- `vector` extension
- `supplements` table
- vector index on `embedding`
- name/search-count/last-searched indexes
- `update_updated_at_column()`
- `update_supplements_updated_at` trigger
- `increment_search_count()`

The definitions are not identical:

- `001_initial_schema.sql` adds `UNIQUE` on `supplements.name`, helper views, a composite popular/recent index, and comments.
- `001_setup_pgvector.sql` adds `search_supplements()`, scientific-name index, verification notices, and different index names.
- `001_initial_schema.sql` drops the update trigger before recreating it; `001_setup_pgvector.sql` creates the trigger directly.

Because `run-migrations.ts` applies every `.sql` file alphabetically, a fresh `npm run migrate` may attempt both initial migrations. Treat that path as unsafe until a dedicated schema reconciliation task decides whether to consolidate, rename, archive, or split these migrations.

## Discovery Boundary

This document is read-only discovery output. No migrations were run, no database was contacted, and no AWS resources were changed.

## Next Required Decision

Before any schema change:

1. Confirm production/staging `schema_migrations` history with read-only access.
2. Decide whether `run-migrations.ts` should skip archival SQL or whether one initial migration should be retired.
3. Produce a forward-only migration plan that does not rewrite applied production history.
