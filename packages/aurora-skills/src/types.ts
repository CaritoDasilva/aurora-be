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

export type ActionCategory =
  | 'call' | 'sms' | 'email'
  | 'file_delete' | 'file_write'
  | 'purchase' | 'payment'
  | 'settings' | 'install'
  | 'reminder' | 'calendar'
  | 'query' | 'navigation' | 'other';
