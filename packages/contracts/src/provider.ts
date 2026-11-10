/**
 * @module packages/contracts/src/provider.ts
 * @description Contratos canônicos, interfaces e tipos universais (provider) do pacote @walletnow/contracts (exporta: ProviderCapability, WalletNowProviderManifest, ProviderHealthStatus, ProviderHealthResult).
 */
/**
 * @walletnow/contracts — Provider & Protocol Contracts
 *
 * Separação canônica entre Providers (implementações) e Protocols (abstrações).
 *
 * Hierarquia:
 *   Protocol (o quê)  →  Provider (como)
 *   Yield             →  DefindexYieldProvider
 *   Swap              →  SoroswapSwapProvider
 *   RWA               →  EtherfuseRWAProvider
 *
 * Isso permite múltiplas implementações do mesmo protocolo sem
 * alterar nada no engine ou no SDK.
 */

import type { StellarNetworkType } from './network.js';

// ─── Provider Capabilities (Protocolos Suportados) ───────────────────────────

/**
 * Capacidades que um provider pode declarar.
 * Correspondem às abstrações de Protocolo do WalletNow OS.
 */
export type ProviderCapability =
  | 'swap'       // DEX — Soroswap, Phoenix, Aquarius
  | 'yield'      // Vaults/Staking — Defindex, Blend
  | 'rwa'        // Real World Assets — Etherfuse
  | 'payment'    // Pagamentos e remessas — MoneyGram, Vibrant
  | 'liquidity'  // Liquidez — Aquarius LP, Soroswap LP
  | 'anchor'     // SEP-24 On/Off-ramp
  | 'lending'    // Empréstimos — Blend
  | 'analytics'; // Analytics on-chain

// ─── Provider Manifest ────────────────────────────────────────────────────────

/**
 * WalletNowProviderManifest — Declaração pública de um provider.
 *
 * Todo builder que implementar um Provider deve declarar este manifesto.
 * É o contrato de registro no ProviderRegistry.
 */
export interface WalletNowProviderManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: ProviderCapability[];
  readonly networks: StellarNetworkType[];
  readonly description: string;
  readonly website: string;
  readonly icon: string;
  readonly author: string;
  readonly docs?: string;
  readonly verified?: boolean;
  readonly tags?: string[];
}

// ─── Provider Health ──────────────────────────────────────────────────────────

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ProviderHealthResult {
  readonly status: ProviderHealthStatus;
  readonly latencyMs?: number;
  readonly checkedAt: number;
  readonly message?: string;
}

// ─── IWalletNowProvider (Contrato Base de Todos os Providers) ─────────────────

/**
 * IWalletNowProvider — Contrato que todo provider deve implementar.
 *
 * @example
 * class SoroswapProvider implements IWalletNowProvider {
 *   readonly manifest = { id: 'soroswap', capabilities: ['swap'], ... };
 *   async initialize() { ... }
 *   async destroy() { ... }
 *   async health() { return { status: 'healthy', checkedAt: Date.now() }; }
 * }
 */
export interface IWalletNowProvider {
  readonly manifest: WalletNowProviderManifest;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  health(): Promise<ProviderHealthResult>;
}

// ─── Protocol Contracts (Abstrações de Alto Nível) ───────────────────────────

/**
 * ISwapProtocol — Contrato canônico para protocolos de Swap.
 * Implementado por: SoroswapProvider, PhoenixProvider, AquariusProvider
 */
export interface ISwapProtocol extends IWalletNowProvider {
  /** Lista de tokens suportados pelo DEX */
  supportedTokens(): Promise<SwapToken[]>;

  /** Obtém o melhor quote para um par de ativos */
  getQuote(params: SwapQuoteParams): Promise<SwapQuoteResult>;

  /** Executa um swap usando um quote previamente obtido */
  executeSwap(params: SwapExecuteParams): Promise<SwapResult>;

  /** Verifica saúde do serviço de swap */
  swapHealth(): Promise<ProviderHealthResult>;
}

/** Token negociável em um DEX Stellar */
export interface SwapToken {
  readonly code: string;
  readonly contract: string;  // Contract ID (C...) ou 'native' para XLM
  readonly issuer?: string;   // Para Stellar Asset Contracts (G...)
  readonly name: string;
  readonly icon: string;
  readonly decimals: number;
}

