# STORY ST-002 — Hardening HTTP del engine (bind, payload, validación PUT /profile)

- Execution profile: Backend · Tier 0 · Riesgo: high (PII médica) · Branch: `feature/st-002-harden-http`
- Ejecutor: PL directo. Loop Guard: 2 intentos.

## Problema
`server.ts` escucha en todas las interfaces, CORS `*`, `express.json()` sin límite y `PUT /profile` acepta cualquier body (`as Partial<UserProfile>`) sin validar — corrompe el perfil o inyecta campos arbitrarios.

## Scope (owns)
- `apps/aurora-engine/src/server.ts`, `apps/aurora-engine/src/validate-profile.ts` (nuevo).
Reads: `packages/aurora-memory/src/types.ts`. Fuera de scope: index.ts (owns de ST-004).

## Implementation Intent
1. `app.listen(PORT, HOST)` con `HOST = process.env.AURORA_HOST ?? '127.0.0.1'`.
2. `express.json({ limit: '1mb' })`.
3. `validate-profile.ts`: `validateProfileUpdates(body)` → whitelist de campos (`name,lastName,language,age,medications,emergencyContacts,preferences`), chequeo de tipos y shapes (arrays, enums de preferences), rechaza claves desconocidas y `userId/createdAt/updatedAt` (gestionados por el sistema). Devuelve `{ ok:true, updates }` o `{ ok:false, errors }`.
4. `PUT /profile` valida antes de `engine.updateProfile`; inválido → 400 con errores.

## Functional Test Matrix
| AC | Estado | Riesgo | Escenario | Evidencia |
|---|---|---|---|---|
| AC-003 | error | critical | FT-005: PUT con `{"hacked":true}` → 400, perfil intacto | unit test validador |
| AC-003 | error | high | FT-006: `medications: "foo"` → 400 | unit test |
| AC-003 | success | high | FT-007: `{"name":"Rosa","age":70}` → 200 y persiste | unit test validador + typecheck |
| AC-004 | success | high | FT-008: server escucha 127.0.0.1 por defecto, AURORA_HOST lo overridea | code review + log de arranque |

## Verification Commands
`npx tsc --noEmit -p apps/aurora-engine/tsconfig.json && node --test apps/aurora-engine/dist` (validador)

## Behavior Delta → BEHAVIOR_DELTA_ST-002.md
## Stop Condition: cambiar el shape de UserProfile (eso sería [CONTRACT-CHANGE]).
