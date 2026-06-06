# Aurora BE

> AI assistant engine backend for people aged 60+, built on OpenClaw architecture.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict, ES2022) |
| Runtime | Node.js ≥ 18 |
| Package manager | pnpm (monorepo via `pnpm-workspace.yaml`) |
| AI provider | Anthropic Claude (agent) + OpenAI Whisper (STT) |
| HTTP server | Express 4 |

---

## Architecture — 5-layer pipeline

```
┌────────────────────────────────────────────────────────┐
│                     Aurora Engine                      │
│                   (apps/aurora-engine)                 │
└──────────────────────────┬─────────────────────────────┘
                           │  POST /message
                           ▼
┌──────────────────────────────────────────────────────┐
│  Layer 1 — InputProcessor  (@aurora/input-processor) │
│  voice (Whisper STT) │ image (Claude Vision) │ text   │
│            ↓ AuroraMessage (normalized text)          │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│  Layer 2 — SafetyLayer     (@aurora/safety-layer)    │
│  prompt injection │ dangerous commands │ emergency    │
│           safe=true → continue                        │
│           emergency=true → emergency protocol         │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│  Layer 3 — ChannelRouter   (@aurora/channel-router)  │
│  Claude agent (claude-opus-4-8) + user profile ctx   │
│  Reads: MemoryPlugin  Calls: AuroraSkills             │
│          ↓ AgentResponse (text + optional skillCall)  │
└──────────────────────────────────────────────────────┘
                           │
                  skillCall detected?
                    │             │
                    ▼             ▼
        ┌───────────────┐    (no skill call)
        │ ConfirmationGate│
        │(@aurora/conf..)│
        │ YES/NO prompt  │
        └───────┬────────┘
                │ confirmed
                ▼
        ┌───────────────┐
        │ AuroraSkills  │
        │ makeCall      │
        │ sendSMS       │
        │ addMedReminder│
        └───────┬───────┘
                │
                ▼
┌──────────────────────────────────────────────────────┐
│  Layer 5 — ResponseFormatter (@aurora/response-fmt)  │
│  plain text + SSML (TTS) │ font size hint             │
│  max 3 sentences │ stripped markdown                  │
└──────────────────────────────────────────────────────┘
                           │
                    HTTP JSON response
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@aurora/input-processor` | Normalize voice/image/text → `AuroraMessage` |
| `@aurora/safety-layer` | Detect injection, dangerous commands, emergencies |
| `@aurora/confirmation-gate` | YES/NO gate for irreversible actions |
| `@aurora/memory-plugin` | Persistent user profile (contacts, meds, prefs) |
| `@aurora/channel-router` | Route to Claude agent (OpenClaw-adapted) |
| `@aurora/response-formatter` | Text + SSML output for display/TTS |
| `@aurora/aurora-skills` | Callable skills: call, SMS, reminders, vision |

---

## Quick start

```bash
git clone https://github.com/CaritoDasilva/aurora-be.git
cd aurora-be

# Copy env file and fill in your API keys
cp .env.example .env

# Install dependencies
pnpm install

# Start all packages in watch mode + the engine
pnpm dev
```

The engine will be available at `http://localhost:3000`.

### Send a test message

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"type":"text","payload":"Hola Aurora, ¿cómo estoy?","userId":"u1"}'
```

### Health check

```bash
curl http://localhost:3000/health
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude agent + Vision) |
| `OPENAI_API_KEY` | OpenAI API key (Whisper STT) |
| `AURORA_PORT` | HTTP server port (default: 3000) |
