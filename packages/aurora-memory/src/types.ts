export interface Medication {
  name: string;
  dose?: string;
  schedule?: string[];
  notes?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  lastName?: string;
  language: string;
  age?: number;
  medications: Medication[];
  emergencyContacts: EmergencyContact[];
  preferences: {
    voiceSpeed?: 'slow' | 'normal' | 'fast';
    fontSize?: 'large' | 'xlarge';
    confirmAllActions?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationEntry {
  id: string;
  timestamp: string;
  userMessage: string;
  auroraResponse: string;
  category: string;
  status: string;
}

export interface MemoryContext {
  profile: UserProfile;
  recentHistory: ConversationEntry[];
  systemPrompt: string;
}
