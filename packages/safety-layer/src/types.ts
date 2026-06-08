import type { AuroraMessage } from '@aurora/input-processor';

export type SafetyLevel = 'safe' | 'confirm' | 'blocked';
export type ActionCategory =
  | 'call' | 'sms' | 'email'          // communication
  | 'file_delete' | 'file_write'       // file system
  | 'purchase' | 'payment'            // financial
  | 'settings' | 'install'            // system
  | 'reminder' | 'calendar'           // scheduling
  | 'query' | 'navigation' | 'other'; // safe by default

export interface SafetyResult {
  level: SafetyLevel;
  category: ActionCategory;
  message: AuroraMessage;
  confirmationPrompt?: string; // shown to user if level === 'confirm'
  reason?: string;             // why it was blocked/flagged
}

export interface SafetyLayerConfig {
  anthropicApiKey?: string;
  strictMode?: boolean; // if true, flag ALL communications for confirmation
}
