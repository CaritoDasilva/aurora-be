# BEHAVIOR_DELTA ST-001

## MODIFIED — Rechazo de objetivos no telefónicos en llamada/SMS
- Comportamiento actual (fuente: `call.ts:35`, `sms.ts:34`): cualquier texto no resuelto a contacto se pasa como "número" al marcador del sistema vía shell.
- Requisito observable: si el objetivo no es un número válido ni un contacto conocido, Aurora responde "No tengo un número válido para X" y NO ejecuta nada.
- Given un usuario dice "llama a x & calc.exe" / When el contacto no existe / Then la skill devuelve success:false con mensaje claro y no se invoca shell ni Twilio.
- Given "llama a +1555000001" / When se procesa / Then la llamada procede igual que antes.
- Mapeo: R-01 → ST-001 → AC-001/AC-002 → FT-001..FT-004.
- Verify Gate: Completeness ✓ (ambas skills + search) · Correctness ✓ (unit tests) · Coherence ✓ (mensajes en español, mismo shape SkillResult).
