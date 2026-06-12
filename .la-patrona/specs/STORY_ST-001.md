# STORY ST-001 — Sanitizar phone/URL antes de exec (command injection)

- Execution profile: Fullstack · Tier 0 · Riesgo: critical · Branch: `feature/st-001-sanitize-exec`
- Ejecutor: PL directo (Owner ODC-3). Loop Guard: 2 intentos.

## Problema
`call.ts` y `sms.ts` interpolan `phone` (que es el input libre del usuario cuando no matchea contacto) en `cmd /c start tel:${phone}`. Un mensaje tipo "llama a x & del /q ..." ejecuta comandos. `search.ts` interpola URL sin comillas en `start`.

## Scope (owns)
- `packages/aurora-skills/src/phone.ts` (nuevo), `call.ts`, `sms.ts`, `search.ts`, `phone.test.ts` (nuevo), `package.json` (script test).
Fuera de scope: types.ts, contacts.ts, reminder.ts, engine.

## Implementation Intent
1. `phone.ts`: `sanitizePhone(raw)` → normaliza (quita espacios/guiones/paréntesis) y valida `/^\+?\d{3,15}$/`; devuelve string normalizado o `null`.
2. `call.ts`/`sms.ts`: tras resolver contacto, sanitizar; si `null` → `{ success:false, message:'No tengo un número válido para <name>' }` sin tocar exec ni Twilio.
3. `search.ts`: `cmd /c start "" "<url>"` con URL ya encodeada.
4. Tests node:test para sanitizePhone (válidos, inyección, vacío) en `src/phone.test.ts`; script `"test": "tsc && node --test dist"`.

## Functional Test Matrix
| AC | Estado | Riesgo | Escenario | Evidencia |
|---|---|---|---|---|
| AC-001 | success | critical | FT-001: input `+1555000001` pasa y llama | unit test |
| AC-001 | error | critical | FT-002: input `x & calc.exe` → rechazado, exec NO se invoca | unit test |
| AC-001 | empty | medium | FT-003: input vacío → rechazado con mensaje claro | unit test |
| AC-002 | success | high | FT-004: `555 000-0001` se normaliza a `5550000001` | unit test |

## Verification Commands
`pnpm --filter @aurora/aurora-skills run build && node --test packages/aurora-skills/dist`

## Behavior Delta → BEHAVIOR_DELTA_ST-001.md
## Stop Condition: tests rojos tras 2 intentos o necesidad de tocar archivos fuera de owns.
