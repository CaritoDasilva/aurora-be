import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileUpdates } from './validate-profile.js';

test('rechaza campos desconocidos', () => {
  const r = validateProfileUpdates({ hacked: true });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors[0], /no permitido/);
});

test('rechaza campos gestionados por el sistema', () => {
  const r = validateProfileUpdates({ userId: 'otro', createdAt: 'x' });
  assert.equal(r.ok, false);
});

test('rechaza medications con shape inválido', () => {
  assert.equal(validateProfileUpdates({ medications: 'foo' }).ok, false);
  assert.equal(validateProfileUpdates({ medications: [{ dose: '5mg' }] }).ok, false);
  assert.equal(validateProfileUpdates({ medications: [{ name: 'Metformina', schedule: '8:00' }] }).ok, false);
});

test('rechaza emergencyContacts incompletos', () => {
  const r = validateProfileUpdates({ emergencyContacts: [{ name: 'María' }] });
  assert.equal(r.ok, false);
});

test('rechaza preferences fuera de enum', () => {
  assert.equal(validateProfileUpdates({ preferences: { voiceSpeed: 'turbo' } }).ok, false);
  assert.equal(validateProfileUpdates({ preferences: { fontSize: 'tiny' } }).ok, false);
  assert.equal(validateProfileUpdates({ preferences: { theme: 'dark' } }).ok, false);
});

test('rechaza age fuera de rango y body no-objeto', () => {
  assert.equal(validateProfileUpdates({ age: -1 }).ok, false);
  assert.equal(validateProfileUpdates({ age: 200 }).ok, false);
  assert.equal(validateProfileUpdates({ age: 68.5 }).ok, false);
  assert.equal(validateProfileUpdates('texto').ok, false);
  assert.equal(validateProfileUpdates([1, 2]).ok, false);
  assert.equal(validateProfileUpdates(null).ok, false);
});

test('acepta una actualización válida completa', () => {
  const r = validateProfileUpdates({
    name: 'Rosa',
    lastName: 'Martínez',
    age: 70,
    language: 'es',
    medications: [{ name: 'Metformina', dose: '500mg', schedule: ['8:00', '20:00'], notes: 'con comida' }],
    emergencyContacts: [{ name: 'Luis', phone: '+1555000003', relationship: 'hijo' }],
    preferences: { voiceSpeed: 'slow', fontSize: 'xlarge', confirmAllActions: true },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.updates.name, 'Rosa');
});

test('acepta actualización parcial mínima', () => {
  const r = validateProfileUpdates({ name: 'Ana' });
  assert.equal(r.ok, true);
});
