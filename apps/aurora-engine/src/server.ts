import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import { AuroraEngine } from './index.js';
import type { RawInput } from '@aurora/input-processor';
import type { UserProfile } from '@aurora/aurora-memory';

const PORT = Number(process.env.AURORA_PORT ?? 3000);

const engine = new AuroraEngine({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  strictMode: process.env.STRICT_MODE === 'true',
});

const app: Application = express();
app.use(express.json());

// CORS — allow all origins
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

app.post('/process', async (req: Request, res: Response) => {
  try {
    const input = req.body as RawInput;
    const response = await engine.process(input);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { pendingAction } = req.body as { pendingAction: string };
    if (!pendingAction) {
      res.status(400).json({ error: 'Missing pendingAction' });
      return;
    }
    const response = await engine.confirm(pendingAction);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/cancel', async (_req: Request, res: Response) => {
  try {
    const response = await engine.cancel();
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
    const updates = req.body as Partial<UserProfile>;
    const profile = await engine.updateProfile(updates);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.listen(PORT, () => {
  console.log(`Aurora Engine running on http://localhost:${PORT}`);
});

export default app;
