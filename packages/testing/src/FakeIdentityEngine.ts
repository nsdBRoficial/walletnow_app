/**
 * @module packages/testing/src/FakeIdentityEngine.ts
 * @description Fakes e utilitários de teste (@walletnow/testing - FakeIdentityEngine) para validação determinística em memória (exporta: FAKE_PUBLIC_KEY, FAKE_IDENTITY_ID, FakeIdentityEngine).
 */
/**
 * @packageDocumentation
 * @module @walletnow/testing
 *
 * FakeIdentityEngine — Dublê de Testes de Primeira Classe para Identidade
 *
 * Propósito na Arquitetura (Test Double / In-Memory Mock):
 * Permitir que testes unitários e de integração de ponta a ponta simulem o comportamento
 * do motor de identidade do WalletNow OS com fidelidade de 100%, sem exigir dispositivos
 * físicos de biometria (WebAuthn / Passkeys), chaves reais ou conexão de rede.
 *
 * Benefícios para DX (Developer Experience):
 * - Execução determinística e instantânea de testes no Vitest / CI.
 * - Testabilidade de cenários de sucesso, erro, bloqueio de cofre e expiração de sessão.
 *
 * @updated Setembro de 2026
 * @implements {IIdentityEngine}
 */

import type {
  IIdentityEngine,
  IAuthAdapter,
  Identity,
  IdentityId,
  IdentitySession,
  IdentityAuthResult,
  CreateIdentityParams,
} from '@walletnow/contracts';
import { IdentityError } from '@walletnow/contracts';

/** Public key padrão usada pelo FakeIdentityEngine em testes */
export const FAKE_PUBLIC_KEY = 'GFAKESTELLARPUBLICKEY1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const FAKE_IDENTITY_ID = 'fake-identity-id-001';

function makeSession(identityId: IdentityId, publicKey: string): IdentitySession {
  return {
    identityId,
    publicKey,
    network: 'testnet',
    startedAt: Date.now(),
    expiresAt: null,
    method: 'keypair',
  };
}

function makeIdentity(id: IdentityId, params: CreateIdentityParams): Identity {
  return {
    id,
    authMethod: params.method,
    ...(params.label !== undefined ? { label: params.label } : {}),
    createdAt: Date.now(),
    lastAuthAt: Date.now(),
    isActive: true,
  };
}

function makeAuthResult(identity: Identity, publicKey: string): IdentityAuthResult {
  return {
    identity,
    session: makeSession(identity.id, publicKey),
    publicKey,
    authenticatedAt: Date.now(),
  };
}

export class FakeIdentityEngine implements IIdentityEngine {
  private _identities = new Map<IdentityId, Identity>();
  private _session: IdentitySession | null = null;
  private _status: IIdentityEngine['status'] = 'unauthenticated';
  private _counter = 0;

  // ─── Estado ────────────────────────────────────────────────────────────────

  get status(): IIdentityEngine['status'] { return this._status; }
  get session(): IdentitySession | null { return this._session; }
  get publicKey(): string | null { return this._session?.publicKey ?? null; }

  // ─── Adapters ──────────────────────────────────────────────────────────────

  use(_adapter: IAuthAdapter): void {
    // Fake ignora adapters — simula qualquer método
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async create(params: CreateIdentityParams): Promise<IdentityAuthResult> {
    const id = `fake-identity-${++this._counter}`;
    const publicKey = `GFAKE${id.toUpperCase().replace(/-/g, '')}`;
    const identity = makeIdentity(id, params);
    this._identities.set(id, identity);
    this._session = makeSession(id, publicKey);
    this._status = 'authenticated';
    return makeAuthResult(identity, publicKey);
  }

  async authenticate(identityId: IdentityId): Promise<IdentityAuthResult> {
    const identity = this._identities.get(identityId);
    if (!identity) throw new IdentityError('IDENTITY_NOT_FOUND', `Identity '${identityId}' não encontrada.`);
    const publicKey = `GFAKE${identityId.toUpperCase().replace(/-/g, '')}`;
    this._session = makeSession(identityId, publicKey);
    this._status = 'authenticated';
    return makeAuthResult(identity, publicKey);
  }

  async list(): Promise<Identity[]> {
    return Array.from(this._identities.values());
  }

  async get(identityId: IdentityId): Promise<Identity | null> {
    return this._identities.get(identityId) ?? null;
  }

  async setActive(identityId: IdentityId): Promise<Identity> {
    const identity = this._identities.get(identityId);
    if (!identity) throw new IdentityError('IDENTITY_NOT_FOUND', `Identity '${identityId}' não encontrada.`);
    return identity;
  }

  async remove(identityId: IdentityId): Promise<void> {
    if (!this._identities.has(identityId)) {
      throw new IdentityError('IDENTITY_NOT_FOUND', `Identity '${identityId}' não encontrada.`);
    }
    this._identities.delete(identityId);
  }

  // ─── Session ───────────────────────────────────────────────────────────────

  async lock(): Promise<void> {
    this._status = 'locked';
  }

  async unlock(identityId: IdentityId): Promise<IdentityAuthResult> {
    return this.authenticate(identityId);
  }

  async logout(): Promise<void> {
    this._session = null;
    this._status = 'unauthenticated';
  }

  // ─── Signing ───────────────────────────────────────────────────────────────

  async sign(payload: Uint8Array): Promise<Uint8Array> {
    if (this._status !== 'authenticated') {
      throw new IdentityError('SESSION_NOT_FOUND', 'Nenhuma sessão ativa para assinar.');
    }
    // Fake signature: inverte os bytes (determinístico para testes)
    return new Uint8Array(payload).reverse();
  }

  // ─── Test Helpers ──────────────────────────────────────────────────────────

  /** Pré-popula uma identity para cenários de teste */
  seedIdentity(id: IdentityId, overrides?: Partial<Identity>): Identity {
    const identity: Identity = {
      id,
      authMethod: 'keypair',
      createdAt: Date.now(),
      lastAuthAt: Date.now(),
      isActive: true,
      ...overrides,
    };
    this._identities.set(id, identity);
    return identity;
  }

  /** Reseta completamente o estado do engine */
  reset(): void {
    this._identities.clear();
    this._session = null;
    this._status = 'unauthenticated';
    this._counter = 0;
  }
}
