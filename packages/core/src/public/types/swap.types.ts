/**
 * @module packages/core/src/public/types/swap.types.ts
 * @description Módulo do kernel @walletnow/core (swap.types) — ciclo de vida, descoberta de protocolos, health monitor e tipos de capacidades (exporta: SwapQuoteParams, SwapQuote).
 */
export interface SwapQuoteParams {
  assetIn: string;
  assetOut: string;
  amountIn: string;
}

export interface SwapQuote {
  assetIn: string;
  assetOut: string;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  feeAmount: string;
  route: string[];
}
