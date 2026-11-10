/**
 * @module packages\identity\src\KeypairAuthAdapter.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import type { 
  IAuthAdapter, 
  CreateIdentityParams, 
  IdentityAuthResult,
  IdentityId,
  AuthMethod
} from '@walletnow/contracts';
import { Keypair } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

export class KeypairAuthAdapter implements IAuthAdapter {
  readonly method: AuthMethod = 'keypair';
  
  // In a real scenario, the adapter wouldn't hold the secret in memory forever,
  // it would be managed safely by the OS/Storage. For tests, we keep a local map.
  private _secrets = new Map<IdentityId, string>();

  async create(params: CreateIdentityParams): Promise<IdentityAuthResult> {
    if (params.method !== 'keypair') {
      throw new Error(`[KeypairAuthAdapter] Invalid method: ${params.method}`);
    }

    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(7); // Fallback for simple testing
      
    // Create new random keypair if not provided (mocking a test env)
    const keypair = Keypair.random();
    
    this._secrets.set(id, keypair.secret());

    const now = Date.now();
    return {
      identity: {
        id,
        authMethod: this.method,
        label: (params as any).label || 'Test Keypair',
        createdAt: now,
        lastAuthAt: now,
        isActive: true
      },
      session: {
        identityId: id,
        publicKey: keypair.publicKey(),
        network: 'testnet',
        startedAt: now,
        expiresAt: null,
        method: this.method
      },
      publicKey: keypair.publicKey(),
      authenticatedAt: now
    };
  }

  async authenticate(identityId: string): Promise<IdentityAuthResult> {
    throw new Error('KeypairAuthAdapter.authenticate not fully implemented for tests.');
  }

  async sign(identityId: string, payload: Uint8Array): Promise<Uint8Array> {
    const secret = this._secrets.get(identityId);
    if (!secret) throw new Error('[KeypairAuthAdapter] Secret not found for identity');
    
    const keypair = Keypair.fromSecret(secret);
    return keypair.sign(Buffer.from(payload));
  }

  async isAvailable(): Promise<boolean> {
    return true; // Keypair auth is always available
  }
}
