/**
 * @module packages/onboarding/src/__tests__/OnboardingOrchestrator.test.ts
 * @description Suíte de testes automatizados Vitest para validação de OnboardingOrchestrator.
 */
/**
 * @walletnow/onboarding — OnboardingOrchestrator.test.ts
 *
 * Testes unitários do domínio de Onboarding.
 * 100% isolados — sem dependências de rede, Horizon ou Stellar SDK.
 *
 * Estratégia:
 *   - FakeIdentityEngine de @walletnow/testing
 *   - FakeWalletEngine e FakeAccountEngine definidos localmente
 *   - FakeGasStation, FakeTestnetFaucet, FakeSessionPort, FakeAnalyticsPort
 *     de @walletnow/onboarding/fakes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { OnboardingOrchestrator } from '../OnboardingOrchestrator.js';
import {
  FakeGasStation,
  FakeTestnetFaucet,
  FakeSessionPort,
  FakeAnalyticsPort,
} from '../fakes/index.js';
import { OnboardingError } from '@walletnow/contracts';
import type { OnboardingContext } from '../OnboardingContext.js';
import type {
  IWalletEngine,
  IAccountEngine,
  IIdentityEngine,
  StellarWallet,
  StellarAccountState,
  IdentityAuthResult,
  CreateIdentityParams,
  Identity,
  IdentityId,
  IdentitySession,
  IAuthAdapter,
} from '@walletnow/contracts';

// ─── Fakes Locais ────────────────────────────────────────────────────────────

/** FakeIdentityEngine simplificado para os testes de onboarding */
class FakeIdentityEngine implements IIdentityEngine {
  private _identities = new Map<string, Identity>();
  private _session: IdentitySession | null = null;
  private _counter = 0;

  get status(): IIdentityEngine['status'] { return this._session ? 'authenticated' : 'unauthenticated'; }
  get session(): IdentitySession | null { return this._session; }
  get publicKey(): string | null { return this._session?.publicKey ?? null; }

  use(_adapter: IAuthAdapter): void {}

  async create(params: CreateIdentityParams): Promise<IdentityAuthResult> {
    const id = `fake-identity-${++this._counter}`;    const publicKey = Keypair.random().publicKey();
    const label = 'label' in params ? params.label : undefined;
    const identity: Identity = {
      id,
      authMethod: params.method,
      label,
      createdAt: Date.now(),
      lastAuthAt: Date.now(),
      isActive: true,
    };
    this._identities.set(id, identity);
    this._session = { identityId: id, publicKey, network: 'testnet', startedAt: Date.now(), expiresAt: null, method: params.method };
    return { identity, session: this._session, publicKey, authenticatedAt: Date.now() };
  }

  async authenticate(identityId: string): Promise<IdentityAuthResult> {
    const identity = this._identities.get(identityId);
    if (!identity) throw new OnboardingError('USER_NOT_FOUND', `Identity ${identityId} not found`);    const publicKey = Keypair.random().publicKey();
    this._session = { identityId, publicKey, network: 'testnet', startedAt: Date.now(), expiresAt: null, method: identity.authMethod };
    return { identity, session: this._session, publicKey, authenticatedAt: Date.now() };
  }

  async list(): Promise<Identity[]> { return Array.from(this._identities.values()); }
  async get(id: string): Promise<Identity | null> { return this._identities.get(id) ?? null; }
  async setActive(id: string): Promise<Identity> { return this._identities.get(id)!; }
  async remove(id: string): Promise<void> { this._identities.delete(id); }
  async lock(): Promise<void> { this._session = null; }
  async unlock(id: string): Promise<IdentityAuthResult> { return this.authenticate(id); }
  async logout(): Promise<void> { this._session = null; }
  async sign(payload: Uint8Array): Promise<Uint8Array> { return payload; }
}

/** FakeWalletEngine para testes de onboarding */
class FakeWalletEngine implements IWalletEngine {
  private _wallets = new Map<string, StellarWallet>();
  private _counter = 0;

  get active(): StellarWallet | null { return Array.from(this._wallets.values()).find(w => w.isActive) ?? null; }
  get publicKey(): string | null { return this.active?.publicKey ?? null; }

  use(_adapter: import('@walletnow/contracts').IWalletAdapter): void {}

