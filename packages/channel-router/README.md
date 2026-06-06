# @aurora/channel-router

Routes normalized `AuroraMessage`s to the Claude agent orchestrator. Adapted from OpenClaw — replaces WhatsApp/Telegram adapters with Aurora's local HTTP API.

## Usage

```typescript
import { ChannelRouter } from '@aurora/channel-router';

const router = new ChannelRouter({ model: 'claude-opus-4-8' });
const response = await router.route(auroraMessage, userProfile);

if (response.skillCall) {
  // dispatch the skill
}
```
