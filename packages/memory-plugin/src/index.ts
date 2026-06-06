/**
 * memory-plugin
 *
 * Persistent user profile for Aurora. Stores personal details, contacts,
 * medications with reminders, emergency contacts, and UI preferences.
 *
 * Storage strategy: currently in-memory (Map). Replace the private store
 * with a database adapter (SQLite for local, PostgreSQL for cloud) before
 * shipping to production.
 */

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  relationship?: string;
  /** If true, shown in emergency contact list */
  isEmergency: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  /** e.g. ['08:00', '20:00'] — times in HH:MM (local time) */
  reminderTimes: string[];
  instructions?: string;
  /** Whether the reminder is currently active */
  active: boolean;
}

export interface UserPreferences {
  /** IANA language tag (e.g. 'es-ES', 'en-US') */
  language: string;
  /** CSS-like font size hint for the UI layer */
  fontSize: 'normal' | 'large' | 'x-large';
  /** TTS speech rate multiplier (1.0 = normal, 0.8 = slower) */
  voiceSpeed: number;
  /** Whether to speak all agent responses aloud */
  alwaysUseTTS: boolean;
}

export interface UserProfile {
  userId: string;
  name: string;
  contacts: Contact[];
  medications: Medication[];
  preferences: UserPreferences;
  /** ISO 8601 date of last profile update */
  updatedAt: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'es-ES',
  fontSize: 'large',
  voiceSpeed: 0.85,
  alwaysUseTTS: true,
};

export class MemoryPlugin {
  // TODO: replace with a real DB adapter (see storage strategy above)
  private store = new Map<string, UserProfile>();

  /** Creates or fully replaces a user profile */
  async upsertProfile(profile: Omit<UserProfile, 'updatedAt'>): Promise<UserProfile> {
    const record: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
    this.store.set(profile.userId, record);
    return record;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.store.get(userId) ?? null;
  }

  /** Creates a minimal profile with sensible defaults for new users */
  async createDefaultProfile(userId: string, name: string): Promise<UserProfile> {
    return this.upsertProfile({
      userId,
      name,
      contacts: [],
      medications: [],
      preferences: { ...DEFAULT_PREFERENCES },
    });
  }

  // ── Contacts ───────────────────────────────────────────────────────────────

  async addContact(userId: string, contact: Omit<Contact, 'id'>): Promise<Contact> {
    const profile = await this.requireProfile(userId);
    const newContact: Contact = { ...contact, id: crypto.randomUUID() };
    profile.contacts.push(newContact);
    profile.updatedAt = new Date().toISOString();
    return newContact;
  }

  async removeContact(userId: string, contactId: string): Promise<boolean> {
    const profile = await this.requireProfile(userId);
    const before = profile.contacts.length;
    profile.contacts = profile.contacts.filter((c) => c.id !== contactId);
    profile.updatedAt = new Date().toISOString();
    return profile.contacts.length < before;
  }

  async getEmergencyContacts(userId: string): Promise<Contact[]> {
    const profile = await this.requireProfile(userId);
    return profile.contacts.filter((c) => c.isEmergency);
  }

  // ── Medications ────────────────────────────────────────────────────────────

  async addMedication(userId: string, med: Omit<Medication, 'id'>): Promise<Medication> {
    const profile = await this.requireProfile(userId);
    const newMed: Medication = { ...med, id: crypto.randomUUID() };
    profile.medications.push(newMed);
    profile.updatedAt = new Date().toISOString();
    return newMed;
  }

  async removeMedication(userId: string, medicationId: string): Promise<boolean> {
    const profile = await this.requireProfile(userId);
    const before = profile.medications.length;
    profile.medications = profile.medications.filter((m) => m.id !== medicationId);
    profile.updatedAt = new Date().toISOString();
    return profile.medications.length < before;
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  async updatePreferences(
    userId: string,
    partial: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const profile = await this.requireProfile(userId);
    profile.preferences = { ...profile.preferences, ...partial };
    profile.updatedAt = new Date().toISOString();
    return profile.preferences;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async requireProfile(userId: string): Promise<UserProfile> {
    const profile = this.store.get(userId);
    if (!profile) throw new Error(`No profile found for userId: ${userId}`);
    return profile;
  }
}