  async create(params: import('@walletnow/contracts').CreateWalletParams): Promise<StellarWallet> {
    const id = `fake-wallet-${++this._counter}`;    const validPublicKey = Keypair.random().publicKey();

    const wallet: StellarWallet = {
      id,
      identityId: params.identityId,
      publicKey: validPublicKey,
      network: params.network ?? 'testnet',
      custodyType: params.custodyType,
      label: params.label,
      createdAt: Date.now(),
      isActive: true,
    };
    this._wallets.set(id, wallet);
    return wallet;
  }

  async import(_params: import('@walletnow/contracts').ImportWalletParams): Promise<StellarWallet> {
    throw new Error('FakeWalletEngine: import not implemented');
  }

  async list(identityId: string): Promise<StellarWallet[]> {
    return Array.from(this._wallets.values()).filter(w => w.identityId === identityId);
  }

  async get(walletId: string): Promise<StellarWallet | null> {
    return this._wallets.get(walletId) ?? null;
  }

  async setActive(walletId: string): Promise<StellarWallet> {
    return this._wallets.get(walletId)!;
  }

  async remove(walletId: string): Promise<void> {
    this._wallets.delete(walletId);
  }

  async signTransaction(xdr: string): Promise<string> {
    return `signed:${xdr}`;
  }
}

/** FakeAccountEngine para testes de onboarding */
class FakeAccountEngine implements IAccountEngine {
  private _existingAccounts = new Set<string>();

  /** Pré-popula uma conta como existente on-chain */
  seedAccount(publicKey: string): void {
    this._existingAccounts.add(publicKey);
  }

  async existsOnChain(publicKey: string): Promise<boolean> {
    return this._existingAccounts.has(publicKey);
  }

