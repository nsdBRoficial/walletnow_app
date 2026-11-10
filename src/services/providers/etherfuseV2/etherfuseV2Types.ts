/**
 * @module src/services/providers/etherfuseV2/etherfuseV2Types.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseV2Types) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: EfV2CreateCustomerRequest, EfV2CustomerResponse, EfV2KycIdentity, EfV2KycDocument).
 */
/**
 * Tipos do Etherfuse V2 — Fluxo Programático Validado
 *
 * Baseado nos contratos observados no demo etherfuse-pix-demo.
 * Ref: https://github.com/wmendes/etherfuse-pix-demo/
 *
 * Diferença do V1: createCustomer retorna bankAccountId diretamente,
 * eliminando a dependência de getFiatAccounts() pós-KYC.
 */

// ─── Customer ─────────────────────────────────────────────────────────────────

/** Payload para criação de customer via POST /ramp/customer */
export interface EfV2CreateCustomerRequest {
  email: string;
  publicKey: string;
  country: string; // 'BR' para Brasil
}

/** Resposta de criação de customer — bankAccountId já retornado aqui (diferença V2) */
export interface EfV2CustomerResponse {
  id: string;
  bankAccountId: string;
  presignedUrl: string;
}

// ─── KYC ──────────────────────────────────────────────────────────────────────

/** Identidade para KYC programático (sandbox Brazil) */
export interface EfV2KycIdentity {
  firstName: string;
  lastName: string;
  dateOfBirth: string;  // YYYY-MM-DD
  taxId: string;        // CPF no formato 000.000.000-00 ou apenas dígitos
  address: {
    street: string;
    city: string;
    region: string;
    country: string;    // 'BR'
    postalCode: string;
  };
  email: string;
  phone: string;
}

/** Documento mock para KYC em sandbox */
export interface EfV2KycDocument {
  documentType: 'cpf' | 'rg' | 'passport' | 'driver_license';
  frontImage: string; // base64 ou URL mock
  backImage?: string;
}

/** Status KYC retornado pela Etherfuse */
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

/** Payload para registrar conta PIX antes do on-ramp */
export interface EfV2RegisterPixRequest {
  bankAccountId: string;
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
  pixKey: string; // CPF mock para sandbox
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface EfV2Asset {
  symbol: string;
  identifier: string; // Formato "CODIGO:ISSUER"
  name: string;
  currency: string | null;
}

export interface EfV2AssetsResponse {
  assets: EfV2Asset[];
}

// ─── Quote ────────────────────────────────────────────────────────────────────

/** Payload de quote on-ramp BRL → TESOURO */
export interface EfV2QuoteRequest {
  quoteId: string;
  customerId: string;
  blockchain: string; // 'stellar'
  quoteAssets: {
    type: 'onramp' | 'offramp';
    sourceAsset: string; // 'BRL'
    targetAsset: string; // 'TESOURO:ISSUER'
  };
  sourceAmount: string; // Valor em BRL
}

export interface EfV2QuoteResponse {
  quoteId: string;
  sourceAmount: string;
  destinationAmount?: string;
  destinationAmountAfterFee?: string;
  exchangeRate: string;
  feeAmount: string;
  expiresAt: string;
}

/** Resultado normalizado de cotação V2 */
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

/** Payload para criar ordem de on-ramp */
export interface EfV2CreateOrderRequest {
  orderId: string;
  bankAccountId: string; // ID real retornado em createCustomer
  publicKey: string;
  quoteId: string;
}

export type EfV2OrderStatus =
  | 'created'
  | 'funded'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled'
  | 'processing';

/** Resultado normalizado de ordem V2 */
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

// ─── Sandbox PIX Mock ─────────────────────────────────────────────────────────

/**
 * CPF mock para registro PIX no sandbox Etherfuse.
 * SANDBOX-ONLY: nunca usar em produção.
 * O sandbox Etherfuse aceita qualquer CPF válido (formato).
 *
 * @see ETHERFUSE_V2_VALIDATED_FLOW.md
 */
export const SANDBOX_PIX_CPF_MOCK = '000.000.000-00';

/**
 * Nome completo mock para KYC programático no sandbox.
 * O sandbox Etherfuse auto-aprova qualquer identidade.
 */
export const SANDBOX_KYC_MOCK_IDENTITY: EfV2KycIdentity = {
  firstName: 'WalletNow',
  lastName: 'Sandbox',
  dateOfBirth: '1990-01-01',
  taxId: '000.000.000-00',
  address: {
    street: 'Av. Paulista, 1374',
    city: 'São Paulo',
    region: 'SP',
    country: 'BR',
    postalCode: '01310-100',
  },
  email: 'sandbox@walletnow.app',
  phone: '+5511999999999',
};
