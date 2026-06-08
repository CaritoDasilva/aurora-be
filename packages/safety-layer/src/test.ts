import { randomUUID } from 'node:crypto';
import { SafetyLayer } from './index.js';
import type { AuroraMessage } from '@aurora/input-processor';

function msg(content: string): AuroraMessage {
  return {
    id: randomUUID(),
    type: 'text',
    content,
    originalInput: { type: 'text', text: content },
    timestamp: new Date(),
  };
}

const CASES = [
  { input: 'Hola Aurora, ¿cómo estás?',        expectedLevel: 'safe',    expectedCategory: 'query'       },
  { input: 'Llama a mi hija María',              expectedLevel: 'confirm', expectedCategory: 'call'        },
  { input: 'Borra el archivo de fotos',          expectedLevel: 'blocked', expectedCategory: 'file_delete' },
  { input: 'Pon un recordatorio para las 8am',   expectedLevel: 'safe',    expectedCategory: 'reminder'    },
] as const;

async function run(): Promise<void> {
  const layer = new SafetyLayer();
  let passed = 0;

  for (const { input, expectedLevel, expectedCategory } of CASES) {
    const result = await layer.evaluate(msg(input));
    const ok = result.level === expectedLevel && result.category === expectedCategory;
    const mark = ok ? '✓' : '✗';

    console.log(`${mark} "${input}"`);
    console.log(`  level:    ${result.level} (expected: ${expectedLevel})`);
    console.log(`  category: ${result.category} (expected: ${expectedCategory})`);
    if (result.confirmationPrompt) console.log(`  prompt:   ${result.confirmationPrompt}`);
    if (result.reason)             console.log(`  reason:   ${result.reason}`);
    console.log();

    if (ok) passed++;
  }

  console.log(`Results: ${passed}/${CASES.length} passed`);
  if (passed < CASES.length) process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(1); });
