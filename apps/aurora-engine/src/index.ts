import { v4 as uuidv4 } from 'uuid';
import { InputProcessor } from '@aurora/input-processor';
import { SafetyLayer } from '@aurora/safety-layer';
import type { ActionCategory } from '@aurora/safety-layer';
import { SkillsExecutor } from '@aurora/aurora-skills';
import { MemoryPlugin } from '@aurora/aurora-memory';
import type { UserProfile } from '@aurora/aurora-memory';
import type { RawInput } from '@aurora/input-processor';
import type { EngineConfig, EngineResponse } from './types.js';

export type { EngineConfig, EngineResponse } from './types.js';
export type { RawInput } from '@aurora/input-processor';

interface PendingAction {
  content: string;
  category: ActionCategory;
}

export class AuroraEngine {
  private inputProcessor: InputProcessor;
  private safetyLayer: SafetyLayer;
  private skillsExecutor: SkillsExecutor;
  private memoryPlugin: MemoryPlugin;

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
    this.skillsExecutor = new SkillsExecutor();
    this.memoryPlugin = new MemoryPlugin();
  }

  async process(input: RawInput): Promise<EngineResponse> {
    const memoryContext = await this.memoryPlugin.getContext();
    const auroraMessage = await this.inputProcessor.process(input);
    auroraMessage.systemPrompt = memoryContext.systemPrompt;

    const safety = await this.safetyLayer.evaluate(auroraMessage);

    if (safety.level === 'blocked') {
      await this.memoryPlugin.saveExchange(
        auroraMessage.content,
        'Lo siento, esa acción no está permitida.',
        safety.category,
        'blocked'
      );
      return {
        id: uuidv4(),
        status: 'blocked',
        message: 'Lo siento, esa acción no está permitida.',
      };
    }

    if (safety.level === 'confirm') {
      const confirmationPrompt = safety.confirmationPrompt ?? '¿Confirmas esta acción?';
      const pending: PendingAction = { content: auroraMessage.content, category: safety.category };
      return {
        id: uuidv4(),
        status: 'awaiting_confirmation',
        message: confirmationPrompt,
        confirmationPrompt,
        pendingAction: JSON.stringify(pending),
      };
    }

    const result = await this.skillsExecutor.execute(safety.category, auroraMessage.content);
    await this.memoryPlugin.saveExchange(
      auroraMessage.content,
      result.message,
      safety.category,
      'completed'
    );
    return {
      id: uuidv4(),
      status: 'completed',
      message: result.message,
    };
  }

  async confirm(pendingAction: string): Promise<EngineResponse> {
    const { content, category } = JSON.parse(pendingAction) as PendingAction;
    const result = await this.skillsExecutor.execute(category ?? 'other', content);
    await this.memoryPlugin.saveExchange(content, result.message, category ?? 'other', 'completed');
    return {
      id: uuidv4(),
      status: 'completed',
      message: result.message,
    };
  }

  async cancel(): Promise<EngineResponse> {
    return {
      id: uuidv4(),
      status: 'completed',
      message: 'Acción cancelada.',
    };
  }

  async getProfile(): Promise<UserProfile> {
    return this.memoryPlugin.getProfile();
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.memoryPlugin.updateProfile(updates);
  }
}
