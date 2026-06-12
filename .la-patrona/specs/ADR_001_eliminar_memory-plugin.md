# ADR-001 — Eliminar `@aurora/memory-plugin` y consolidar en `@aurora/aurora-memory`

- **Estado**: ACEPTADO (Owner, 2026-06-12, vía Owner Decision Card ODC-2)
- **Contexto**: Dos paquetes de memoria con shapes incompatibles de `UserProfile`. `memory-plugin` es in-memory (Map), sin persistencia; `aurora-memory` es el que usa el engine en producción. Único consumidor de memory-plugin: `channel-router`.
- **Opciones**:
  1. Eliminar memory-plugin y migrar channel-router → aurora-memory. ✅ elegida
  2. Deprecar sin borrar — deja la duplicación viva y dos shapes de perfil.
  3. No hacer nada — riesgo de que nuevo código importe el paquete equivocado.
- **Consecuencias**: una sola fuente de verdad de perfil; channel-router adapta su `buildSystemPrompt` al shape nuevo (name/lastName/emergencyContacts/preferences planas).
- **Reversibilidad / migration path**: el paquete queda en historia de git (`git revert` del commit de ST-006 lo restaura). Sin consumidores externos al monorepo.
- **Sign-off**: Owner aprobó "Aprobar ADR-001" el 2026-06-12.
