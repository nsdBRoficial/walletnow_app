/**
 * @module packages\onboarding\src\index.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/onboarding — Public API Barrel
 *
 * Este é o único ponto de importação do domínio de Onboarding.
 *
 * O builder importa apenas:
 *   - IOnboardingDomain (tipo)
 *   - UserOnboardingResult (tipo)
 *   - OnboardingOrchestrator (implementação, usado internamente pelo SDK)
 *
 * Tudo mais (OnboardingContext, ports, fakes) é consumido internamente.
 *
 * @example
 * // O builder nunca importa diretamente deste pacote.
 * // Ele usa wn.onboarding.* via @walletnow/sdk.
 * //
 * // Para integração com o Kernel (WalletNow OS):
 * import { OnboardingOrchestrator } from '@walletnow/onboarding';
 * import type { OnboardingContext } from '@walletnow/onboarding';
 */

// ─── Implementação Principal ──────────────────────────────────────────────────
export { OnboardingOrchestrator } from './OnboardingOrchestrator.js';

// ─── Contexto (para injeção de dependência no Kernel) ────────────────────────
export type {
  OnboardingContext,
  IGasStationPort,
  ITestnetFaucetPort,
  ISessionPort,
  IAnalyticsPort,
  OnboardingAnalyticsEvent,
} from './OnboardingContext.js';

// ─── Fakes (apenas para uso em testes) ───────────────────────────────────────
export {
  FakeGasStation,
  FakeTestnetFaucet,
  FakeSessionPort,
  FakeAnalyticsPort,
} from './fakes/index.js';
