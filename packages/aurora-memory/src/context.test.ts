import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from './context.js';
import type { UserProfile, ConversationEntry } from './types.js';

const fullProfile: UserProfile = {
  userId: 'default',
  name: 'Ana',
  lastName: 'López',
  language: 'es',
  age: 68,
  medications: [
    { name: 'Metformina', dose: '500mg', schedule: ['8:00', '20:00'], notes: 'con comida' },
    { name: 'Atorvastatina', dose: '20mg', schedule: ['21:00'] },
  ],
  emergencyContacts: [
    { name: 'María García', phone: '+1555000001', relationship: 'hija' },
    { name: 'Dr. Ramírez', phone: '+1555000002', relationship: 'médico' },
  ],
  preferences: {},
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

test('incluye nombre completo, edad y nombre de pila', () => {
  const prompt = buildSystemPrompt(fullProfile, []);
  assert.match(prompt, /Ana López, 68 años/);
  assert.match(prompt, /nombre de pila "Ana"/);
});

test('incluye medicamentos con dosis, horarios y notas', () => {
  const prompt = buildSystemPrompt(fullProfile, []);
  assert.match(prompt, /Metformina 500mg → a las 8:00 y 20:00, con comida/);
  assert.match(prompt, /Atorvastatina 20mg → a las 21:00/);
});

test('incluye contactos con teléfono y hints de relación', () => {
  const prompt = buildSystemPrompt(fullProfile, []);
  assert.match(prompt, /Hija: María García \(\+1555000001\)/);
  assert.match(prompt, /"mi hija" o "hija", es María García/);
  assert.match(prompt, /"mi médico" o "médico", es Dr\. Ramírez/);
});

test('incluye solo los últimos 3 intercambios', () => {
  const history: ConversationEntry[] = [1, 2, 3, 4].map((n) => ({
    id: `id-${n}`,
    timestamp: new Date().toISOString(),
    userMessage: `pregunta ${n}`,
    auroraResponse: `respuesta ${n}`,
    category: 'query',
    status: 'completed',
  }));
  // recentHistory llega más-reciente-primero (contrato de getRecentHistory)
  const prompt = buildSystemPrompt(fullProfile, history);
  assert.match(prompt, /pregunta 1/);
  assert.match(prompt, /pregunta 3/);
  assert.doesNotMatch(prompt, /pregunta 4/);
});

test('perfil vacío genera prompt válido sin crashear', () => {
  const empty: UserProfile = {
    userId: 'default',
    name: 'Usuario',
    language: 'es',
    medications: [],
    emergencyContacts: [],
    preferences: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const prompt = buildSystemPrompt(empty, []);
  assert.match(prompt, /Usuario\./);
  assert.match(prompt, /Ninguno registrado/);
  assert.match(prompt, /Sin conversación previa\./);
  assert.doesNotMatch(prompt, /undefined/);
  assert.doesNotMatch(prompt, /años/);
});
