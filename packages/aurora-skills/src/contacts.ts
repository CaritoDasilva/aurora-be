import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Contact } from './types.js';

const DEFAULT_PATH = path.resolve(__dirname, '../data/contacts.json');

export async function loadContacts(filePath?: string): Promise<Contact[]> {
  try {
    const raw = await readFile(filePath ?? DEFAULT_PATH, 'utf-8');
    return JSON.parse(raw) as Contact[];
  } catch {
    return [];
  }
}

export async function findContact(nameOrRelationship: string, filePath?: string): Promise<Contact | null> {
  const contacts = await loadContacts(filePath);
  const q = nameOrRelationship.toLowerCase().trim();
  return (
    contacts.find(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.relationship?.toLowerCase().includes(q) ?? false)
    ) ?? null
  );
}

export async function addContact(contact: Contact, filePath?: string): Promise<void> {
  const p = filePath ?? DEFAULT_PATH;
  const contacts = await loadContacts(p);
  contacts.push(contact);
  await writeFile(p, JSON.stringify(contacts, null, 2), 'utf-8');
}
