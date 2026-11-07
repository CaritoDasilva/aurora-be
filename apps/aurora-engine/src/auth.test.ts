import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, normalizeChileanMobile } from './auth.js';
import type { CodeSender } from './auth.js';

function setup(opts: ConstructorParameters<typeof AuthService>[0] = {}) {
  const sent: { phone: string; code: string }[] = [];
  const sender: CodeSender = { async send(phone, code) { sent.push({ phone, code }); } };
  let t = 1_000_000;
  const clock = { advance: (ms: number) => { t += ms; } };
  const auth = new AuthService({ sender, now: () => t, ...opts });
  return { auth, sent, clock };
}

test('normaliza celulares chilenos y rechaza el resto', () => {
  assert.equal(normalizeChileanMobile('9 1234 5678'), '56912345678');
  assert.equal(normalizeChileanMobile('+56 9 1234 5678'), '56912345678');
  assert.equal(normalizeChileanMobile('912345678'), '56912345678');
  assert.equal(normalizeChileanMobile('22 123 4567'), null);
  assert.equal(normalizeChileanMobile('x & calc'), null);
  assert.equal(normalizeChileanMobile(''), null);
  assert.equal(normalizeChileanMobile(undefined), null);
});

test('flujo feliz: pedir código, verificar y validar la sesión', async () => {
  const { auth, sent } = setup();
  assert.deepEqual(await auth.requestCode('9 1234 5678'), { ok: true });
  assert.equal(sent.length, 1);
  assert.match(sent[0].code, /^\d{6}$/);
  const r = auth.verifyCode('+56 9 1234 5678', sent[0].code);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(auth.validateToken(r.token), { phone: '56912345678' });
});

test('número inválido no envía nada', async () => {
  const { auth, sent } = setup();
  assert.deepEqual(await auth.requestCode('123'), { ok: false, error: 'invalid_phone' });
  assert.equal(sent.length, 0);
});

test('un código sirve una sola vez', async () => {
  const { auth, sent } = setup();
  await auth.requestCode('912345678');
  assert.equal(auth.verifyCode('912345678', sent[0].code).ok, true);
  const again = auth.verifyCode('912345678', sent[0].code);
  assert.deepEqual(again, { ok: false, error: 'no_code' });
});

test('código incorrecto, y bloqueo tras 5 intentos aunque luego acierte', async () => {
  const { auth, sent } = setup();
  await auth.requestCode('912345678');
  const wrong = sent[0].code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(auth.verifyCode('912345678', wrong), { ok: false, error: 'invalid_code' });
  }
  assert.deepEqual(auth.verifyCode('912345678', wrong), { ok: false, error: 'too_many_attempts' });
  assert.deepEqual(auth.verifyCode('912345678', sent[0].code), { ok: false, error: 'no_code' });
});

test('el código vence a los 5 minutos', async () => {
  const { auth, sent, clock } = setup();
  await auth.requestCode('912345678');
  clock.advance(5 * 60_000 + 1);
  assert.deepEqual(auth.verifyCode('912345678', sent[0].code), { ok: false, error: 'expired' });
});

test('reenviar antes de 30 s se rechaza con el tiempo de espera', async () => {
  const { auth, clock } = setup();
  await auth.requestCode('912345678');
  clock.advance(10_000);
  assert.deepEqual(await auth.requestCode('912345678'), { ok: false, error: 'too_soon', retryAfterSec: 20 });
  clock.advance(20_000);
  assert.deepEqual(await auth.requestCode('912345678'), { ok: true });
});

test('modo demo: el código es el fijo', async () => {
  const { auth, sent } = setup({ fixedCode: '123456' });
  assert.equal(auth.demoMode, true);
  await auth.requestCode('912345678');
  assert.equal(sent[0].code, '123456');
  assert.equal(auth.verifyCode('912345678', '123456').ok, true);
});

test('un código fijo mal formado se ignora', () => {
  assert.equal(setup({ fixedCode: '12' }).auth.demoMode, false);
});

test('la sesión vence, se puede cerrar, y un token inventado no vale', async () => {
  const { auth, sent, clock } = setup({ fixedCode: '123456' });
  await auth.requestCode('912345678');
  const r = auth.verifyCode('912345678', '123456');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(auth.validateToken(r.token));
  assert.equal(auth.validateToken('inventado'), null);
  auth.logout(r.token);
  assert.equal(auth.validateToken(r.token), null);

  clock.advance(60_000);
  await auth.requestCode('912345678');
  const r2 = auth.verifyCode('912345678', '123456');
  assert.ok(r2.ok);
  if (!r2.ok) return;
  clock.advance(24 * 3_600_000 + 1);
  assert.equal(auth.validateToken(r2.token), null);
  assert.equal(sent.length, 2);
});

test('si falla el envío, no queda código guardado', async () => {
  const failing: CodeSender = { async send() { throw new Error('sin red'); } };
  const auth = new AuthService({ sender: failing });
  const origError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await auth.requestCode('912345678'), { ok: false, error: 'send_failed' });
  } finally {
    console.error = origError;
  }
  assert.deepEqual(auth.verifyCode('912345678', '123456'), { ok: false, error: 'no_code' });
});
