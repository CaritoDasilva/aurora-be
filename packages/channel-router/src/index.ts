/**
 * channel-router
 *
 * Routes incoming normalized AuroraMessages to the Claude agent orchestrator.
 * Adapted from OpenClaw's channel routing layer — replaces WhatsApp/Telegram
 * adapters with Aurora's own HTTP API channel.
 *
 * OpenClaw routing logic:
 *   1. Resolve the active channel for the user (Aurora local API only, for now)
 *   2. Build the Claude system prompt with the user's profile context
 *   3. Forward message to Claude and return the structured response
 *   4. Emit a skill-dispatch event if Claude identifies an Aurora skill to call
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AuroraMessage } from '@aurora/input-processor';
import type { UserProfile } from '@aurora/aurora-memory';

export interface RouteConfig {
  /** Which channel adapter to use. Aurora only ships 'aurora-api' for now. */
  channel: 'aurora-api';
  /** Anthropic model ID to use for this route */
  model: string;
  /** Max tokens for the agent response */
  maxTokens: number;
  /** API key; si falta se usa ANTHROPIC_API_KEY (se exige recién al enrutar un mensaje) */
  apiKey?: string;
}

export interface AgentResponse {
  text: string;
  /** Skill name if Claude decided to call an Aurora skill */
  skillCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  /** Raw Anthropic stop reason for debugging */
  stopReason: string;
  /** Approximate token counts for billing tracking */
  usage: { inputTokens: number; outputTokens: number };
}

const DEFAULT_CONFIG: RouteConfig = {
  channel: 'aurora-api',
  // Configurable con AURORA_MODEL. Respuestas cortas y rápidas importan más que el
  // tamaño del modelo para una conversación por voz con personas mayores.
  model: process.env.AURORA_MODEL ?? 'claude-sonnet-5-5',
  maxTokens: 512,
};

/** Contrato mínimo que el motor necesita (permite un router falso en los tests). */
export interface AgentRouter {
  route(msg: AuroraMessage, profile?: UserProfile | null): Promise<AgentResponse>;
}

const SKILL_INSTRUCTIONS = `Puedes pedir estas acciones; la persona siempre las confirma antes de que se hagan:
- make_call(contactName): llamar a un contacto
- send_sms(contactName, message): enviar un mensaje de texto

Solo si la persona pide claramente una de ellas, termina tu respuesta con una última línea:
SKILL_CALL: {"name": "make_call", "args": {"contactName": "María"}}
No inventes contactos ni pidas acciones que la persona no mencionó.`;

export class ChannelRouter implements AgentRouter {
  private client?: Anthropic;
  private config: RouteConfig;

  constructor(config: Partial<RouteConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Lazy init: constructing the router without ANTHROPIC_API_KEY must not
  // throw — the key is only required once a message is actually routed.
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = this.config.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required to route messages');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Routes an AuroraMessage through the Claude agent and returns the response.
   *
   * TODO: add conversation history management (sliding window of last N turns)
   *       stored in the session layer so Claude has context across multi-turn
   *       conversations without exceeding the context window.
   */
  async route(msg: AuroraMessage, profile?: UserProfile | null): Promise<AgentResponse> {
    // El MemoryPlugin ya arma un prompt en español con perfil, medicamentos,
    // contactos y conversación reciente: se usa si viene; si no, el prompt base.
    const systemPrompt = msg.systemPrompt
      ? `${msg.systemPrompt}\n\n${SKILL_INSTRUCTIONS}`
      : this.buildSystemPrompt(profile);

    // TODO: include tool definitions for Aurora skills so Claude can call them
    //       via the Anthropic tool_use API (instead of text-based dispatch)
    const response = await this.getClient().messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: msg.content }],
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    // TODO: parse tool_use blocks when Claude calls an Aurora skill
    const skillCall = this.extractSkillCall(text);

    return {
      text,
      skillCall,
      stopReason: response.stop_reason ?? 'unknown',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  private buildSystemPrompt(profile?: UserProfile | null): string {
    const userName = profile?.name ?? 'the user';
    const language = profile?.language ?? 'es';
    const contacts =
      profile?.emergencyContacts.map((c) => `${c.name} (${c.relationship})`).join(', ') || 'none';

    return `Eres Aurora, una asistente amable y paciente para personas mayores.
Hablas con ${userName}. Responde siempre en ${language === 'es' ? 'español de Chile' : language}, tratándola de tú.
Usa frases cortas (máximo 2 oraciones) y palabras simples. Nunca uses tecnicismos.
Si la persona parece confundida, repite con calma lo más importante.

Contactos conocidos: ${contacts}

${SKILL_INSTRUCTIONS}`;
  }

  /** Parses an inline SKILL_CALL directive from the agent response text */
  private extractSkillCall(
    text: string
  ): AgentResponse['skillCall'] | undefined {
    // TODO: replace text-based extraction with proper tool_use API blocks
    const match = text.match(/SKILL_CALL:\s*(\{[\s\S]*?\})\s*$/m);
    if (!match) return undefined;

    try {
      const parsed = JSON.parse(match[1]) as { name: string; args: Record<string, unknown> };
      return parsed;
    } catch {
      return undefined;
    }
  }
}
