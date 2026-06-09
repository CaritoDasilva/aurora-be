import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import type { UserProfile } from './types.js';

const DEFAULT_PROFILE_PATH = join(__dirname, '../data/profile.json');

export async function loadProfile(filePath?: string): Promise<UserProfile> {
  const path = filePath ?? DEFAULT_PROFILE_PATH;
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as UserProfile;
  } catch {
    const defaultProfile: UserProfile = {
      userId: 'default',
      name: 'Usuario',
      language: 'es',
      medications: [],
      emergencyContacts: [],
      preferences: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(defaultProfile, path);
    return defaultProfile;
  }
}

export async function saveProfile(profile: UserProfile, filePath?: string): Promise<void> {
  const path = filePath ?? DEFAULT_PROFILE_PATH;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(profile, null, 2), 'utf-8');
}

export async function updateProfile(
  updates: Partial<UserProfile>,
  filePath?: string
): Promise<UserProfile> {
  const profile = await loadProfile(filePath);
  const updated: UserProfile = {
    ...profile,
    ...updates,
    preferences: { ...profile.preferences, ...(updates.preferences ?? {}) },
    updatedAt: new Date().toISOString(),
  };
  await saveProfile(updated, filePath);
  return updated;
}
