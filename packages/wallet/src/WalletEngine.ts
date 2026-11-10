/**
 * @module packages\wallet\src\WalletEngine.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/wallet — WalletEngine (Stub)
 *
 * Implementação principal do Wallet Engine.
 * Responsável por gerenciar Wallets Stellar (Self-custody ou Watch-only).
 */

import type {
  IWalletEngine,
  IWalletAdapter,
  StellarWallet,
  WalletId,
  CreateWalletParams,
  ImportWalletParams,
  IdentityId,
} from '@walletnow/contracts';
import { NotImplementedError } from '@walletnow/contracts';
import type { ISecureStorage } from '@walletnow/storage';
import type { IIdentityEngine } from '@walletnow/contracts';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

export class WalletEngine implements IWalletEngine {
  private _active: StellarWallet | null = null;
  private _adapters = new Map<string, IWalletAdapter>();

  constructor(
    private readonly secureStorage: ISecureStorage,
    private readonly identity: IIdentityEngine
  ) {}

  get active(): StellarWallet | null {
    return this._active;
  }

  get publicKey(): string | null {
    return this._active?.publicKey ?? null;
  }

  use(adapter: IWalletAdapter): void {
    this._adapters.set(adapter.custodyType, adapter);
  }

  async create(params: CreateWalletParams): Promise<StellarWallet> {
    const keypair = Keypair.random();
    const walletId = `wallet_${Date.now()}`;
    const wallet: StellarWallet = {
      id: walletId,
      identityId: params.identityId,
      publicKey: keypair.publicKey(),
      network: params.network ?? 'testnet',
      custodyType: params.custodyType,
      createdAt: Date.now(),
      isActive: true
    };
    
    if (params.label) {
      Object.assign(wallet, { label: params.label });
    }
    
    const encoder = new TextEncoder();
    await this.secureStorage.set(`wallet:${walletId}`, encoder.encode(JSON.stringify(wallet)));
    await this.secureStorage.set(`wallet_secret:${walletId}`, encoder.encode(keypair.secret()));
    
    // Store index of wallets per identity
    const identityWalletsStr = await this.secureStorage.get(`wallets_by_identity:${params.identityId}`);
    const identityWallets: string[] = identityWalletsStr ? JSON.parse(new TextDecoder().decode(identityWalletsStr)) : [];
    identityWallets.push(walletId);
    await this.secureStorage.set(`wallets_by_identity:${params.identityId}`, encoder.encode(JSON.stringify(identityWallets)));
    
    this._active = wallet;
    return wallet;
  }

  async import(params: ImportWalletParams): Promise<StellarWallet> {
    const keypair = Keypair.fromSecret(params.secretOrMnemonic);
    const walletId = `wallet_${Date.now()}`;
    const wallet: StellarWallet = {
      id: walletId,
      identityId: params.identityId,
      publicKey: keypair.publicKey(),
      network: params.network ?? 'testnet',
      custodyType: 'self-custody',
      createdAt: Date.now(),
      isActive: true
    };
    
    if (params.label) Object.assign(wallet, { label: params.label });
    
    const encoder = new TextEncoder();
    await this.secureStorage.set(`wallet:${walletId}`, encoder.encode(JSON.stringify(wallet)));
    await this.secureStorage.set(`wallet_secret:${walletId}`, encoder.encode(keypair.secret()));
    
    const identityWalletsStr = await this.secureStorage.get(`wallets_by_identity:${params.identityId}`);
    const identityWallets: string[] = identityWalletsStr ? JSON.parse(new TextDecoder().decode(identityWalletsStr)) : [];
    identityWallets.push(walletId);
    await this.secureStorage.set(`wallets_by_identity:${params.identityId}`, encoder.encode(JSON.stringify(identityWallets)));
    
    this._active = wallet;
    return wallet;
  }

  async list(identityId: IdentityId): Promise<StellarWallet[]> {
    const identityWalletsStr = await this.secureStorage.get(`wallets_by_identity:${identityId}`);
    if (!identityWalletsStr) return [];
    const walletIds: string[] = JSON.parse(new TextDecoder().decode(identityWalletsStr));
    
    const wallets: StellarWallet[] = [];
    for (const id of walletIds) {
      const wStr = await this.secureStorage.get(`wallet:${id}`);
      if (wStr) {
        wallets.push(JSON.parse(new TextDecoder().decode(wStr)));
      }
    }
    return wallets;
  }

  async get(walletId: WalletId): Promise<StellarWallet | null> {
    const wStr = await this.secureStorage.get(`wallet:${walletId}`);
    if (!wStr) return null;
    return JSON.parse(new TextDecoder().decode(wStr));
  }

  async setActive(walletId: WalletId): Promise<StellarWallet> {
    const wallet = await this.get(walletId);
    if (!wallet) throw new Error(`Wallet ${walletId} not found`);
    this._active = wallet;
    return wallet;
  }

  async remove(walletId: WalletId): Promise<void> {
    const wallet = await this.get(walletId);
    if (!wallet) return;
    
    const identityWalletsStr = await this.secureStorage.get(`wallets_by_identity:${wallet.identityId}`);
    if (identityWalletsStr) {
      let identityWallets: string[] = JSON.parse(new TextDecoder().decode(identityWalletsStr));
      identityWallets = identityWallets.filter(id => id !== walletId);
      const encoder = new TextEncoder();
      await this.secureStorage.set(`wallets_by_identity:${wallet.identityId}`, encoder.encode(JSON.stringify(identityWallets)));
    }
    
    await this.secureStorage.remove(`wallet:${walletId}`);
    await this.secureStorage.remove(`wallet_secret:${walletId}`);
    
    if (this._active?.id === walletId) {
      this._active = null;
    }
  }

  async signTransaction(xdr: string): Promise<string> {
    if (!this._active) throw new Error('No active wallet to sign transaction');
    
    const secretBytes = await this.secureStorage.get(`wallet_secret:${this._active.id}`);
    if (!secretBytes) throw new Error('Secret key not found for active wallet');
    
    const secret = new TextDecoder().decode(secretBytes);
    const keypair = Keypair.fromSecret(secret);
    
    // Assumindo Testnet para este ambiente de testes. Numa implementação final, 
    // a network seria injetada baseada na configuração.
    const networkPassphrase = this._active.network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
    
    const tx = new Transaction(xdr, networkPassphrase);
    tx.sign(keypair);
    
    return tx.toXDR();
  }
}
