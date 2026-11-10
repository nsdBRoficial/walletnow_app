/**
 * @module packages\contracts\src\wallet.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/contracts — Wallet Contracts
 *
 * Contratos canônicos do Wallet Engine e Account Engine.
 * Foco exclusivo na rede Stellar.
 *
 * Princípio: WalletEngine não sabe como as chaves são guardadas.
 * Ele delega ao IWalletAdapter para cada tipo de custódia.
 */

import type { IdentityId } from './identity.js';
import type { StellarNetworkType, StellarAssetBalance } from './network.js';

// ─── Wallet Entity ────────────────────────────────────────────────────────────

export type WalletId = string;
export type AccountId = string;

/**
 * Tipo de custódia da wallet.
 * Extensível para futuros tipos (Hardware Wallet, Multi-sig, etc.)
 * — todos ainda Stellar.
 */
export type WalletCustodyType =
  | 'self-custody'      // Passkeys ou keypair importado
  | 'readonly';         // Apenas observação, sem signing

/** Wallet Stellar — vinculada a uma Identity */
export interface StellarWallet {
  readonly id: WalletId;
  readonly identityId: IdentityId;
  readonly publicKey: string;
  readonly network: StellarNetworkType;
  readonly custodyType: WalletCustodyType;
  readonly label?: string;
  readonly createdAt: number;
  readonly isActive: boolean;
}

// ─── Account (On-Chain State) ─────────────────────────────────────────────────

/** Estado completo de uma conta no ledger Stellar */
export interface StellarAccountState {
  readonly publicKey: string;
  readonly exists: boolean;
  readonly xlmBalance: string;
  readonly sequenceNumber: string;
  readonly subentryCount: number;
  readonly balances: StellarAssetBalance[];
  readonly signers: StellarSigner[];
  readonly lastSyncAt: number;
}

/** Signer de uma conta Stellar (multi-sig) */
export interface StellarSigner {
  readonly publicKey: string;
  readonly weight: number;
  readonly type: 'ed25519_public_key' | 'hash_x' | 'pre_auth_tx';
}

// ─── IWalletAdapter (Strategy Pattern) ───────────────────────────────────────

/**
 * IWalletAdapter — Strategy que implementa UM tipo de custódia de wallet.
 *
 * O WalletEngine não sabe como as chaves são armazenadas.
 * Cada adapter cuida de seu próprio mecanismo de persistência segura.
 *
 * @example Adapter de Self-Custody via Passkeys
 * class PasskeyWalletAdapter implements IWalletAdapter {
 *   readonly custodyType = 'self-custody' as const;
 *   async create() { ... derive keypair from Passkey ... }
 *   async signTransaction(xdr, passphrase) { ... sign with secure enclave ... }
 * }
 *
 * @example Adapter de Watch-Only
 * class ReadonlyWalletAdapter implements IWalletAdapter {
 *   readonly custodyType = 'readonly' as const;
 *   async create() { ... store publicKey only ... }
 *   async signTransaction() { throw new NotImplementedError('Readonly wallet cannot sign'); }
 * }
 */
export interface IWalletAdapter {
  readonly custodyType: WalletCustodyType;

  /**
   * Cria e persiste uma nova wallet, derivando o keypair conforme o tipo de custódia.
   * Retorna a public key — nunca a private key.
   */
  create(params: CreateWalletAdapterParams): Promise<string>;

  /**
   * Importa uma wallet existente a partir de uma secret key ou mnemonic.
   * Criptografa e persiste a chave privada no armazenamento seguro.
   */
  import?(secretOrMnemonic: string): Promise<string>;

  /**
   * Assina um XDR de transação Stellar.
   * Retorna o XDR assinado.
   * @throws NotImplementedError para wallets readonly
   */
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;

  /** Remove a wallet do armazenamento seguro */
  remove(publicKey: string): Promise<void>;
}

/** Parâmetros para criar uma wallet via adapter */
export interface CreateWalletAdapterParams {
  readonly identityId: IdentityId;
  readonly network: StellarNetworkType;
  readonly label?: string;
}

// ─── IWalletEngine (Contrato Principal) ───────────────────────────────────────

/**
 * IWalletEngine — Contrato canônico do Wallet Engine.
 *
 * Responsabilidades:
 * - Gerenciar o ciclo de vida de Wallets Stellar
 * - Orquestrar os IWalletAdapters (não implementa custódia diretamente)
 * - Coordenar com o AccountEngine para operações on-chain
 */
export interface IWalletEngine {
  readonly active: StellarWallet | null;
  readonly publicKey: string | null;

  /** Registra um WalletAdapter para um tipo de custódia */
  use(adapter: IWalletAdapter): void;

  // CRUD
  create(params: CreateWalletParams): Promise<StellarWallet>;
  import(params: ImportWalletParams): Promise<StellarWallet>;
  list(identityId: IdentityId): Promise<StellarWallet[]>;
  get(walletId: WalletId): Promise<StellarWallet | null>;
  setActive(walletId: WalletId): Promise<StellarWallet>;
  remove(walletId: WalletId): Promise<void>;

  // Signing
  signTransaction(xdr: string): Promise<string>;
}

/** Parâmetros para criar uma wallet via WalletEngine */
export interface CreateWalletParams {
  readonly identityId: IdentityId;
  readonly custodyType: WalletCustodyType;
  readonly network?: StellarNetworkType;
  readonly label?: string;
}

/** Parâmetros para importar uma wallet via secret key ou mnemonic */
export interface ImportWalletParams {
  readonly identityId: IdentityId;
  readonly secretOrMnemonic: string;
  readonly network?: StellarNetworkType;
  readonly label?: string;
  readonly setAsActive?: boolean;
}

// ─── IAccountEngine (Contrato Principal) ──────────────────────────────────────

/**
 * IAccountEngine — Contrato canônico do Account Engine.
 *
 * Responsabilidades:
 * - Consultar estado on-chain de contas Stellar via Horizon
 * - Sincronizar saldos e trustlines
 * - Verificar existência de contas
 */
export interface IAccountEngine {
  existsOnChain(publicKey: string): Promise<boolean>;
  getState(publicKey: string): Promise<StellarAccountState>;
  sync(publicKey: string): Promise<StellarAccountState>;
}
