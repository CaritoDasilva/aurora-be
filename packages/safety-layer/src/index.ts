/**
 * safety-layer
 *
 * Validates every AuroraMessage before it reaches the agent.
 * Three threat classes are detected:
 *   1. Prompt injection — attempts to override system instructions
 *   2. Dangerous system commands — shell/OS-level commands embedded in text
 *   3. Emergency situations — keywords indicating medical/safety emergencies
 *      (triggers emergency protocol instead of normal agent flow)
 */

import type { AuroraMessage } from '@aurora/input-processor';

export interface SafetyResult {
  safe: boolean;
  /** Human-readable reason when safe=false */
  reason?: string;
  /** When true, the caller must activate the emergency protocol immediately */
  emergency?: boolean;
}

// Patterns that look like prompt injection attempts
// TODO: extend with an ML-based classifier for higher recall
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|prior|above|all)\s+instructions?/i,
  /you\s+are\s+now\s+(?:a\s+)?(?:different|new|an?\s+)?(?:ai|assistant|bot|gpt)/i,
  /system\s*prompt/i,
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/,
  /\bDAN\b.*\bjailbreak\b/i,
];

// Patterns that indicate an attempt to run OS/shell commands
const DANGEROUS_COMMAND_PATTERNS: RegExp[] = [
  /\b(rm\s+-rf|del\s+\/[sq]|format\s+[a-z]:)/i,
  /\b(exec|eval|subprocess|os\.system|shell_exec)\s*\(/i,
  /\b(powershell|cmd\.exe|bash|sh)\s+-[cC]/i,
  /`[^`]{1,200}`/,                   // backtick command substitution
  /\$\([^)]{1,200}\)/,               // $( ) subshell
];

// Keywords that indicate a medical or safety emergency
const EMERGENCY_KEYWORDS: RegExp[] = [
  /\b(me\s+caigo|i\s+fell|i\s+(?:am\s+)?(?:having|feel\s+like|think\s+i'm\s+having)\s+(?:a\s+)?(?:heart\s+attack|stroke|seizure))\b/i,
  /\b(call\s+(?:9[01][01]|emergency|ambulance|police)\s+(?:now|immediately|fast))\b/i,
  /\b(chest\s+pain|no\s+(?:puedo\s+respirar|puedo\s+moverme))\b/i,
  /\b(help\s+me\s+(?:please\s+)?(?:i|my)\s+(?:am|is)\s+(?:dying|hurt|injured|unconscious))\b/i,
  /\b(auxilio|socorro|ayuda\s+urgente)\b/i,
];

export class SafetyLayer {
  /**
   * Validates an AuroraMessage before it is forwarded to the agent.
   *
   * TODO: replace regex-only detection with an LLM-assisted guard call
   *       (e.g. a fast claude-haiku-4-5 check) for nuanced injection attempts.
   */
  async validate(msg: AuroraMessage): Promise<SafetyResult> {
    const text = msg.text;

    // 1. Emergency check — highest priority
    for (const pattern of EMERGENCY_KEYWORDS) {
      if (pattern.test(text)) {
        return {
          safe: false,
          emergency: true,
          reason: 'Emergency situation detected — activating emergency protocol',
        };
      }
    }

    // 2. Prompt injection check
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          safe: false,
          reason: 'Potential prompt injection attempt detected',
        };
      }
    }

    // 3. Dangerous command check
    for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
      if (pattern.test(text)) {
        return {
          safe: false,
          reason: 'Dangerous system command detected in input',
        };
      }
    }

    // TODO: add rate-limiting per userId to prevent abuse
    // TODO: add content moderation API call (e.g. OpenAI Moderation endpoint)

    return { safe: true };
  }
}
