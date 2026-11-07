import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import { AuroraEngine } from './index.js';
import type { EngineConfig } from './types.js';
import { validateProfileUpdates } from './validate-profile.js';
import type { RawInput } from '@aurora/input-processor';

const PORT = Number(process.env.AURORA_PORT ?? 3000);
// Localhost-only by default: the profile endpoints expose medical data.
const HOST = process.env.AURORA_HOST ?? '127.0.0.1';

const engine = new AuroraEngine({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  strictMode: process.env.STRICT_MODE === 'true',
  whisperModel: process.env.WHISPER_MODEL as EngineConfig['whisperModel'] | undefined,
});

const app: Application = express();
app.use(express.json({ limit: '1mb' }));

// CORS — allow all origins
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aurora-Client');
  next();
});

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const ts = new Date().toISOString();
  res.on('finish', () => {
    console.log(`[${ts}] ${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
});

// La app móvil ejecuta call/sms/reminder en el teléfono: lo indica con
// `native: true` en el cuerpo o con el header `x-aurora-client: mobile`.
function wantsNative(req: Request): boolean {
  return req.body?.native === true || req.header('x-aurora-client') === 'mobile';
}

app.post('/process', async (req: Request, res: Response) => {
  try {
    const { native: _native, ...input } = req.body as RawInput & { native?: boolean };
    const response = await engine.process(input as RawInput, { native: wantsNative(req) });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { pendingAction } = req.body as { pendingAction: string };
    if (typeof pendingAction !== 'string' || !pendingAction) {
      res.status(400).json({ error: 'Missing pendingAction' });
      return;
    }
    const response = await engine.confirm(pendingAction, { native: wantsNative(req) });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { pendingAction } = (req.body ?? {}) as { pendingAction?: string };
    const response = await engine.cancel(pendingAction);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/profile', async (_req: Request, res: Response) => {
  try {
    const profile = await engine.getProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.put('/profile', async (req: Request, res: Response) => {
  try {
    const validation = validateProfileUpdates(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: 'Perfil inválido', details: validation.errors });
      return;
    }
    const profile = await engine.updateProfile(validation.updates);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.listen(PORT, HOST, () => {
  console.log(`Aurora Engine running on http://${HOST}:${PORT}`);
});

export default app;
