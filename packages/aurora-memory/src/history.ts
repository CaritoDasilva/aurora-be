import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import type { ConversationEntry } from './types.js';

const DEFAULT_HISTORY_PATH = join(__dirname, '../data/history.json');
const MAX_HISTORY_ENTRIES = 50;

export async function loadHistory(filePath?: string): Promise<ConversationEntry[]> {
  const path = filePath ?? DEFAULT_HISTORY_PATH;
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as ConversationEntry[];
  } catch {
    return [];
  }
}

export async function saveEntry(entry: ConversationEntry, filePath?: string): Promise<void> {
  const path = filePath ?? DEFAULT_HISTORY_PATH;
  const history = await loadHistory(path);
  history.push(entry);
  const trimmed = history.slice(-MAX_HISTORY_ENTRIES);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(trimmed, null, 2), 'utf-8');
}

export async function getRecentHistory(
  n: number,
  filePath?: string
): Promise<ConversationEntry[]> {
  const history = await loadHistory(filePath);
  return history.slice(-n).reverse();
}
