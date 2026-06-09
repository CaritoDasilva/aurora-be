import type { UserProfile, ConversationEntry } from './types.js';

export function buildSystemPrompt(
  profile: UserProfile,
  recentHistory: ConversationEntry[]
): string {
  const fullName = [profile.name, profile.lastName].filter(Boolean).join(' ');
  const ageStr = profile.age != null ? `, ${profile.age} años` : '';

  const medsLines =
    profile.medications.length > 0
      ? profile.medications
          .map((m) => {
            const scheduleStr = m.schedule?.join(' y ') ?? '';
            const notesStr = m.notes ? `, ${m.notes}` : '';
            return `- ${m.name}${m.dose ? ` ${m.dose}` : ''} → a las ${scheduleStr}${notesStr}`;
          })
          .join('\n')
      : '- Ninguno registrado';

  const contactsLines =
    profile.emergencyContacts.length > 0
      ? profile.emergencyContacts
          .map((c) => {
            const rel = c.relationship.charAt(0).toUpperCase() + c.relationship.slice(1);
            return `- ${rel}: ${c.name} (${c.phone})`;
          })
          .join('\n')
      : '- Ninguno registrado';

  const contactHints = profile.emergencyContacts
    .map((c) => `- Si mencionan "mi ${c.relationship}" o "${c.relationship}", es ${c.name}`)
    .join('\n');

  const last3 = recentHistory.slice(0, 3);
  const historyStr =
    last3.length > 0
      ? last3
          .map((e) => `${profile.name}: ${e.userMessage} / Aurora: ${e.auroraResponse}`)
          .join('\n')
      : 'Sin conversación previa.';

  return `Eres Aurora, una asistente personal amable y paciente para personas mayores.

Usuario: ${fullName}${ageStr}.
Idioma: Español. Responde siempre en español, con frases cortas y claras.

Medicamentos:
${medsLines}

Contactos importantes:
${contactsLines}

Instrucciones:
- Usa el nombre de pila "${profile.name}" para dirigirte al usuario
- Frases cortas, máximo 2 oraciones por respuesta
${contactHints}
- Sé cálida y tranquila, nunca uses tecnicismos

Conversación reciente:
${historyStr}`;
}
