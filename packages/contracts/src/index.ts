/**
 * @module packages\contracts\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/contracts — Public API Barrel
 *
 * Único ponto de importação de TODOS os contratos do WalletNow OS.
 *
 * @example
 * import type { IIdentityEngine, IWalletEngine, IWalletNowOS } from '@walletnow/contracts';
 * import { NotImplementedError, IdentityError, WalletNowError } from '@walletnow/contracts';
 * import type { IOnboardingDomain, CreateUserParams, UserOnboardingResult } from '@walletnow/contracts';
 */

// ─── Network ──────────────────────────────────────────────────────────────────
export type {
  StellarNetworkType,
  StellarNetworkConfig,
  StellarNetworkUrls,
  StellarAsset,
  StellarAssetBalance,
  StellarTransactionResult,
  TransactionStatus,
} from './network.js';

// ─── Identity ─────────────────────────────────────────────────────────────────
export type {
  AuthMethod,
  IdentityId,
  Identity,
  IdentitySession,
  CreateIdentityParams,
  CreateWithPasskeyParams,
  CreateWithKeypairParams,
  CreateWithOAuthParams,
  CreateReadonlyParams,
  IdentityAuthResult,
  IAuthAdapter,
  IIdentityEngine,
} from './identity.js';

// ─── Wallet ───────────────────────────────────────────────────────────────────
export type {
  WalletId,
  AccountId,
  WalletCustodyType,
  StellarWallet,
  StellarAccountState,
  StellarSigner,
  IWalletAdapter,
  CreateWalletAdapterParams,
  IWalletEngine,
  CreateWalletParams,
  ImportWalletParams,
  IAccountEngine,
} from './wallet.js';

// ─── Provider & Protocol ──────────────────────────────────────────────────────
export type {
  ProviderCapability,
  WalletNowProviderManifest,
  ProviderHealthStatus,
  ProviderHealthResult,
  IWalletNowProvider,
  ISwapProtocol,
  SwapToken,
  SwapQuoteParams,
  SwapQuoteResult,
  SwapExecuteParams,
  SwapResult,
  IYieldProtocol,
  YieldVault,
  YieldDepositParams,
  YieldWithdrawParams,
  YieldResult,
  YieldPosition,
  IRWAProtocol,
  RWAAsset,
  RWAQuoteParams,
  RWAQuote,
  RWAOrderParams,
  RWAOrder,
  IProviderRegistry,
} from './provider.js';

// ─── Storage ──────────────────────────────────────────────────────────────────
export type {
  IStorage,
  ISecureStorage,
  IMemoryStorage,
  StorageItemMetadata,
  StorageNamespace,
} from './storage.js';

// ─── Crypto ───────────────────────────────────────────────────────────────────
export type {
  IKeypairDeriver,
  DeriveInput,
  DerivedKeypair,
  IStellarSigner,
  IEncryptor,
  EncryptedData,
  IHasher,
  IMnemonicGenerator,
} from './crypto.js';

// ─── Events ───────────────────────────────────────────────────────────────────
export type {
  WalletNowOSEvents,
  OSEventName,
} from './events.js';

// ─── OS Lifecycle ─────────────────────────────────────────────────────────────
export type {
  WalletNowOSConfig,
  OSState,
  IWalletNowOS,
  IEventBus,
} from './os.js';

// ─── Errors (Classes — não apenas tipos) ─────────────────────────────────────
export {
  WalletNowError,
  NotImplementedError,
  IdentityError,
  WalletError,
  StorageError,
  CryptoError,
  ProviderError,
  NetworkError,
  OnboardingError,
} from './errors.js';

export type {
  IdentityErrorCode,
  WalletErrorCode,
  StorageErrorCode,
  CryptoErrorCode,
  ProviderErrorCode,
  NetworkErrorCode,
  OnboardingErrorCode,
} from './errors.js';

// ─── Onboarding (Domínio de Primeira Classe) ─────────────────────────────────────
export type {
  // Inputs
  CreateUserParams,
  RestoreUserParams,
  SetupTrustlinesParams,
  // Outputs
  UserOnboardingResult,
  OnboardingAccountStatus,
  TrustlineSetupResult,
  OnboardingUserStatus,
  // Contract
  IOnboardingDomain,
} from './onboarding.js';
