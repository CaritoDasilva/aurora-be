/**
 * aurora-engine
 *
 * Entry point for the Aurora AI assistant backend.
 * Wires all packages into a 5-layer processing pipeline:
 *
 *   [RawInput]
 *       │
 *   InputProcessor   (normalize voice/image/text → AuroraMessage)
 *       │
 *   SafetyLayer      (detect injection / dangerous commands / emergencies)
 *       │
 *   ConfirmationGate (pause for user YES/NO on irreversible actions)
 *       │
 *   ChannelRouter    (send to Claude agent + dispatch Aurora skills)
 *       │
 *   ResponseFormatter (text + SSML output for display/TTS)
 *       │
 *   [HTTP Response]
 */

import express, { Request, Response, NextFunction } from 'express';
import { InputProcessor, RawInput } from '@aurora/input-processor';
import { SafetyLayer } from '@aurora/safety-layer';
import { ConfirmationGate } from '@aurora/confirmation-gate';
import { MemoryPlugin } from '@aurora/memory-plugin';
import { ChannelRouter } from '@aurora/channel-router';
import { ResponseFormatter } from '@aurora/response-formatter';
import * as AuroraSkills from '@aurora/aurora-skills';

// ── Bootstrap ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const inputProcessor = new InputProcessor();
const safetyLayer = new SafetyLayer();
const confirmationGate = new ConfirmationGate();
const memory = new MemoryPlugin();
const router = new ChannelRouter();
const formatter = new ResponseFormatter();

// Wire the confirmation gate to broadcast to connected SSE/WebSocket clients
// TODO: replace this stub with a real push mechanism (Server-Sent Events or WS)
confirmationGate.registerConfirmationHandler((req, resolve) => {
  console.warn('[ConfirmationGate] Action requires confirmation:', req.action);
  console.warn('[ConfirmationGate] Stub: auto-denying until real push is wired');
  resolve(false);
});

const PORT = Number(process.env.AURORA_PORT ?? 3000);

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /message
 *
 * Body: { type: 'text'|'voice'|'image', payload: string, userId?: string, language?: string }
 *
 * Response: { text: string, ssml?: string, safe: boolean, emergency?: boolean }
 */
app.post('/message', async (req: Request, res: Response) => {
  const rawInput = req.body as RawInput;

  if (!rawInput?.type || !rawInput?.payload) {
    res.status(400).json({ error: 'Missing required fields: type, payload' });
    return;
  }

  // ── Layer 1: Input normalization ──────────────────────────────────────────
  let auroraMessage;
  try {
    auroraMessage = await inputProcessor.process(rawInput);
  } catch (err) {
    res.status(422).json({ error: `Input processing failed: ${String(err)}` });
    return;
  }

  // ── Layer 2: Safety validation ────────────────────────────────────────────
  const safety = await safetyLayer.validate(auroraMessage);
  if (safety.emergency) {
    // TODO: trigger emergency protocol (alert contacts, open emergency UI)
    const contacts = await AuroraSkills.getEmergencyContacts(
      auroraMessage.userId ?? 'anonymous',
      memory
    );
    res.status(200).json({
      safe: false,
      emergency: true,
      message: 'Activating emergency protocol',
      emergencyContacts: contacts,
    });
    return;
  }
  if (!safety.safe) {
    res.status(400).json({ safe: false, reason: safety.reason });
    return;
  }

  // ── Layer 3: Agent routing ────────────────────────────────────────────────
  const profile = await memory.getProfile(auroraMessage.userId ?? 'anonymous');
  const agentResponse = await router.route(auroraMessage, profile);

  // ── Layer 4: Skill dispatch (with confirmation gate) ──────────────────────
  if (agentResponse.skillCall) {
    const { name: skillName, args } = agentResponse.skillCall;

    if (confirmationGate.requiresConfirmation(skillName)) {
      const confirmed = await confirmationGate.requestConfirmation({
        action: skillName,
        description: `ejecutar ${skillName}`,
        reversible: false,
        target: String(args.contactName ?? args.contact ?? ''),
      });

      if (!confirmed) {
        const formatted = formatter.format(
          'Entendido, acción cancelada.',
          profile?.preferences.alwaysUseTTS ? 'both' : 'text',
          profile?.preferences.fontSize ?? 'large',
          profile?.preferences.voiceSpeed ?? 0.85
        );
        res.status(200).json({ ...formatted, safe: true, cancelled: true });
        return;
      }
    }

    // TODO: dispatch skill and append result to the response
    //       e.g. if (skillName === 'make_call') await AuroraSkills.makeCall(...)
    console.log(`[aurora-engine] Skill dispatch stub: ${skillName}`, args);
  }

  // ── Layer 5: Response formatting ──────────────────────────────────────────
  const outputMode = profile?.preferences.alwaysUseTTS ? 'both' : 'text';
  const formatted = formatter.format(
    agentResponse.text,
    outputMode,
    profile?.preferences.fontSize ?? 'large',
    profile?.preferences.voiceSpeed ?? 0.85
  );

  res.status(200).json({ ...formatted, safe: true });
});

/**
 * GET /health
 * Simple liveness probe.
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ──────────────────────────────────────────────────────────

// TODO: add structured error logging (e.g. Pino or Winston) before production
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[aurora-engine] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Aurora engine running on http://localhost:${PORT}`);
  console.log('POST /message  — send a message through the Aurora pipeline');
  console.log('GET  /health   — liveness probe');
});

export default app;
