import type { SkillResult } from './types.js';

function parseTime(timeStr: string): Date | null {
  const now = new Date();

  // "en X minutos"
  const minutesMatch = timeStr.match(/en\s+(\d+)\s+minutos?/i);
  if (minutesMatch) {
    return new Date(now.getTime() + parseInt(minutesMatch[1], 10) * 60_000);
  }

  // "en X horas"
  const hoursMatch = timeStr.match(/en\s+(\d+)\s+horas?/i);
  if (hoursMatch) {
    return new Date(now.getTime() + parseInt(hoursMatch[1], 10) * 3_600_000);
  }

  // "las 3 de la tarde" / "las 8 de la mañana"
  const spanishMatch = timeStr.match(/(?:a las?|las?)\s+(\d{1,2})(?::(\d{2}))?\s*(de la tarde|de la noche|de la mañana|pm|am)?/i);
  if (spanishMatch) {
    let hour = parseInt(spanishMatch[1], 10);
    const minute = spanishMatch[2] ? parseInt(spanishMatch[2], 10) : 0;
    const period = (spanishMatch[3] ?? '').toLowerCase();
    if ((period.includes('tarde') || period.includes('noche') || period === 'pm') && hour < 12) {
      hour += 12;
    } else if ((period.includes('mañana') || period === 'am') && hour === 12) {
      hour = 0;
    }
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }

  // "8am" / "3pm"
  const simpleMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (simpleMatch) {
    let hour = parseInt(simpleMatch[1], 10);
    const minute = simpleMatch[2] ? parseInt(simpleMatch[2], 10) : 0;
    const period = simpleMatch[3].toLowerCase();
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }

  return null;
}

export async function setReminder(text: string, timeStr?: string): Promise<SkillResult> {
  const targetTime = timeStr ? parseTime(timeStr) : null;

  const notify = () => {
    // Dynamic import to avoid hard failure if node-notifier is unavailable
    import('node-notifier')
      .then(({ default: notifier }) => {
        notifier.notify({ title: 'Aurora', message: `Recordatorio: ${text}`, sound: true });
      })
      .catch(() => {
        // Silent fallback — notification not critical
      });
  };

  if (targetTime) {
    const delay = targetTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(notify, delay);
      const timeLabel = targetTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      return { success: true, message: `Recordatorio configurado: ${text} a las ${timeLabel}` };
    }
  }

  // Immediate notification
  notify();
  return { success: true, message: `Recordatorio configurado: ${text}` };
}
