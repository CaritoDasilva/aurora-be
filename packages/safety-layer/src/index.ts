/**
 * safety-layer
 *
 * Classifies every AuroraMessage by intent and returns one of three verdicts:
 *   safe    — pass through to the OpenClaw agent unchanged
 *   confirm — pause and ask the user for explicit confirmation
 *   blocked — reject immediately (financial actions, file deletion)
 */

import type { AuroraMessage } from '@aurora/input-processor';
import { classifyIntent } from './classifier.js';
import { buildConfirmationPrompt } from './confirmation.js';
import type { ActionCategory, SafetyLayerConfig, SafetyResult } from './types.js';

export type { ActionCategory, SafetyLayerConfig, SafetyLevel, SafetyResult } from './types.js';
export type { AuroraMessage } from '@aurora/input-processor';

const SAFE_CATEGORIES: ActionCategory[] = ['query', 'navigation', 'reminder', 'calendar', 'other'];
const CONFIRM_CATEGORIES: ActionCategory[] = ['call', 'sms', 'email', 'file_write', 'settings', 'install'];
const BLOCKED_CATEGORIES: ActionCategory[] = ['file_delete', 'purchase', 'payment'];

export class SafetyLayer {
  private config: SafetyLayerConfig;

  constructor(config: SafetyLayerConfig = {}) {
    this.config = config;
  }

  async evaluate(message: AuroraMessage): Promise<SafetyResult> {
    const category = await classifyIntent(message.content, this.config.anthropicApiKey);

    if (BLOCKED_CATEGORIES.includes(category)) {
      return {
        level: 'blocked',
        category,
        message,
        reason: 'Esta acción no está permitida por razones de seguridad.',
      };
    }

    const needsConfirm =
      CONFIRM_CATEGORIES.includes(category) ||
      (this.config.strictMode === true && !SAFE_CATEGORIES.includes(category));

    if (needsConfirm) {
      return {
        level: 'confirm',
        category,
        message,
        confirmationPrompt: buildConfirmationPrompt(category, message.content),
      };
    }

    return { level: 'safe', category, message };
  }
}
