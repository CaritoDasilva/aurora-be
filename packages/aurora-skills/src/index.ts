export type { SkillResult, Contact, SkillsConfig, ActionCategory } from './types.js';
export { loadContacts, findContact, addContact } from './contacts.js';
export { makeCall } from './call.js';
export { sendSMS } from './sms.js';
export { setReminder } from './reminder.js';
export { webSearch } from './search.js';

import type { SkillsConfig, SkillResult, ActionCategory } from './types.js';
import { makeCall } from './call.js';
import { sendSMS } from './sms.js';
import { setReminder } from './reminder.js';
import { webSearch } from './search.js';

export class SkillsExecutor {
  private config: SkillsConfig;

  constructor(config: SkillsConfig = {}) {
    this.config = {
      twilioAccountSid: config.twilioAccountSid ?? process.env['TWILIO_ACCOUNT_SID'],
      twilioAuthToken: config.twilioAuthToken ?? process.env['TWILIO_AUTH_TOKEN'],
      twilioFromNumber: config.twilioFromNumber ?? process.env['TWILIO_FROM_NUMBER'],
      contactsFilePath: config.contactsFilePath,
    };
  }

  async execute(category: ActionCategory, content: string): Promise<SkillResult> {
    switch (category) {
      case 'call':
        return makeCall(extractTarget(content), this.config);

      case 'sms':
        return sendSMS(extractTarget(content), content, this.config);

      case 'reminder':
      case 'calendar':
        return setReminder(content, extractTime(content));

      case 'query':
      case 'navigation':
        return webSearch(content);

      default:
        return { success: false, message: 'Habilidad no disponible aún' };
    }
  }
}

function extractTarget(content: string): string {
  // "llama a mi hija María" → "mi hija María"; "a María" → "María"
  const match = content.match(/\ba\s+(.+)$/i);
  return match ? match[1].trim() : content;
}

function extractTime(content: string): string | undefined {
  const patterns = [
    /en\s+\d+\s+(?:minutos?|horas?)/i,
    /(?:a las?|las?)\s+\d{1,2}(?::\d{2})?\s*(?:de la tarde|de la noche|de la mañana|am|pm)?/i,
    /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) return m[0];
  }
  return undefined;
}
