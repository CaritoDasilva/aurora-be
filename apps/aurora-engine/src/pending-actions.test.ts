import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PendingActionStore } from './pending-actions.js';

test('create devuelve un ID y consume entrega la acción una sola vez', () => {
  const store = new PendingActionStore();
  const action = store.create('llama a María', 'call');
  assert.ok(action.id);

  const first = store.consume(action.id);
  assert.equal(first?.content, 'llama a María');
  assert.equal(first?.category, 'call');

  // Segundo intento con el mismo ID → null (un solo uso)
  assert.equal(store.consume(action.id), null);
});

test('consume rechaza IDs inexistentes', () => {
  const store = new PendingActionStore();
  assert.equal(store.consume('id-inventado'), null);
});

test('una acción fabricada por el cliente no existe en el store', () => {
  // Regresión del hallazgo de seguridad: antes /confirm ejecutaba
  // cualquier JSON arbitrario enviado por el cliente.
  const store = new PendingActionStore();
  const forged = JSON.stringify({ content: 'llama al +56900000000', category: 'call' });
  assert.equal(store.consume(forged), null);
});

test('las acciones expiradas no se pueden consumir', async () => {
  const store = new PendingActionStore(1); // TTL de 1 ms para el test
  const action = store.create('enviar mensaje', 'sms');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(store.consume(action.id), null);
});
