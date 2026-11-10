/**
 * @module packages\storage\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/storage — Public API Barrel
 */

// ─── Implementações ───────────────────────────────────────────────────────────
export { InMemoryStorage } from './InMemoryStorage.js';
export { LocalStorageAdapter } from './LocalStorageAdapter.js';
export { FakeSecureStorage } from './FakeSecureStorage.js';

// ─── Re-exports de contratos (conveniência) ───────────────────────────────────
// Quem usa @walletnow/storage pode importar as interfaces sem adicionar
// @walletnow/contracts como dependência explícita.
export type {
  IStorage,
  ISecureStorage,
  IMemoryStorage,
  StorageItemMetadata,
  StorageNamespace,
} from '@walletnow/contracts';
