# Traceability — Épica AUDIT-2026-06: Revisión y mejoras aurora-be

Requisitos = hallazgos del audit (2026-06-12). Diseño = decisión técnica propuesta.

| Requisito | Decisión de diseño | Historia | Criterio de aceptación | Test | Estado |
|---|---|---|---|---|---|
| R-01: Eliminar command injection en call/sms/search (input libre → `cmd /c start`) | Helper `sanitizePhone()` E.164-like (`/^\+?\d{3,15}$/`) en aurora-skills; nunca interpolar texto no validado en exec | ST-001 | AC-001: input no numérico jamás llega a exec; AC-002: número válido sigue funcionando | unit (node:test) | covered |
| R-02: Endurecer servidor HTTP (bind, payload, validación PUT /profile) | Bind `127.0.0.1` por defecto (`AURORA_HOST` para override), `express.json({limit:'1mb'})`, whitelist+validación de shape en PUT /profile | ST-002 | AC-003: PUT con campos inválidos → 400; AC-004: server escucha solo localhost por defecto | unit | covered |
| R-03: whisper-bridge transcribe 2× y usa script temporal con nombre fijo en cwd | Una sola pasada de transcribe; script en `os.tmpdir()` con sufijo aleatorio | ST-003 | AC-005: una sola llamada a `model.transcribe`; AC-006: script temp único fuera del repo | inspección + typecheck | covered |
| R-04: Quitar dependencia deprecada `uuid` | `crypto.randomUUID()` nativo en aurora-engine; quitar uuid/@types/uuid | ST-004 | AC-007: cero imports de `uuid`; pnpm install sin warning uuid@9 | typecheck + grep | covered |
| R-05: Tests ejecutables (aurora-memory sin tests; solo scripts manuales) | `node:test` (sin deps nuevas) para aurora-memory (profile/history/context) y response-formatter; script `test` en root | ST-005 | AC-008: `pnpm test` corre y pasa; AC-009: aurora-memory cubierto en sus 3 módulos | node:test | covered |
| R-06: Duplicación memory-plugin vs aurora-memory; ActionCategory duplicado; contactos en 2 JSONs | Migrar channel-router → aurora-memory, eliminar memory-plugin, unificar ActionCategory (skills importa de safety-layer) | ST-006 | AC-010: cero referencias a @aurora/memory-plugin; AC-011: una sola definición de ActionCategory | typecheck + grep | needs-owner-decision (ADR-001: borrar paquete es difícil de revertir) |
| R-07: ChannelRouter crashea al instanciar sin ANTHROPIC_API_KEY; SKILL_CALL text-based vs tool_use | Incluido en ST-006 (lazy client init); tool_use queda fuera de scope | ST-006 | AC-012: instanciar sin API key no lanza | unit | needs-owner-decision (va con ADR-001) |
| R-08: Contactos duplicados (aurora-skills/data vs aurora-memory profile) | Fuente única: skills resuelve desde perfil | — | — | — | missing (fuera de scope de esta épica; requiere contrato skills↔memory) |
