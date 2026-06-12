export interface SkillResult {
  success: boolean;
  message: string;
  data?: unknown;
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
