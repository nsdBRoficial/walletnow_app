/**
 * @module packages\testing\src\FakeProviderRegistry.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/testing — FakeProviderRegistry
 *
 * Implementação Fake de IProviderRegistry para testes.
 *
 * @example
 * import { FakeProviderRegistry, makeFakeProvider } from '@walletnow/testing';
 *
 * const registry = new FakeProviderRegistry();
 * const soroswap = makeFakeProvider({ id: 'soroswap', capabilities: ['swap'] });
 * await registry.register(soroswap);
 * expect(registry.has('soroswap')).toBe(true);
 */

import type {
  IProviderRegistry,
  IWalletNowProvider,
  WalletNowProviderManifest,
  ProviderCapability,
  ProviderHealthResult,
} from '@walletnow/contracts';
import { ProviderError } from '@walletnow/contracts';

// ─── FakeProvider Factory ─────────────────────────────────────────────────────

/** Cria um provider fake para testes */
export function makeFakeProvider(overrides: Partial<WalletNowProviderManifest> & { id: string }): IWalletNowProvider {
  const manifest: WalletNowProviderManifest = {
    id: overrides.id,
    name: overrides.name ?? `Fake ${overrides.id} Provider`,
    version: overrides.version ?? '0.0.0-test',
    capabilities: overrides.capabilities ?? [],
    networks: overrides.networks ?? ['testnet'],
    description: overrides.description ?? 'Fake provider for testing',
    website: overrides.website ?? 'https://example.com',
    icon: overrides.icon ?? 'https://example.com/icon.svg',
    author: overrides.author ?? 'WalletNow Testing',
    verified: overrides.verified ?? false,
  };

  return {
    manifest,
    initialize: async () => {},
    destroy: async () => {},
    health: async (): Promise<ProviderHealthResult> => ({
      status: 'healthy',
      latencyMs: 1,
      checkedAt: Date.now(),
    }),
  };
}

// ─── FakeProviderRegistry ─────────────────────────────────────────────────────

export class FakeProviderRegistry implements IProviderRegistry {
  private readonly _providers = new Map<string, IWalletNowProvider>();
  readonly calls: { method: string; args: unknown[] }[] = [];

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({ method, args });
  }

  async register(provider: IWalletNowProvider): Promise<void> {
    this.record('register', provider.manifest.id);
    if (this._providers.has(provider.manifest.id)) {
      throw new ProviderError('PROVIDER_ALREADY_REGISTERED', `Provider '${provider.manifest.id}' já registrado.`);
    }
    await provider.initialize();
    this._providers.set(provider.manifest.id, provider);
  }

  async unregister(id: string): Promise<void> {
    this.record('unregister', id);
    const provider = this._providers.get(id);
    if (!provider) throw new ProviderError('PROVIDER_NOT_FOUND', `Provider '${id}' não encontrado.`);
    await provider.destroy();
    this._providers.delete(id);
  }

  get(id: string): IWalletNowProvider | undefined {
    this.record('get', id);
    return this._providers.get(id);
  }

  getByCapability(capability: ProviderCapability): IWalletNowProvider[] {
    this.record('getByCapability', capability);
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
      results[id] = await provider.health();
    }
    return results;
  }

  async destroyAll(): Promise<void> {
    const ids = Array.from(this._providers.keys());
    for (const id of ids) await this.unregister(id);
  }

  /** Reseta o registry e o histórico de chamadas */
  reset(): void {
    this._providers.clear();
    this.calls.length = 0;
  }
}
