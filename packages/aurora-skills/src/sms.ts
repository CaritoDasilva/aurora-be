import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SkillsConfig, SkillResult } from './types.js';
import { findContact } from './contacts.js';

const execAsync = promisify(exec);

export async function sendSMS(target: string, body: string, config: SkillsConfig): Promise<SkillResult> {
  const contact = await findContact(target, config.contactsFilePath);
  const phone = contact?.phone ?? target;
  const name = contact?.name ?? target;

  if (!phone) {
    return { success: false, message: `No se encontró un número para ${name}` };
  }

  const accountSid = config.twilioAccountSid ?? process.env['TWILIO_ACCOUNT_SID'];
  const authToken = config.twilioAuthToken ?? process.env['TWILIO_AUTH_TOKEN'];
  const fromNumber = config.twilioFromNumber ?? process.env['TWILIO_FROM_NUMBER'];

  if (accountSid && authToken && fromNumber) {
    try {
      const { Twilio } = await import('twilio');
      const client = new Twilio(accountSid, authToken);
      await client.messages.create({ to: phone, from: fromNumber, body });
      return { success: true, message: `Mensaje enviado a ${name}` };
    } catch (err) {
      return { success: false, message: `Error al enviar mensaje a ${name}: ${String(err)}` };
    }
  }

  // Windows SMS fallback
  try {
    await execAsync(`cmd /c start sms:${phone}`);
    return { success: true, message: `Abriendo mensajes para ${name}...` };
  } catch (err) {
    return { success: false, message: `No se pudo abrir mensajes: ${String(err)}` };
  }
}
