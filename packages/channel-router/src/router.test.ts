import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelRouter } from './index.js';
import type { AuroraMessage } from '@aurora/input-processor';

function msg(content: string): AuroraMessage {
  return {
    id: 'test-id',
    type: 'text',
    content,
    originalInput: { type: 'text', text: content },
    timestamp: new Date(),
  };
}

test('instanciar sin ANTHROPIC_API_KEY no lanza', () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.doesNotThrow(() => new ChannelRouter());
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('route sin ANTHROPIC_API_KEY rechaza con mensaje claro', async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const router = new ChannelRouter();
    await assert.rejects(router.route(msg('Hola')), /ANTHROPIC_API_KEY/);
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});
