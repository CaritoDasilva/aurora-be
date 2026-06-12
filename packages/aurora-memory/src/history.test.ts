import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadHistory, saveEntry, getRecentHistory } from './history.js';
import type { ConversationEntry } from './types.js';

function entry(n: number): ConversationEntry {
  return {
    id: `id-${n}`,
    timestamp: new Date(2026, 0, 1, 0, n).toISOString(),
    userMessage: `mensaje ${n}`,
    auroraResponse: `respuesta ${n}`,
    category: 'query',
    status: 'completed',
  };
}

async function withTempPath(fn: (path: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'aurora-history-'));
  try {
    await fn(join(dir, 'history.json'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('loadHistory devuelve [] si el archivo no existe', async () => {
  await withTempPath(async (path) => {
    assert.deepEqual(await loadHistory(path), []);
  });
});

test('loadHistory devuelve [] ante JSON corrupto sin crashear', async () => {
  await withTempPath(async (path) => {
    await writeFile(path, '{corrupto', 'utf-8');
    assert.deepEqual(await loadHistory(path), []);
  });
});

test('saveEntry agrega entradas en orden', async () => {
  await withTempPath(async (path) => {
    await saveEntry(entry(1), path);
    await saveEntry(entry(2), path);
    const history = await loadHistory(path);
    assert.equal(history.length, 2);
    assert.equal(history[0].id, 'id-1');
    assert.equal(history[1].id, 'id-2');
  });
});

test('saveEntry recorta a 50 entradas conservando las más recientes', async () => {
  await withTempPath(async (path) => {
    for (let i = 1; i <= 55; i++) {
      await saveEntry(entry(i), path);
    }
    const history = await loadHistory(path);
    assert.equal(history.length, 50);
    assert.equal(history[0].id, 'id-6');
    assert.equal(history[49].id, 'id-55');
  });
});

test('getRecentHistory devuelve últimos n, más reciente primero', async () => {
  await withTempPath(async (path) => {
    for (let i = 1; i <= 5; i++) {
      await saveEntry(entry(i), path);
    }
    const recent = await getRecentHistory(3, path);
    assert.equal(recent.length, 3);
    assert.deepEqual(recent.map((e) => e.id), ['id-5', 'id-4', 'id-3']);
  });
});
