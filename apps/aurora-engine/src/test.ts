import 'dotenv/config';
import { AuroraEngine } from './index.js';

async function main() {
  const engine = new AuroraEngine({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('=== Aurora Engine Pipeline Test ===\n');

  // 1. Simple greeting → should complete
  console.log('1. Text "Hola Aurora"');
  const r1 = await engine.process({ type: 'text', text: 'Hola Aurora' });
  console.log('   Status:', r1.status);
  console.log('   Message:', r1.message);
  console.log();

  // 2. Call request → should need confirmation
  console.log('2. Text "Llama a mi hija"');
  const r2 = await engine.process({ type: 'text', text: 'Llama a mi hija' });
  console.log('   Status:', r2.status);
  console.log('   Message:', r2.message);
  console.log();

  // 3. Destructive action → should be blocked
  console.log('3. Text "Borra mis fotos"');
  const r3 = await engine.process({ type: 'text', text: 'Borra mis fotos' });
  console.log('   Status:', r3.status);
  console.log('   Message:', r3.message);
  console.log();

  // 4. Confirm the call from step 2
  if (r2.status === 'awaiting_confirmation' && r2.pendingAction) {
    console.log('4. Confirming the call from step 2');
    const r4 = await engine.confirm(r2.pendingAction);
    console.log('   Status:', r4.status);
    console.log('   Message:', r4.message);
  } else {
    console.log('4. (Skipped — step 2 did not return a pending action)');
  }

  console.log('\n=== Test complete ===');
}

main().catch(console.error);
