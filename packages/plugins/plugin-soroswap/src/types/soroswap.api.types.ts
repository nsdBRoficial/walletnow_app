/**
 * @module packages\plugins\plugin-soroswap\src\types\soroswap.api.types.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-soroswap — Tipos internos da API Soroswap
 *
 * Representam os contratos exatos da Soroswap Aggregator REST API.
 * Documentação: https://api.soroswap.finance/docs
 * Fluxo: POST /quote → POST /build → Sign (Freighter) → Submit (Stellar SDK)
 */

/** Rede suportada pela Soroswap API */
export type SoroswapNetwork = 'testnet' | 'mainnet';

/** Tipo de operação de swap */
export type SoroswapTradeType = 'EXACT_IN' | 'EXACT_OUT';

/** Protocolos agregados pela Soroswap */
export type SoroswapApiProtocol = 'soroswap' | 'phoenix' | 'aqua' | 'sdex';

/** Payload para POST /quote */
export interface SoroswapQuotePayload {
  assetIn: string;                      // Contract ID (C...) ou 'native' para XLM
  assetOut: string;
  amount: string;                        // Em stroops (inteiro como string)
  tradeType: SoroswapTradeType;
  protocols?: SoroswapApiProtocol[];
}

/** Resposta de POST /quote */
export interface SoroswapQuoteApiResponse {
  assetIn: string;
  assetOut: string;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  path: string[];
  protocol: SoroswapApiProtocol;
  tradeType: SoroswapTradeType;
  networkFee: string;
  // Campos opcionais que podem vir da API
  routeData?: unknown;
}

/** Payload para POST /build */
export interface SoroswapBuildPayload {
  quote: SoroswapQuoteApiResponse;
  from: string;                          // Public key G...
  to?: string;                           // Destinatário (default: from)
  slippageTolerance?: number;            // Em decimal (0.005 = 0.5%)
}

/** Resposta de POST /build */
export interface SoroswapBuildApiResponse {
  xdr: string;                           // XDR da transação, pronto para assinar
  minAmountOut: string;                  // Mínimo garantido após slippage
}

/** Resposta de saúde da API (inferida da disponibilidade) */
export interface SoroswapApiHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs: number;
  apiVersion?: string;
}

/** Erro padronizado da Soroswap API */
export interface SoroswapApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
