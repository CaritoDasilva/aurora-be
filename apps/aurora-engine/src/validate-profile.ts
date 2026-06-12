import type { UserProfile } from '@aurora/aurora-memory';

/**
 * Validation boundary for PUT /profile. The profile holds medical data and
 * emergency contacts, so unknown keys and malformed shapes are rejected
 * outright instead of being merged into the stored profile.
 */

const ALLOWED_KEYS = new Set([
  'name',
  'lastName',
  'language',
  'age',
  'medications',
  'emergencyContacts',
  'preferences',
]);

const VOICE_SPEEDS = new Set(['slow', 'normal', 'fast']);
const FONT_SIZES = new Set(['large', 'xlarge']);

export type ValidationResult =
  | { ok: true; updates: Partial<UserProfile> }
  | { ok: false; errors: string[] };

export function validateProfileUpdates(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'] };
  }

  const input = body as Record<string, unknown>;

  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push(`Campo no permitido: ${key}`);
    }
  }

  if ('name' in input && (typeof input.name !== 'string' || input.name.trim() === '')) {
    errors.push('name debe ser un texto no vacío');
  }
  if ('lastName' in input && typeof input.lastName !== 'string') {
    errors.push('lastName debe ser un texto');
  }
  if ('language' in input && (typeof input.language !== 'string' || input.language.trim() === '')) {
    errors.push('language debe ser un texto no vacío');
  }
  if ('age' in input && (typeof input.age !== 'number' || !Number.isInteger(input.age) || input.age < 0 || input.age > 130)) {
    errors.push('age debe ser un entero entre 0 y 130');
  }

  if ('medications' in input) {
    if (!Array.isArray(input.medications)) {
      errors.push('medications debe ser una lista');
    } else {
      input.medications.forEach((m, i) => {
        if (typeof m !== 'object' || m === null) {
          errors.push(`medications[${i}] debe ser un objeto`);
          return;
        }
        const med = m as Record<string, unknown>;
        if (typeof med.name !== 'string' || med.name.trim() === '') {
          errors.push(`medications[${i}].name es obligatorio`);
        }
        if ('dose' in med && med.dose !== undefined && typeof med.dose !== 'string') {
          errors.push(`medications[${i}].dose debe ser texto`);
        }
        if ('schedule' in med && med.schedule !== undefined &&
            (!Array.isArray(med.schedule) || med.schedule.some((s) => typeof s !== 'string'))) {
          errors.push(`medications[${i}].schedule debe ser una lista de horarios`);
        }
        if ('notes' in med && med.notes !== undefined && typeof med.notes !== 'string') {
          errors.push(`medications[${i}].notes debe ser texto`);
        }
      });
    }
  }

  if ('emergencyContacts' in input) {
    if (!Array.isArray(input.emergencyContacts)) {
      errors.push('emergencyContacts debe ser una lista');
    } else {
      input.emergencyContacts.forEach((c, i) => {
        if (typeof c !== 'object' || c === null) {
          errors.push(`emergencyContacts[${i}] debe ser un objeto`);
          return;
        }
        const contact = c as Record<string, unknown>;
        if (typeof contact.name !== 'string' || contact.name.trim() === '') {
          errors.push(`emergencyContacts[${i}].name es obligatorio`);
        }
        if (typeof contact.phone !== 'string' || contact.phone.trim() === '') {
          errors.push(`emergencyContacts[${i}].phone es obligatorio`);
        }
        if (typeof contact.relationship !== 'string' || contact.relationship.trim() === '') {
          errors.push(`emergencyContacts[${i}].relationship es obligatorio`);
        }
      });
    }
  }

  if ('preferences' in input) {
    if (typeof input.preferences !== 'object' || input.preferences === null || Array.isArray(input.preferences)) {
      errors.push('preferences debe ser un objeto');
    } else {
      const prefs = input.preferences as Record<string, unknown>;
      for (const key of Object.keys(prefs)) {
        if (!['voiceSpeed', 'fontSize', 'confirmAllActions'].includes(key)) {
          errors.push(`preferences.${key} no es un campo permitido`);
        }
      }
      if ('voiceSpeed' in prefs && !VOICE_SPEEDS.has(prefs.voiceSpeed as string)) {
        errors.push('preferences.voiceSpeed debe ser slow, normal o fast');
      }
      if ('fontSize' in prefs && !FONT_SIZES.has(prefs.fontSize as string)) {
        errors.push('preferences.fontSize debe ser large o xlarge');
      }
      if ('confirmAllActions' in prefs && typeof prefs.confirmAllActions !== 'boolean') {
        errors.push('preferences.confirmAllActions debe ser booleano');
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, updates: input as Partial<UserProfile> };
}
