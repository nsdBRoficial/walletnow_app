/**
 * @module packages\providers\provider-etherfuse\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/provider-etherfuse — Public API Barrel
 *
 * Este é o único ponto de importação do pacote.
 * Plugins e consumidores devem importar exclusivamente daqui.
 *
 * @example
 * import { createEtherfuseV2ApiService, EtherfusePersistenceService } from '@walletnow/provider-etherfuse';
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  IEtherfuseAssetConfig,
  EfV2CreateCustomerRequest,
  EfV2CustomerResponse,
  EfV2KycIdentity,
  EfV2KycStatus,
  EfV2KycStatusResponse,
  EfV2RegisterPixRequest,
  EfV2Asset,
  EfV2AssetsResponse,
  EfV2QuoteResult,
  EfV2OrderResult,
  EfV2OrderStatus,
  EfV2Activity,
  EfV2PersistenceData,
  TrustlineResult,
} from './etherfuse.types.js';

export {
  SANDBOX_PIX_CPF_MOCK,
  SANDBOX_KYC_MOCK_IDENTITY,
} from './etherfuse.types.js';

// ─── Configuration ────────────────────────────────────────────────────────────
export {
  ETHERFUSE_ASSET_CONFIG,
  ETHERFUSE_HORIZON_URL,
  TESOURO_FALLBACK_IDENTIFIER,
} from './etherfuse.config.js';

// ─── Services ─────────────────────────────────────────────────────────────────
export {
  createEtherfuseV2ApiService,
  EfV2HttpError,
  type EtherfuseV2ApiService,
  type EtherfuseApiServiceConfig,
} from './EtherfuseV2ApiService.js';

export { EtherfusePersistenceService } from './EtherfusePersistenceService.js';
export { EtherfuseActivityService } from './EtherfuseActivityService.js';
export { EtherfuseTrustlineService } from './EtherfuseTrustlineService.js';
