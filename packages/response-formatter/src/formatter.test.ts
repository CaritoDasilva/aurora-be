import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ResponseFormatter } from './index.js';

const formatter = new ResponseFormatter();

test('trunca a 3 oraciones', () => {
  const r = formatter.format('Uno. Dos. Tres. Cuatro. Cinco.', 'text');
  assert.equal(r.text, 'Uno. Dos. Tres.');
});

test('quita markdown del texto', () => {
  const r = formatter.format('**Hola** *Ana*, mira [esto](https://x.com) y `código`.', 'text');
  assert.equal(r.text, 'Hola Ana, mira esto y código.');
});

test('remueve directivas SKILL_CALL', () => {
  const r = formatter.format('Llamando a María.\nSKILL_CALL: {"name": "make_call", "args": {}}', 'text');
  assert.doesNotMatch(r.text, /SKILL_CALL/);
});

test('modo voice genera SSML con rate y entidades escapadas', () => {
  const r = formatter.format('Recuerda: agua & descanso. Si tienes <dolor>, avísame.', 'voice', 'large', 0.85);
  assert.ok(r.ssml);
  assert.match(r.ssml!, /^<speak><prosody rate="85%">/);
  assert.match(r.ssml!, /&amp;/);
  assert.match(r.ssml!, /&lt;dolor&gt;/);
});

test('modo text no genera SSML; modo both genera ambos', () => {
  assert.equal(formatter.format('Hola.', 'text').ssml, undefined);
  const both = formatter.format('Hola.', 'both');
  assert.equal(both.text, 'Hola.');
  assert.ok(both.ssml);
});

test('uiHint refleja fontSize y alto contraste', () => {
  const r = formatter.format('Hola.', 'text', 'x-large');
  assert.deepEqual(r.uiHint, { fontSize: 'x-large', highContrast: true });
  const normal = formatter.format('Hola.', 'text', 'normal');
  assert.equal(normal.uiHint?.highContrast, false);
});

test('texto sin puntuación final no se pierde', () => {
  const r = formatter.format('Hola Ana', 'text');
  assert.equal(r.text, 'Hola Ana');
});
