/**
 * @module packages\core\src\public\types\rwa.types.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
export interface RwaAsset {
  id: string;
  name: string;
  symbol: string;
  tvlUsd: number;
  projectedApy: number;
  maturityDate?: string;
  ticker?: string;
  apy?: string | number;
  price?: number;
  tvl?: string | number;
  underlying?: string;
  description?: string;
  requiresKyc?: boolean;
  explorerUrl?: string;
}
