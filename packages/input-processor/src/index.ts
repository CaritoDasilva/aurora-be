import { randomUUID } from 'node:crypto';
import { RawInput, AuroraMessage, ProcessorConfig } from './types.js';
import { transcribeAudio } from './whisper-bridge.js';
import { describeImage } from './vision-bridge.js';

export * from './types.js';

export class InputProcessor {
  private config: ProcessorConfig;

  constructor(config: ProcessorConfig = {}) {
    this.config = {
      whisperModel: config.whisperModel || 'small',
      anthropicApiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      defaultLanguage: config.defaultLanguage || 'es',
    };
  }

  async process(input: RawInput): Promise<AuroraMessage> {
    const startTime = Date.now();

    let content: string;
    let confidence: number | undefined;
    let detectedLanguage: string | undefined;

    switch (input.type) {
      case 'text':
        if (!input.text) throw new Error('Text input requires text field');
        content = input.text.trim();
        detectedLanguage = input.language || this.config.defaultLanguage;
        break;

      case 'voice': {
        if (!input.audioPath) throw new Error('Voice input requires audioPath');
        const transcription = await transcribeAudio(
          input.audioPath,
          this.config.whisperModel,
          input.language
        );
        content = transcription.text.trim();
        confidence = transcription.confidence;
        detectedLanguage = transcription.language;
        break;
      }

      case 'image': {
        if (!this.config.anthropicApiKey) {
          throw new Error('Image processing requires ANTHROPIC_API_KEY');
        }
        const vision = await describeImage(
          input.imagePath,
          input.imageBase64,
          this.config.anthropicApiKey
        );
        content = `[IMAGEN] ${vision.description} Intención probable: ${vision.intent}`;
        detectedLanguage = this.config.defaultLanguage;
        break;
      }

      default:
        throw new Error(`Unknown input type: ${(input as RawInput).type}`);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      id: randomUUID(),
      type: input.type,
      content,
      originalInput: input,
      confidence,
      detectedLanguage,
      processingTimeMs,
      timestamp: new Date(),
    };
  }
}
