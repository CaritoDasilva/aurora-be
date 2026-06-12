# BEHAVIOR_DELTA ST-006

## MODIFIED — ChannelRouter construye el prompt desde aurora-memory
- Actual (fuente: `channel-router/src/index.ts` buildSystemPrompt): perfil de memory-plugin (contacts con isEmergency, preferences.language IANA).
- Requisito: mismo prompt funcional desde el shape de aurora-memory (name/lastName, language, emergencyContacts). El texto visible para Claude mantiene la misma información.
## MODIFIED — Instanciar ChannelRouter sin API key no lanza
- Actual: `new Anthropic({ apiKey: undefined })` lanza en el constructor.
- Requisito: el error solo ocurre al llamar `route()` sin key, con mensaje claro.
## REMOVED — Paquete @aurora/memory-plugin
- Fuente: ADR-001. Sin consumidores tras la migración.
- Mapeo: R-06/R-07 → ST-006 → AC-010..AC-012 → FT-019..FT-022.
- Verify Gate: Completeness ✓ · Correctness ✓ · Coherence ✓ (una sola fuente de perfil en el monorepo).
