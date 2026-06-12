# STORY ST-003 — whisper-bridge: transcripción única + temp file seguro

- Execution profile: Backend · Tier 0 · Riesgo: medium · Branch: `feature/st-003-whisper-fix`
- Ejecutor: PL directo. Loop Guard: 2 intentos.

## Problema
El script Python embebido llama `model.transcribe()` DOS veces (la segunda solo para `segments`) → doble costo de CPU en cada audio. Además escribe `.whisper_transcribe.py` con nombre fijo en `process.cwd()` → colisión entre requests concurrentes y basura en el repo.

## Scope (owns)
- `packages/input-processor/src/whisper-bridge.ts`.

## Implementation Intent
1. Python: materializar `segs = list(segments)` una sola vez y derivar `text` y `segments` de esa lista.
2. Script temporal: `path.join(os.tmpdir(), 'aurora-whisper-' + randomUUID() + '.py')`; cleanup en `finally`/close como hoy.

## Functional Test Matrix
| AC | Estado | Riesgo | Escenario | Evidencia |
|---|---|---|---|---|
| AC-005 | success | medium | FT-009: una sola llamada a `model.transcribe` en el script | code review (no hay CI con python) |
| AC-006 | success | medium | FT-010: el path temporal usa tmpdir + sufijo único | code review + typecheck |
| AC-005 | error | medium | FT-011: exit code ≠ 0 sigue rechazando con stderr | code review (lógica intacta) |

## Verification Commands
`npx tsc --noEmit -p packages/input-processor/tsconfig.json`

## Behavior Delta: not-applicable — mismo output observable, solo performance/robustez interna.
## Stop Condition: necesidad de cambiar el contrato TranscriptionResult.
