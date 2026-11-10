/**
 * @module packages\core\src\public\types\yield.types.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/core — yield.types.ts
 *
 * Tipos centrais para a Yield Capability.
 * Modelados para suportar Defindex e futuros protocolos de yield.
 * Campos pensados para a UI da Home do WalletNow SuperApp.
 */

/** Nível de risco de um vault */
export type YieldRiskLevel = 'low' | 'medium' | 'high';

/** Estratégia interna de um vault */
export interface YieldStrategy {
  address: string;
  name: string;
  paused: boolean;
}

/** Ativo subjacente gerenciado pelo vault */
export interface YieldVaultAsset {
  /** Contract ID do ativo */
  address: string;
  /** Nome completo (ex: "USDC:GA...") */
  name: string;
  /** Símbolo (ex: "USDC") */
  symbol: string;
  /** Valor total gerenciado neste ativo (em unidades do ativo) */
  totalAmount: string;
  /** Quantidade idle (não investida) */
  idleAmount: string;
  /** Quantidade investida em strategies */
  investedAmount: string;
  /** Strategies associadas a este ativo */
  strategies: YieldStrategy[];
}

/**
 * YieldVault — Modelo canônico de um Vault de Yield no WalletNow.
 * Modelado para o Defindex e compatível com futuras integrações.
 *
 * Campos suficientes para renderizar um card de vault na Home do SuperApp.
 */
export interface YieldVault {
  /** Contract ID do vault */
  id: string;
  /** Nome de exibição (ex: "USDC Yield Vault") */
  name: string;
  /** Ticker do vault share token (ex: "dfUSDC") */
  symbol: string;
  /** Protocolo origem (ex: "defindex") */
  protocol: string;

  // ─── Métricas financeiras ─────────────────────────────────────────────
  /** APY em % (ex: 19.41 = 19.41%) */
  apy: number;
  /** APY diário estimado em % */
  dailyApy: number;
  /** TVL total em USD (estimado pelo protocolo) */
  tvlUsd: number;

  // ─── Ativos ───────────────────────────────────────────────────────────
  /** Token primário de depósito */
  depositToken: string;
  /** Token primário de saque */
  withdrawToken: string;
  /** Detalhes dos ativos gerenciados */
  assets: YieldVaultAsset[];

  // ─── Estratégia ───────────────────────────────────────────────────────
  /** Resumo da estratégia (ex: "Blend + Compound") */
  strategy: string;
  /** Nível de risco avaliado */
  riskLevel: YieldRiskLevel;

  // ─── Taxas ────────────────────────────────────────────────────────────
  /** Taxa do vault em bps (ex: 25 = 0.25%) */
  vaultFeeBps: number;
  /** Taxa da plataforma Defindex em bps */
  platformFeeBps: number;

  // ─── Estado ───────────────────────────────────────────────────────────
  network: string;
}

/**
 * YieldUserPosition — Posição de um usuário em um vault.
 * Necessário para o PortfolioPlugin detectar posições Defindex.
 */
export interface YieldUserPosition {
  /** Reference ao vault */
  vaultId: string;
  vaultName: string;
  /** Endereço do usuário */
  userAddress: string;
  /** Shares do vault detidas pelo usuário */
  shares: string;
  /** Valor em USD estimado da posição */
  valueUsd: number;
  /** Estimativa de yield diário em USD */
  estimatedDailyYieldUsd: number;
  /** Ativo de exposição principal */
  primaryAsset: string;
  apy: number;
}

/** Parâmetros para depositar em um vault */
export interface YieldDepositParams {
  /** Contract ID do vault */
  vaultId: string;
  /** Valor a depositar por ativo (em unidades do ativo, considerando decimais) */
  amounts: number[];
  /** Endereço do usuário */
  from: string;
  /** Investir automaticamente (default: true) */
  invest?: boolean;
  /** Slippage em bps (default: 100 = 1%) */
  slippageBps?: number;
}

/** Parâmetros para sacar de um vault */
export interface YieldWithdrawParams {
  /** Contract ID do vault */
  vaultId: string;
  /** Valores a sacar por ativo (em unidades) */
  amounts: number[];
  /** Endereço do usuário */
  from: string;
  /** Slippage em bps (default: 0) */
  slippageBps?: number;
}

/** Estimativa de yield futura */
export interface YieldEstimate {
  vaultId: string;
  apy: number;
  dailyYield: number;     // Em % do principal
  weeklyYield: number;
  monthlyYield: number;
  yearlyYield: number;
}

/** Status de saúde do serviço de Yield */
export interface YieldHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  latency: number;
  network: string;
  apiVersion?: string;
  lastCheck: number;
}

