import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface VisionResult {
  description: string;
  intent: string; // What the user probably wants to do with this image
}

export async function describeImage(
  imagePath: string | undefined,
  imageBase64: string | undefined,
  apiKey: string
): Promise<VisionResult> {
  const client = new Anthropic({ apiKey });

  let imageData: string;
  let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';

  if (imageBase64) {
    imageData = imageBase64;
  } else if (imagePath) {
    const ext = path.extname(imagePath).toLowerCase();
    if (ext === '.png') mediaType = 'image/png';
    else if (ext === '.gif') mediaType = 'image/gif';
    else if (ext === '.webp') mediaType = 'image/webp';

    imageData = fs.readFileSync(imagePath).toString('base64');
  } else {
    throw new Error('Either imagePath or imageBase64 must be provided');
  }

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: imageData }
        },
        {
          type: 'text',
          text: 'Describe this image clearly and concisely in Spanish. Then in one sentence, explain what the user probably wants to do or know based on this image. Format your response as JSON: {"description": "...", "intent": "..."}'
        }
      ]
    }]
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]) as VisionResult;
  } catch {
    return {
      description: content.text,
      intent: 'El usuario quiere información sobre esta imagen.'
    };
  }
}
