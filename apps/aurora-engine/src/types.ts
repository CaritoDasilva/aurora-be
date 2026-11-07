import type { NativeAction } from '@aurora/aurora-skills';

export interface EngineConfig {
  anthropicApiKey?: string;
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large-v2' | 'large-v3';
  defaultLanguage?: string;
  strictMode?: boolean;
}

export interface EngineResponse {
  id: string;
  status: 'completed' | 'awaiting_confirmation' | 'blocked' | 'error';
  message: string;
  confirmationPrompt?: string;
  pendingAction?: string;
  /** Acción para que el cliente móvil ejecute en el teléfono (llamar, SMS, recordatorio). */
  action?: NativeAction;
  error?: string;
}

export interface ProcessOptions {
  /** El cliente ejecuta call/sms/reminder en el teléfono: el servidor devuelve `action`. */
  native?: boolean;
}
