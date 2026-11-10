/**
 * @module packages/testing/src/FakeEventBus.ts
 * @description Fakes e utilitários de teste (@walletnow/testing - FakeEventBus) para validação determinística em memória (exporta: FakeEventBus).
 */
/**
 * @walletnow/testing — FakeEventBus
 *
 * Implementação Fake de IEventBus<WalletNowOSEvents> para testes.
 *
 * Permite:
 * - Verificar se eventos foram emitidos
 * - Verificar payloads dos eventos
 * - Simular eventos para testar handlers reativos
 *
 * @example
 * const events = new FakeEventBus();
 *
 * // Registrar o handler real
 * events.on('wallet.created', ({ publicKey }) => {
 *   document.title = publicKey;
 * });
 *
 * // Simular o evento
 * events.emit('wallet.created', { walletId: 'w1', publicKey: 'G...', network: 'testnet' });
 *
 * // Verificar
 * expect(events.emitted('wallet.created')).toHaveLength(1);
 * expect(events.lastEmitted('wallet.created')?.publicKey).toBe('G...');
 */

import type { IEventBus, WalletNowOSEvents, OSEventName } from '@walletnow/contracts';

type EventRecord = { event: OSEventName; payload: unknown; timestamp: number };

export class FakeEventBus implements IEventBus<WalletNowOSEvents> {
  private readonly handlers = new Map<OSEventName, Set<(...args: unknown[]) => unknown>>();
  private readonly _history: EventRecord[] = [];

  on<K extends OSEventName>(
    event: K,
    handler: (payload: WalletNowOSEvents[K]) => void | Promise<void>,
  ): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.handlers.get(event)!.add(handler as any);
    return () => { this.handlers.get(event)?.delete(handler as never); };
  }

  once<K extends OSEventName>(
    event: K,
    handler: (payload: WalletNowOSEvents[K]) => void | Promise<void>,
  ): () => void {
    const unsub = this.on(event, (payload) => {
      unsub();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (handler as any)(payload);
    });
    return unsub;
  }

  emit<K extends OSEventName>(event: K, payload: WalletNowOSEvents[K]): void {
    this._history.push({ event, payload, timestamp: Date.now() });
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  off(event: OSEventName): void {
    this.handlers.delete(event);
  }

  removeAllListeners(): void {
    this.handlers.clear();
  }

  // ─── Test Assertion Helpers ───────────────────────────────────────────────

  /**
   * Retorna todos os eventos emitidos de um tipo específico.
   * @example
   * events.emitted('wallet.created') // → [{ walletId: '...', publicKey: '...' }, ...]
   */
  emitted<K extends OSEventName>(event: K): WalletNowOSEvents[K][] {
    return this._history
      .filter((r) => r.event === event)
      .map((r) => r.payload as WalletNowOSEvents[K]);
  }

  /** Último payload emitido de um evento */
  lastEmitted<K extends OSEventName>(event: K): WalletNowOSEvents[K] | undefined {
    const all = this.emitted(event);
    return all[all.length - 1];
  }

  /** Verifica se um evento foi emitido pelo menos uma vez */
  wasEmitted(event: OSEventName): boolean {
    return this._history.some((r) => r.event === event);
  }

  /** Número total de eventos emitidos */
  get totalEmitted(): number {
    return this._history.length;
  }

  /** Histórico completo de eventos emitidos */
  get history(): ReadonlyArray<EventRecord> {
    return this._history;
  }

  /** Limpa o histórico de eventos sem remover os handlers */
  clearHistory(): void {
    this._history.length = 0;
  }

  /** Reseta completamente: handlers + histórico */
  reset(): void {
    this.handlers.clear();
    this._history.length = 0;
  }
}
