/**
 * @module packages/providers/src/registry/ProviderRegistry.ts
 * @description Infraestrutura de provedores (@walletnow/providers - ProviderRegistry) — registro, barramento de eventos e adaptadores externos (exporta: ProviderRegistry).
 */
/**
 * @walletnow/providers — ProviderRegistry
 *
 * Implementação real do IProviderRegistry.
 * Gerencia o ciclo de vida dos providers carregados no OS.
 */

import type {
  IProviderRegistry,
  IWalletNowProvider,
  ProviderCapability,
  ProviderHealthResult,
} from '@walletnow/contracts';
import { ProviderError } from '@walletnow/contracts';
import type { WalletNowEventBus } from '../eventbus/EventBus.js';

export class ProviderRegistry implements IProviderRegistry {
  private readonly _providers = new Map<string, IWalletNowProvider>();

  constructor(private readonly events?: WalletNowEventBus) {}

  async register(provider: IWalletNowProvider): Promise<void> {
    const id = provider.manifest.id;
    if (this._providers.has(id)) {
      throw new ProviderError('PROVIDER_ALREADY_REGISTERED', `Provider '${id}' já está registrado.`);
    }

    try {
      await provider.initialize();
      this._providers.set(id, provider);
      
      this.events?.emit('provider.registered', {
        id,
        name: provider.manifest.name,
        capabilities: provider.manifest.capabilities,
      });
    } catch (err) {
      this.events?.emit('provider.init_failed', {
        id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new ProviderError('PROVIDER_INIT_FAILED', `Falha ao inicializar provider '${id}'`, { cause: err });
    }
  }

  async unregister(id: string): Promise<void> {
    const provider = this._providers.get(id);
    if (!provider) {
      throw new ProviderError('PROVIDER_NOT_FOUND', `Provider '${id}' não encontrado no registry.`);
    }

    await provider.destroy();
    this._providers.delete(id);
    
    this.events?.emit('provider.unregistered', { id });
  }

  get(id: string): IWalletNowProvider | undefined {
    return this._providers.get(id);
  }

  getByCapability(capability: ProviderCapability): IWalletNowProvider[] {
    return Array.from(this._providers.values()).filter((p) =>
      p.manifest.capabilities.includes(capability),
    );
  }

  list(): IWalletNowProvider[] {
    return Array.from(this._providers.values());
  }

  has(id: string): boolean {
    return this._providers.has(id);
  }

  get size(): number {
    return this._providers.size;
  }

  async healthAll(): Promise<Record<string, ProviderHealthResult>> {
    const results: Record<string, ProviderHealthResult> = {};
    for (const [id, provider] of this._providers) {
      try {
        const health = await provider.health();
        results[id] = health;
        
        this.events?.emit('provider.health_changed', {
          id,
          status: health.status,
          latencyMs: health.latencyMs,
        });
      } catch (err) {
        results[id] = { status: 'unknown', checkedAt: Date.now(), message: String(err) };
      }
    }
    return results;
  }

  async destroyAll(): Promise<void> {
    const ids = Array.from(this._providers.keys());
    for (const id of ids) {
      await this.unregister(id);
    }
  }
}
