# @aurora/input-processor

Multimodal input handler for Aurora. Accepts voice, image, or text and outputs a normalized `AuroraMessage`.

## Inputs

| Type    | Payload format          | How it's processed          |
|---------|-------------------------|-----------------------------|
| `text`  | Plain string            | Trimmed and passed through  |
| `voice` | Base64-encoded audio    | OpenAI Whisper STT          |
| `image` | Base64 or URL           | Claude Vision description   |

## Usage

```typescript
import { InputProcessor, RawInput } from '@aurora/input-processor';

const processor = new InputProcessor();
const msg = await processor.process({ type: 'text', payload: 'Hello!', userId: 'u1' });
// → { text: 'Hello!', originalType: 'text', userId: 'u1', timestamp: '...' }
```
