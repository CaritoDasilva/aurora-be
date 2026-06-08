import { InputProcessor } from './index.js';

async function test() {
  const processor = new InputProcessor({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'test',
  });

  // Test text input
  const textResult = await processor.process({
    type: 'text',
    text: 'Hola Aurora, ¿puedes llamar a mi hija María?',
    userId: 'test-user',
  });

  console.log('Text input result:');
  console.log(JSON.stringify(textResult, null, 2));
  console.log('\n✅ InputProcessor working correctly');
}

test().catch(console.error);
