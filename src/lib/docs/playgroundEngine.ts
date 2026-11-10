/**
 * @module src\lib\docs\playgroundEngine.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — PlaygroundEngine
 *
 * Motor que simula o fluxo REAL do SDK usando os Fakes do @walletnow/onboarding.
 * O código apresentado no playground é idêntico ao que um builder usaria em produção.
 * A única diferença são os ports — que usam Fakes em vez de implementações reais.
 *
 * NOTA: Usa simulação de timing para dar feedback visual step-a-step.
 * O `createUser` real é chamado em paralelo com as animações de UI.
 */

// ─── Tipo local (espelha @walletnow/contracts UserOnboardingResult) ──────────

export interface UserOnboardingResult {
  readonly userId: string;
  readonly externalId: string;
  readonly stellarAddress: string;
  readonly network: 'testnet' | 'mainnet';
  readonly isSponsored: boolean;
  readonly trustlines: string[];
  readonly failedTrustlines: string[];
  readonly authMethod: 'keypair' | 'passkey';
  readonly accountStatus: 'active' | 'pending' | 'sponsored' | 'error';
  readonly createdAt: number;
  readonly sessionToken: string;
}


// ─── Tipos públicos do Playground ────────────────────────────────────────────

export type PlaygroundStepId =
  | 'init'
  | 'identity'
  | 'wallet'
  | 'account'
  | 'sponsor'
  | 'trustlines'
  | 'session';

export type PlaygroundStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface PlaygroundStep {
  id: PlaygroundStepId;
  label: string;
  detail?: string;
  status: PlaygroundStepStatus;
  durationMs?: number;
}

export interface PlaygroundParams {
  externalId: string;
  displayName?: string;
  trustlines: string[];
  sponsored: boolean;
  network: 'testnet' | 'mainnet';
}

export interface PlaygroundResult {
  success: boolean;
  result?: UserOnboardingResult;
  error?: string;
  totalMs: number;
}

export type PlaygroundProgressHandler = (steps: PlaygroundStep[]) => void;

// ─── Labels padrão (EN) ──────────────────────────────────────────────────────

export const DEFAULT_STEP_LABELS: Record<PlaygroundStepId, string> = {
  init: 'Booting WalletNow OS',
  identity: 'Creating identity (keypair)',
  wallet: 'Deriving Stellar wallet',
  account: 'Checking on-chain status',
  sponsor: 'Gas Station sponsoring account',
  trustlines: 'Configuring trustlines',
  session: 'Creating session token',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(min: number, max: number): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

/** Gera um Stellar address fake (mesmo formato: G + 55 chars base32) */
function fakeAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let addr = 'G';
  for (let i = 0; i < 55; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

/** Gera um userId UUID-like */
function fakeUserId(): string {
  return 'wn_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

/** Gera um session token fake */
function fakeSessionToken(): string {
  return 'wn_sess_' + Math.random().toString(36).slice(2, 18) + Math.random().toString(36).slice(2, 10);
}

// ─── PlaygroundEngine ─────────────────────────────────────────────────────────

import { WalletNowClient } from '@walletnow/sdk';
import {
  PlaygroundIdentityEngine,
  PlaygroundWalletEngine,
  PlaygroundAccountEngine,
  PlaygroundGasStation,
  PlaygroundTestnetFaucet,
  PlaygroundSessionPort,
  PlaygroundAnalyticsPort,
} from './playgroundFakes';

export class PlaygroundEngine {
  private _steps: PlaygroundStep[] = [];
  private _onProgress: PlaygroundProgressHandler = () => {};

  onProgress(handler: PlaygroundProgressHandler): this {
    this._onProgress = handler;
    return this;
  }

  async run(
    params: PlaygroundParams,
    stepLabels: Record<PlaygroundStepId, string> = DEFAULT_STEP_LABELS,
  ): Promise<PlaygroundResult> {
    const startTime = performance.now();

    this._steps = (Object.keys(DEFAULT_STEP_LABELS) as PlaygroundStepId[]).map((id) => ({
      id,
      label: stepLabels[id] ?? DEFAULT_STEP_LABELS[id],
      status: 'pending' as const,
    }));
    this._emit();

    const updateStep = (id: PlaygroundStepId, status: PlaygroundStepStatus) => {
      this._setStatus(id, status);
      this._emit();
    };

    try {
      updateStep('init', 'running');
      
      // REAL SDK INIT com Fakes reais conectando na rede Stellar Testnet
      const wn = await WalletNowClient.init({
        network: params.network,
        engines: {
          identity: new PlaygroundIdentityEngine(updateStep),
          wallet: new PlaygroundWalletEngine(updateStep),
          account: new PlaygroundAccountEngine(updateStep),
          gasStation: new PlaygroundGasStation(updateStep) as any,
          faucet: new PlaygroundTestnetFaucet(updateStep) as any,
          session: new PlaygroundSessionPort(updateStep) as any,
          analytics: new PlaygroundAnalyticsPort() as any,
        },
      });
      
      updateStep('init', 'done');

      // Chamada real ao SDK. Cada engine disparará o updateStep de acordo com o progresso real.
      const realResult = await wn.onboarding.createUser({
        externalId: params.externalId,
        authMethod: 'keypair',
        sponsored: params.sponsored,
        trustlines: params.trustlines,
      });

      // Garante que todas as etapas foram devidamente concluídas
      (Object.keys(DEFAULT_STEP_LABELS) as PlaygroundStepId[]).forEach((id) => {
        const step = this._steps.find(s => s.id === id);
        if (step && step.status !== 'done') {
          updateStep(id, 'done');
        }
      });

      const totalMs = Math.round(performance.now() - startTime);
      return { success: true, result: realResult as any, totalMs };
    } catch (err) {
      const runningStep = this._steps.find(s => s.status === 'running');
      if (runningStep) {
        updateStep(runningStep.id, 'error');
      }
      const totalMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: (err as Error).message,
        totalMs,
      };
    }
  }

  private _setStatus(id: PlaygroundStepId, status: PlaygroundStepStatus): void {
    this._steps = this._steps.map((s) => (s.id === id ? { ...s, status } : s));
  }

  private _emit(): void {
    this._onProgress([...this._steps]);
  }
}

// ─── Gerador de código ────────────────────────────────────────────────────────

export function generatePlaygroundCode(params: PlaygroundParams): string {
  const trustlinesStr =
    params.trustlines.length > 0
      ? `['${params.trustlines.join("', '")}']`
      : '[]';

  return `import { WalletNow } from '@walletnow/sdk';

const wn = await WalletNow.init({
  apiKey: 'wn_test_your_key_here',
  network: '${params.network}',
});

const user = await wn.onboarding.createUser({
  externalId: '${params.externalId}',${params.displayName ? `\n  displayName: '${params.displayName}',` : ''}
  trustlines: ${trustlinesStr},
  sponsored: ${params.sponsored},
});

console.log(user.stellarAddress); // ${params.sponsored ? 'GABC... (sponsored, no XLM needed)' : 'GABC...'}
console.log(user.sessionToken);   // wn_sess_...
console.log(user.isSponsored);    // ${params.sponsored}`;
}
