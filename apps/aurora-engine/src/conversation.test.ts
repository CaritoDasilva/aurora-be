import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MemoryPlugin } from '@aurora/aurora-memory';
import type { AgentRouter, AgentResponse } from '@aurora/channel-router';
import { AuroraEngine } from './index.js';

// Agente simulado: nunca llama a la API de Anthropic.
function fakeRouter(reply: Partial<AgentResponse> | Error) {
  const calls: string[] = [];
  const router: AgentRouter = {
    async route(msg) {
      calls.push(msg.content);
      if (reply instanceof Error) throw reply;
      return { text: '', stopReason: 'end_turn', usage: { inputTokens: 1, outputTokens: 1 }, ...reply };
    },
  };
  return { router, calls };
}

let dir: string;
let memory: MemoryPlugin;
let savedKey: string | undefined;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'aurora-engine-'));
  memory = new MemoryPlugin({
    profilePath: path.join(dir, 'profile.json'),
    historyPath: path.join(dir, 'history.json'),
  });
  // Sin clave, el clasificador usa solo palabras clave (sin red).
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(async () => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  await rm(dir, { recursive: true, force: true });
});

test('un saludo lo responde el agente, sin markdown y en máximo 3 frases', async () => {
  const { router, calls } = fakeRouter({
    text: '**Hola**, qué gusto. Estoy aquí. Cuéntame. Esta cuarta frase sobra.',
  });
  const engine = new AuroraEngine({}, { router, memory });
  const r = await engine.process({ type: 'text', text: 'Hola Aurora' });
  assert.equal(r.status, 'completed');
  assert.equal(calls.length, 1);
  assert.equal(r.message, 'Hola, qué gusto. Estoy aquí. Cuéntame.');
});

test('el intercambio con el agente queda en la memoria', async () => {
  const { router } = fakeRouter({ text: 'Aquí estoy contigo.' });
  const engine = new AuroraEngine({}, { router, memory });
  await engine.process({ type: 'text', text: 'Necesito compañía' });
  const ctx = await memory.getContext();
  assert.equal(ctx.recentHistory[0].auroraResponse, 'Aquí estoy contigo.');
});

test('el agente pide llamar: no se ejecuta, queda para confirmar', async () => {
  const { router } = fakeRouter({
    text: 'Claro, te ayudo.',
    skillCall: { name: 'make_call', args: { contactName: 'María' } },
  });
  const engine = new AuroraEngine({}, { router, memory });
  const r = await engine.process({ type: 'text', text: 'Extraño a mi hija' }, { native: true });
  assert.equal(r.status, 'awaiting_confirmation');
  assert.equal(r.action, undefined);
  assert.deepEqual(JSON.parse(r.pendingAction!), { content: 'llama a María', category: 'call' });
});

test('un pedido directo de llamada no pasa por el agente', async () => {
  const { router, calls } = fakeRouter({ text: 'no debería usarse' });
  const engine = new AuroraEngine({}, { router, memory });
  const r = await engine.process({ type: 'text', text: 'Llama a mi hija' });
  assert.equal(r.status, 'awaiting_confirmation');
  assert.equal(calls.length, 0);
});

test('acciones bloqueadas siguen bloqueadas aunque haya agente', async () => {
  const { router, calls } = fakeRouter({ text: 'no debería usarse' });
  const engine = new AuroraEngine({}, { router, memory });
  const r = await engine.process({ type: 'text', text: 'Quiero comprar algo' });
  assert.equal(r.status, 'blocked');
  assert.equal(calls.length, 0);
});

test('si el agente falla, responde como antes (skills) sin romperse', async () => {
  const { router } = fakeRouter(new Error('sin red'));
  const engine = new AuroraEngine({}, { router, memory });
  const origError = console.error;
  console.error = () => {};
  try {
    const r = await engine.process({ type: 'text', text: 'Necesito compañía' });
    assert.equal(r.status, 'completed');
    assert.match(r.message, /no disponible/i);
  } finally {
    console.error = origError;
  }
});

test('sin API key ni router, el motor sigue funcionando sin agente', async () => {
  const engine = new AuroraEngine({}, { memory });
  const r = await engine.process({ type: 'text', text: 'Necesito compañía' });
  assert.equal(r.status, 'completed');
  assert.match(r.message, /no disponible/i);
});
