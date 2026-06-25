# CHANGE_MANIFEST — stop-hook-json-output

## Summary

Fixed the GSD Stop hook digest path so `node scripts/gsd/digest.mjs --hook` emits valid JSON while preserving the existing human-readable CLI output for default digest use. The digest now also includes tracked worktree changes in its tamper-visible file list before commit.

## Files Changed

- `scripts/gsd/digest.mjs`
  - Adds explicit `--hook` mode.
  - Builds digest data once, then renders either JSON for hook execution or text for operator CLI use.
  - Includes tracked worktree diffs against `origin/main` so edits under protected paths are visible before commit.
- `.planning/stop-hook-json-output/TASK_SPEC.md`
  - Documents scope, substitution test, validation, and human gates.
- `.planning/stop-hook-json-output/CHANGE_MANIFEST.md`
  - Records this implementation and certification evidence.
- `.planning/stop-hook-json-output/AUDIT_FANOUT.md`
  - Records independent read-only audit results after fan-out.

## Validation Plan

- `node --check scripts/gsd/digest.mjs`
- `node scripts/gsd/digest.mjs`
- `node scripts/gsd/digest.mjs --hook`
- `node scripts/gsd/digest.mjs --hook | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { JSON.parse(data); console.log('HOOK_JSON_VALID'); })"`
- `node scripts/gsd/digest.mjs | rg "tamper_visible=.*scripts/gsd/digest.mjs"`
- `npm run gsd:invariants`
- `npm run gsd:offline-certify -- --quick`
- read-only fan-out: reviewer, verifier, smoke tester
- `npm run gsd:done -- --audit-pass-file .planning/stop-hook-json-output/AUDIT_FANOUT.md`

## Risk Notes

- This touches `scripts/gsd/`, so invariant/tamper visibility is expected and must remain explicit.
- No hook registration, product code, cloud path, deploy path, or production content path is changed.