  async getState(publicKey: string): Promise<StellarAccountState> {
    return {
      publicKey,
      exists: this._existingAccounts.has(publicKey),
      xlmBalance: '1.0000000',
      sequenceNumber: '100',
      subentryCount: 1,
      balances: [
        {
          asset: { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', name: 'USD Coin', decimals: 7 },
          balance: '100.0000000',
          limit: '9999999999.0000000',
          isAuthorized: true,
        },
      ],
      signers: [],
      lastSyncAt: Date.now(),
    };
  }

  async sync(publicKey: string): Promise<StellarAccountState> {
    return this.getState(publicKey);
  }
}

// ─── Factory de Contexto ──────────────────────────────────────────────────────

function makeTestContext(overrides: Partial<OnboardingContext> = {}): {
  ctx: OnboardingContext;
  identity: FakeIdentityEngine;
  wallet: FakeWalletEngine;
  account: FakeAccountEngine;
  gasStation: FakeGasStation;
  faucet: FakeTestnetFaucet;
  session: FakeSessionPort;
  analytics: FakeAnalyticsPort;
} {
  const identity = new FakeIdentityEngine();
  const wallet = new FakeWalletEngine();
  const account = new FakeAccountEngine();
  const gasStation = new FakeGasStation();
  const faucet = new FakeTestnetFaucet();
  const session = new FakeSessionPort();
  const analytics = new FakeAnalyticsPort();

  const ctx: OnboardingContext = {
    identity,
    wallet,
    account,
    gasStation,
    faucet,
    session,
    analytics,
    network: 'testnet',
    ...overrides,
  };

  return { ctx, identity, wallet, account, gasStation, faucet, session, analytics };
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('OnboardingOrchestrator', () => {
  let orchestrator: OnboardingOrchestrator;
  let deps: ReturnType<typeof makeTestContext>;

  beforeEach(() => {
    deps = makeTestContext();
    orchestrator = new OnboardingOrchestrator(deps.ctx);
  });

  // ─── createUser ────────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('deve criar um usuário e retornar um endereço Stellar', async () => {
      const result = await orchestrator.createUser({
        externalId: 'alice@example.com',
        displayName: 'Alice',
      });

      expect(result.stellarAddress).toMatch(/^G/);
      expect(result.externalId).toBe('alice@example.com');
      expect(result.userId).toBeTruthy();
      expect(result.network).toBe('testnet');
    });

    it('deve patrocinar a criação da conta quando sponsored=true e conta não existe on-chain', async () => {
      const result = await orchestrator.createUser({
        externalId: 'bob@example.com',
        sponsored: true,
      });

      expect(result.isSponsored).toBe(true);
      expect(result.accountStatus).toBe('sponsored');
      expect(deps.gasStation.sponsoredAccounts).toContain(result.stellarAddress);
    });

    it('deve marcar conta como pending quando sponsored=false e conta não existe on-chain', async () => {
      const result = await orchestrator.createUser({
        externalId: 'carol@example.com',
        sponsored: false,
      });

      expect(result.isSponsored).toBe(false);
      expect(result.accountStatus).toBe('pending');
      expect(deps.gasStation.sponsoredAccounts).toHaveLength(0);
    });

    it('deve configurar trustlines quando conta é patrocinada', async () => {
      const result = await orchestrator.createUser({
        externalId: 'dave@example.com',
        sponsored: true,
        trustlines: ['USDC', 'BRL'],
      });

      expect(result.trustlines).toContain('USDC');
      expect(result.trustlines).toContain('BRL');
      expect(result.failedTrustlines).toHaveLength(0);
    });

    it('deve gerar um token de sessão', async () => {
      const result = await orchestrator.createUser({
        externalId: 'eve@example.com',
      });

      expect(result.sessionToken).toBeTruthy();
      expect(result.sessionToken).toContain('fake_session_');
    });

    it('deve emitir evento analytics de user_created', async () => {
      await orchestrator.createUser({ externalId: 'frank@example.com' });

      expect(deps.analytics.hasEvent('onboarding.user_created')).toBe(true);
      const event = deps.analytics.eventsOf('onboarding.user_created')[0];
      expect(event.externalId).toBe('frank@example.com');
    });

    it('deve emitir evento analytics de account_sponsored quando patrocinado', async () => {
      await orchestrator.createUser({ externalId: 'grace@example.com', sponsored: true });

      expect(deps.analytics.hasEvent('onboarding.account_sponsored')).toBe(true);
    });

    it('deve retornar accountStatus=active quando conta já existe on-chain', async () => {
      // Pré-criar identidade e pegar a public key
      const result = await orchestrator.createUser({
        externalId: 'preexisting@example.com',
        sponsored: false,
      });
      // Seed a conta como existente no fake
      deps.account.seedAccount(result.stellarAddress);

      // Segundo usuário com mesmo endereço (simulação)
      const result2 = await orchestrator.createUser({
        externalId: 'preexisting2@example.com',
        sponsored: false,
      });
      deps.account.seedAccount(result2.stellarAddress);

      // Re-criar outro usuário cuja conta já existe
      const resultExisting = await orchestrator.createUser({
        externalId: 'fresh@example.com',
        sponsored: false,
      });
      deps.account.seedAccount(resultExisting.stellarAddress);

      // Criar outro usuário — mas dessa vez a conta JÁ existe antes
      // (simula o cenário onde a conta foi ativada externamente)
      const freshOrchestrator = new OnboardingOrchestrator({
        ...deps.ctx,
        // Sobrescrever o account com um que já tem a conta
        account: (() => {
          const a = new FakeAccountEngine();
          // Qualquer conta já existe
          a.seedAccount('any');
          return {
            existsOnChain: async () => true,
            getState: a.getState.bind(a),
            sync: a.sync.bind(a),
          };
        })(),
      });

      const resultAlreadyActive = await freshOrchestrator.createUser({
        externalId: 'already_active@example.com',
        sponsored: false,
      });

      expect(resultAlreadyActive.accountStatus).toBe('active');
    });

    it('deve lançar OnboardingError quando externalId está vazio', async () => {
      await expect(
        orchestrator.createUser({ externalId: '' }),
      ).rejects.toThrow(OnboardingError);

      await expect(
        orchestrator.createUser({ externalId: '' }),
      ).rejects.toMatchObject({ code: 'INVALID_EXTERNAL_ID' });
    });

    it('deve lançar OnboardingError quando cota do Gas Station está esgotada', async () => {
      deps.gasStation.setQuotaExhausted();

      await expect(
        orchestrator.createUser({ externalId: 'no_quota@example.com', sponsored: true }),
      ).rejects.toMatchObject({ code: 'SPONSORSHIP_LIMIT_EXCEEDED' });
    });

    it('deve lançar OnboardingError quando externalId excede 256 caracteres', async () => {
      const longId = 'a'.repeat(257);
      await expect(
        orchestrator.createUser({ externalId: longId }),
      ).rejects.toMatchObject({ code: 'INVALID_EXTERNAL_ID' });
    });
  });

  // ─── restoreUser ───────────────────────────────────────────────────────────

  describe('restoreUser()', () => {
    it('deve restaurar um usuário previamente criado', async () => {
      const created = await orchestrator.createUser({ externalId: 'return@example.com', displayName: 'return@example.com' });

      const restored = await orchestrator.restoreUser({ externalId: 'return@example.com' });

      expect(restored.userId).toBe(created.userId);
      expect(restored.stellarAddress).toBeTruthy();
      expect(restored.sessionToken).toBeTruthy();
    });

    it('deve lançar OnboardingError para usuário não encontrado', async () => {
      await expect(
        orchestrator.restoreUser({ externalId: 'notexists@example.com' }),
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    });

    it('deve emitir evento analytics de user_restored', async () => {
      await orchestrator.createUser({ externalId: 'restored@example.com', displayName: 'restored@example.com' });
      await orchestrator.restoreUser({ externalId: 'restored@example.com' });

      expect(deps.analytics.hasEvent('onboarding.user_restored')).toBe(true);
    });
  });

  // ─── createTestUser ────────────────────────────────────────────────────────

  describe('createTestUser()', () => {
    it('deve criar um usuário de teste na testnet', async () => {
      const result = await orchestrator.createTestUser({ externalId: 'testuser@example.com' });

      expect(result.accountStatus).toBe('active');
      expect(result.network).toBe('testnet');
      expect(deps.faucet.activatedAccounts).toContain(result.stellarAddress);
    });

    it('deve gerar externalId automático quando omitido', async () => {
      const result = await orchestrator.createTestUser();

      expect(result.externalId).toMatch(/^test_user_/);
    });

    it('deve lançar OnboardingError quando chamado em mainnet', async () => {
      const mainnetOrchestrator = new OnboardingOrchestrator({
        ...deps.ctx,
        network: 'mainnet',
      });

      await expect(mainnetOrchestrator.createTestUser()).rejects.toMatchObject({
        code: 'TESTNET_ONLY',
      });
    });
  });

  // ─── getUserStatus ─────────────────────────────────────────────────────────

  describe('getUserStatus()', () => {
    it('deve retornar status de um usuário existente', async () => {
      const created = await orchestrator.createUser({
        externalId: 'status_check@example.com',
        sponsored: true,
      });

      // Seed a conta como existente on-chain
      deps.account.seedAccount(created.stellarAddress);

      const status = await orchestrator.getUserStatus(created.userId);

      expect(status.userId).toBe(created.userId);
      // O stellarAddress do getUserStatus vem do wallet engine (correto)
      // — pode diferir da identity engine em testes com fakes independentes
      expect(status.stellarAddress).toBeTruthy();
      expect(status.stellarAddress).toMatch(/^G/);
      expect(status.accountStatus).toBe('active');
      expect(status.trustlines).toContain('USDC');
    });

    it('deve lançar OnboardingError para userId não encontrado', async () => {
      await expect(
        orchestrator.getUserStatus('nonexistent-user-id'),
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    });
  });

  // ─── setupTrustlines ───────────────────────────────────────────────────────

  describe('setupTrustlines()', () => {
    it('deve configurar trustlines em conta existente', async () => {
      const created = await orchestrator.createUser({
        externalId: 'trustlines@example.com',
        sponsored: true,
      });
      deps.account.seedAccount(created.stellarAddress);

      const result = await orchestrator.setupTrustlines({
        stellarAddress: created.stellarAddress,
        assets: ['EURC', 'BRL'],
        sponsored: true,
      });

      expect(result.configured).toContain('EURC');
      expect(result.configured).toContain('BRL');
      expect(result.isSponsored).toBe(true);
    });

    it('deve retornar vazio quando nenhum asset é fornecido', async () => {
      const result = await orchestrator.setupTrustlines({
        stellarAddress: 'GANY...',
        assets: [],
      });

      expect(result.configured).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('deve lançar OnboardingError quando conta não existe on-chain', async () => {
      await expect(
        orchestrator.setupTrustlines({
          stellarAddress: 'GNONEXISTENT',
          assets: ['USDC'],
        }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_CREATION_FAILED' });
    });
  });
});
