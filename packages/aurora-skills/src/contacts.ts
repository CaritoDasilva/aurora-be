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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export async function findContact(nameOrRelationship: string, filePath?: string): Promise<Contact | null> {
  const contacts = await loadContacts(filePath);
  const queryWords = normalize(nameOrRelationship).split(/\s+/).filter(Boolean);
  return (
    contacts.find((c) => {
      const nameWords = normalize(c.name).split(/\s+/);
      const relationship = c.relationship ? normalize(c.relationship) : undefined;
      return queryWords.some((w) => nameWords.includes(w) || w === relationship);
    }) ?? null
  );
}

export async function addContact(contact: Contact, filePath?: string): Promise<void> {
  const p = filePath ?? DEFAULT_PATH;
  const contacts = await loadContacts(p);
  contacts.push(contact);
  await writeFile(p, JSON.stringify(contacts, null, 2), 'utf-8');
}
