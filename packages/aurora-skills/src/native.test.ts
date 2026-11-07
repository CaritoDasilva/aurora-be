import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { SkillsExecutor } from './index.js';
import { extractSmsBody, cleanReminderText } from './native.js';

// Mismo JSON de ejemplo que usa el paquete (dist/ -> ../data)
const contactsFilePath = path.resolve(__dirname, '../data/contacts.json');
const skills = new SkillsExecutor({ contactsFilePath });

test('native: llamar a "mi hija" devuelve acción call con el número del contacto', async () => {
  const r = await skills.execute('call', 'llama a mi hija', { native: true });
  assert.equal(r.success, true);
  assert.deepEqual(r.action, { type: 'call', phone: '+1555000001', name: 'María García' });
});

test('native: no ejecuta nada en el servidor (sin Twilio ni cmd)', async () => {
  const r = await skills.execute('call', 'llama a mi hija', { native: true });
  assert.match(r.message, /Llamando a María García/);
});

test('native: SMS devuelve acción sms con cuerpo vacío si no se dictó mensaje', async () => {
  const r = await skills.execute('sms', 'envía un mensaje a mi hija', { native: true });
  assert.equal(r.success, true);
  assert.deepEqual(r.action, { type: 'sms', phone: '+1555000001', name: 'María García', body: '' });
});

test('native: SMS con "diciendo ..." usa ese texto como cuerpo', async () => {
  assert.equal(extractSmsBody('manda un mensaje a mi hija diciendo que llego tarde'), 'que llego tarde');
  assert.equal(extractSmsBody('mensaje a mi hija'), '');
});

test('native: contacto desconocido o texto libre no genera acción (anti-inyección)', async () => {
  const r = await skills.execute('call', 'llama a x & calc.exe', { native: true });
  assert.equal(r.success, false);
  assert.equal(r.action, undefined);
});

test('native: recordatorio "en 10 minutos" ≈ 600 segundos', async () => {
  const r = await skills.execute('reminder', 'recuérdame tomar la pastilla en 10 minutos', { native: true });
  assert.equal(r.action?.type, 'reminder');
  if (r.action?.type === 'reminder') {
    assert.ok(Math.abs(r.action.triggerSeconds - 600) <= 2);
    assert.equal(r.action.body, 'tomar la pastilla');
  }
});

test('native: recordatorio sin hora se dispara en pocos segundos', async () => {
  const r = await skills.execute('reminder', 'recordatorio de llamar al médico', { native: true });
  assert.equal(r.action?.type, 'reminder');
  if (r.action?.type === 'reminder') assert.equal(r.action.triggerSeconds, 5);
});

test('sin native las categorías query siguen igual y no traen acción', async () => {
  const r = await skills.execute('other', 'hola', { native: true });
  assert.equal(r.action, undefined);
});

test('texto del recordatorio queda solo con lo importante', () => {
  assert.equal(cleanReminderText('Ponme un recordatorio de la pastilla en 10 minutos'), 'la pastilla');
  assert.equal(cleanReminderText('recuérdame tomar la pastilla a las 8 de la noche'), 'tomar la pastilla');
  assert.equal(cleanReminderText('recordatorio'), 'recordatorio');
});
