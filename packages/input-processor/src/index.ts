import { randomUUID } from 'node:crypto';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
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
        let audioPath = input.audioPath;
        let tempAudioPath: string | undefined;
        if (!audioPath) {
          if (!input.audioBase64) {
            throw new Error('Voice input requires audioPath or audioBase64');
          }
          const ext = (input.audioFormat || 'm4a').replace(/^\./, '');
          tempAudioPath = path.join(os.tmpdir(), `aurora-voice-${randomUUID()}.${ext}`);
          await fs.writeFile(tempAudioPath, Buffer.from(input.audioBase64, 'base64'));
          audioPath = tempAudioPath;
        }

        try {
          const transcription = await transcribeAudio(
            audioPath,
            this.config.whisperModel,
            input.language
          );
          content = transcription.text.trim();
          confidence = transcription.confidence;
          detectedLanguage = transcription.language;
        } finally {
          if (tempAudioPath) {
            await fs.unlink(tempAudioPath).catch(() => {});
          }
        }
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
