const BASE = 'http://localhost:3000';

export interface EngineResponse {
  id: string;
  status: 'completed' | 'awaiting_confirmation' | 'blocked' | 'error';
  message: string;
  confirmationPrompt?: string;
  pendingAction?: string;
  error?: string;
}

export async function processInput(text: string): Promise<EngineResponse> {
  const res = await fetch(`${BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'text', text }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function processVoice(audioBase64: string): Promise<EngineResponse> {
  const res = await fetch(`${BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'voice', audioBase64 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function confirmAction(pendingAction: string): Promise<EngineResponse> {
  const res = await fetch(`${BASE}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingAction }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function cancelAction(): Promise<EngineResponse> {
  const res = await fetch(`${BASE}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
