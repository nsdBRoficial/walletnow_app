/**
 * @module packages/wallet/src/index.ts
 * @description Motor de carteiras e contas Stellar (@walletnow/wallet - index) — gestão de trustlines, saldos e submissão XDR.
 */
/**
 * @walletnow/wallet — Public API
 */

export { WalletEngine } from './WalletEngine.js';
export { AccountEngine } from './AccountEngine.js';

// Re-exporta contratos do wallet
export type {
  IWalletEngine,
  IWalletAdapter,
  StellarWallet,
  WalletId,
  WalletCustodyType,
  CreateWalletParams,
  ImportWalletParams,
  CreateWalletAdapterParams,
  IAccountEngine,
  StellarAccountState,
  StellarSigner,
} from '@walletnow/contracts';
