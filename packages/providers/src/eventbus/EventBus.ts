/**
 * @module packages\providers\src\eventbus\EventBus.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/providers — WalletNowEventBus
 *
 * Implementação real do IEventBus<WalletNowOSEvents>.
 * Usado pelo OS para orquestrar a comunicação assíncrona entre módulos.
 */

import type { IEventBus, WalletNowOSEvents, OSEventName } from '@walletnow/contracts';

export class WalletNowEventBus implements IEventBus<WalletNowOSEvents> {
  private readonly handlers = new Map<OSEventName, Set<(...args: unknown[]) => unknown>>();

  on<K extends OSEventName>(
    event: K,
    handler: (payload: WalletNowOSEvents[K]) => void | Promise<void>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.handlers.get(event)!.add(handler as any);
    
    return () => {
      this.handlers.get(event)?.delete(handler as never);
    };
  }

  once<K extends OSEventName>(
    event: K,
    handler: (payload: WalletNowOSEvents[K]) => void | Promise<void>,
  ): () => void {
    const unsub = this.on(event, async (payload) => {
      unsub();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (handler as any)(payload);
    });
    return unsub;
  }

  emit<K extends OSEventName>(event: K, payload: WalletNowOSEvents[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;
    
    // Dispara handlers de forma assíncrona para não bloquear o emissor
    for (const handler of eventHandlers) {
      try {
        const result = handler(payload);
        if (result instanceof Promise) {
          result.catch((err) => console.error(`[EventBus] Error in async handler for ${event}:`, err));
        }
      } catch (err) {
        console.error(`[EventBus] Error in handler for ${event}:`, err);
      }
    }
  }

  off(event: OSEventName): void {
    this.handlers.delete(event);
  }

  removeAllListeners(): void {
    this.handlers.clear();
  }
}
