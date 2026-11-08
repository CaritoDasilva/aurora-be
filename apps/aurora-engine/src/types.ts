import type { NativeInstruction } from '@aurora/aurora-skills';

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
  /**
   * ID opaco de la acción pendiente de confirmación. Lo emite el servidor,
   * es de un solo uso y expira a los 5 minutos. El cliente lo devuelve
   * tal cual en POST /confirm — nunca construye uno propio.
   */
  pendingActionId?: string;
  /**
   * Instrucción de acción nativa que el DISPOSITIVO ejecuta
   * (abrir marcador, abrir SMS, programar notificación).
   */
  skillCall?: NativeInstruction;
  error?: string;
}

/** Resultado que el dispositivo reporta tras ejecutar una skillCall. */
export interface DeviceResultReport {
  skillName: string;
  success: boolean;
  message: string;
}
