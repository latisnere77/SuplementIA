# TASKS

Fecha de auditoria: 2026-07-01

Backlog fresco para Fase 2: El Oraculo Real. Cada tarea es local-only, debe crear
TASK_SPEC/CHANGE_MANIFEST/AUDIT_FANOUT, pasar su arnes local y recibir fan-out independiente
antes de marcar DONE. Produccion queda fuera de esta cola y requiere GO-gate humano con token
air-gapped.

- [ ] TAREA: Cubrir Scripts GSD Invariants Y DONE Oracle. ESTADO: DONE
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/invariant-ratchet.test.js scripts/gsd/__tests__/done-oracle.test.js`
  - Tipo de Tarea: GREEN-FIELD
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=20, apply_patch<=8, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 5; max tokens 60000; max tiempo 120m.

- [ ] TAREA: Cubrir Policy Hook Contra Comandos Permitidos Y Bloqueados. ESTADO: TODO
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/pre-tool-policy.test.js`
  - Tipo de Tarea: GREEN-FIELD
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=18, apply_patch<=7, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 5; max tokens 50000; max tiempo 90m.

- [ ] TAREA: Implementar DebounceHook Fisico Para Comandos Repetidos. ESTADO: TODO
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/tool-budget-policy.test.js && npm run gsd:invariants`
  - Tipo de Tarea: GREEN-FIELD
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=22, apply_patch<=8, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 5; max tokens 65000; max tiempo 120m.

- [ ] TAREA: Implementar LimitToolCounts Fisico Por Sesion. ESTADO: TODO
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/tool-budget-policy.test.js && npm run gsd:done -- --check-config-only`
  - Tipo de Tarea: GREEN-FIELD
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=24, apply_patch<=8, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 5; max tokens 65000; max tiempo 120m.

- [ ] TAREA: Crear Mini-Benchmark De Respuestas Del Oraculo. ESTADO: TODO
  - Criterio de Arnes: `node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json`
  - Tipo de Tarea: GREEN-FIELD
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=20, apply_patch<=8, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 5; max tokens 60000; max tiempo 120m.

- [ ] TAREA: Exigir Fan-Out Worktree-Aislado En DONE Oracle. ESTADO: TODO
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath scripts/gsd/__tests__/done-oracle.test.js && npm run gsd:invariants`
  - Tipo de Tarea: BUGFIX
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=18, apply_patch<=6, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 3; max tokens 45000; max tiempo 90m.

- [ ] TAREA: Documentar Y Validar DEAD_ENDS Como Entrada Del Loop. ESTADO: TODO
  - Criterio de Arnes: `npm run gsd:invariants`
  - Tipo de Tarea: REFACTOR
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=10, apply_patch<=4, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 3; max tokens 25000; max tiempo 45m.

- [ ] TAREA: Integrar Oracle Benchmark A Offline Certify Quick. ESTADO: TODO
  - Criterio de Arnes: `npm run gsd:offline-certify -- --quick && node scripts/gsd/oracle-benchmark.mjs --fixtures docs/oracle-benchmark-fixtures.json`
  - Tipo de Tarea: BUGFIX
  - GOBERNANZA POR HOOKS: `LimitToolCounts(exec<=16, apply_patch<=6, git<=4)`; `DebounceHook(max_same_command=2)`; max iteraciones 3; max tokens 40000; max tiempo 75m.
