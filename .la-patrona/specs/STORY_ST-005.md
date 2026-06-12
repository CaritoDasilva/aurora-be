# STORY ST-005 — Tests ejecutables con node:test (aurora-memory + response-formatter)

- Execution profile: QA · Tier 0 · Riesgo: low · Branch: `feature/st-005-node-tests`
- Ejecutor: PL directo. Loop Guard: 2 intentos.

## Problema
No hay test runner: solo scripts manuales `test.ts` con console.log. `aurora-memory` (perfil médico + system prompt) tiene cero tests. Node 24 trae `node:test` nativo — cero deps nuevas.

## Scope (owns)
- `packages/aurora-memory/src/*.test.ts` (nuevos), `packages/aurora-memory/package.json` (script test)
- `packages/response-formatter/src/*.test.ts` (nuevo), `packages/response-formatter/package.json` (script test)
- `package.json` raíz (script `test`: `pnpm -r run test`)

## Implementation Intent
1. `profile.test.ts`: load crea default si no existe (en tmpdir), save/load roundtrip, updateProfile mergea preferences y actualiza updatedAt.
2. `history.test.ts`: saveEntry agrega, trim a 50, getRecentHistory devuelve últimos n en orden reciente-primero.
3. `context.test.ts`: buildSystemPrompt incluye nombre/edad, medicamentos con horario y notas, contactos con teléfono, hints de relación ("mi hija" → María García) y últimos 3 intercambios; perfiles vacíos no rompen.
4. `formatter.test.ts`: trunca a 3 oraciones, quita markdown, SSML escapa entidades y aplica rate.
5. Scripts: cada paquete `"test": "tsc && node --test dist"`; root `"test": "pnpm -r run test"`.
Los tests usan paths en `os.tmpdir()` — NUNCA tocan `data/profile.json` real.

## Functional Test Matrix
| AC | Estado | Riesgo | Escenario | Evidencia |
|---|---|---|---|---|
| AC-008 | success | low | FT-015: `pnpm test` desde root corre y pasa | output runner |
| AC-009 | success | medium | FT-016: los 3 módulos de aurora-memory cubiertos (≥1 caso éxito + 1 borde c/u) | output runner |
| AC-009 | error | medium | FT-017: history corrupto/inexistente → [] sin crash | unit test |
| AC-009 | empty | medium | FT-018: perfil sin meds/contactos → prompt válido | unit test |

## Verification Commands
`pnpm test` (root)

## Behavior Delta: not-applicable — solo agrega tests e infraestructura.
## Stop Condition: necesidad de modificar código de producción para testear (eso sería bug real → reportar antes de tocar).
