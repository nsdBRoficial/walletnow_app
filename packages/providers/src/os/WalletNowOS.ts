/**
 * @module packages\providers\src\os\WalletNowOS.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/providers — WalletNowOS
 *
 * Entrypoint principal do sistema. Orquestra a inicialização e ciclo de vida
 * de todos os módulos e engines.
 */

import type {
  IWalletNowOS,
  WalletNowOSConfig,
  OSState,
  IWalletNowProvider,
  StellarNetworkType,
} from '@walletnow/contracts';
import { IdentityEngine, KeypairAuthAdapter } from '@walletnow/identity';
import { WalletEngine, AccountEngine } from '@walletnow/wallet';
import { FakeSecureStorage, LocalStorageAdapter } from '@walletnow/storage';
import { ProviderRegistry } from '../registry/ProviderRegistry.js';
import { WalletNowEventBus } from '../eventbus/EventBus.js';

export class WalletNowOS implements IWalletNowOS {
  private _state: OSState = 'idle';
  private _config: WalletNowOSConfig | null = null;
  private _network: StellarNetworkType | null = null;

  readonly version = '0.1.0';
  readonly events = new WalletNowEventBus();
  readonly providers = new ProviderRegistry(this.events);
  
  // Engines
  readonly identity: IdentityEngine;
  readonly wallet: WalletEngine;
  readonly account: AccountEngine;

  constructor() {
    // Inicialização default usando stubs/fakes.
    // Em produção, isso seria configurado externamente com DI.
    const secureStorage = new FakeSecureStorage();
    const accountCache = new LocalStorageAdapter('account');

    this.identity = new IdentityEngine(secureStorage);
    
    // Register default test adapter
    this.identity.use(new KeypairAuthAdapter());
    
    this.wallet = new WalletEngine(secureStorage, this.identity);
    this.account = new AccountEngine('https://horizon-testnet.stellar.org', accountCache);
  }

  get state(): OSState {
    return this._state;
  }

  get isReady(): boolean {
    return this._state === 'ready';
  }

  get config(): WalletNowOSConfig | null {
    return this._config;
  }

  get network(): StellarNetworkType | null {
    return this._network;
  }

  async register(provider: IWalletNowProvider): Promise<void> {
    await this.providers.register(provider);
  }

  async unregister(id: string): Promise<void> {
    await this.providers.unregister(id);
  }

  async boot(config: WalletNowOSConfig): Promise<void> {
    if (this._state !== 'idle') {
      throw new Error(`OS can only boot from idle state. Current state: ${this._state}`);
    }

    this._state = 'booting';
    this._config = config;
    this._network = config.network;

    // TODO: Injetar Horizon URL real no AccountEngine baseado na config
    
    this._state = 'ready';
    this.events.emit('os.ready', { version: this.version, network: this._network });
  }

  async ready(): Promise<void> {
    if (this.isReady) return;
    
    return new Promise((resolve) => {
      this.events.once('os.ready', () => resolve());
    });
  }

  async shutdown(): Promise<void> {
    if (this._state === 'destroyed') return;
    
    this._state = 'shutting_down';
    
    await this.identity.logout();
    await this.providers.destroyAll();
    
    this.events.emit('os.shutdown', undefined);
    this.events.removeAllListeners();
    
    this._state = 'destroyed';
  }
}
