/**
 * @module packages/wallet/src/AccountEngine.ts
 * @description Motor de carteiras e contas Stellar (@walletnow/wallet - AccountEngine) — gestão de trustlines, saldos e submissão XDR (exporta: AccountEngine).
 */
/**
 * @walletnow/wallet — AccountEngine (Stub)
 *
 * Implementação principal do Account Engine.
 * Responsável por buscar o estado on-chain das contas via Horizon.
 */

import type { IAccountEngine, StellarAccountState } from '@walletnow/contracts';
import { NotImplementedError } from '@walletnow/contracts';
import type { IStorage } from '@walletnow/storage';
import { Horizon } from '@stellar/stellar-sdk';

export class AccountEngine implements IAccountEngine {
  private server: Horizon.Server;

  constructor(
    private readonly horizonUrl: string,
    private readonly cache?: IStorage
  ) {
    this.server = new Horizon.Server(this.horizonUrl);
  }

  async existsOnChain(publicKey: string): Promise<boolean> {
    try {
      await this.server.loadAccount(publicKey);
      return true;
    } catch (e: any) {
      if (e.response && e.response.status === 404) return false;
      throw e;
    }
  }

  async getState(publicKey: string): Promise<StellarAccountState> {
    try {
      const acc = await this.server.loadAccount(publicKey);
      return {
        publicKey,
        exists: true,
        xlmBalance: acc.balances.find(b => b.asset_type === 'native')?.balance || '0',
        sequenceNumber: acc.sequenceNumber(),
        subentryCount: acc.subentry_count,
        balances: acc.balances.map(b => ({
          asset: {
            code: b.asset_type === 'native' ? 'XLM' : (b as any).asset_code,
            issuer: b.asset_type === 'native' ? null : (b as any).asset_issuer,
            network: 'testnet',
            name: b.asset_type === 'native' ? 'Stellar Lumens' : (b as any).asset_code,
            decimals: 7
          },
          balance: b.balance,
          limit: (b as any).limit,
          isAuthorized: (b as any).is_authorized
        })),
        signers: acc.signers.map(s => ({
          publicKey: s.key,
          weight: s.weight,
          type: s.type as any
        })),
        lastSyncAt: Date.now()
      };
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
        return {
          publicKey,
          exists: false,
          xlmBalance: '0',
          sequenceNumber: '0',
          subentryCount: 0,
          balances: [],
          signers: [],
          lastSyncAt: Date.now()
        };
      }
      throw e;
    }
  }

  async sync(publicKey: string): Promise<StellarAccountState> {
    return this.getState(publicKey);
  }
}
