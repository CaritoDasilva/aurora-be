export type { SkillResult, Contact, SkillsConfig, ActionCategory } from './types.js';
export type { NativeInstruction, NativeInstructionResult } from './native-instructions.js';
export { loadContacts, findContact, addContact } from './contacts.js';
export { makeCall } from './call.js';
export { sendSMS } from './sms.js';
export { setReminder, parseReminderTime } from './reminder.js';
export { webSearch } from './search.js';
export { extractTarget, extractTime, extractSmsBody } from './extract.js';
export { buildNativeInstruction } from './native-instructions.js';

import type { SkillsConfig, SkillResult, ActionCategory } from './types.js';
import { makeCall } from './call.js';
import { sendSMS } from './sms.js';
import { setReminder } from './reminder.js';
import { webSearch } from './search.js';
import { extractTarget, extractTime } from './extract.js';

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
