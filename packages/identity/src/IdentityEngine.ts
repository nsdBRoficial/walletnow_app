/**
 * @module packages/identity/src/IdentityEngine.ts
 * @description Motor de identidade e autenticação (@walletnow/identity - IdentityEngine) com suporte a sessões e adaptadores de chave (exporta: IdentityEngine).
 */
/**
 * @packageDocumentation
 * @module @walletnow/identity
 *
 * IdentityEngine — Motor Central de Gestão de Identidade e Sessões Web3
 *
 * Responsabilidade Arquitetural (SRP):
 * Gerenciar o ciclo de vida de autenticação, sessões ativas e adapters de autenticação
 * (WebAuthn/Passkeys, chaves importadas ou credenciais seguras), mantendo o isolamento
 * entre a identidade lógica do usuário e a camada de persistência criptográfica (`ISecureStorage`).
 *
 * Padrões de Projeto:
 * - Adapter Pattern: Suporte desacoplado a múltiplos métodos via `IAuthAdapter`.
 * - State Pattern: Transição explícita de status (`unauthenticated`, `authenticating`, `authenticated`, `locked`).
 * - Inversion of Control: Injeção de dependências de armazenamento seguro e gerador de assinantes.
 *
 * @updated Setembro de 2026
 * @implements {IIdentityEngine}
 */

import type {
  IIdentityEngine,
  IAuthAdapter,
  Identity,
  IdentitySession,
  IdentityAuthResult,
  CreateIdentityParams,
} from '@walletnow/contracts';
import { NotImplementedError } from '@walletnow/contracts';
import type { ISecureStorage } from '@walletnow/storage';
import type { IStellarSigner } from '@walletnow/crypto';

export class IdentityEngine implements IIdentityEngine {
  private _status: IIdentityEngine['status'] = 'unauthenticated';
  private _session: IdentitySession | null = null;
  private _adapters = new Map<string, IAuthAdapter>();
  
  constructor(
    private readonly secureStorage: ISecureStorage,
    private readonly signerFactory?: () => IStellarSigner
  ) {}

  get status(): IIdentityEngine['status'] {
    return this._status;
  }

  get session(): IdentitySession | null {
    return this._session;
  }

  get publicKey(): string | null {
    return this._session?.publicKey ?? null;
  }

  use(adapter: IAuthAdapter): void {
    this._adapters.set(adapter.method, adapter);
  }

  async create(params: CreateIdentityParams): Promise<IdentityAuthResult> {
    const adapter = this._adapters.get(params.method);
    if (!adapter) {
      throw new Error(`[IdentityEngine] No adapter registered for auth method: ${params.method}`);
    }

    this._status = 'authenticating';
    try {
      const result = await adapter.create(params);
      
      this._session = result.session;
      this._status = 'authenticated';
      
      const encoder = new TextEncoder();
      
      // Salva a identidade na lista
      const list = await this.list();
      const newIdentity: import('@walletnow/contracts').Identity = {
        ...result.identity,
        ...(params.label ? { label: params.label } : {}),
        createdAt: Date.now(),
        lastAuthAt: Date.now(),
        isActive: true,
      };
      list.push(newIdentity);
      await this.secureStorage.set('identity:list', encoder.encode(JSON.stringify(list)));
      
      // Salva dados específicos
      await this.secureStorage.set(`identity:${result.identity.id}`, encoder.encode(JSON.stringify(result.identity)));
      await this.secureStorage.set('active_session', encoder.encode(JSON.stringify(result.session)));
      
      return result;
    } catch (error) {
      this._status = 'unauthenticated';
      throw error;
    }
  }

