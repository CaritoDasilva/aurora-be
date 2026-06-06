/**
 * input-processor
 *
 * Accepts multimodal input (voice, image, or text) and normalizes it
 * into a typed AuroraMessage for downstream processing.
 *
 * Voice  → Whisper STT transcription → text
 * Image  → Claude Vision description → text
 * Text   → passed through as-is
 */

export type InputType = 'text' | 'voice' | 'image';

export interface RawInput {
  type: InputType;
  /** Raw text for type=text; base64 audio for type=voice; base64/URL for type=image */
  payload: string;
  /** Optional: user ID to associate the message with a profile */
  userId?: string;
  /** Optional: IANA language tag (e.g. 'es-ES', 'en-US') for voice transcription */
  language?: string;
}

export interface AuroraMessage {
  /** Normalized plain-text content ready for the agent */
  text: string;
  /** Original input type before normalization */
  originalType: InputType;
  userId?: string;
  /** ISO 8601 timestamp of when the message was processed */
  timestamp: string;
  /** Extra metadata produced during processing (e.g. Whisper confidence, vision context) */
  metadata?: Record<string, unknown>;
}

export class InputProcessor {
  /**
   * Normalizes any RawInput into an AuroraMessage.
   *
   * TODO: inject OpenAI client for Whisper (voice) and Anthropic client for
   *       Claude Vision (image) via constructor dependency injection.
   */
  async process(input: RawInput): Promise<AuroraMessage> {
    let text: string;
    const metadata: Record<string, unknown> = {};

    switch (input.type) {
      case 'text':
        // TODO: apply basic sanitization (trim, normalize whitespace)
        text = input.payload.trim();
        break;

      case 'voice':
        // TODO: call OpenAI Whisper API
        //   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        //   const transcription = await openai.audio.transcriptions.create({
        //     file: createReadStreamFromBase64(input.payload),
        //     model: 'whisper-1',
        //     language: input.language,
        //   });
        //   text = transcription.text;
        //   metadata.whisperConfidence = transcription.confidence;
        text = '[voice-transcription-stub]';
        metadata.stub = true;
        break;

      case 'image':
        // TODO: call Anthropic Claude Vision API
        //   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        //   const response = await anthropic.messages.create({
        //     model: 'claude-opus-4-8',
        //     max_tokens: 1024,
        //     messages: [{
        //       role: 'user',
        //       content: [
        //         { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.payload } },
        //         { type: 'text', text: 'Describe what you see in this image for an elderly user.' },
        //       ],
        //     }],
        //   });
        //   text = response.content[0].text;
        text = '[image-description-stub]';
        metadata.stub = true;
        break;

      default:
        throw new Error(`Unknown input type: ${(input as RawInput).type}`);
    }

    return {
      text,
      originalType: input.type,
      userId: input.userId,
      timestamp: new Date().toISOString(),
      metadata: Object.keys(metadata).length ? metadata : undefined,
    };
  }
}
