# Production content enricher source recovery

Date: 2026-06-14

Scope: read-only source-recovery probe for Lambda
`production-content-enricher` in account `643942183354`, region `us-east-1`.

Verdict: `RED/BLOCKED`.

Faithful source recovery is not possible from the live artifact. The live
artifact contains compiled JavaScript and declaration files. It also contains an
embedded `index.zip` with sourcemaps for part of the first-party `dist`, but
those maps do not include `sourcesContent`. Sourcemaps without embedded original
source text are not enough to recover the TypeScript tree faithfully.

Do not reconstruct TypeScript by hand from the compiled JavaScript.

## AWS actions performed

Read-only only:

- `aws lambda get-function-configuration`
- `aws lambda get-function`
- Downloaded the presigned `Code.Location` URL immediately into a scratch
  directory outside the repo.

No AWS writes were performed. No Lambda invoke was performed. No Bedrock
inference was performed.

Scratch location used for the probe:

```text
/tmp/enricher-artifact-20260614181739
```

The presigned `Code.Location` URL was not persisted in the repo or copied into
this document.

## Live Lambda metadata

```text
FunctionName: production-content-enricher
FunctionArn: arn:aws:lambda:us-east-1:643942183354:function:production-content-enricher
Runtime: nodejs22.x
Role: arn:aws:iam::643942183354:role/production-suplementia-lambda-role
Handler: index.handler
CodeSize: 20412225
Description: Content Enricher Lambda for Suplementia Production
Timeout: 300
MemorySize: 1024
LastModified: 2026-06-08T02:03:30.000+0000
CodeSha256: HQnp3PT5VFNxk4Ve0ZR/AIBFLvfGAYa8ncRQbXR/JKA=
Version: $LATEST
PackageType: Zip
Architectures: arm64
EphemeralStorage: 512 MB
TracingConfig: Active
LogGroup: /aws/lambda/production-content-enricher
```

Environment variables present, values redacted:

```text
USE_TOOL_API=<redacted>
ENVIRONMENT=<redacted>
MAX_TOKENS=<redacted>
XRAY_ENABLED=<redacted>
BEDROCK_MODEL_ID=<redacted>
```

## Artifact inventory

Downloaded zip size:

```text
20412225 bytes
```

Root first-party files:

```text
bedrock.d.ts
bedrock.js
bedrockConverse.d.ts
bedrockConverse.js
cache.d.ts
cache.js
config.d.ts
config.js
index.d.ts
index.js
index.zip
job-store.d.ts
job-store.js
package.json
prompts-examine-style.d.ts
prompts-examine-style.js
prompts.d.ts
prompts.js
retry.d.ts
retry.js
studySummarizer.d.ts
studySummarizer.js
synergies.d.ts
synergies.js
toolSchema.d.ts
toolSchema.js
types.d.ts
types.js
```

Root package summary:

```text
name: @suplementia/dist
version: 1.0.0
type: commonjs
main: index.js
scripts.test: echo "Error: no test specified" && exit 1
```

No root lockfile or `tsconfig.json` was present:

```text
package-lock.json: missing
yarn.lock: missing
pnpm-lock.yaml: missing
tsconfig.json: missing
```

The artifact includes `node_modules`. The root `package.json` contains runtime
dependencies only and also includes duplicated dependency names with a ` 2`
suffix, which is another signal that this is packaged output, not the original
source project.

## Sourcemap probe

Root artifact:

```text
root first-party JS files: 13
root first-party d.ts files: 13
root .map files: 0
root sourceMappingURL comments in first-party JS: present
root sourcesContent in first-party JS/d.ts/package files: absent
```

Every root first-party JavaScript file has a sourcemap comment such as:

```text
//# sourceMappingURL=index.js.map
```

But the corresponding root `.js.map` files are missing:

```text
bedrock.js.map MISSING
bedrockConverse.js.map MISSING
cache.js.map MISSING
config.js.map MISSING
index.js.map MISSING
job-store.js.map MISSING
prompts-examine-style.js.map MISSING
prompts.js.map MISSING
retry.js.map MISSING
studySummarizer.js.map MISSING
synergies.js.map MISSING
toolSchema.js.map MISSING
types.js.map MISSING
```

Nested `index.zip`:

The artifact root contains an `index.zip`. Unzipping it in scratch revealed a
`dist/` tree with first-party maps for these modules:

```text
dist/bedrock.js.map -> ../src/bedrock.ts
dist/bedrockConverse.js.map -> ../src/bedrockConverse.ts
dist/cache.js.map -> ../src/cache.ts
dist/config.js.map -> ../src/config.ts
dist/index.js.map -> ../src/index.ts
dist/prompts-examine-style.js.map -> ../src/prompts-examine-style.ts
dist/prompts.js.map -> ../src/prompts.ts
dist/retry.js.map -> ../src/retry.ts
dist/studySummarizer.js.map -> ../src/studySummarizer.ts
dist/toolSchema.js.map -> ../src/toolSchema.ts
dist/types.js.map -> ../src/types.ts
```

