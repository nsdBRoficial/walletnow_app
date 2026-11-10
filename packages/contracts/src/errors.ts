/**
 * @module packages\contracts\src\errors.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module @walletnow/contracts
 *
 * Canonical Error Hierarchy — WalletNow OS
 *
 * Princípio Arquitetural:
 * Padronização estrita de falhas em todos os módulos e pacotes do monorepo.
 * Cada subsistema herda da classe abstrata canônica `WalletNowError`, garantindo
 * tipagem discriminada (`code`), domínio de origem (`domain`) e metadados contextuais
 * seguros sem vazamento de informações sensíveis (PII ou chaves privadas).
 *
 * Domínios Suportados:
 * - Base: `WalletNowError`, `NotImplementedError`
 * - Identidade & Autenticação: `IdentityError` (Passkeys, WebAuthn, Vault)
 * - Carteira & Chaves: `WalletError` (Keypairs, Ativação de Contas, Assinatura)
 * - Persistência: `StorageError` (Leitura, Escrita, Decriptação de Sessão)
 * - Criptografia: `CryptoError` (AES-GCM, PBKDF2, Derivação Ed25519)
 * - Provedores & Liquidez: `ProviderError` (Cotações, Slippage, Liquidez)
 * - Rede & Horizon: `NetworkError` (RPC Soroban, Horizon, Rate Limits)
 * - Onboarding & Gasless: `OnboardingError` (Patrocínio, Trustlines, Sessão)
 *
 * @updated Setembro de 2026
 */

// ─── Base Error ───────────────────────────────────────────────────────────────

/**
 * WalletNowError — Erro base de todo o WalletNow OS.
 * Todos os erros do sistema herdam desta classe.
 */
export class WalletNowError extends Error {
  readonly code: string;
  readonly domain: string;
  readonly context?: Record<string, unknown> | undefined;

