import type { SkillsConfig, SkillResult } from './types.js';
import { findContact } from './contacts.js';
import { sanitizePhone } from './phone.js';
import { parseTime } from './reminder.js';

/**
 * Versiones "nativas" de las habilidades: en vez de ejecutar en el servidor
 * (Twilio / marcador de Windows / node-notifier), resuelven el contacto,
 * validan el número y devuelven una NativeAction para que la app móvil la ejecute.
 */

const IMMEDIATE_REMINDER_SECONDS = 5;

export async function planCall(target: string, config: SkillsConfig): Promise<SkillResult> {
  const contact = await findContact(target, config.contactsFilePath);
  const phone = sanitizePhone(contact?.phone ?? target);
  const name = contact?.name ?? target;
  if (!phone) {
    return { success: false, message: `No tengo un número válido para ${name}` };
  }
  return {
    success: true,
    message: `Llamando a ${name}...`,
    action: { type: 'call', phone, name },
  };
}

export async function planSMS(target: string, body: string, config: SkillsConfig): Promise<SkillResult> {
  const contact = await findContact(target, config.contactsFilePath);
  const phone = sanitizePhone(contact?.phone ?? target);
  const name = contact?.name ?? target;
  if (!phone) {
    return { success: false, message: `No tengo un número válido para ${name}` };
  }
  return {
    success: true,
    message: `Abriendo mensajes para ${name}...`,
    action: { type: 'sms', phone, name, body },
  };
}

/** "Ponme un recordatorio de la pastilla en 10 minutos" → "la pastilla" */
export function cleanReminderText(content: string): string {
  const cleaned = content
    .replace(/\ben\s+\d+\s+(?:minutos?|horas?)/i, '')
    .replace(/(?:\ba las?|\blas?)\s+\d{1,2}(?::\d{2})?\s*(?:de la tarde|de la noche|de la mañana|am|pm)?/i, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i, '')
    .replace(/^\s*(?:por favor,?\s*)?(?:ponme|pon|crea|configura|agenda|haz(?:me)?)?\s*(?:un|una)?\s*(?:recordatorio|alarma)\s*(?:de|para|que)?\s*/i, '')
    .replace(/^\s*recu[eé]rdame\s*(?:que|de|a)?\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || content.trim();
}

export function planReminder(text: string, timeStr?: string): SkillResult {
  const what = cleanReminderText(text);
  const target = timeStr ? parseTime(timeStr) : null;
  const seconds = target
    ? Math.max(IMMEDIATE_REMINDER_SECONDS, Math.round((target.getTime() - Date.now()) / 1000))
    : IMMEDIATE_REMINDER_SECONDS;
  const when = target
    ? ` a las ${target.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
    : '';
  return {
    success: true,
    message: `Recordatorio configurado: ${what}${when}`,
    action: { type: 'reminder', title: 'Aurora', body: what, triggerSeconds: seconds },
  };
}

/**
 * Texto del mensaje a enviar: lo que viene después de "diciendo", "que diga" o ":".
 * Si no hay, queda vacío y la persona lo escribe en el redactor de SMS del teléfono
 * (mejor que enviar la frase completa del comando como si fuera el mensaje).
 */
export function extractSmsBody(content: string): string {
  const m = content.match(/(?:diciendo|que\s+diga|que\s+dice|:)\s*(.+)$/i);
  return m ? m[1].trim() : '';
}
