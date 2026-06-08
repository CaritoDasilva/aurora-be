import type { ActionCategory } from './types.js';

export function buildConfirmationPrompt(category: ActionCategory, content: string): string {
  const truncated = content.length > 80 ? content.slice(0, 80) + '…' : content;

  // Try to extract a name or number from the message for personalized prompts
  const nameMatch = content.match(
    /\b(?:a|to)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i
  );
  const nameOrFallback = nameMatch ? nameMatch[1] : truncated;

  switch (category) {
    case 'call':
      return `¿Quieres que llame a ${nameOrFallback} ahora?`;
    case 'sms':
      return `¿Envío este mensaje: '${truncated}'?`;
    case 'email':
      return '¿Mando este correo?';
    case 'file_write':
      return '¿Guardo los cambios?';
    case 'settings':
    case 'install':
      return '¿Aplico este cambio de configuración?';
    case 'file_delete':
    case 'purchase':
    case 'payment':
      return 'Lo siento, esta acción no está permitida por seguridad.';
    default:
      return '¿Confirmas esta acción?';
  }
}
