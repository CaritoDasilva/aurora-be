import { loadProfile, saveProfile as _saveProfile, updateProfile as _updateProfile } from './profile.js';
import { saveEntry, getRecentHistory } from './history.js';
import { buildSystemPrompt } from './context.js';
import type { UserProfile, ConversationEntry, MemoryContext } from './types.js';

export type { UserProfile, ConversationEntry, MemoryContext, Medication, EmergencyContact } from './types.js';

interface MemoryPluginConfig {
  profilePath?: string;
  historyPath?: string;
}

export class MemoryPlugin {
  private profilePath?: string;
  private historyPath?: string;

  constructor(config?: MemoryPluginConfig) {
    this.profilePath = config?.profilePath;
    this.historyPath = config?.historyPath;
  }

  async getContext(): Promise<MemoryContext> {
    const profile = await loadProfile(this.profilePath);
    const recentHistory = await getRecentHistory(10, this.historyPath);
    const systemPrompt = buildSystemPrompt(profile, recentHistory);
    return { profile, recentHistory, systemPrompt };
  }

  async saveExchange(
    userMessage: string,
    auroraResponse: string,
    category: string,
    status: string
  ): Promise<void> {
    const entry: ConversationEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userMessage,
      auroraResponse,
      category,
      status,
    };
    await saveEntry(entry, this.historyPath);
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return _updateProfile(updates, this.profilePath);
  }

  async getProfile(): Promise<UserProfile> {
    return loadProfile(this.profilePath);
  }
}