  constructor(
    domain: string,
    code: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WalletNowError';
    this.domain = domain;
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Not Implemented ──────────────────────────────────────────────────────────

/**
 * NotImplementedError — Lançado por implementações placeholder (stub).
 *
 * Usado durante a fase de arquitetura para marcar métodos que ainda
 * precisam de implementação concreta.
 *
 * @example
 * async sign(payload: Uint8Array): Promise<Uint8Array> {
 *   throw new NotImplementedError('IIdentityEngine', 'sign');
 * }
 */
export class NotImplementedError extends WalletNowError {
  constructor(engine: string, method: string) {
    super(
      engine,
      'NOT_IMPLEMENTED',
      `[${engine}] '${method}' is not implemented yet. ` +
      `Provide a concrete adapter or implementation before calling this method.`,
    );
    this.name = 'NotImplementedError';
  }
}

// ─── Identity Errors ──────────────────────────────────────────────────────────

export type IdentityErrorCode =
  | 'IDENTITY_NOT_FOUND'
  | 'IDENTITY_ALREADY_EXISTS'
  | 'AUTH_FAILED'
  | 'AUTH_CANCELLED'
  | 'AUTH_METHOD_NOT_SUPPORTED'
  | 'SESSION_EXPIRED'
  | 'SESSION_NOT_FOUND'
  | 'VAULT_LOCKED'
  | 'INVALID_SECRET'
  | 'PASSKEY_NOT_SUPPORTED'
  | 'PASSKEY_CREATION_FAILED'
  | 'SIGNING_FAILED'
  | 'CANNOT_REMOVE_ACTIVE';

export class IdentityError extends WalletNowError {
  constructor(code: IdentityErrorCode, message: string, context?: Record<string, unknown>) {
    super('Identity', code, message, context);
    this.name = 'IdentityError';
  }
}

// ─── Wallet Errors ────────────────────────────────────────────────────────────

export type WalletErrorCode =
  | 'WALLET_NOT_FOUND'
  | 'WALLET_ALREADY_EXISTS'
  | 'INVALID_SECRET_KEY'
  | 'INVALID_MNEMONIC'
  | 'SIGNING_FAILED'
  | 'READONLY_CANNOT_SIGN'
  | 'ADAPTER_NOT_FOUND'
  | 'ACCOUNT_NOT_ACTIVATED'
  | 'INSUFFICIENT_BALANCE';

export class WalletError extends WalletNowError {
  constructor(code: WalletErrorCode, message: string, context?: Record<string, unknown>) {
    super('Wallet', code, message, context);
    this.name = 'WalletError';
  }
}

// ─── Storage Errors ───────────────────────────────────────────────────────────

export type StorageErrorCode =
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_DECRYPTION_FAILED'
  | 'STORAGE_NOT_INITIALIZED'
  | 'KEY_NOT_FOUND';

export class StorageError extends WalletNowError {
  constructor(code: StorageErrorCode, message: string, context?: Record<string, unknown>) {
    super('Storage', code, message, context);
    this.name = 'StorageError';
  }
}

// ─── Crypto Errors ────────────────────────────────────────────────────────────

export type CryptoErrorCode =
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_KEY'
  | 'DERIVATION_FAILED'
  | 'INVALID_MNEMONIC'
  | 'SIGNING_FAILED'
  | 'VERIFICATION_FAILED';

export class CryptoError extends WalletNowError {
  constructor(code: CryptoErrorCode, message: string, context?: Record<string, unknown>) {
    super('Crypto', code, message, context);
    this.name = 'CryptoError';
  }
}

// ─── Provider Errors ──────────────────────────────────────────────────────────

export type ProviderErrorCode =
  | 'PROVIDER_NOT_FOUND'
  | 'PROVIDER_ALREADY_REGISTERED'
  | 'PROVIDER_INIT_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'CAPABILITY_NOT_SUPPORTED'
  | 'QUOTE_EXPIRED'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED';

export class ProviderError extends WalletNowError {
  constructor(code: ProviderErrorCode, message: string, context?: Record<string, unknown>) {
    super('Provider', code, message, context);
    this.name = 'ProviderError';
  }
}

// ─── Network Errors ───────────────────────────────────────────────────────────

export type NetworkErrorCode =
  | 'HORIZON_UNAVAILABLE'
  | 'RPC_UNAVAILABLE'
  | 'TRANSACTION_FAILED'
  | 'TRANSACTION_TIMEOUT'
  | 'ACCOUNT_NOT_FOUND'
  | 'INSUFFICIENT_XLM'
  | 'RATE_LIMITED';

export class NetworkError extends WalletNowError {
  constructor(code: NetworkErrorCode, message: string, context?: Record<string, unknown>) {
    super('Network', code, message, context);
    this.name = 'NetworkError';
  }
}

// ─── Onboarding Errors ────────────────────────────────────────────────────────

export type OnboardingErrorCode =
  | 'USER_ALREADY_EXISTS'        // externalId já registrado neste projeto
  | 'USER_NOT_FOUND'             // externalId não encontrado
  | 'ACCOUNT_CREATION_FAILED'    // Falha ao criar conta on-chain
  | 'SPONSORSHIP_FAILED'         // Gas Station não pôde patrocinar
  | 'SPONSORSHIP_LIMIT_EXCEEDED' // Cota de patrocínio do plano esgotada
  | 'TRUSTLINE_SETUP_FAILED'     // Falha parcial ou total nas trustlines
  | 'INVALID_ASSET_CODE'         // Código de ativo inválido ou não suportado
  | 'TESTNET_ONLY'               // Operação só disponível em testnet
  | 'INVALID_EXTERNAL_ID'        // externalId inválido (vazio, muito longo, etc.)
  | 'SESSION_CREATION_FAILED'    // Falha ao gerar token de sessão
  | 'NETWORK_MISMATCH';          // Conta existe em rede diferente da configurada

export class OnboardingError extends WalletNowError {
  constructor(code: OnboardingErrorCode, message: string, context?: Record<string, unknown>) {
    super('Onboarding', code, message, context);
    this.name = 'OnboardingError';
  }
}
