/**
 * @module packages/contracts/src/os.ts
 * @description Contratos canônicos, interfaces e tipos universais (os) do pacote @walletnow/contracts (exporta: WalletNowOSConfig, OSState, IWalletNowOS, IEventBus).
 */
/**
 * @walletnow/contracts — OS Lifecycle & Registry Contracts
 *
 * Contratos do ciclo de vida do WalletNow OS e do Registry.
 */

import type { StellarNetworkType } from './network.js';
import type { IIdentityEngine } from './identity.js';
import type { IWalletEngine, IAccountEngine } from './wallet.js';
import type { IWalletNowProvider, IProviderRegistry } from './provider.js';
import type { WalletNowOSEvents } from './events.js';

// ─── OS Config ────────────────────────────────────────────────────────────────

/** Configuração de inicialização do WalletNow OS */
export interface WalletNowOSConfig {
  /** Rede Stellar alvo */
  readonly network: StellarNetworkType;
  /** URL customizada do Horizon — usa o padrão da rede se omitido */
  readonly horizonUrl?: string;
  /** URL customizada do Soroban RPC */
  readonly sorobanRpcUrl?: string;
  /** Modo de debug — habilita logs detalhados */
  readonly debug?: boolean;
}

// ─── OS Lifecycle States ──────────────────────────────────────────────────────

/** Estados do ciclo de vida do WalletNow OS */
export type OSState = 'idle' | 'booting' | 'ready' | 'shutting_down' | 'destroyed';

// ─── IWalletNowOS (Contrato Principal do OS) ──────────────────────────────────

/**
 * IWalletNowOS — Contrato canônico do WalletNow OS.
 *
 * É o orquestrador central. Os builders interagem exclusivamente
 * através desta interface — nunca diretamente com os engines.
 *
 * Inspiração: Express.js para plugins, Kubernetes para lifecycle.
 *
 * @example
 * const os = new WalletNowOS();
 *
 * // Registrar providers
 * await os.register(new SoroswapProvider());
 *
 * // Registrar adapters
 * os.identity.use(new PasskeyAuthAdapter());
 * os.wallet.use(new PasskeyWalletAdapter());
 *
 * // Inicializar
 * await os.boot({ network: 'testnet' });
 *
 * // Aguardar pronto
 * await os.ready();
 *
 * // Usar
 * const result = await os.identity.create({ method: 'passkeys' });
 */
export interface IWalletNowOS {

  // ─── Estado ────────────────────────────────────────────────────────────────
  readonly state: OSState;
  readonly version: string;
  readonly isReady: boolean;
  readonly config: WalletNowOSConfig | null;
  readonly network: StellarNetworkType | null;

  // ─── Engines (disponíveis após boot) ──────────────────────────────────────
  readonly identity: IIdentityEngine;
  readonly wallet: IWalletEngine;
  readonly account: IAccountEngine;

  // ─── Providers ─────────────────────────────────────────────────────────────
  readonly providers: IProviderRegistry;

  // ─── EventBus ──────────────────────────────────────────────────────────────
  readonly events: IEventBus<WalletNowOSEvents>;

  // ─── Lifecycle (Inspirado no Express/Koa) ─────────────────────────────────

  /**
   * Registra um provider no OS.
   * Pode ser chamado antes ou após boot().
   * @example os.register(new SoroswapProvider());
   */
  register(provider: IWalletNowProvider): Promise<void>;

  /**
   * Remove um provider do OS pelo ID.
   * @example os.unregister('soroswap');
   */
  unregister(id: string): Promise<void>;

  /**
   * Inicializa o OS com a configuração fornecida.
   * Valida engines obrigatórios e emite 'os.ready'.
   */
  boot(config: WalletNowOSConfig): Promise<void>;

  /**
   * Promise que resolve quando o OS atingir o estado 'ready'.
   * Útil para aguardar o boot em contextos assíncronos.
   * @example await os.ready();
   */
  ready(): Promise<void>;

  /**
   * Encerra o OS graciosamente.
   * Destrói providers, limpa RAM e emite 'os.shutdown'.
   */
  shutdown(): Promise<void>;
}

// ─── IEventBus ────────────────────────────────────────────────────────────────

/**
 * IEventBus<TEvents> — Contrato genérico de barramento de eventos.
 * TEvents é o mapa de eventos específico do OS.
 */
export interface IEventBus<TEvents extends Record<string, unknown>> {
  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void | Promise<void>,
  ): () => void;

  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void | Promise<void>,
  ): () => void;

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;

  off(event: keyof TEvents): void;

  removeAllListeners(): void;
}
