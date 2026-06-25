# TASK_SPEC — stop-hook-json-output

## Work Order

Fix ROADMAP Phase 3 / Nervous system: make the Stop hook digest command hook-compatible while preserving the human CLI digest output.

## Objective

`node scripts/gsd/digest.mjs --hook` must stop emitting plain text that the Stop hook runner rejects as invalid JSON. `npm run gsd:digest` and `node scripts/gsd/digest.mjs` must keep the existing human-readable digest, and digest tamper visibility must include tracked worktree changes before commit.

## In Scope

- `scripts/gsd/digest.mjs`
- `.planning/stop-hook-json-output/TASK_SPEC.md`
- `.planning/stop-hook-json-output/CHANGE_MANIFEST.md`
- `.planning/stop-hook-json-output/AUDIT_FANOUT.md`

## Out Of Scope

- `.codex/hooks.json`
- `scripts/gsd/pre-tool-policy.mjs`
- ROADMAP edits
- Product code
- CI workflow changes
- Merge, deploy, AWS writes, Lambda invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags, and `production-content-enricher`

## Substitution Test

If `--hook` continues printing plain text, Codex Stop hook execution can fail with `hook returned invalid stop hook JSON output`. If human digest output changes, operator-facing GSD observability regresses.

## Implementation Plan

- Refactor digest construction into an object plus text renderer.
- Include committed, tracked worktree, and untracked changes in the digest file list.
- Keep default CLI output exactly human-readable.
- Add `--hook` mode that prints valid JSON containing the same digest data and no blocking decision.
- Avoid adding dependencies or changing hook registration.

## Validation

```bash
node --check scripts/gsd/digest.mjs
node scripts/gsd/digest.mjs
node scripts/gsd/digest.mjs --hook
node scripts/gsd/digest.mjs --hook | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { JSON.parse(data); })"
node scripts/gsd/digest.mjs | rg "tamper_visible=.*scripts/gsd/digest.mjs"
npm run gsd:invariants
npm run gsd:offline-certify -- --quick
```

Then run read-only fan-out and:

```bash
npm run gsd:done -- --audit-pass-file .planning/stop-hook-json-output/AUDIT_FANOUT.md
```

## Stop Rules

- Stop if hook output schema cannot be made JSON-valid without weakening the Stop hook.
- Stop if invariant ratchet fails.
- Stop if any validation suggests hook mode blocks normal conversation flow.

## Human Gates

Human owns merge to `main`, deploy/production GO, `.deploy-go`, AWS writes, Lambda invoke/update, Terraform/EventBridge, Bedrock, LanceDB mutation, feature flags, and `production-content-enricher`.
