/**
 * Phone sanitization — every value that reaches a shell command or the
 * Twilio API must pass through here first. User text that doesn't resolve
 * to a contact arrives as a raw "phone" string, so this is the security
 * boundary against command injection (e.g. "x & calc.exe").
 */

const PHONE_PATTERN = /^\+?\d{3,15}$/;

/**
 * Normalizes a phone-like string (strips spaces, dashes, dots and parens)
 * and validates it. Returns the normalized number, or null if the input
 * cannot be a phone number and must never reach exec/Twilio.
 */
export function sanitizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const normalized = raw.trim().replace(/[\s\-().]/g, '');
  return PHONE_PATTERN.test(normalized) ? normalized : null;
}
