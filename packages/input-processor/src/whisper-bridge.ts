import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments: Array<{ start: number; end: number; text: string }>;
}

export async function transcribeAudio(
  audioPath: string,
  model: string = 'small',
  language?: string
): Promise<TranscriptionResult> {
  const scriptPath = path.join(process.cwd(), '.whisper_transcribe.py');
  const pythonScript = `
import sys
import json
from faster_whisper import WhisperModel

audio_path = sys.argv[1]
model_name = sys.argv[2] if len(sys.argv) > 2 else 'small'
language = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != 'auto' else None

model = WhisperModel(model_name, device='cpu', compute_type='int8')
segments, info = model.transcribe(audio_path, language=language, beam_size=5)

result = {
  'text': ' '.join([s.text for s in segments]),
  'language': info.language,
  'confidence': float(info.language_probability),
  'segments': [{'start': s.start, 'end': s.end, 'text': s.text} for s in list(model.transcribe(audio_path, language=language)[0])]
}
print(json.dumps(result))
`;

  fs.writeFileSync(scriptPath, pythonScript);

  return new Promise((resolve, reject) => {
    const args = [scriptPath, audioPath, model, language || 'auto'];
    const py = spawn('python', args);

    let output = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => { output += data.toString(); });
    py.stderr.on('data', (data) => { errorOutput += data.toString(); });

    py.on('close', (code) => {
      try { fs.unlinkSync(scriptPath); } catch {}

      if (code !== 0) {
        reject(new Error(`Whisper transcription failed: ${errorOutput}`));
        return;
      }

      try {
        const result = JSON.parse(output.trim()) as TranscriptionResult;
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse Whisper output: ${output}`));
      }
    });
  });
}
