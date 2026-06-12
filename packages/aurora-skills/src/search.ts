import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SkillResult } from './types.js';

const execAsync = promisify(exec);

interface DuckDuckGoResponse {
  AbstractText?: string;
  Answer?: string;
}

export async function webSearch(query: string): Promise<SkillResult> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Aurora/1.0' } });
    const data = (await response.json()) as DuckDuckGoResponse;

    const text = (data.AbstractText ?? data.Answer ?? '').trim();
    if (text) {
      return { success: true, message: text.slice(0, 200), data: text };
    }
  } catch {
    // fall through to browser fallback
  }

  // Fallback: open search in browser
  try {
    await execAsync(`cmd /c start "" "https://www.google.com/search?q=${encodeURIComponent(query)}"`);
    return { success: true, message: `Abriendo búsqueda para: ${query}` };
  } catch (err) {
    return { success: false, message: `No se pudo buscar: ${String(err)}` };
  }
}
