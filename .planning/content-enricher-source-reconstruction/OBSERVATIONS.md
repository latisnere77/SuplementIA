# Observations: content enricher source reconstruction

- The original TypeScript source remains unavailable. This PR establishes a governed reconstructed source tree as a new source of truth rather than claiming recovery of the original authoring tree.
- The reconstructed modules are intentionally close to the compiled dist. They are not refactored into idiomatic TypeScript in this pass because behavioral fidelity is the primary requirement.
- The build artifact is generated under `services/content-enricher/dist/` and ignored from git.
- A future deploy PR should be a separate human-gated step with artifact comparison, package/install review, Lambda packaging, and production canary/rollback plan.

