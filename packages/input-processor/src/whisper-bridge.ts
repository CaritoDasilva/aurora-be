import { spawn } from 'child_process';
import { randomUUID } from 'node:crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  segments: Array<{ start: number; end: number; text: string }>;
}

// El intérprete varía por máquina: Windows puede tener 'python' o el
// launcher 'py'; macOS/Linux suele tener solo 'python3'. Se prueba en
// orden y se puede forzar con la variable de entorno PYTHON_BIN.
const PYTHON_CANDIDATES = [
  process.env.PYTHON_BIN,
  'python',
  'python3',
  'py',
].filter((c): c is string => typeof c === 'string' && c.length > 0);

export async function transcribeAudio(
  audioPath: string,
  model: string = 'small',
  language?: string
): Promise<TranscriptionResult> {
  // Unique temp path: concurrent transcriptions must not clobber each other,
  // and the helper script must never land inside the project directory.
  const scriptPath = path.join(os.tmpdir(), `aurora-whisper-${randomUUID()}.py`);
  const pythonScript = `
import sys
import json
from faster_whisper import WhisperModel

audio_path = sys.argv[1]
model_name = sys.argv[2] if len(sys.argv) > 2 else 'small'
language = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != 'auto' else None

model = WhisperModel(model_name, device='cpu', compute_type='int8')
segments, info = model.transcribe(audio_path, language=language, beam_size=5)

# transcribe() returns a lazy generator — materialize it once and derive
# both the full text and the segment list from the same pass.
segs = list(segments)

result = {
  'text': ' '.join([s.text for s in segs]),
  'language': info.language,
  'confidence': float(info.language_probability),
  'segments': [{'start': s.start, 'end': s.end, 'text': s.text} for s in segs]
}
print(json.dumps(result))
`;

  fs.writeFileSync(scriptPath, pythonScript);

  return new Promise((resolve, reject) => {
    const args = [scriptPath, audioPath, model, language || 'auto'];
    let attempt = 0;
    let output = '';
    let errorOutput = '';
    let settled = false;

    const cleanup = () => {
      try { fs.unlinkSync(scriptPath); } catch {}
    };

    const tryNext = () => {
      const bin = PYTHON_CANDIDATES[attempt];
      if (!bin) {
        settled = true;
        cleanup();
        reject(new Error(
          `No se encontró intérprete de Python (probados: ${PYTHON_CANDIDATES.join(', ')}). ` +
          'Instala Python 3 o define la variable de entorno PYTHON_BIN.'
        ));
        return;
      }

      const py = spawn(bin, args);
      output = '';
      errorOutput = '';

      py.stdout.on('data', (data) => { output += data.toString(); });
      py.stderr.on('data', (data) => { errorOutput += data.toString(); });

      py.on('error', (err: NodeJS.ErrnoException) => {
        if (settled) return;
        if (err.code === 'ENOENT') {
          // Ese binario no existe en esta máquina: probar el siguiente.
          attempt++;
          tryNext();
        } else {
          settled = true;
          cleanup();
          reject(new Error(`No se pudo ejecutar ${bin}: ${err.message}`));
        }
      });

      py.on('close', (code) => {
        if (settled) return;
        settled = true;
        cleanup();

        if (code !== 0) {
          reject(new Error(`Whisper transcription failed: ${errorOutput}`));
          return;
        }

        try {
          const result = JSON.parse(output.trim()) as TranscriptionResult;
          resolve(result);
        } catch {
          reject(new Error(`Failed to parse Whisper output: ${output}`));
        }
      });
    };

    tryNext();
  });
}
