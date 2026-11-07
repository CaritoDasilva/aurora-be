/**
 * Acción que el servidor NO ejecuta: se la devuelve al cliente móvil para que
 * la ejecute con las funciones nativas del teléfono (marcador, SMS, notificaciones).
 * Todo teléfono que llega aquí ya pasó por sanitizePhone().
 */
export type NativeAction =
  | { type: 'call'; phone: string; name: string }
  | { type: 'sms'; phone: string; name: string; body: string }
  | { type: 'reminder'; title: string; body: string; triggerSeconds: number };

export interface SkillResult {
  success: boolean;
  message: string;
  data?: unknown;
  /** Presente solo cuando el cliente pidió ejecución nativa (ver SkillsExecutor). */
  action?: NativeAction;
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

export interface SkillsConfig {
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  contactsFilePath?: string;
}

// Single source of truth for the category taxonomy: the safety-layer
// classifier owns it; skills only consume it.
export type { ActionCategory } from '@aurora/safety-layer';
