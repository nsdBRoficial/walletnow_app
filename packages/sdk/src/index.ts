/**
 * @module packages\sdk\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module @walletnow/sdk
 *
 * WalletNow SDK — Unified Facade for Stellar Web3 Abstraction
 *
 * Propósito na Arquitetura (Facade Pattern):
 * Encapsular a complexidade dos 13 pacotes internos do monorepo, entregando
 * uma API limpa, amigável e fortemente tipada para builders e integradores de dApps.
 *
 * Recursos Disponibilizados:
 * - Onboarding com Abstração Total (`wn.onboarding`): Criação biométrica via Passkeys e patrocínio de contas/trustlines.
 * - Integração Segura com Stellar Network: Redes Testnet e Mainnet configuráveis com failover.
 * - Tratamento Canônico de Erros: Erros tipados e discriminados (`WalletNowError`, `OnboardingError`, `NetworkError`).
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

// ─── Entrypoint Principal (Facade) ─────────────────────────────────────────────
export { WalletNowClient } from './WalletNowClient.js';
export type { WalletNowClientConfig } from './WalletNowClient.js';

// ─── Domínio: Onboarding (Primeiro Domínio, Sempre) ──────────────────────────
export { OnboardingOrchestrator } from '@walletnow/onboarding';

// ─── Tipos Públicos do Domínio Onboarding ────────────────────────────────────
export type {
  IOnboardingDomain,
  CreateUserParams,
  RestoreUserParams,
  SetupTrustlinesParams,
  UserOnboardingResult,
  OnboardingAccountStatus,
  TrustlineSetupResult,
  OnboardingUserStatus,
} from '@walletnow/contracts';

// ─── Tipos de Rede (necessários para configuração) ───────────────────────────
export type {
  StellarNetworkType,
  StellarNetworkConfig,
} from '@walletnow/contracts';

// ─── Erros Públicos (o builder precisa conseguir capturar erros tipados) ──────
export {
  WalletNowError,
  OnboardingError,
  NetworkError,
} from '@walletnow/contracts';

export type {
  OnboardingErrorCode,
  NetworkErrorCode,
} from '@walletnow/contracts';

// ─── Kernel (para integração avançada — uso interno do SDK) ──────────────────
// NOTA: O builder NÃO deve importar WalletNowOS diretamente.
// Este export existe para testes e para provedores de plataforma.
// @internal
export { WalletNowOS } from '@walletnow/providers';
