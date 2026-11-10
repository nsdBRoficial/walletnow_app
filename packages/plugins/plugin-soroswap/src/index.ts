/**
 * @module packages\plugins\plugin-soroswap\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-soroswap — Public API
 *
 * Exports públicos do plugin.
 * Importar apenas o necessário para evitar tree-shaking desnecessário.
 */

// Plugin principal (registro no Kernel)
export { SoroswapPlugin } from './SoroswapPlugin';
export type { SoroswapPluginConfig } from './SoroswapPlugin';
export { SOROSWAP_MANIFEST } from './SoroswapPlugin';

// Serviços (para uso avançado ou testes)
export { SoroswapAPIClient, SoroswapAPIError } from './SoroswapAPIClient';
export type { SoroswapAPIClientConfig } from './SoroswapAPIClient';
export { SoroswapSwapService } from './SoroswapSwapService';
export type { SoroswapSwapServiceConfig } from './SoroswapSwapService';
export { SoroswapTokenService } from './SoroswapTokenService';

// Tipos internos da API (úteis para integrações UI)
export type {
  SoroswapNetwork,
  SoroswapTradeType,
  SoroswapApiProtocol,
  SoroswapQuotePayload,
  SoroswapQuoteApiResponse,
  SoroswapBuildPayload,
  SoroswapBuildApiResponse,
} from './types/soroswap.api.types';

// Tokens testnet
export { TESTNET_TOKENS, XLM_TESTNET, TESTNET_TOKEN_MAP } from './constants/tokens.testnet';