The nested first-party `.d.ts.map` files point to the same `../src/*.ts`
locations for those modules.

Critical finding:

```text
nested first-party map files: 22
nested first-party maps with sourcesContent: 0
```

Example map structure:

```json
{
  "file": "dist/index.js.map",
  "version": 3,
  "sources": ["../src/index.ts"],
  "hasSourcesContent": false,
  "sourcesContentCount": 0
}
```

The nested `index.zip` did not provide first-party maps for the root-only modules
observed in the live artifact:

```text
job-store.ts
synergies.ts
```

## Per-module recovery status

| Module | Root compiled JS | Root map | Nested map | sourcesContent | Faithful TS recoverable |
| --- | --- | --- | --- | --- | --- |
| `index.ts` | present | missing | present | absent | no |
| `bedrock.ts` | present | missing | present | absent | no |
| `bedrockConverse.ts` | present | missing | present | absent | no |
| `cache.ts` | present | missing | present | absent | no |
| `config.ts` | present | missing | present | absent | no |
| `prompts.ts` | present | missing | present | absent | no |
| `prompts-examine-style.ts` | present | missing | present | absent | no |
| `retry.ts` | present | missing | present | absent | no |
| `studySummarizer.ts` | present | missing | present | absent | no |
| `toolSchema.ts` | present | missing | present | absent | no |
| `types.ts` | present | missing | present | absent | no |
| `job-store.ts` | present | missing | missing | absent | no |
| `synergies.ts` | present | missing | missing | absent | no |

## Why this is RED

Faithful recovery from sourcemaps requires the original source text to be
embedded in `sourcesContent`, or the original source files to exist at the
referenced paths. This artifact only provides compiled `.js`, `.d.ts`, sourcemap
path metadata, and dependency files.

The maps say that files such as `../src/prompts.ts` once existed, but they do not
include the file contents. Recovering TypeScript from the compiled JavaScript
would be manual reconstruction, which is explicitly outside the governance gate.

## Operator handoff package

The operator must provide the original source project that produced the live
Lambda artifact, not a reconstruction.

Required artifacts:

- Complete TypeScript source tree, including:
  - `src/index.ts`
  - `src/bedrock.ts`
  - `src/bedrockConverse.ts`
  - `src/cache.ts`
  - `src/config.ts`
  - `src/prompts.ts`
  - `src/prompts-examine-style.ts`
  - `src/retry.ts`
  - `src/studySummarizer.ts`
  - `src/toolSchema.ts`
  - `src/types.ts`
  - `src/job-store.ts`
  - `src/synergies.ts`
- Source `package.json`.
- Lockfile: `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`.
- `tsconfig.json`.
- Build command that produces `dist`.
- Packaging command that produces the Lambda zip.
- Deploy command or CI/CD pipeline definition.
- Repo-to-Lambda mapping.
- Last source commit matching the live Lambda, or the closest known commit plus
  a documented diff.
- Identity of the person, machine, or pipeline that deployed the current live
  version.
- Any deployment logs that connect the source commit to CodeSha256
  `HQnp3PT5VFNxk4Ve0ZR/AIBFLvfGAYa8ncRQbXR/JKA=`.

Questions for the operator:

1. Where is the source repo or working tree containing `src/*.ts`?
2. Was the live zip produced by CI, local build, or another deployment system?
3. What exact command produced `dist/`?
4. What exact command produced the Lambda zip?
5. Was `index.zip` intentionally included inside the root Lambda zip?
6. Why are sourcemap comments present in root `.js` files while root `.map`
   files are absent?
7. Why does nested `index.zip` contain sourcemaps without `sourcesContent`?
8. Why are `job-store` and `synergies` present in the root artifact but absent
   from nested `index.zip` first-party maps?
9. Which source commit corresponds to CodeSha256
   `HQnp3PT5VFNxk4Ve0ZR/AIBFLvfGAYa8ncRQbXR/JKA=`?
10. Are there uncommitted local changes or generated files that were included in
    the live zip?

## Unblock criteria

The enricher remains blocked until all criteria are met:

1. Original TypeScript source tree is delivered.
2. Source project includes package metadata, lockfile, and tsconfig.
3. Build command reproduces a `dist/` tree from source.
4. Packaging command is known and reproducible.
5. Rebuilt artifact either matches live CodeSha256 exactly or has a small,
   documented, understood diff.
6. Deployment path is versioned or documented well enough for rollback.
7. A no-behavior-change source/IaC PR lands before any model, prompt, cache, or
   cost optimization.

## Stop condition

RED: faithful source recovery not possible from the live artifact. Enricher
remains BLOCKED pending operator delivery of the original TS source tree.
