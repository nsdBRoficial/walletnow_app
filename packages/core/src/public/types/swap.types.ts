/**
 * @module packages\core\src\public\types\swap.types.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
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
