/**
 * confirmation-gate
 *
 * Before any irreversible action is executed, this gate pauses execution
 * and sends a confirmation request to the UI layer.
 *
 * UX design principle: keep it binary (YES / NO) with the confirmation
 * message written in plain, friendly language suitable for users aged 60+.
 * The UI layer should render large buttons and read the question aloud via TTS.
 */

export interface ConfirmationRequest {
  /** Short action identifier (e.g. 'make_call', 'send_sms', 'delete_file') */
  action: string;
  /** Full human-readable description shown to the user */
  description: string;
  /** Whether the action can be undone after confirmation */
  reversible: boolean;
  /** Optional: phone number / contact name / filename for context in the message */
  target?: string;
}

export interface ConfirmationResponse {
  confirmed: boolean;
  /** ISO 8601 timestamp of when the user responded */
  respondedAt: string;
}

// Actions that always require explicit user confirmation before execution
const CONFIRMATION_REQUIRED_ACTIONS = new Set([
  'make_call',
  'send_sms',
  'send_email',
  'delete_file',
  'share_location',
  'purchase',
  'update_emergency_contacts',
  'wipe_profile',
]);

export class ConfirmationGate {
  /**
   * Callback the engine must register to push a confirmation request to the UI.
   * The UI must call resolve(true/false) based on the user's button press.
   *
   * TODO: replace with an event-emitter or WebSocket push in production so
   *       the gate can await a real user button press in the Aurora UI.
   */
  private onConfirmationRequired?: (
    req: ConfirmationRequest,
    resolve: (confirmed: boolean) => void
  ) => void;

  registerConfirmationHandler(
    handler: (req: ConfirmationRequest, resolve: (confirmed: boolean) => void) => void
  ): void {
    this.onConfirmationRequired = handler;
  }

  /** Returns true if the given action name must go through the confirmation flow */
  requiresConfirmation(action: string): boolean {
    return CONFIRMATION_REQUIRED_ACTIONS.has(action);
  }

  /**
   * Sends a confirmation request and waits for the user's YES/NO response.
   *
   * TODO: implement a real async await with a timeout (e.g. 60 seconds)
   *       and a default-to-cancel fallback for unresponsive users.
   */
  async requestConfirmation(req: ConfirmationRequest): Promise<boolean> {
    if (!this.onConfirmationRequired) {
      // TODO: remove this fallback once the UI handler is wired up;
      //       defaulting to false is the safest option (deny = no action taken)
      console.warn('[ConfirmationGate] No handler registered — defaulting to denied');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      // TODO: add a 60-second timeout that auto-resolves to false
      this.onConfirmationRequired!(req, resolve);
    });
  }

  /** Builds a friendly, plain-language confirmation message for the user */
  buildMessage(req: ConfirmationRequest): string {
    const targetPart = req.target ? ` a ${req.target}` : '';
    const reversibleNote = req.reversible
      ? 'Puedes deshacer esto después.'
      : 'Esta acción NO se puede deshacer.';

    return `¿Deseas ${req.description}${targetPart}?\n\n${reversibleNote}\n\nPresiona SÍ para confirmar o NO para cancelar.`;
  }
}
