/**
 * @module packages\contracts\src\network.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/contracts — Network Contracts
 *
 * Tipos canônicos de rede do WalletNow OS.
 * Foco exclusivo na Stellar Network.
 */

// ─── Rede Stellar ─────────────────────────────────────────────────────────────

/** Redes Stellar suportadas pelo WalletNow OS */
export type StellarNetworkType = 'mainnet' | 'testnet';

/** Configuração de conexão com a rede Stellar */
export interface StellarNetworkConfig {
  /** Rede alvo */
  readonly network: StellarNetworkType;
  /** URL do Horizon (REST API) — usa o padrão da rede se omitido */
  readonly horizonUrl?: string;
  /** URL do Soroban RPC — para chamadas a smart contracts */
  readonly sorobanRpcUrl?: string;
  /**
   * Network passphrase para assinatura de transações.
   * Omitir usa o padrão de cada rede.
   * Mainnet: "Public Global Stellar Network ; September 2015"
   * Testnet: "Test SDF Network ; September 2015"
   */
  readonly passphrase?: string;
}

/** URLs resolvidas e validadas de uma rede Stellar */
export interface StellarNetworkUrls {
  readonly horizonUrl: string;
  readonly sorobanRpcUrl: string;
  readonly passphrase: string;
  readonly network: StellarNetworkType;
  readonly explorerUrl: string;
}

// ─── Assets Stellar ───────────────────────────────────────────────────────────

/** Ativo nativo ou emitido na rede Stellar */
export interface StellarAsset {
  readonly code: string;
  /** null = XLM nativo */
  readonly issuer: string | null;
  readonly name: string;
  readonly decimals: 7;
}

/** Saldo de um ativo em uma conta Stellar */
export interface StellarAssetBalance {
  readonly asset: StellarAsset;
  /** Saldo em formato decimal (ex: "100.0000000") */
  readonly balance: string;
  /** Limite de trustline (null para XLM) */
  readonly limit: string | null;
  readonly isAuthorized: boolean;
}

// ─── Transações Stellar ───────────────────────────────────────────────────────

/** Resultado de uma transação submetida ao Horizon */
export interface StellarTransactionResult {
  readonly txHash: string;
  readonly ledger: number;
  readonly successful: boolean;
  readonly envelopeXdr: string;
  readonly resultXdr: string;
  readonly createdAt: string;
}

/** Status possíveis de uma transação no pipeline */
export type TransactionStatus =
  | 'pending'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'confirmed'
  | 'failed';
