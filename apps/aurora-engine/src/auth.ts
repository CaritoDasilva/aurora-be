import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Login por número de teléfono con código de 6 dígitos.
 *
 * El envío del código va detrás de `CodeSender`: hoy se usa `ConsoleCodeSender`
 * (imprime el código en la consola del servidor) y, para las pruebas con personas,
 * `AURORA_DEMO_CODE` fija el código. Para SMS real basta con otra implementación de
 * `CodeSender` (p. ej. Twilio) sin tocar el resto.
 */

export interface CodeSender {
  send(phone: string, code: string): Promise<void>;
}

export class ConsoleCodeSender implements CodeSender {
  async send(phone: string, code: string): Promise<void> {
    console.log(`[auth] Código de acceso para +${phone}: ${code}`);
  }
}

/** Celular chileno → "569XXXXXXXX", o null si no lo es. Acepta "9 1234 5678", "+56 9 1234 5678", etc. */
export function normalizeChileanMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s\-().+]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (/^9\d{8}$/.test(digits)) return `56${digits}`;
  if (/^569\d{8}$/.test(digits)) return digits;
  return null;
}

export type RequestCodeResult =
  | { ok: true }
  | { ok: false; error: 'invalid_phone' | 'too_soon' | 'send_failed'; retryAfterSec?: number };

export type VerifyCodeResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; error: 'invalid_phone' | 'invalid_code' | 'no_code' | 'expired' | 'too_many_attempts' };

export interface AuthOptions {
  sender?: CodeSender;
  /** Si se define (6 dígitos), todos los códigos son este. Solo para demos y pruebas con personas. */
  fixedCode?: string;
  codeTtlMs?: number;
  sessionTtlMs?: number;
  resendCooldownMs?: number;
  maxAttempts?: number;
  now?: () => number;
}

interface PendingCode {
  codeHash: Buffer;
  expiresAt: number;
  attempts: number;
  sentAt: number;
}

const sha = (s: string) => createHash('sha256').update(s).digest();

export class AuthService {
  private codes = new Map<string, PendingCode>();
  private sessions = new Map<string, { phone: string; expiresAt: number }>();
  private sender: CodeSender;
  private fixedCode?: string;
  private codeTtlMs: number;
  private sessionTtlMs: number;
  private resendCooldownMs: number;
  private maxAttempts: number;
  private now: () => number;

  constructor(opts: AuthOptions = {}) {
    this.sender = opts.sender ?? new ConsoleCodeSender();
    this.fixedCode = opts.fixedCode && /^\d{6}$/.test(opts.fixedCode) ? opts.fixedCode : undefined;
    this.codeTtlMs = opts.codeTtlMs ?? 5 * 60_000;
    this.sessionTtlMs = opts.sessionTtlMs ?? 24 * 3_600_000;
    this.resendCooldownMs = opts.resendCooldownMs ?? 30_000;
    this.maxAttempts = opts.maxAttempts ?? 5;
    this.now = opts.now ?? Date.now;
  }

  get demoMode(): boolean {
    return this.fixedCode !== undefined;
  }

  async requestCode(rawPhone: unknown): Promise<RequestCodeResult> {
    const phone = normalizeChileanMobile(rawPhone);
    if (!phone) return { ok: false, error: 'invalid_phone' };

    const t = this.now();
    const previous = this.codes.get(phone);
    if (previous && t - previous.sentAt < this.resendCooldownMs) {
      return {
        ok: false,
        error: 'too_soon',
        retryAfterSec: Math.ceil((this.resendCooldownMs - (t - previous.sentAt)) / 1000),
      };
    }

    const code = this.fixedCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      await this.sender.send(phone, code);
    } catch (err) {
      console.error('[auth] No se pudo enviar el código:', String(err));
      return { ok: false, error: 'send_failed' };
    }
    this.codes.set(phone, { codeHash: sha(code), expiresAt: t + this.codeTtlMs, attempts: 0, sentAt: t });
    return { ok: true };
  }

  verifyCode(rawPhone: unknown, rawCode: unknown): VerifyCodeResult {
    const phone = normalizeChileanMobile(rawPhone);
    if (!phone) return { ok: false, error: 'invalid_phone' };

    const entry = this.codes.get(phone);
    if (!entry) return { ok: false, error: 'no_code' };
    if (entry.expiresAt <= this.now()) {
      this.codes.delete(phone);
      return { ok: false, error: 'expired' };
    }
    if (entry.attempts >= this.maxAttempts) {
      this.codes.delete(phone);
      return { ok: false, error: 'too_many_attempts' };
    }

    entry.attempts += 1;
    const code = typeof rawCode === 'string' ? rawCode.trim() : '';
    if (!/^\d{6}$/.test(code) || !timingSafeEqual(entry.codeHash, sha(code))) {
      if (entry.attempts >= this.maxAttempts) {
        this.codes.delete(phone);
        return { ok: false, error: 'too_many_attempts' };
      }
      return { ok: false, error: 'invalid_code' };
    }

    this.codes.delete(phone); // un código sirve una sola vez
    const token = randomBytes(32).toString('base64url');
    const expiresAt = this.now() + this.sessionTtlMs;
    this.sessions.set(sha(token).toString('hex'), { phone, expiresAt });
    return { ok: true, token, expiresAt };
  }

  /** Teléfono dueño de la sesión, o null si el token no existe o venció. */
  validateToken(token: unknown): { phone: string } | null {
    if (typeof token !== 'string' || !token) return null;
    const key = sha(token).toString('hex');
    const session = this.sessions.get(key);
    if (!session) return null;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(key);
      return null;
    }
    return { phone: session.phone };
  }

  logout(token: unknown): void {
    if (typeof token === 'string') this.sessions.delete(sha(token).toString('hex'));
  }
}

/** Mensajes para la persona (español de Chile, tono simple). */
export const AUTH_MESSAGES: Record<string, string> = {
  invalid_phone: 'Ese número no parece un celular chileno. Escríbelo así: 9 1234 5678.',
  too_soon: 'Ya te mandé un código hace un momento. Espera unos segundos y pídelo de nuevo.',
  send_failed: 'No pude mandar el código ahora. Inténtalo de nuevo en un rato.',
  invalid_code: 'Ese código no es el correcto. Revísalo e inténtalo otra vez.',
  no_code: 'Primero pide un código para tu número.',
  expired: 'Ese código ya venció. Pide uno nuevo.',
  too_many_attempts: 'Fueron muchos intentos. Pide un código nuevo.',
};
