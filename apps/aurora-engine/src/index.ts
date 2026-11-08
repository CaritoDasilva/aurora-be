import { randomUUID } from 'node:crypto';
import { InputProcessor } from '@aurora/input-processor';
import { SafetyLayer } from '@aurora/safety-layer';
import { SkillsExecutor, buildNativeInstruction } from '@aurora/aurora-skills';
import { MemoryPlugin } from '@aurora/aurora-memory';
import type { UserProfile } from '@aurora/aurora-memory';
import type { RawInput } from '@aurora/input-processor';
import { PendingActionStore } from './pending-actions.js';
import type { DeviceResultReport, EngineConfig, EngineResponse } from './types.js';

export type { EngineConfig, EngineResponse, DeviceResultReport } from './types.js';
export type { RawInput } from '@aurora/input-processor';

/**
 * Orquestador del pipeline Aurora.
 *
 * División de responsabilidades (según la arquitectura de la tesis):
 *   - El backend DECIDE: normaliza la entrada, evalúa seguridad y
 *     construye la instrucción a ejecutar.
 *   - El dispositivo EJECUTA: las acciones nativas (llamada, SMS,
 *     recordatorio) se devuelven como `skillCall` y las ejecuta la app
 *     móvil con expo-linking / expo-sms / expo-notifications.
 */
export class AuroraEngine {
  private inputProcessor: InputProcessor;
  private safetyLayer: SafetyLayer;
  private skillsExecutor: SkillsExecutor;
  private memoryPlugin: MemoryPlugin;
  private pendingActions: PendingActionStore;

  constructor(config: EngineConfig = {}) {
    this.inputProcessor = new InputProcessor({
      anthropicApiKey: config.anthropicApiKey,
      whisperModel: config.whisperModel,
      defaultLanguage: config.defaultLanguage,
    });
    this.safetyLayer = new SafetyLayer({
      anthropicApiKey: config.anthropicApiKey,
      strictMode: config.strictMode,
    });
    this.skillsExecutor = new SkillsExecutor();
    this.memoryPlugin = new MemoryPlugin();
    this.pendingActions = new PendingActionStore();
  }

  async process(input: RawInput): Promise<EngineResponse> {
    const memoryContext = await this.memoryPlugin.getContext();
    const auroraMessage = await this.inputProcessor.process(input);
    auroraMessage.systemPrompt = memoryContext.systemPrompt;

    const safety = await this.safetyLayer.evaluate(auroraMessage);

    if (safety.level === 'blocked') {
      await this.memoryPlugin.saveExchange(
        auroraMessage.content,
        'Lo siento, esa acción no está permitida.',
        safety.category,
        'blocked'
      );
      return {
        id: randomUUID(),
        status: 'blocked',
        message: 'Lo siento, esa acción no está permitida.',
      };
    }

    if (safety.level === 'confirm') {
      // La acción queda guardada EN EL SERVIDOR: el cliente solo recibe
      // un ID opaco de un solo uso. Nadie puede fabricar una acción
      // arbitraria y enviarla a /confirm.
      const pending = this.pendingActions.create(auroraMessage.content, safety.category);
      const confirmationPrompt = safety.confirmationPrompt ?? '¿Confirmas esta acción?';
      return {
        id: randomUUID(),
        status: 'awaiting_confirmation',
        message: confirmationPrompt,
        confirmationPrompt,
        pendingActionId: pending.id,
      };
    }

    // Acciones seguras que se ejecutan EN EL DISPOSITIVO (recordatorios):
    // no requieren confirmación, pero la ejecución igual es nativa.
    if (safety.category === 'reminder' || safety.category === 'calendar') {
      return this.dispatchNative(safety.category, auroraMessage.content);
    }

    // Resto de acciones seguras (consultas, navegación): se responden
    // desde el servidor como hasta ahora.
    const result = await this.skillsExecutor.execute(safety.category, auroraMessage.content);
    await this.memoryPlugin.saveExchange(
      auroraMessage.content,
      result.message,
      safety.category,
      'completed'
    );
    return {
      id: randomUUID(),
      status: 'completed',
      message: result.message,
    };
  }

  async confirm(pendingActionId: string): Promise<EngineResponse> {
    const pending = this.pendingActions.consume(pendingActionId);
    if (!pending) {
      return {
        id: randomUUID(),
        status: 'error',
        message: 'Esa acción ya no está disponible (expiró o ya se procesó). ¿Me la repites?',
      };
    }
    return this.dispatchNative(pending.category, pending.content);
  }

  /** Registra el resultado de la ejecución nativa reportado por el dispositivo. */
  async reportResult(report: DeviceResultReport): Promise<void> {
    await this.memoryPlugin.saveExchange(
      `[ejecución en dispositivo] ${report.skillName}`,
      report.message,
      'device_execution',
      report.success ? 'completed' : 'error'
    );
  }

  async cancel(): Promise<EngineResponse> {
    return {
      id: randomUUID(),
      status: 'completed',
      message: 'Acción cancelada.',
    };
  }

  async getProfile(): Promise<UserProfile> {
    return this.memoryPlugin.getProfile();
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.memoryPlugin.updateProfile(updates);
  }

  /** Construye la instrucción nativa y la devuelve con el mensaje para la usuaria. */
  private async dispatchNative(
    category: Parameters<typeof buildNativeInstruction>[0],
    content: string
  ): Promise<EngineResponse> {
    const result = await buildNativeInstruction(category, content);
    await this.memoryPlugin.saveExchange(
      content,
      result.userMessage,
      category,
      result.ok ? 'completed' : 'error'
    );
    return {
      id: randomUUID(),
      status: result.ok ? 'completed' : 'error',
      message: result.userMessage,
      skillCall: result.ok ? result.instruction : undefined,
    };
  }
}
