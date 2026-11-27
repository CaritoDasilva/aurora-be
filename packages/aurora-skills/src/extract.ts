/**
 * Extracción de entidades desde el texto del usuario.
 * Heurísticas centralizadas: las usan tanto el SkillsExecutor
 * (ejecución en servidor) como buildNativeInstruction (ejecución
 * en el dispositivo).
 *
 * TODO: reemplazar estas heurísticas por extracción con el modelo
 * (tool_use / salida estructurada) cuando el agente LLM se conecte
 * al pipeline.
 */

export function extractTarget(content: string): string {
  // "llama a mi hija María" → "mi hija María"; "a María" → "María"
  const match = content.match(/\ba\s+(.+)$/i);
  return match ? match[1].trim() : content;
}

export function extractTime(content: string): string | undefined {
  const patterns = [
    /en\s+\d+\s+(?:minutos?|horas?)/i,
    /(?:a las?|las?)\s+\d{1,2}(?::\d{2})?\s*(?:de la tarde|de la noche|de la mañana|am|pm)?/i,
    /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) return m[0];
  }
  return undefined;
}

/**
 * Extrae el cuerpo real del SMS desde la instrucción del usuario.
 *   "mándale un mensaje a Juan que llego tarde" → "llego tarde"
 *   "mensaje a María: nos vemos mañana"       → "nos vemos mañana"
 * Si no hay marca explícita, devuelve el texto completo como último
 * recurso (es lo que hacía antes, pero ahora de forma explícita).
 */
export function extractSmsBody(content: string): string {
  const queMatch = content.match(/\bque\s+(.+)$/i);
  if (queMatch) return queMatch[1].trim();
  const colon = content.indexOf(':');
  if (colon >= 0) return content.slice(colon + 1).trim();
  return content;
}
