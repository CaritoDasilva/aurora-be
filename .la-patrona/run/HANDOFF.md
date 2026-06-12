# HANDOFF — AUDIT-2026-06

Para retomar sin el chat:
1. Leer `.la-patrona/specs/traceability.md` (hallazgos R-01..R-08) y `EPIC_SPEC.md` (corte, tiers, territory map).
2. Estado en `run/RUN_STATE.md`. Si los ODC siguen pendientes → pedir decisión al Owner antes de tocar código.
3. Hallazgo crítico: command injection en `packages/aurora-skills/src/{call,sms}.ts` (interpolación de input en `cmd /c start`). Es ST-001, máxima prioridad.
4. Comandos de verificación del repo: `pnpm install`, `npx tsc --noEmit -p <pkg>/tsconfig.json` por paquete. No hay test runner aún (lo agrega ST-005).
5. Owner: usuario de la sesión (caritodasilva). Base branch: main. Push directo a main fue el patrón previo del repo; esta épica usa branches feature/* + merge.
