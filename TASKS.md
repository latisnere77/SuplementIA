# TASKS

Fecha de auditoria: 2026-07-01

Formato canonico para Fase 2. Cada tarea debe ejecutarse bajo AGENTS.md, SDD y GSD.

- [ ] TAREA: Revalidar Gate AWS De Phase 7. ESTADO: BLOCKED
  - Riesgo: Alto.
  - Presupuesto de Archivos por Riesgo: Alto, max 20 archivos con Lote Piloto de 10 archivos.
  - Criterio de Arnes: `aws sts get-caller-identity --profile suplementai-admin --output json`
  - Condicion de exito: el JSON contiene `"Account": "643942183354"`.
  - Stop rule: si STS no ejecuta o la cuenta no coincide, no editar archivos ni hacer AWS writes.
  - Bloqueo: el comando fue rechazado por politica local antes de AWS: `approval required by policy, but AskForApproval is set to Never`.

- [ ] TAREA: Crear SPEC Ejecutable De Phase 7 AWS Report-Only. ESTADO: DONE
  - Riesgo: Alto.
  - Presupuesto de Archivos por Riesgo: Alto, max 20 archivos con Lote Piloto de 10 archivos.
  - Criterio de Arnes: `npm run gsd:done -- --audit-pass-file .planning/phase7-aws-report-only-implementation/AUDIT_FANOUT.md`
  - Condicion de exito: TASK_SPEC incluye rollback, costos, PII, IAM, S3, Lambda, input/output S3, safe defaults y stop rules antes de cualquier write.
  - Stop rule: no EventBridge/scheduling, no portal deploy, no `.deploy-go`, no Bedrock, no LanceDB, no `production-content-enricher`.

- [ ] TAREA: Inventariar Y Clasificar Rutas Debug/Test. ESTADO: DONE
  - Riesgo: Alto.
  - Presupuesto de Archivos por Riesgo: Alto, max 20 archivos con Lote Piloto de 10 archivos.
  - Criterio de Arnes: `npm run test:e2e -- e2e/portal.spec.ts --workers=1`
  - Condicion de exito: cada ruta debug/test queda clasificada como conservar, proteger, remover o bloquear con evidencia.
  - Stop rule: si una ruta puede ser production-reachable y su uso es ambiguo, documentar bloqueo antes de borrar.

- [ ] TAREA: Quarantinar Archivos Duplicados Con Sufijo 2. ESTADO: DONE
  - Riesgo: Medio.
  - Presupuesto de Archivos por Riesgo: Medio, max 50 archivos.
  - Criterio de Arnes: `npm run validate`
  - Condicion de exito: duplicados comparados contra originales y eliminados/quarantinados solo si no afectan build/test.
  - Stop rule: si un duplicado tiene diferencias semanticas no explicadas, registrar en OBSERVATIONS.md y no borrar.

- [ ] TAREA: Crear Matriz De Scripts Infra Permitidos Y Prohibidos. ESTADO: DONE
  - Riesgo: Medio.
  - Presupuesto de Archivos por Riesgo: Medio, max 50 archivos.
  - Criterio de Arnes: `npm run gsd:invariants`
  - Condicion de exito: cada script en `infrastructure/**` y `scripts/**` con potencial deploy/write queda mapeado a gate, rollback y arnes.
  - Stop rule: no ejecutar scripts de deploy, migracion, LanceDB, Bedrock o cleanup durante esta tarea.

- [ ] TAREA: Disenar Persistencia Analytics Privacy-Safe. ESTADO: DONE
  - Riesgo: Alto.
  - Presupuesto de Archivos por Riesgo: Alto, max 20 archivos con Lote Piloto de 10 archivos.
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath lib/research-audit/events.test.ts lib/research-audit/redaction.test.ts`
  - Condicion de exito: diseno define agregacion, redaccion, retencion, schema y limites de no PII antes de writes.
  - Stop rule: no guardar payloads crudos, IPs, user agents, session IDs, emails, URLs completas ni historias medicas.

- [ ] TAREA: Verificar Funnel Monetizacion Offline. ESTADO: DONE
  - Riesgo: Alto.
  - Presupuesto de Archivos por Riesgo: Alto, max 20 archivos con Lote Piloto de 10 archivos.
  - Criterio de Arnes: `npm test -- --runInBand --runTestsByPath lib/portal/iherb-affiliate.test.ts`
  - Condicion de exito: afiliados y suscripcion quedan cubiertos por tests offline sin compra live ni mutacion de checkout.
  - Stop rule: no live purchase, no Stripe mutation, no production flag change.

- [ ] TAREA: Ratchet Incremental De Coverage Por Area. ESTADO: DONE
  - Riesgo: Medio.
  - Presupuesto de Archivos por Riesgo: Medio, max 50 archivos.
  - Criterio de Arnes: `npm test -- --runInBand --coverage`
  - Condicion de exito: propuesta de ratchet por modulo sin bajar coverage ni romper `jest.config.js`.
  - Stop rule: no mezclar ratchet de coverage con cambios de producto.

- [ ] TAREA: Confirmar Paridad Local CI. ESTADO: DONE
  - Riesgo: Bajo.
  - Presupuesto de Archivos por Riesgo: Bajo, max 200 archivos.
  - Criterio de Arnes: `npm run gsd:invariants && npm run lint && npm run type-check && npm run build && npm test -- --runInBand && npm run test:e2e`
  - Condicion de exito: documentar diferencias entre CI y local, incluyendo `npm audit` y `RUN_REAL_SEARCHES=1`.
  - Stop rule: no cambiar CI sin TASK_SPEC separado.

- [ ] TAREA: Generar Benchmark L2 A L3 Para Agentes. ESTADO: DONE
  - Riesgo: Bajo.
  - Presupuesto de Archivos por Riesgo: Bajo, max 200 archivos.
  - Criterio de Arnes: `node scripts/gsd-autonomous.mjs --recon`
  - Condicion de exito: definir mini-benchmark para subir autonomia solo con tareas disjuntas, verificador read-only y evidencia GSD.
  - Stop rule: no declarar L3 efectivo para writes remotos ni merges; mantener gates humanos vigentes.
