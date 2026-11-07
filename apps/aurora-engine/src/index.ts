import { randomUUID } from 'node:crypto';
import { InputProcessor } from '@aurora/input-processor';
import { SafetyLayer } from '@aurora/safety-layer';
import type { ActionCategory } from '@aurora/safety-layer';
import { SkillsExecutor } from '@aurora/aurora-skills';
import { MemoryPlugin } from '@aurora/aurora-memory';
import { ChannelRouter } from '@aurora/channel-router';
import type { AgentRouter } from '@aurora/channel-router';
import { ResponseFormatter } from '@aurora/response-formatter';
import type { UserProfile } from '@aurora/aurora-memory';
import type { RawInput, AuroraMessage } from '@aurora/input-processor';
import type { EngineConfig, EngineResponse, ProcessOptions } from './types.js';

export type { EngineConfig, EngineResponse, ProcessOptions } from './types.js';
export type { RawInput } from '@aurora/input-processor';

interface PendingAction {
  content: string;
  category: ActionCategory;
}

// Categorías sin acción sensible: las responde el agente Claude (conversación).
const CONVERSATIONAL_CATEGORIES: ActionCategory[] = ['query', 'other'];

export interface EngineDeps {
  router?: AgentRouter;
  memory?: MemoryPlugin;
}

export class AuroraEngine {
  private router: AgentRouter;
  private formatter = new ResponseFormatter();
  private agentEnabled: boolean;
  private inputProcessor: InputProcessor;
  private safetyLayer: SafetyLayer;
  private skillsExecutor: SkillsExecutor;
  private memoryPlugin: MemoryPlugin;

  constructor(config: EngineConfig = {}, deps: EngineDeps = {}) {
    this.router = deps.router ?? new ChannelRouter({ apiKey: config.anthropicApiKey });
    // Con un router inyectado (tests) o con API key, la conversación va por el agente.
    this.agentEnabled = Boolean(deps.router ?? config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY);
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
    this.memoryPlugin = deps.memory ?? new MemoryPlugin();
  }

  async process(input: RawInput, options: ProcessOptions = {}): Promise<EngineResponse> {
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
        id: randomUUID(),
        status: 'blocked',
        message: 'Lo siento, esa acción no está permitida.',
      };
    }

    if (safety.level === 'confirm') {
      const confirmationPrompt = safety.confirmationPrompt ?? '¿Confirmas esta acción?';
      const pending: PendingAction = { content: auroraMessage.content, category: safety.category };
      return {
        id: randomUUID(),
        status: 'awaiting_confirmation',
        message: confirmationPrompt,
        confirmationPrompt,
        pendingAction: JSON.stringify(pending),
      };
    }

    if (this.agentEnabled && CONVERSATIONAL_CATEGORIES.includes(safety.category)) {
      const reply = await this.converse(auroraMessage, safety.category, memoryContext.profile);
      if (reply) return reply;
      // Si el agente falla, se sigue con el comportamiento anterior (skills).
    }

    const result = await this.skillsExecutor.execute(safety.category, auroraMessage.content, options);
    await this.memoryPlugin.saveExchange(
      auroraMessage.content,
      result.message,
      safety.category,
      'completed'
    );
    return {
      id: randomUUID(),
      status: 'completed',
      message: result.message,
      action: result.action,
    };
  }

  /**
   * Respuesta conversacional del agente. Devuelve null si el agente falla.
   * Si el agente pide llamar o escribir a alguien, NO se ejecuta: pasa por la
   * misma confirmación que cualquier llamada o SMS.
   */
  private async converse(
    msg: AuroraMessage,
    category: ActionCategory,
    profile: UserProfile
  ): Promise<EngineResponse | null> {
    try {
      const agent = await this.router.route(msg, profile);
      const call = agent.skillCall;
      const contact = typeof call?.args?.['contactName'] === 'string' ? (call.args['contactName'] as string).trim() : '';

      if (call && contact && (call.name === 'make_call' || call.name === 'send_sms')) {
        const isCall = call.name === 'make_call';
        const text = typeof call.args['message'] === 'string' ? (call.args['message'] as string).trim() : '';
        const pending: PendingAction = {
          content: isCall ? `llama a ${contact}` : `mensaje a ${contact}${text ? ` diciendo ${text}` : ''}`,
          category: isCall ? 'call' : 'sms',
        };
        const prompt = isCall ? `¿Quieres que llame a ${contact} ahora?` : `¿Quieres que le escriba a ${contact} ahora?`;
        return {
          id: randomUUID(),
          status: 'awaiting_confirmation',
          message: prompt,
          confirmationPrompt: prompt,
          pendingAction: JSON.stringify(pending),
        };
      }

      const text = this.formatter.format(agent.text, 'text').text || 'No te entendí bien. ¿Me lo puedes repetir?';
      await this.memoryPlugin.saveExchange(msg.content, text, category, 'completed');
      return { id: randomUUID(), status: 'completed', message: text };
    } catch (err) {
      console.error('Agent error, usando skills como respaldo:', String(err));
      return null;
    }
  }

  async confirm(pendingAction: string, options: ProcessOptions = {}): Promise<EngineResponse> {
    const { content, category } = JSON.parse(pendingAction) as PendingAction;
    const result = await this.skillsExecutor.execute(category ?? 'other', content, options);
    await this.memoryPlugin.saveExchange(content, result.message, category ?? 'other', 'completed');
    return {
      id: randomUUID(),
      status: 'completed',
      message: result.message,
      action: result.action,
    };
  }

  async cancel(): Promise<EngineResponse> {
    return {
      id: randomUUID(),
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
