# STORY ST-004 — Eliminar dependencia deprecada `uuid` (+ fix crypto global)

- Execution profile: Backend · Tier 0 · Riesgo: low · Branch: `feature/st-004-drop-uuid` · Tag esperado: [LOCKFILE-CHANGE]
- Ejecutor: PL directo. Loop Guard: 2 intentos.

## Problema
`uuid@9` está deprecado (warning en cada install). Node ≥18 trae `randomUUID` en `node:crypto`. Lo usan `aurora-engine/src/index.ts` y `input-processor/src/index.ts`. Además `aurora-memory/src/index.ts` usa el global `crypto.randomUUID()` que no existe en Node 18 (engines declara >=18) → import explícito de `node:crypto`.

## Scope (owns)
- `apps/aurora-engine/src/index.ts`, `apps/aurora-engine/package.json`
- `packages/input-processor/src/index.ts`, `packages/input-processor/package.json`
- `packages/aurora-memory/src/index.ts` (solo la línea del import/uso de randomUUID)
- `pnpm-lock.yaml`

## Implementation Intent
`import { randomUUID } from 'node:crypto'` y reemplazo 1:1 de `uuidv4()`/`crypto.randomUUID()`. Quitar `uuid` y `@types/uuid` de ambos package.json. `pnpm install` para regenerar lockfile.

## Functional Test Matrix
| AC | Estado | Riesgo | Escenario | Evidencia |
|---|---|---|---|---|
| AC-007 | success | low | FT-012: cero imports de `uuid` en src/ | grep |
| AC-007 | success | low | FT-013: typecheck verde en los 3 paquetes | tsc --noEmit |
| AC-007 | success | low | FT-014: `pnpm install` sin warning uuid@9 directo | output de install |

## Verification Commands
`pnpm install && npx tsc --noEmit -p apps/aurora-engine/tsconfig.json -p (cada paquete)` + grep uuid

## Behavior Delta: not-applicable — IDs siguen siendo UUID v4.
## Stop Condition: cualquier paquete que requiera uuid v5/v3 (no hay).
