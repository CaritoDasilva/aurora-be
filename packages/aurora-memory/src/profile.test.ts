import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadProfile, saveProfile, updateProfile } from './profile.js';
import type { UserProfile } from './types.js';

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'aurora-profile-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('loadProfile crea perfil por defecto si el archivo no existe', async () => {
  await withTempDir(async (dir) => {
    const path = join(dir, 'profile.json');
    const profile = await loadProfile(path);
    assert.equal(profile.userId, 'default');
    assert.equal(profile.name, 'Usuario');
    assert.equal(profile.language, 'es');
    assert.deepEqual(profile.medications, []);
    assert.deepEqual(profile.emergencyContacts, []);
    // y lo persiste: una segunda carga lee el mismo perfil
    const again = await loadProfile(path);
    assert.equal(again.createdAt, profile.createdAt);
  });
});

test('saveProfile + loadProfile roundtrip', async () => {
  await withTempDir(async (dir) => {
    const path = join(dir, 'profile.json');
    const profile: UserProfile = {
      userId: 'default',
      name: 'Ana',
      lastName: 'López',
      language: 'es',
      age: 68,
      medications: [{ name: 'Metformina', dose: '500mg', schedule: ['8:00'], notes: 'con comida' }],
      emergencyContacts: [{ name: 'María', phone: '+1555000001', relationship: 'hija' }],
      preferences: { voiceSpeed: 'slow' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    await saveProfile(profile, path);
    const loaded = await loadProfile(path);
    assert.deepEqual(loaded, profile);
  });
});

test('updateProfile mergea preferences y actualiza updatedAt', async () => {
  await withTempDir(async (dir) => {
    const path = join(dir, 'profile.json');
    await loadProfile(path); // crea default
    await updateProfile({ preferences: { voiceSpeed: 'slow' } }, path);
    const updated = await updateProfile({ name: 'Rosa', preferences: { fontSize: 'xlarge' } }, path);
    assert.equal(updated.name, 'Rosa');
    // el merge de preferences no pisa lo anterior
    assert.equal(updated.preferences.voiceSpeed, 'slow');
    assert.equal(updated.preferences.fontSize, 'xlarge');
    assert.notEqual(updated.updatedAt, updated.createdAt);
  });
});
