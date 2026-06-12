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
  // Use the most capable model for the best experience with elderly users
  model: 'claude-opus-4-8',
  maxTokens: 1024,
};

export class ChannelRouter {
  private client?: Anthropic;
  private config: RouteConfig;

  constructor(config: Partial<RouteConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Lazy init: constructing the router without ANTHROPIC_API_KEY must not
  // throw — the key is only required once a message is actually routed.
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
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
    const systemPrompt = this.buildSystemPrompt(profile);

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

    return `You are Aurora, a kind and patient AI assistant for elderly people.
You are talking with ${userName}. Always speak in ${language}.
Be clear, concise, and use simple vocabulary. Never use jargon.
If the user seems confused, gently repeat the most important part.

Known contacts: ${contacts}

Available Aurora skills you can request:
- make_call(contactName) — call a contact
- send_sms(contactName, message) — send a text message
- add_medication_reminder(name, dosage, times) — set a medication reminder
- get_emergency_contacts() — list emergency contacts
- describe_image(path) — describe what is in an image

If you need to use a skill, end your reply with:
SKILL_CALL: {"name": "skill_name", "args": {...}}`;
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
