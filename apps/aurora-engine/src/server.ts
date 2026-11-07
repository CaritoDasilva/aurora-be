import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import { AuroraEngine } from './index.js';
import type { EngineConfig } from './types.js';
import { validateProfileUpdates } from './validate-profile.js';
import { AuthService, AUTH_MESSAGES } from './auth.js';
import type { RawInput } from '@aurora/input-processor';

const PORT = Number(process.env.AURORA_PORT ?? 3000);
// Localhost-only by default: the profile endpoints expose medical data.
const HOST = process.env.AURORA_HOST ?? '127.0.0.1';

const engine = new AuroraEngine({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  strictMode: process.env.STRICT_MODE === 'true',
  whisperModel: process.env.WHISPER_MODEL as EngineConfig['whisperModel'] | undefined,
});

// Login por teléfono + código. AURORA_DEMO_CODE=123456 fija el código (pruebas con personas);
// sin él, el código se imprime en la consola del servidor.
const auth = new AuthService({ fixedCode: process.env.AURORA_DEMO_CODE });
// Con AURORA_REQUIRE_AUTH=true, /process, /confirm, /cancel y /profile exigen sesión.
const REQUIRE_AUTH = process.env.AURORA_REQUIRE_AUTH === 'true';

function bearer(req: Request): string | undefined {
  const h = req.header('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}

const app: Application = express();
app.use(express.json({ limit: '1mb' }));

// CORS — allow all origins
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Aurora-Client, Authorization');
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

app.post('/auth/request-code', async (req: Request, res: Response) => {
  const result = await auth.requestCode(req.body?.phone);
  if (result.ok) {
    res.json({ ok: true });
    return;
  }
  const status = result.error === 'too_soon' ? 429 : result.error === 'send_failed' ? 502 : 400;
  res.status(status).json({
    ok: false,
    error: result.error,
    message: AUTH_MESSAGES[result.error],
    retryAfterSec: result.retryAfterSec,
  });
});

app.post('/auth/verify-code', (req: Request, res: Response) => {
  const result = auth.verifyCode(req.body?.phone, req.body?.code);
  if (result.ok) {
    res.json({ ok: true, token: result.token, expiresAt: result.expiresAt });
    return;
  }
  res.status(result.error === 'too_many_attempts' ? 429 : 400).json({
    ok: false,
    error: result.error,
    message: AUTH_MESSAGES[result.error],
  });
});

app.get('/auth/session', (req: Request, res: Response) => {
  const session = auth.validateToken(bearer(req));
  if (!session) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }
  res.json({ ok: true });
});

app.post('/auth/logout', (req: Request, res: Response) => {
  auth.logout(bearer(req));
  res.json({ ok: true });
});

// Desde aquí, rutas protegidas cuando AURORA_REQUIRE_AUTH=true.
app.use(['/process', '/confirm', '/cancel', '/profile'], (req: Request, res: Response, next: NextFunction) => {
  if (!REQUIRE_AUTH || req.method === 'OPTIONS' || auth.validateToken(bearer(req))) {
    next();
    return;
  }
  res.status(401).json({ error: 'No has iniciado sesión.' });
});

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
  if (auth.demoMode) console.warn('[auth] MODO DEMO: AURORA_DEMO_CODE fija el código de acceso.');
  if (!REQUIRE_AUTH) console.warn('[auth] AURORA_REQUIRE_AUTH no está activo: las rutas no exigen sesión.');
});

export default app;
