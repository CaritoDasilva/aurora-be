# STORY ST-006 — Consolidar memoria (ADR-001): migrar channel-router, borrar memory-plugin, unificar ActionCategory

- Execution profile: Fullstack · Tier 1 (depends-on: cierre tier 0 + ADR-001 ✅) · Riesgo: medium · Branch: `feature/st-006-consolidate-memory` · Tag esperado: [LOCKFILE-CHANGE]
- Ejecutor: PL directo. Loop Guard: 2 intentos.

## Scope (owns)
- `packages/channel-router/src/index.ts`, `packages/channel-router/package.json`
- `packages/memory-plugin/**` (eliminación completa)
- `packages/aurora-skills/src/types.ts`, `packages/aurora-skills/package.json` (re-export ActionCategory)
- `pnpm-lock.yaml`

## Implementation Intent
1. channel-router: dep `@aurora/memory-plugin` → `@aurora/aurora-memory`; adaptar `buildSystemPrompt` al shape nuevo (`name`, `language` directo, `emergencyContacts`); lazy-init del cliente Anthropic (hoy crashea al construir sin ANTHROPIC_API_KEY).
2. Borrar `packages/memory-plugin/` (git rm). Restaurable por revert (ADR-001).
3. `aurora-skills`: `ActionCategory` pasa a re-export desde `@aurora/safety-layer` (dueña de la taxonomía por el classifier); dep workspace agregada. Shape idéntico → sin cambios de API.
4. `pnpm install` → lockfile.

## Functional Test Matrix
| AC | Estado | Riesgo | Escenario | Evidencia |
|---|---|---|---|---|
| AC-010 | success | medium | FT-019: grep `memory-plugin` → 0 referencias fuera de .la-patrona/git | grep |
| AC-011 | success | medium | FT-020: 1 sola declaración de ActionCategory; typecheck verde en todos | tsc --noEmit |
| AC-012 | success | medium | FT-021: `new ChannelRouter()` sin API key no lanza | unit test |
| AC-010 | falla de dependencia | high | FT-022: build completo del monorepo verde tras borrar el paquete | pnpm -r build |

## Verification Commands
`pnpm install && pnpm -r run build && node --test packages/channel-router/dist`

## Behavior Delta → BEHAVIOR_DELTA_ST-006.md (prompt del router cambia de fuente de datos)
## Stop Condition: cualquier import externo de memory-plugin no detectado → [BLOCKER].
