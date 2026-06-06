# @aurora/response-formatter

Formats agent responses for Aurora's display layer. Strips markdown, truncates to 3 sentences, and optionally wraps in SSML for TTS.

## Usage

```typescript
import { ResponseFormatter } from '@aurora/response-formatter';

const formatter = new ResponseFormatter();
const out = formatter.format(agentText, 'both', 'large', 0.85);
// out.text  → plain text
// out.ssml  → <speak><prosody rate="85%">...</prosody></speak>
```
