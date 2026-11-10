/**
 * @module packages/providers/provider-etherfuse/src/etherfuse.types.ts
 * @description Infraestrutura de provedores (@walletnow/providers - etherfuse.types) — registro, barramento de eventos e adaptadores externos (exporta: IEtherfuseAssetConfig, EfV2CreateCustomerRequest, EfV2CustomerResponse, EfV2KycIdentity).
 */
/**
 * @walletnow/provider-etherfuse — Tipos do Etherfuse V2
 *
 * Fluxo programático validado baseado no demo etherfuse-pix-demo.
 * Ref: https://github.com/wmendes/etherfuse-pix-demo/
 *
 * DIFERENÇA V1 → V2: createCustomer retorna bankAccountId diretamente,
 * eliminando a dependência de getFiatAccounts() pós-KYC.
 */

// ─── Configuração de Assets ───────────────────────────────────────────────────

export interface IEtherfuseAssetConfig {
  assetCode: string;
  issuer: string;
  network: 'MAINNET' | 'TESTNET';
  displayName: string;
  description: string;
  decimals: number;
  color: string;
  status: 'live' | 'preview' | 'deprecated';
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface EfV2CreateCustomerRequest {
  email: string;
  publicKey: string;
  country: string;
}

export interface EfV2CustomerResponse {
  id: string;
  bankAccountId: string;
  presignedUrl: string;
}

// ─── KYC ──────────────────────────────────────────────────────────────────────

export interface EfV2KycIdentity {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  taxId: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  email: string;
  phone: string;
}

export type EfV2KycStatus =
  | 'not_started'
  | 'proposed'
  | 'pending'
  | 'approved'
  | 'approved_chain_deploying'
  | 'rejected';

export interface EfV2KycStatusResponse {
  status: EfV2KycStatus;
  onChainMarked?: boolean;
  currentRejectionReason?: string | null;
}

// ─── PIX Bank Account ─────────────────────────────────────────────────────────

export interface EfV2RegisterPixRequest {
  bankAccountId: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  pixKey: string;
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface EfV2Asset {
  symbol: string;
  identifier: string;
  name: string;
  currency: string | null;
}

export interface EfV2AssetsResponse {
  assets: EfV2Asset[];
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export interface EfV2QuoteResult {
  quoteId: string;
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  feeAmount: string;
  expiresAt: string;
  resolvedTargetAsset: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type EfV2OrderStatus =
  | 'created'
  | 'funded'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'processing';

export interface EfV2OrderResult {
  orderId: string;
  status: EfV2OrderStatus;
  pixKey?: string;
  pixCode?: string;
  pixKeyType?: string;
  amountInFiat?: string;
  amountInTokens?: string;
  confirmedTxSignature?: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface EfV2Activity {
  orderId: string;
  txHash: string;
  explorerUrl: string;
  asset: string;
  amountBRL: string;
  amountToken: string;
  status: string;
  createdAt: string;
  completedAt: string;
  type: 'BUY TESOURO' | 'SELL TESOURO';
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export interface EfV2PersistenceData {
  version: number;
  customerId: string;
  bankAccountId: string;
  createdAt: string;
  walletPublicKey: string;
}

// ─── Trustline ────────────────────────────────────────────────────────────────

export interface TrustlineResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  alreadyExists?: boolean;
}

// ─── Sandbox Mocks ────────────────────────────────────────────────────────────

/**
 * CPF mock para registro PIX no sandbox Etherfuse.
 * SANDBOX-ONLY — nunca usar em produção.
 */
export const SANDBOX_PIX_CPF_MOCK = '000.000.000-00';

/**
 * Identidade mock para KYC programático no sandbox.
 * O sandbox Etherfuse auto-aprova qualquer identidade válida.
 */
export const SANDBOX_KYC_MOCK_IDENTITY: EfV2KycIdentity = {
  firstName: 'WalletNow',
  lastName: 'Sandbox',
  dateOfBirth: '1990-01-01',
  taxId: '000.000.000-00',
  address: {
    street: 'Av. Paulista, 1374',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    postalCode: '01310-100',
  },
  email: 'sandbox@walletnow.app',
  phone: '+5511999999999',
};
