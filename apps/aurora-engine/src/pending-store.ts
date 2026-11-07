import { randomUUID } from 'node:crypto';
import type { ActionCategory } from '@aurora/safety-layer';

export interface PendingAction {
  content: string;
  category: ActionCategory;
}

interface Entry {
  action: PendingAction;
  expiresAt: number;
}

/**
 * Acciones que esperan confirmación. Viven SOLO en el servidor: el cliente recibe
 * un id opaco y de un solo uso, así no puede inventar ni modificar lo que se ejecuta.
 * Vencen a los pocos minutos y el almacén tiene tope de tamaño.
 */
export class PendingStore {
  private items = new Map<string, Entry>();

  constructor(
    private ttlMs = 5 * 60_000,
    private maxItems = 100,
    private now: () => number = Date.now
  ) {}

  create(action: PendingAction): string {
    this.sweep();
    while (this.items.size >= this.maxItems) {
      const oldest = this.items.keys().next().value;
      if (oldest === undefined) break;
      this.items.delete(oldest);
    }
    const id = randomUUID();
    this.items.set(id, { action, expiresAt: this.now() + this.ttlMs });
    return id;
  }

  /** Devuelve la acción y la elimina (un id sirve una sola vez). */
  take(id: string): PendingAction | undefined {
    const entry = this.items.get(id);
    if (!entry) return undefined;
    this.items.delete(id);
    return entry.expiresAt > this.now() ? entry.action : undefined;
  }

  /** Solo lectura, sin consumir (para tests y depuración). */
  peek(id: string): PendingAction | undefined {
    const entry = this.items.get(id);
    return entry && entry.expiresAt > this.now() ? entry.action : undefined;
  }

  discard(id: string): void {
    this.items.delete(id);
  }

  get size(): number {
    return this.items.size;
  }

  private sweep(): void {
    const t = this.now();
    for (const [id, entry] of this.items) {
      if (entry.expiresAt <= t) this.items.delete(id);
    }
  }
}
