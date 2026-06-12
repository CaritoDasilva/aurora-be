# EPIC_SPEC — AUDIT-2026-06: Revisión y mejoras aurora-be

## Gate de trazabilidad
- `traceability.md`: R-01..R-05 covered; R-06/R-07 needs-owner-decision (ADR-001); R-08 missing (declarado fuera de scope).
- Patch proposal: not required si el Owner acepta el scope propuesto.

## Historias y ownership

| ID | Resumen | Tier | Riesgo | Profile |
|---|---|---|---|---|
| ST-001 | Sanitizar phone/URL antes de exec en aurora-skills | 0 | critical (seguridad) | Fullstack |
| ST-002 | Hardening HTTP: bind localhost, payload limit, validar PUT /profile | 0 | high (PII) | Backend |
| ST-003 | Fix whisper-bridge: transcripción única + temp file seguro | 0 | medium | Backend |
| ST-004 | Eliminar dependencia uuid deprecada → crypto.randomUUID | 0 | low | Backend |
| ST-005 | Tests node:test para aurora-memory + response-formatter + root script | 0 | low | QA |
| ST-006 | Consolidar memoria: channel-router→aurora-memory, borrar memory-plugin, unificar ActionCategory | 1 | medium (requiere ADR-001) | Fullstack |

## Matriz de paralelización
- tier_0 = {ST-001, ST-002, ST-003, ST-004, ST-005} — territorios disjuntos (ver Territory Map).
- tier_1 = {ST-006} — bloqueada por ADR-001 (decisión Owner) y cierre de tier_0.
- MAX_PARALLEL=4 → tier_0 en lotes: [ST-001, ST-002, ST-003, ST-004] y luego ST-005,
  o ejecución directa si el Owner lo prefiere (historias chicas, repo único).

## Territory Map
```json
{
  "ST-001": { "owns": ["packages/aurora-skills/src/phone.ts", "packages/aurora-skills/src/call.ts", "packages/aurora-skills/src/sms.ts", "packages/aurora-skills/src/search.ts", "packages/aurora-skills/src/*.test.ts", "packages/aurora-skills/package.json"], "reads": ["packages/aurora-skills/src/types.ts"] },
  "ST-002": { "owns": ["apps/aurora-engine/src/server.ts", "apps/aurora-engine/src/validate-profile.ts", "apps/aurora-engine/src/*.test.ts"], "reads": ["packages/aurora-memory/src/types.ts", "apps/aurora-engine/src/index.ts"] },
  "ST-003": { "owns": ["packages/input-processor/src/whisper-bridge.ts"], "reads": ["packages/input-processor/src/types.ts"] },
  "ST-004": { "owns": ["apps/aurora-engine/src/index.ts", "apps/aurora-engine/package.json", "pnpm-lock.yaml"], "reads": [] },
  "ST-005": { "owns": ["packages/aurora-memory/test/**", "packages/response-formatter/test/**", "package.json"], "reads": ["packages/aurora-memory/src/**", "packages/response-formatter/src/**"] },
  "ST-006": { "owns": ["packages/channel-router/**", "packages/memory-plugin/**", "packages/aurora-skills/src/types.ts"], "reads": ["packages/aurora-memory/src/**", "packages/safety-layer/src/types.ts"] }
}
```
Conflictos conocidos: ST-004 toca `pnpm-lock.yaml` → `[LOCKFILE-CHANGE]`, mergear al final del tier.
ST-002 lee (no edita) `index.ts` que ST-004 posee → sin conflicto de owns.

## Swarm Architecture
- PL (la_patrona) = manager; story-specialists = specialists; sin canal agente↔agente.
- Canales permitidos: Story Brief + STORY/MEMORY_PACKET/contratos readonly → subagente; tags + Agent Run Card + CHECKPOINT → PL.

## Agent Architecture Check (resumen; detalle en cada STORY)
Cada agente: input = Story Brief + specs; output = diff en su branch + evidencia; Verification = `npx tsc --noEmit -p <paquete>` + `node --test` donde aplique; Stop Condition = 2 intentos sin avance (Loop Guard) o scope fuera de territory.

## Owner Decision Cards
- ODC-1: Aprobar corte de historias tier_0. — PENDIENTE
- ODC-2: ADR-001 (eliminar memory-plugin, migrar channel-router). — PENDIENTE
- ODC-3: Autorizar creación de branches + subagentes (o ejecución directa por el PL). — PENDIENTE

## Governance
- Coverage policy: tests en archivos nuevos/modificados donde el runtime lo permita (node:test, sin deps nuevas).
- Evidencia sin secretos/PII. Los datos seed (María García, etc.) son ficticios del repo.
- Behavior Delta: ST-001/ST-002 tienen cambio observable → BEHAVIOR_DELTA propio; ST-003/ST-004/ST-005 not-applicable (sin cambio de comportamiento de cara al usuario; razón en cada STORY).
