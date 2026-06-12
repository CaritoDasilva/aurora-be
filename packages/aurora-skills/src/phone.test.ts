import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePhone } from './phone.js';

test('acepta E.164 con prefijo +', () => {
  assert.equal(sanitizePhone('+1555000001'), '+1555000001');
});

test('acepta números cortos de emergencia', () => {
  assert.equal(sanitizePhone('911'), '911');
});

test('normaliza espacios, guiones, puntos y paréntesis', () => {
  assert.equal(sanitizePhone('555 000-0001'), '5550000001');
  assert.equal(sanitizePhone('(555) 000.0001'), '5550000001');
  assert.equal(sanitizePhone('+34 600 11 22 33'), '+34600112233');
});

test('rechaza intentos de inyección de comandos', () => {
  assert.equal(sanitizePhone('x & calc.exe'), null);
  assert.equal(sanitizePhone('555; del /q *'), null);
  assert.equal(sanitizePhone('tel:911 && shutdown'), null);
  assert.equal(sanitizePhone('$(rm -rf .)'), null);
});

test('rechaza texto libre que no resolvió a contacto', () => {
  assert.equal(sanitizePhone('mi hija María'), null);
  assert.equal(sanitizePhone('el médico'), null);
});

test('rechaza vacío, null, undefined y longitudes inválidas', () => {
  assert.equal(sanitizePhone(''), null);
  assert.equal(sanitizePhone(null), null);
  assert.equal(sanitizePhone(undefined), null);
  assert.equal(sanitizePhone('12'), null);
  assert.equal(sanitizePhone('1234567890123456'), null);
});
