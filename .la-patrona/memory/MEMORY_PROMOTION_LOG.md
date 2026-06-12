# MEMORY_PROMOTION_LOG — AUDIT-2026-06

Aprendizajes promovidos al cierre (2026-06-12):

1. `node --test <dir>` en Node 24 colapsa el resumen por directorio (reporta 1 entrada) pero
   propaga fallos vía exit code 1 — verificado con sanity check. Los scripts `tsc && node --test dist`
   son confiables para CI.
2. `apps/aurora-engine/dist/test.js` matchea el patrón default de node:test → el script test del
   engine apunta explícitamente a `dist/validate-profile.test.js` (el pipeline manual quedó en
   `test:pipeline`).
3. La taxonomía ActionCategory vive en `@aurora/safety-layer`; aurora-skills la re-exporta.
   No volver a duplicarla.
4. Todo valor que llegue a `exec`/Twilio debe pasar por `sanitizePhone()` de aurora-skills.
