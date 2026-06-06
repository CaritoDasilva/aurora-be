# @aurora/safety-layer

Validates every `AuroraMessage` before it reaches the agent. Three threat classes:

1. **Prompt injection** — attempts to override system instructions
2. **Dangerous commands** — shell/OS commands embedded in text
3. **Emergency situations** — keywords triggering immediate emergency protocol

## Usage

```typescript
import { SafetyLayer } from '@aurora/safety-layer';

const safety = new SafetyLayer();
const result = await safety.validate(auroraMessage);

if (result.emergency) {
  // activate emergency protocol — call emergency contacts
} else if (!result.safe) {
  // reject message, inform user
}
```
