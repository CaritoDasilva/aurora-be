import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SkillsConfig, SkillResult } from './types.js';
import { findContact } from './contacts.js';
import { sanitizePhone } from './phone.js';

const execAsync = promisify(exec);

export async function makeCall(target: string, config: SkillsConfig): Promise<SkillResult> {
  const contact = await findContact(target, config.contactsFilePath);
  const phone = sanitizePhone(contact?.phone ?? target);
  const name = contact?.name ?? target;

  if (!phone) {
    return { success: false, message: `No tengo un número válido para ${name}` };
  }

  const accountSid = config.twilioAccountSid ?? process.env['TWILIO_ACCOUNT_SID'];
  const authToken = config.twilioAuthToken ?? process.env['TWILIO_AUTH_TOKEN'];
  const fromNumber = config.twilioFromNumber ?? process.env['TWILIO_FROM_NUMBER'];

  if (accountSid && authToken && fromNumber) {
    try {
      const { Twilio } = await import('twilio');
      const client = new Twilio(accountSid, authToken);
      const twiml = `<Response><Say language="es-MX">Llamada de Aurora para ${name}</Say></Response>`;
      await client.calls.create({ to: phone, from: fromNumber, twiml });
      return { success: true, message: `Llamando a ${name}...` };
    } catch (err) {
      return { success: false, message: `Error al llamar a ${name}: ${String(err)}` };
    }
  }

  // Windows dialer fallback
  try {
    await execAsync(`cmd /c start tel:${phone}`);
    return { success: true, message: `Abriendo marcador para llamar a ${name}...` };
  } catch (err) {
    return { success: false, message: `No se pudo abrir el marcador: ${String(err)}` };
  }
}