export interface SwapQuoteParams {
  readonly assetIn: string;   // Contract ID ou 'native'
  readonly assetOut: string;
  readonly amount: string;    // Em stroops (7 decimais Stellar)
  readonly tradeType?: 'EXACT_IN' | 'EXACT_OUT';
}

export interface SwapQuoteResult {
  readonly quoteId: string;
  readonly assetIn: string;
  readonly assetOut: string;
  readonly amountIn: string;
  readonly amountOut: string;
  readonly priceImpact: number;
  readonly protocol: string;
  readonly expiresAt: number;
  readonly path: string[];
}

export interface SwapExecuteParams {
  readonly quote: SwapQuoteResult;
  readonly senderPublicKey: string;
  readonly slippageTolerance?: number;
}

export interface SwapResult {
  readonly txHash: string;
  readonly amountOut: string;
  readonly ledger: number;
  readonly protocol: string;
}

// ─── IYieldProtocol ───────────────────────────────────────────────────────────

/**
 * IYieldProtocol — Contrato canônico para protocolos de Yield/Vaults.
 * Implementado por: DefindexProvider, BlendProvider
 */
export interface IYieldProtocol extends IWalletNowProvider {
  listVaults(): Promise<YieldVault[]>;
  getVault(vaultId: string): Promise<YieldVault>;
  deposit(params: YieldDepositParams): Promise<YieldResult>;
  withdraw(params: YieldWithdrawParams): Promise<YieldResult>;
  getPosition(publicKey: string, vaultId: string): Promise<YieldPosition | null>;
}

export interface YieldVault {
  readonly id: string;
  readonly name: string;
  readonly apy: number;
  readonly tvl: string;
  readonly asset: string;
  readonly protocol: string;
  readonly risk: 'low' | 'medium' | 'high';
}

export interface YieldDepositParams {
  readonly vaultId: string;
  readonly amount: string;
  readonly senderPublicKey: string;
}

export interface YieldWithdrawParams {
  readonly vaultId: string;
  readonly shares: string;
  readonly senderPublicKey: string;
}

export interface YieldResult {
  readonly txHash: string;
  readonly ledger: number;
}

export interface YieldPosition {
  readonly vaultId: string;
  readonly shares: string;
  readonly estimatedValue: string;
  readonly publicKey: string;
}

// ─── IRWAProtocol ─────────────────────────────────────────────────────────────

/**
 * IRWAProtocol — Contrato canônico para Real World Assets.
 * Implementado por: EtherfuseProvider
 */
export interface IRWAProtocol extends IWalletNowProvider {
  listAssets(): Promise<RWAAsset[]>;
  getQuote(params: RWAQuoteParams): Promise<RWAQuote>;
  createOrder(params: RWAOrderParams): Promise<RWAOrder>;
  getOrder(orderId: string): Promise<RWAOrder | null>;
}

export interface RWAAsset {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly apy: number;
  readonly minAmount: string;
  readonly currency: string;
}

export interface RWAQuoteParams {
  readonly assetId: string;
  readonly amount: string;
  readonly currency: 'BRL' | 'USD';
}

export interface RWAQuote {
  readonly quoteId: string;
  readonly assetId: string;
  readonly amount: string;
  readonly price: string;
  readonly expiresAt: number;
}

export interface RWAOrderParams {
  readonly quoteId: string;
  readonly publicKey: string;
}

export interface RWAOrder {
  readonly orderId: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly txHash?: string;
}

// ─── IProviderRegistry (Contrato do Registry) ─────────────────────────────────

/**
 * IProviderRegistry — Contrato canônico do Provider Registry.
 * Gerencia o ciclo de vida de todos os providers do OS.
 */
export interface IProviderRegistry {
  register(provider: IWalletNowProvider): Promise<void>;
  unregister(id: string): Promise<void>;
  get(id: string): IWalletNowProvider | undefined;
  getByCapability(capability: ProviderCapability): IWalletNowProvider[];
  list(): IWalletNowProvider[];
  has(id: string): boolean;
  readonly size: number;
  healthAll(): Promise<Record<string, ProviderHealthResult>>;
  destroyAll(): Promise<void>;
}
