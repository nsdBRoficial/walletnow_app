/**
 * @module packages/onboarding/src/fakes/index.ts
 * @description Módulo de onboarding invisível (@walletnow/onboarding - index) — orquestração de identidade, carteira, patrocínio Gasless e sessão (exporta: FakeGasStation, FakeTestnetFaucet, FakeSessionPort, FakeAnalyticsPort).
 */
/**
 * @walletnow/onboarding — Fake Ports (para Testes)
 *
 * Implementações fake dos ports do OnboardingContext.
 * Permitem testar o OnboardingOrchestrator sem dependências externas.
 *
 * Padrão de uso:
 * @example
 * import { FakeGasStation, FakeTestnetFaucet, FakeSessionPort, FakeAnalyticsPort } from '../fakes/index.js';
 *
 * const ctx = {
 *   gasStation: new FakeGasStation(),
 *   faucet: new FakeTestnetFaucet(),
 *   session: new FakeSessionPort(),
 *   analytics: new FakeAnalyticsPort(),
 *   // ... demais engines fakes de @walletnow/testing
 * };
 */

import type {
  IGasStationPort,
  ITestnetFaucetPort,
  ISessionPort,
  IAnalyticsPort,
  OnboardingAnalyticsEvent,
} from '../OnboardingContext.js';
import type { StellarNetworkType } from '@walletnow/contracts';

// ─── FakeGasStation ────────────────────────────────────────────────────────────

/**
 * FakeGasStation — Simula o Gas Station sem chamadas de rede.
 *
 * Configurável para simular cenários de erro (quota esgotada, falha de rede etc.).
 */
export class FakeGasStation implements IGasStationPort {
  private _hasQuota = true;
  private _shouldFailSponsor = false;
  private _shouldFailTrustlines = false;

  readonly sponsoredAccounts: string[] = [];
  readonly sponsoredTrustlines: Array<{ publicKey: string; assets: string[] }> = [];

  /** Configura o fake para simular cota esgotada */
  setQuotaExhausted(): void {
    this._hasQuota = false;
  }

  /** Configura o fake para simular falha no sponsorship */
  setFailSponsor(): void {
    this._shouldFailSponsor = true;
  }

  async hasQuota(_network: StellarNetworkType): Promise<boolean> {
    return this._hasQuota;
  }

  async sponsorAccountCreation(publicKey: string, _network: StellarNetworkType): Promise<string> {
    if (this._shouldFailSponsor) {
      throw new Error('FakeGasStation: simulated sponsorship failure');
    }
    this.sponsoredAccounts.push(publicKey);
    return `fake_tx_account_${publicKey.slice(0, 8)}`;
  }
  async sponsorTransaction(
    signedXdr: string,
    _network: StellarNetworkType,
  ): Promise<{ txHash: string }> {
    if (this._shouldFailTrustlines) {
      throw new Error('FakeGasStation: simulated transaction failure');
    }
    return {
      txHash: `fake_tx_sponsored_${Date.now()}`
    };
  }
}

// ─── FakeTestnetFaucet ─────────────────────────────────────────────────────────

export class FakeTestnetFaucet implements ITestnetFaucetPort {
  readonly activatedAccounts: string[] = [];
  readonly fundedTokens: Array<{ publicKey: string; asset: string }> = [];

  async activateAccount(publicKey: string): Promise<{ txHash: string }> {
    this.activatedAccounts.push(publicKey);
    return { txHash: `fake_friendbot_${publicKey.slice(0, 8)}` };
  }

  async fundTestTokens(publicKey: string, asset: string): Promise<{ txHash: string; amount: string }> {
    this.fundedTokens.push({ publicKey, asset });
    return {
      txHash: `fake_fund_${asset}_${publicKey.slice(0, 8)}`,
      amount: '100.0000000',
    };
  }
}

// ─── FakeSessionPort ──────────────────────────────────────────────────────────

export class FakeSessionPort implements ISessionPort {
  readonly createdTokens: Array<{ userId: string; publicKey: string }> = [];

  async createToken(userId: string, publicKey: string): Promise<string> {
    this.createdTokens.push({ userId, publicKey });
    return `fake_session_${userId}_${Date.now()}`;
  }
}

// ─── FakeAnalyticsPort ────────────────────────────────────────────────────────

export class FakeAnalyticsPort implements IAnalyticsPort {
  readonly trackedEvents: OnboardingAnalyticsEvent[] = [];

  async track(event: OnboardingAnalyticsEvent): Promise<void> {
    this.trackedEvents.push(event);
  }

  /** Helper: retorna todos os eventos de um tipo específico */
  eventsOf(name: OnboardingAnalyticsEvent['name']): OnboardingAnalyticsEvent[] {
    return this.trackedEvents.filter((e) => e.name === name);
  }

  /** Helper: verifica se um evento foi emitido */
  hasEvent(name: OnboardingAnalyticsEvent['name']): boolean {
    return this.trackedEvents.some((e) => e.name === name);
  }
}
