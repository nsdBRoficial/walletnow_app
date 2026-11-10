/**
 * @module packages/contracts/src/identity.ts
 * @description Contratos canônicos, interfaces e tipos universais (identity) do pacote @walletnow/contracts (exporta: AuthMethod, IdentityId, Identity, IdentitySession).
 */
/**
 * @walletnow/contracts — Identity Contracts
 *
 * Contratos canônicos do Identity Engine.
 * Define WHAT identity management does, never HOW.
 *
 * Princípio: Identity nunca sabe como autenticou.
 * Ela recebe um IdentitySession e entrega uma assinatura.
 */

import type { StellarNetworkType } from './network.js';

// ─── Auth Methods ─────────────────────────────────────────────────────────────

/**
 * Método de autenticação suportado.
 * O AuthAdapter escolhido pelo builder determina como a Identity é criada.
 */
export type AuthMethod =
  | 'passkeys'    // FIDO2/WebAuthn — Secure Enclave biométrico
  | 'google'      // Google OAuth
  | 'apple'       // Apple Sign In
  | 'magic-link'  // Email magic link
  | 'keypair'     // Par de chaves Stellar importado manualmente
  | 'mnemonic'    // BIP-39 mnemonic phrase (12 ou 24 palavras)
  | 'secret-key'  // Secret Key Stellar direta (S...)
  | 'readonly';   // Watch-only — public key apenas, sem assinar

// ─── Identity Entity ──────────────────────────────────────────────────────────

export type IdentityId = string;

/**
 * Identity — Entidade raiz do WalletNow OS.
 *
 * Representa o usuário de forma abstrata e desacoplada do método de auth.
 * Uma Identity pode possuir N Wallets em N redes (hoje apenas Stellar).
 */
export interface Identity {
  readonly id: IdentityId;
  readonly authMethod: AuthMethod;
  readonly label?: string;
  readonly createdAt: number;
  readonly lastAuthAt: number;
  readonly isActive: boolean;
}

// ─── Session ──────────────────────────────────────────────────────────────────

/** Sessão ativa de uma Identity */
export interface IdentitySession {
  readonly identityId: IdentityId;
  /** Public key Stellar derivada ou vinculada a esta sessão */
  readonly publicKey: string;
  readonly network: StellarNetworkType;
  readonly startedAt: number;
  readonly expiresAt: number | null;
  readonly method: AuthMethod;
}

// ─── Auth Params (Union Discriminada) ────────────────────────────────────────

export interface CreateWithPasskeyParams {
  readonly method: 'passkeys';
  readonly label?: string;
  readonly rpId?: string;
  readonly displayName?: string;
}

export interface CreateWithKeypairParams {
  readonly method: 'keypair' | 'mnemonic' | 'secret-key';
  readonly secretOrMnemonic: string;
  readonly label?: string;
}

export interface CreateWithOAuthParams {
  readonly method: 'google' | 'apple' | 'magic-link';
  readonly label?: string;
  /** Callback URL para OAuth redirect */
  readonly redirectUrl?: string;
}

export interface CreateReadonlyParams {
  readonly method: 'readonly';
  readonly publicKey: string;
  readonly label?: string;
}

export type CreateIdentityParams =
  | CreateWithPasskeyParams
  | CreateWithKeypairParams
  | CreateWithOAuthParams
  | CreateReadonlyParams;

// ─── Auth Result ──────────────────────────────────────────────────────────────

export interface IdentityAuthResult {
  readonly identity: Identity;
  readonly session: IdentitySession;
  readonly publicKey: string;
  readonly authenticatedAt: number;
}

// ─── IAuthAdapter (Strategy Pattern) ────────────────────────────────────────

/**
 * IAuthAdapter — Strategy que implementa UM método de autenticação.
 *
 * O IdentityEngine não sabe COMO autenticar.
 * Ele delega ao IAuthAdapter correto para cada AuthMethod.
 *
 * @example Adapter de Passkeys
 * class PasskeyAuthAdapter implements IAuthAdapter {
 *   readonly method = 'passkeys' as const;
 *   async create(params) { ... WebAuthn navigator.credentials.create() ... }
 *   async authenticate(identityId) { ... navigator.credentials.get() ... }
 *   async sign(payload) { ... } // assina com secure enclave
 * }
 */
export interface IAuthAdapter {
  readonly method: AuthMethod;

  /** Cria uma nova identity via este método de auth */
  create(params: CreateIdentityParams): Promise<IdentityAuthResult>;

  /**
   * Autentica (reabre sessão de) uma identity existente.
   * Para Passkeys: biometria. Para OAuth: redirect.
   */
  authenticate(identityId: IdentityId): Promise<IdentityAuthResult>;

  /**
   * Assina bytes arbitrários com a chave privada da identity.
   * Chamado pelo WalletEngine para assinar transações Stellar.
   */
  sign(identityId: IdentityId, payload: Uint8Array): Promise<Uint8Array>;

  /** Verifica se este método de auth está disponível no ambiente atual */
  isAvailable(): Promise<boolean>;
}

// ─── IIdentityEngine (Contrato Principal) ─────────────────────────────────────

/**
 * IIdentityEngine — Contrato canônico do Identity Engine.
 *
 * Responsabilidades:
 * - Gerenciar o ciclo de vida de Identities
 * - Orquestrar os IAuthAdapters (não implementa auth diretamente)
 * - Gerenciar sessões ativas
 * - Assinar payloads (delega ao adapter correto)
 */
export interface IIdentityEngine {
  readonly status: 'unauthenticated' | 'authenticating' | 'authenticated' | 'locked';
  readonly session: IdentitySession | null;
  readonly publicKey: string | null;

  // Adapters
  /** Registra um AuthAdapter para um método de autenticação */
  use(adapter: IAuthAdapter): void;

  // CRUD
  create(params: CreateIdentityParams): Promise<IdentityAuthResult>;
  authenticate(identityId: IdentityId): Promise<IdentityAuthResult>;
  list(): Promise<Identity[]>;
  get(identityId: IdentityId): Promise<Identity | null>;
  setActive(identityId: IdentityId): Promise<Identity>;
  remove(identityId: IdentityId): Promise<void>;

  // Session
  lock(): Promise<void>;
  unlock(identityId: IdentityId): Promise<IdentityAuthResult>;
  logout(): Promise<void>;

  // Signing
  sign(payload: Uint8Array): Promise<Uint8Array>;
}
