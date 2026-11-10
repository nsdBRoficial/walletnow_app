/**
 * @module packages\identity\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/identity — Public API
 */

export { IdentityEngine } from './IdentityEngine.js';
export { KeypairAuthAdapter } from './KeypairAuthAdapter.js';

// Re-exporta contratos de identity
export type {
  IIdentityEngine,
  IAuthAdapter,
  Identity,
  IdentityId,
  IdentitySession,
  IdentityAuthResult,
  CreateIdentityParams,
} from '@walletnow/contracts';
