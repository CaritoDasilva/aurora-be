# BEHAVIOR_DELTA ST-002

## MODIFIED — PUT /profile valida el body
- Actual (fuente: `server.ts` PUT /profile): cualquier JSON se mergea al perfil.
- Requisito: campos desconocidos o con tipo inválido → 400 `{ error, details }`; el perfil no se modifica.
- Given PUT `{"hacked":true}` / Then 400 y perfil intacto. Given PUT `{"name":"Rosa","age":70}` / Then 200 con perfil actualizado.

## MODIFIED — Server escucha solo localhost por defecto
- Actual: `app.listen(PORT)` → todas las interfaces.
- Requisito: bind `127.0.0.1` salvo `AURORA_HOST` explícito. La UI local sigue funcionando igual.
- Mapeo: R-02 → ST-002 → AC-003/AC-004 → FT-005..FT-008.
- Verify Gate: Completeness ✓ · Correctness ✓ (tests del validador) · Coherence ✓ (errores JSON consistentes con el resto de endpoints).
