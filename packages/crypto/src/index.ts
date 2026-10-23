/**
 * @packageDocumentation
 * @module @walletnow/crypto
 *
 * WalletNow Crypto Engine — Criptografia, Chaves e Assinatura Client-Side
 *
 * Responsabilidade:
 * Centralizar todas as rotinas criptográficas canônicas do WalletNow OS:
 * - Derivação de pares de chaves Stellar Ed25519 (`StellarKeypairDeriver`).
 * - Assinador em memória para transações autenticadas (`InMemoryStellarSigner`).
 * - Cifragem simétrica com padrão militar AES-GCM-256 e PBKDF2 (`WebCryptoEncryptor`).
 *
 * @updated Setembro de 2026
 */

// ─── Stubs (prontos para Fase 2) ─────────────────────────────────────────────
export { StellarKeypairDeriver } from './StellarKeypairDeriver.js';
export { InMemoryStellarSigner } from './InMemoryStellarSigner.js';
export { WebCryptoEncryptor } from './WebCryptoEncryptor.js';
export { isValidPublicKey, isValidSecretKey, STELLAR_ED25519_KEY_LENGTH } from './validation.js';

// ─── Re-exports de contratos (conveniência) ───────────────────────────────────
export type {
  IKeypairDeriver,
  DeriveInput,
  DerivedKeypair,
  IStellarSigner,
  IEncryptor,
  EncryptedData,
  IHasher,
  IMnemonicGenerator,
} from '@walletnow/contracts';
