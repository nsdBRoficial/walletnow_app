/**
 * @module packages/core/src/public/types/rwa.types.ts
 * @description Módulo do kernel @walletnow/core (rwa.types) — ciclo de vida, descoberta de protocolos, health monitor e tipos de capacidades (exporta: RwaAsset).
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
