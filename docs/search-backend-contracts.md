# Search Backend Contracts

Generated: 2026-06-17

## Primary Search Contract

Primary implementation: `lib/search-service.ts`.

Inputs:

- `query`: user query string.
- `limit`: result limit, default `5`.

Output shape:

- `SearchResult[]` with optional `title`, `name`, `abstract`, `description`, `ingredients`, `conditions`, `score`, `study_count`, `evidence_grade`, and `source`.
- `source` is one of `lancedb`, `lambda`, or `local_catalog`.

## Backend Selection

Environment variables:

- `SEARCH_BACKEND`
  - `local`: always uses local catalog.
  - `lancedb`: attempts LanceDB and does not fall back to Lambda.
  - `lambda`: skips LanceDB and attempts Lambda if `SEARCH_API_URL` is configured.
  - unset or unknown: `auto`.
- `USE_LANCEDB`
  - `false`: disables LanceDB.
  - any other value: allows LanceDB unless `SEARCH_BACKEND=local`.
- `SEARCH_API_URL`
  - enables Lambda Function URL fallback when non-empty and `SEARCH_BACKEND` is not `local` or `lancedb`.
- `LANCEDB_PATH`
  - defaults to `/tmp/lancedb-pristine`.
  - `auto` uses LanceDB only if `${LANCEDB_PATH}/supplements.lance/_versions` exists.
- `DEBUG_SEARCH`
  - `true` enables search debug logs.

Fallback order:

1. `SEARCH_BACKEND=local`: local catalog only.
2. `SEARCH_BACKEND=lancedb`: LanceDB, then local catalog if LanceDB returns no results or throws.
3. `SEARCH_BACKEND=lambda`: Lambda, then local catalog if Lambda returns no results or throws.
4. `auto`: LanceDB if local table exists, then Lambda if `SEARCH_API_URL` exists, then local catalog.

If LanceDB/Lambda throw and local catalog also has no results, the service rethrows the remote error.

## Local Catalog Contract

Source: `lib/portal/supplements-database.ts`.

Behavior:

- Deterministic in-repo fallback.
- Excludes entries where `category === 'condition'`.
- Normalizes accents and punctuation.
- Scores exact name, aliases, partial matches, and token matches.
- Deduplicates by normalized supplement name.
- Emits `source: 'local_catalog'` and default `evidence_grade: 'C'`.

This is the required backend for local e2e isolation.

## LanceDB And Bedrock Boundary

Source: `lib/lancedb-service.ts`.

LanceDB search:

- Opens local table `supplements` under `LANCEDB_PATH`.
- Generates query embeddings with Amazon Bedrock Titan V2.
- Uses `amazon.titan-embed-text-v2:0` with 512 dimensions.
- Maps LanceDB rows to normalized `LanceDBResult`.

Boundary:

- Any path that reaches `searchLanceDB()` can invoke Bedrock.
- Bedrock and production search behavior are governed paths.
- Local/e2e tests should set `SEARCH_BACKEND=local` and `USE_LANCEDB=false`.

## Lambda Search Contract

Source: `searchViaLambda()` in `lib/search-service.ts`.

Behavior:

- Uses `SEARCH_API_URL`.
- Sends `POST` with JSON content type to `${SEARCH_API_URL}?q=<query>&top_k=<limit>`.
- Accepts either an array response or an object with `results`.
- Maps returned result fields into `SearchResult` with `source: 'lambda'`.

No Lambda invoke/update is performed by this code path directly; it calls an HTTP URL if configured.

## Portal Routes

`app/api/portal/search/route.ts`:

- Validates `q` and `limit`.
- Calls `searchSupplements(q, limit)`.
- The log message says "via Lambda", but the actual backend is decided by `lib/search-service.ts`.

`app/api/portal/quiz/route.ts`:

- Calls `searchSupplements(searchTerm)` in hybrid search.
- Treats `SEARCH_BACKEND=local` specially for local known limited-evidence behavior.
- Can call search again with a higher limit for variant detection.

## Autocomplete Contract

Source: `lib/portal/autocomplete-suggestions-fuzzy.ts`.

Default behavior:

- Uses Fuse.js over `SUPPLEMENTS_DATABASE`.
- Supports `en` and `es`.
- Uses cross-language token matching and abbreviation expansion.

Remote behavior:

- `USE_LANCEDB=true` makes autocomplete call `searchLanceDB()`.
- That can reach Bedrock through `lib/lancedb-service.ts`.
- On LanceDB error or no results, autocomplete falls back to the local Fuse database.

API route:

- `app/api/portal/autocomplete/route.ts`
- Validates `q`, `lang`, and `limit`.
- Returns graceful empty suggestions on internal error.
- Adds Sentry breadcrumb on success and captures exceptions on failure.

## E2E Isolation Contract

`playwright.config.ts` starts the local server with:

```text
JOB_STORE_DRIVER=memory SEARCH_BACKEND=local USE_LANCEDB=false
```

This contract prevents local browser tests from using DynamoDB, LanceDB, Lambda search, or Bedrock embeddings through normal portal search paths.

## Open Follow-Ups

- Fix misleading `app/api/portal/search/route.ts` log text so it does not always say "via Lambda".
- Decide whether autocomplete should use `SEARCH_BACKEND` rather than only `USE_LANCEDB`.
- Keep `SEARCH_BACKEND=local` as the required e2e default.
