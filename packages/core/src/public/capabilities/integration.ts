/**
 * @module packages/core/src/public/capabilities/integration.ts
 * @description Módulo do kernel @walletnow/core (integration) — ciclo de vida, descoberta de protocolos, health monitor e tipos de capacidades (exporta: ISwapCapability, YieldTransactionResult, IYieldCapability, IRWACapability).
 */
import type { PortfolioSummary, PortfolioPosition } from '../types/portfolio.types.js';
import type { SwapQuote, SwapQuoteParams } from '../types/swap.types.js';
import type {
  YieldVault,
  YieldUserPosition,
  YieldDepositParams,
  YieldWithdrawParams,
  YieldEstimate,
  YieldHealthStatus,
} from '../types/yield.types.js';
import type { RwaAsset } from '../types/rwa.types.js';
import type { Transaction } from '../types/transaction.types.js';


// ─── Swap Capability ───────────────────────────────────────────────────────
export interface ISwapCapability {
  getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
  buildSwapTransaction(quote: SwapQuote): Promise<Transaction>;
}

// ─── Yield Capability ──────────────────────────────────────────────────────

/** Resultado de uma operação transacional de yield (deposit/withdraw) */
export interface YieldTransactionResult {
  txHash: string;
  ledger: number;
  vaultId: string;
  amounts: number[];
  shares?: string;
}

/**
 * IYieldCapability — Contrato completo para qualquer integração de Yield no WalletNow.
 * Implementado por DefindexPlugin. Futuramente por Blend, Aquarius, etc.
 *
 * CAMADA DE ORQUESTRAÇÃO: A UI consome esta interface sem conhecer o Defindex.
 * O PortfolioPlugin detecta posições via getUserPositions() sem código específico.
 */
export interface IYieldCapability {
  /**
   * Retorna todos os vaults disponíveis na rede.
   * Cacheado localmente por TTL configurado (default: 5min).
   */
  listVaults(): Promise<YieldVault[]>;

  /**
   * Retorna informações detalhadas de um vault específico.
   * @param vaultId — Contract ID do vault
   */
  getVault(vaultId: string): Promise<YieldVault>;

  /**
   * Retorna as posições ativas do usuário em todos os vaults.
   * Usado pelo PortfolioPlugin para composição do portfolio.
   * @param userAddress — Public key G... do usuário
   */
  getUserPositions(userAddress: string): Promise<YieldUserPosition[]>;

  /**
   * Deposita ativos em um vault.
   * Fluxo: Build XDR → Sign (ctx.signer) → Submit (ctx.rpc) → Confirm
   * Emite eventos: yield.deposit.started → yield.deposit.signed → yield.deposit.confirmed | yield.deposit.failed
   */
  deposit(params: YieldDepositParams): Promise<YieldTransactionResult>;

  /**
   * Saca ativos de um vault queimando shares.
   * Fluxo: Build XDR → Sign (ctx.signer) → Submit (ctx.rpc) → Confirm
   * Emite eventos: yield.withdraw.started → yield.withdraw.signed → yield.withdraw.confirmed | yield.withdraw.failed
   */
  withdraw(params: YieldWithdrawParams): Promise<YieldTransactionResult>;

  /**
   * Estima o yield projetado para um vault.
   * @param vaultId — Contract ID do vault
   * @param principalAmount — Valor do principal em unidades do ativo
   */
  estimateYield(vaultId: string, principalAmount: number): Promise<YieldEstimate>;

  /** Verifica a saúde do serviço de Yield */
  health(): Promise<YieldHealthStatus>;
}

// ─── RWA Capability ────────────────────────────────────────────────────────
export interface IRWACapability {
  /** Lista todos os ativos RWA disponíveis para compra */
  getAssets(): Promise<RwaAsset[]>;
  // buildBuyTransaction(assetId: string, amount: string): Promise<Transaction>;
}

// ─── Portfolio Contributor ─────────────────────────────────────────────────
/**
 * IPortfolioContributor — Interface genérica para qualquer plugin que contribui
 * com posições ao PortfolioPlugin.
 *
 * O PortfolioPlugin busca via findByCapability('portfolio-contributor') e chama
 * getPortfolioPositions() em cada plugin registrado — sem conhecer marcas.
 *
 * Implementado por: EtherfusePlugin (RWA), DefindexPlugin (Yield), etc.
 */
export interface IPortfolioContributor {
  /**
   * Retorna as posições do usuário neste protocolo no formato universal.
   * @param publicKey — Stellar public key G... do usuário
   */
  getPortfolioPositions(publicKey: string): Promise<PortfolioPosition[]>;
}

// ─── Payment Capability ────────────────────────────────────────────────────
/**
 * IPaymentCapability — Contrato para fluxos de on-ramp e pagamento.
 * Implementado por EtherfusePlugin para PIX BRL → TESOURO.
 */
export interface IPaymentCapability {
  /**
   * Inicia o fluxo completo de on-ramp.
   * Retorna dados da ordem criada (PIX key, valor, etc).
   */
  initiateOnRamp(params: OnRampParams): Promise<OnRampResult>;

  /**
   * Consulta o status de uma ordem de on-ramp existente.
   */
  getOnRampStatus(orderId: string): Promise<OnRampStatus>;
}

export interface OnRampParams {
  publicKey: string;
  amountFiat: string;
  fiatCurrency: string; // 'BRL'
  targetAsset: string;  // 'TESOURO'
}

export interface OnRampResult {
  orderId: string;
  pixKey?: string;
  pixCode?: string;
  amountFiat?: string;
  status: string;
}

export type OnRampStatus =
  | 'created'
  | 'funded'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'processing';

// ─── Analytics Capability ──────────────────────────────────────────────────
/**
 * IAnalyticsCapability — Métricas e informações financeiras para o AI Assistant.
 * Implementado por EtherfusePlugin para dados de RWA.
 */
export interface IAnalyticsCapability {
  /**
   * Retorna métricas de alto nível do protocolo.
   */
  getProtocolMetrics(): Promise<ProtocolMetrics>;
}

export interface ProtocolMetrics {
  tvlUsd: number;
  apy?: number;
  totalUsers?: number;
  lastUpdated: string;
}

// ─── Portfolio Capability ──────────────────────────────────────────────────
export interface IPortfolioCapability {
  /**
   * Retorna o resumo unificado de posições de todas as integrações.
   * O motor (Portfolio Plugin) deve varrer:
   * - A carteira nativa (ativos Stellar)
   * - O adaptador DeFi (posições LP)
   * - O adaptador Yield (cofres)
   * - O adaptador RWA (ativos do mundo real)
   * E retornar tudo padronizado.
   */
  getSummary(publicKey: string): Promise<PortfolioSummary>;
}

