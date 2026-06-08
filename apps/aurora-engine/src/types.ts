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
  error?: string;
}
