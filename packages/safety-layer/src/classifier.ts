import Anthropic from '@anthropic-ai/sdk';
import type { ActionCategory } from './types.js';

interface KeywordEntry {
  category: ActionCategory;
  pattern: RegExp;
}

// Order matters: more specific categories should come before broader ones.
const KEYWORD_MAP: KeywordEntry[] = [
  // File system — check before generic "write" verbs
  { category: 'file_delete', pattern: /\b(eliminar|borra[r]?|delete\s+file|trash)\b/i },
  { category: 'file_write',  pattern: /\b(guardar|escribir\s+en|save\s+file|create\s+file)\b/i },

  // Financial — always blocked; detect early
  { category: 'purchase', pattern: /\b(comprar|pagar|buy|purchase|order)\b/i },
  { category: 'payment',  pattern: /\b(pago|transferencia|transfer|payment|wire)\b/i },

  // Communication
  { category: 'call',  pattern: /\b(llamar|llama|ll[aá]male|call|tel[eé]fono|marcar|dial)\b/i },
  { category: 'sms',   pattern: /\b(mensaje|enviar\s+mensaje|sms|text|whatsapp|escribir\s+a)\b/i },
  { category: 'email', pattern: /\b(correo|email|enviar\s+correo|mandar\s+mail)\b/i },

  // System
  { category: 'settings', pattern: /\b(configurar|ajustes|settings|configuraci[oó]n)\b/i },
  { category: 'install',  pattern: /\b(instalar|install|descargar|download)\b/i },

  // Scheduling — safe
  { category: 'reminder', pattern: /\b(recordatorio|alarma|reminder|alarm)\b/i },
  { category: 'calendar', pattern: /\b(cita|calendar|agenda|evento)\b/i },

  // Safe conversational / query
  { category: 'query',      pattern: /\b(qu[eé]\s+es|buscar|show|ver|hola|buenos?\s+d[ií]as?|qu[eé]\s+tal)\b/i },
  { category: 'navigation', pattern: /\b(abrir|open|ir\s+a|llevar|navegar|navigate)\b/i },
];

export async function classifyIntent(
  content: string,
  anthropicApiKey?: string
): Promise<ActionCategory> {
  // Fast path: keyword matching
  for (const { category, pattern } of KEYWORD_MAP) {
    if (pattern.test(content)) {
      return category;
    }
  }

  // Slow path: Claude fallback (only when an API key is available)
  const apiKey = anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Classify this user message into exactly one category.

Categories: call, sms, email, file_delete, file_write, purchase, payment, settings, install, reminder, calendar, query, navigation, other

User message: "${content}"

Respond with JSON only, no explanation: {"category": "<category>", "confidence": <0-1>}`,
          },
        ],
      });

      const block = response.content[0];
      if (block.type === 'text') {
        const match = block.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { category: ActionCategory; confidence: number };
          if (parsed.category) return parsed.category;
        }
      }
    } catch {
      // Fall through to default on any error
    }
  }

  return 'other';
}
