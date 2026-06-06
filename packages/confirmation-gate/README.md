# @aurora/confirmation-gate

Pauses execution before irreversible actions and waits for explicit YES/NO user confirmation. Designed for users aged 60+: plain language, binary choice, large button hint.

## Actions that require confirmation

`make_call`, `send_sms`, `send_email`, `delete_file`, `share_location`, `purchase`, `update_emergency_contacts`, `wipe_profile`

## Usage

```typescript
import { ConfirmationGate } from '@aurora/confirmation-gate';

const gate = new ConfirmationGate();
gate.registerConfirmationHandler((req, resolve) => {
  // push req to UI and call resolve(true/false) when user taps YES/NO
});

if (gate.requiresConfirmation('make_call')) {
  const ok = await gate.requestConfirmation({
    action: 'make_call',
    description: 'llamar',
    reversible: false,
    target: 'María (hija)',
  });
  if (!ok) return; // user cancelled
}
```
