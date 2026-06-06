# @aurora/aurora-skills

Aurora-specific callable skills. Each is a typed async function the agent can dispatch after safety and confirmation checks.

| Skill | Description | Requires confirmation |
|-------|-------------|----------------------|
| `makeCall` | Place a phone call to a contact | Yes |
| `sendSMS` | Send an SMS message | Yes |
| `addMedicationReminder` | Schedule a medication reminder | No |
| `getEmergencyContacts` | List emergency contacts | No |
| `describeImage` | Claude Vision description of an image | No |

## Usage

```typescript
import { makeCall, sendSMS } from '@aurora/aurora-skills';

const result = await makeCall('u1', 'María', memory);
```
