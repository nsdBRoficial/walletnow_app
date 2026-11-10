/**
 * @module packages/plugins/plugin-defindex/src/index.ts
 * @description Plugin de capacidade DeFi/RWA (@walletnow/plugin-defindex - index) integrado ao IntegrationEngine.
 */
/**
 * @walletnow/plugin-defindex — Public API
 *
 * Ponto único de importação do plugin.
 * Exporta apenas o necessário para os consumidores externos.
 */

// ─── Plugin Principal ─────────────────────────────────────────────────────
export { DefindexPlugin } from './DefindexPlugin';
export type { DefindexPluginConfig } from './DefindexPlugin';
export { DEFINDEX_MANIFEST } from './DefindexPlugin';

// ─── API Client (para uso avançado) ───────────────────────────────────────
export { DefindexAPIClient } from './DefindexAPIClient';
export type { DefindexAPIClientConfig } from './DefindexAPIClient';

// ─── Services (para uso avançado / testes) ────────────────────────────────
export { DefindexVaultService } from './DefindexVaultService';
export type { DefindexVaultServiceConfig } from './DefindexVaultService';

export { DefindexYieldService } from './DefindexYieldService';
export type { DefindexYieldServiceConfig } from './DefindexYieldService';

// ─── API Types (internos, exportados para documentação/testes) ────────────
export type { DefindexNetwork } from './types/defindex.api.types';
