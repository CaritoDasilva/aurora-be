export type InputType = 'text' | 'voice' | 'image';

export interface RawInput {
  type: InputType;
  // For text: the text string
  text?: string;
  // For voice: path to audio file (mp3, wav, m4a, ogg)
  audioPath?: string;
  // For image: path to image file OR base64 string
  imagePath?: string;
  imageBase64?: string;
  // Optional metadata
  userId?: string;
  timestamp?: Date;
  language?: string; // e.g. 'es', 'en' — for Whisper language hint
}

export interface AuroraMessage {
  id: string;
  type: InputType;
  content: string;          // The normalized text content
  originalInput: RawInput;
  confidence?: number;      // 0-1, for voice transcription confidence
  detectedLanguage?: string;
  processingTimeMs?: number;
  timestamp: Date;
  systemPrompt?: string;    // Injected by MemoryPlugin before skill execution
}

export interface ProcessorConfig {
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large-v2' | 'large-v3';
  anthropicApiKey?: string;
  defaultLanguage?: string;
}
