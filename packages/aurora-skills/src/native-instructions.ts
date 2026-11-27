import type { SkillsConfig } from './types.js';
import type { ActionCategory } from '@aurora/safety-layer';
import { findContact } from './contacts.js';
import { sanitizePhone } from './phone.js';
import { extractTarget, extractSmsBody, extractTime } from './extract.js';
import { parseReminderTime } from './reminder.js';

/**
 * Instrucción que el dispositivo móvil ejecuta de forma nativa
 * (expo-linking, expo-sms, expo-notifications).
 * Es el contrato público del backend hacia aurora-mobile.
 */
export interface NativeInstruction {
  name: 'make_call' | 'send_sms' | 'schedule_reminder';
  args: Record<string, unknown>;
}

export type NativeInstructionResult =
  | { ok: true; instruction: NativeInstruction; userMessage: string }
  | { ok: false; userMessage: string };

/**
 * Convierte una acción ya clasificada (y, si correspondía, confirmada por
 * la usuaria) en una instrucción para que el TELÉFONO la ejecute. El
 * backend decide; el dispositivo ejecuta. Los números de teléfono se
 * resuelven contra la agenda y se sanitizan aquí — el cliente nunca
 * recibe texto libre con el que construir comandos.
 */
export async function buildNativeInstruction(
  category: ActionCategory,
  content: string,
  config: SkillsConfig = {}
): Promise<NativeInstructionResult> {
  switch (category) {
    case 'call': {
      const target = extractTarget(content);
      const contact = await findContact(target, config.contactsFilePath);
      const phone = sanitizePhone(contact?.phone ?? target);
      const name = contact?.name ?? target;
      if (!phone) {
        return {
          ok: false,
          userMessage: `No tengo un número válido para ${name}. Revísalo en la lista de contactos.`,
        };
      }
      return {
        ok: true,
        instruction: { name: 'make_call', args: { phoneNumber: phone, contactName: name } },
        userMessage: `Abriendo el marcador para llamar a ${name}…`,
      };
    }

    case 'sms': {
      const target = extractTarget(content);
      const contact = await findContact(target, config.contactsFilePath);
      const phone = sanitizePhone(contact?.phone ?? target);
      const name = contact?.name ?? target;
      if (!phone) {
        return {
          ok: false,
          userMessage: `No tengo un número válido para ${name}. Revísalo en la lista de contactos.`,
        };
      }
      const body = extractSmsBody(content);
      return {
        ok: true,
        instruction: { name: 'send_sms', args: { phoneNumber: phone, contactName: name, body } },
        userMessage: `Abriendo mensajes para escribirle a ${name}…`,
      };
    }

    case 'reminder':
    case 'calendar': {
      const timeStr = extractTime(content);
      const at = timeStr ? parseReminderTime(timeStr) : null;
      // Sin hora reconocible: por defecto en 1 hora (más seguro que
      // notificar de inmediato y confundir a la usuaria).
      const seconds = at ? Math.max(1, Math.round((at.getTime() - Date.now()) / 1000)) : 3600;
      return {
        ok: true,
        instruction: {
          name: 'schedule_reminder',
          args: { title: 'Aurora', body: content, seconds },
        },
        userMessage: at
          ? `Recordatorio listo: ${content} (${at.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })})`
          : `Recordatorio listo: ${content} (en 1 hora)`,
      };
    }

    default:
      return { ok: false, userMessage: 'Esa acción todavía no se puede ejecutar en el teléfono.' };
  }
}
