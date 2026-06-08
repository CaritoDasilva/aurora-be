import { v4 as uuidv4 } from 'uuid';
import { InputProcessor } from '@aurora/input-processor';
import { SafetyLayer } from '@aurora/safety-layer';
import type { RawInput } from '@aurora/input-processor';
import type { EngineConfig, EngineResponse } from './types.js';

export type { EngineConfig, EngineResponse } from './types.js';
export type { RawInput } from '@aurora/input-processor';

export class AuroraEngine {
  private inputProcessor: InputProcessor;
  private safetyLayer: SafetyLayer;

  constructor(config: EngineConfig = {}) {
    this.inputProcessor = new InputProcessor({
      anthropicApiKey: config.anthropicApiKey,
      whisperModel: config.whisperModel,
      defaultLanguage: config.defaultLanguage,
    });
    this.safetyLayer = new SafetyLayer({
      anthropicApiKey: config.anthropicApiKey,
      strictMode: config.strictMode,
    });
  }

  async process(input: RawInput): Promise<EngineResponse> {
    const auroraMessage = await this.inputProcessor.process(input);
    const safety = await this.safetyLayer.evaluate(auroraMessage);

    if (safety.level === 'blocked') {
      return {
        id: uuidv4(),
        status: 'blocked',
        message: 'Lo siento, esa acción no está permitida.',
      };
    }

    if (safety.level === 'confirm') {
      const confirmationPrompt = safety.confirmationPrompt ?? '¿Confirmas esta acción?';
      return {
        id: uuidv4(),
        status: 'awaiting_confirmation',
        message: confirmationPrompt,
        confirmationPrompt,
        pendingAction: JSON.stringify(auroraMessage),
      };
    }

    return {
      id: uuidv4(),
      status: 'completed',
      message: 'Entendido: ' + auroraMessage.content,
    };
  }

  async confirm(pendingAction: string): Promise<EngineResponse> {
    const auroraMessage = JSON.parse(pendingAction) as { content: string };
    return {
      id: uuidv4(),
      status: 'completed',
      message: 'Acción confirmada: ' + auroraMessage.content,
    };
  }

  async cancel(): Promise<EngineResponse> {
    return {
      id: uuidv4(),
      status: 'completed',
      message: 'Acción cancelada.',
    };
  }
}
