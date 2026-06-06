# @aurora/memory-plugin

Persistent user profile store for Aurora. Manages contacts, medications with reminders, emergency contacts, and UI preferences.

## Usage

```typescript
import { MemoryPlugin } from '@aurora/memory-plugin';

const memory = new MemoryPlugin();
await memory.createDefaultProfile('u1', 'Doña Carmen');
await memory.addContact('u1', { name: 'María', phone: '+34600000001', isEmergency: true });
await memory.addMedication('u1', { name: 'Enalapril', dosage: '10mg', reminderTimes: ['08:00', '20:00'], active: true });
const emergency = await memory.getEmergencyContacts('u1');
```

## Storage

Currently in-memory (Map). Replace with a DB adapter before production.