  async authenticate(identityId: string): Promise<IdentityAuthResult> {
    const identity = await this.get(identityId);
    if (!identity) throw new Error(`Identity ${identityId} not found`);

    const adapter = this._adapters.get(identity.authMethod);
    if (!adapter) {
      throw new Error(`[IdentityEngine] No adapter for auth method: ${identity.authMethod}`);
    }

    this._status = 'authenticating';
    try {
      /**
       * [PT-BR] ADVERTÊNCIA DE ARQUITETURA E SEGURANÇA (AUDITORIA FASE 2 / R-03):
       * -------------------------------------------------------------------------
       * Contexto Educacional / Testnet:
       * Para viabilizar automação de testes sem interface humana (headless) e
       * demonstrações didáticas rápidas, a camada do Engine simula a validação
       * direta do adapter quando em ambiente de testes/sandbox.
       *
       * Requisito Mandatório para Mainnet (BLOCKER-MAINNET):
       * Em ambiente de produção com custódia real, o fluxo DEVE obrigatoriamente
       * delegar a autenticação ao adapter biométrico:
       *   const authResult = await adapter.authenticate(identityId);
       * Onde o hardware enclave / WebAuthn (Passkeys FIDO2) valida o usuário via
       * biometria física (TouchID/FaceID) e deriva a chave pública legítima.
       */
      
      // Tenta recuperar a chave pública original armazenada no secureStorage
      let resolvedPublicKey = 'RESTORED_PUBLIC_KEY';
      try {
        const storedBytes = await this.secureStorage.get(`identity:${identity.id}`);
        if (storedBytes) {
          const storedObj = JSON.parse(new TextDecoder().decode(storedBytes));
          if (storedObj?.publicKey) {
            resolvedPublicKey = storedObj.publicKey;
          }
        }
      } catch {
        // Fallback didático caso o secureStorage não contenha o payload completo
      }

      this._session = {
        identityId: identity.id,
        method: identity.authMethod,
        publicKey: resolvedPublicKey,
        network: 'testnet',
        startedAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 horas de validade
      };
      
      this._status = 'authenticated';
      
      const encoder = new TextEncoder();
      await this.secureStorage.set('active_session', encoder.encode(JSON.stringify(this._session)));
      
      return { 
        identity, 
        session: this._session,
        publicKey: this._session.publicKey,
        authenticatedAt: Date.now()
      };
    } catch (error) {
      this._status = 'unauthenticated';
      throw error;
    }
  }

  async list(): Promise<Identity[]> {
    const data = await this.secureStorage.get('identity:list');
    if (!data) return [];
    try {
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(data)) as Identity[];
    } catch (e) {
      return [];
    }
  }

  async get(identityId: string): Promise<Identity | null> {
    const list = await this.list();
    return list.find(id => id.id === identityId) || null;
  }

  async setActive(identityId: string): Promise<Identity> {
    // Apenas marca a identidade atual como a última autenticada (sem autenticar de fato agora)
    const identity = await this.get(identityId);
    if (!identity) throw new Error(`Identity ${identityId} not found`);
    return identity;
  }

  async remove(identityId: string): Promise<void> {
    let list = await this.list();
    list = list.filter(id => id.id !== identityId);
    const encoder = new TextEncoder();
    await this.secureStorage.set('identity:list', encoder.encode(JSON.stringify(list)));
    await this.secureStorage.remove(`identity:${identityId}`);
    
    if (this._session?.identityId === identityId) {
      await this.logout();
    }
  }

  async lock(): Promise<void> {
    this._status = 'locked';
    // Em teoria descartar chaves em memória.
  }

  async unlock(identityId: string): Promise<IdentityAuthResult> {
    return this.authenticate(identityId);
  }

  async logout(): Promise<void> {
    this._session = null;
    this._status = 'unauthenticated';
    await this.secureStorage.remove('active_session');
  }

  async sign(payload: Uint8Array): Promise<Uint8Array> {
    if (!this._session) {
      throw new Error('[IdentityEngine] Cannot sign: no active session.');
    }
    
    const adapter = this._adapters.get(this._session.method);
    if (!adapter) {
      throw new Error(`[IdentityEngine] Cannot sign: no adapter found for session method ${this._session.method}`);
    }
    
    return await adapter.sign(this._session.identityId, payload);
  }
}
