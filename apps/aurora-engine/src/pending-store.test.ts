import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PendingStore } from './pending-store.js';

const call = { content: 'llama a mi hija', category: 'call' as const };

test('create devuelve un id opaco y take entrega la acción una sola vez', () => {
  const store = new PendingStore();
  const id = store.create(call);
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(store.take(id), call);
  assert.equal(store.take(id), undefined);
});

test('un id inventado o con JSON no existe', () => {
  const store = new PendingStore();
  assert.equal(store.take('cualquier-cosa'), undefined);
  assert.equal(store.take(JSON.stringify(call)), undefined);
});

test('las acciones vencen', () => {
  let t = 1_000;
  const store = new PendingStore(60_000, 10, () => t);
  const id = store.create(call);
  t += 59_000;
  assert.deepEqual(store.peek(id), call);
  t += 2_000;
  assert.equal(store.take(id), undefined);
});

test('el tope de tamaño descarta las más antiguas', () => {
  const store = new PendingStore(60_000, 2);
  const a = store.create({ ...call, content: 'a' });
  const b = store.create({ ...call, content: 'b' });
  const c = store.create({ ...call, content: 'c' });
  assert.equal(store.size, 2);
  assert.equal(store.peek(a), undefined);
  assert.ok(store.peek(b) && store.peek(c));
});

test('discard elimina la acción (cancelar)', () => {
  const store = new PendingStore();
  const id = store.create(call);
  store.discard(id);
  assert.equal(store.take(id), undefined);
});
