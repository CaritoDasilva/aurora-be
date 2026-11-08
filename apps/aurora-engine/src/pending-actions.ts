import { randomUUID } from 'node:crypto';
import type { ActionCategory } from '@aurora/safety-layer';

export interface PendingAction {
  id: string;
  content: string;
  category: ActionCategory;
  createdAt: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Registro server-side de acciones pendientes de confirmación.
 *
 * Seguridad: antes de este store, /confirm aceptaba un JSON arbitrario del
 * cliente y lo ejecutaba — cualquiera podía fabricar una acción sin pasar
 * por la safety-layer. Ahora el cliente solo recibe un ID opaco; la acción
 * real vive aquí, es de un solo uso y expira.
 */
export class PendingActionStore {
  private actions = new Map<string, PendingAction>();

  constructor(private ttlMs: number = DEFAULT_TTL_MS) {}

  create(content: string, category: ActionCategory): PendingAction {
    this.prune();
    const now = Date.now();
    const action: PendingAction = {
      id: randomUUID(),
      content,
      category,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };
    this.actions.set(action.id, action);
    return action;
  }

  /** Devuelve la acción y la elimina (un solo uso). null si no existe o expiró. */
  consume(id: string): PendingAction | null {
    this.prune();
    const action = this.actions.get(id);
    if (!action) return null;
    this.actions.delete(id);
    return action;
  }

  /** Cantidad de acciones vigentes (para tests y diagnóstico). */
  get size(): number {
    this.prune();
    return this.actions.size;
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, action] of this.actions) {
      if (action.expiresAt <= now) this.actions.delete(id);
    }
  }
}
