/**
 * @module src/lib/docs/playgroundFakes.ts
 * @description Módulo src/lib/docs/playgroundFakes.ts do ecossistema WalletNow OS (exporta: server, BRW_KEYPAIR, USDW_KEYPAIR, BRW_ISSUER).
 */
import type {
  IIdentityEngine,
  IWalletEngine,
  IAccountEngine,
  Identity,
  IdentitySession,
  IdentityAuthResult,
  CreateIdentityParams,
  StellarWallet,
  StellarAccountState,
} from '@walletnow/contracts';
import { Keypair, Horizon, TransactionBuilder, Asset, Operation } from '@stellar/stellar-sdk';
import type { PlaygroundStepId, PlaygroundStepStatus } from './playgroundEngine';

// Horizon Server apontando para Stellar Testnet
export const server = new Horizon.Server('https://horizon-testnet.stellar.org');

// Emissores de desenvolvimento fixos e persistentes na Stellar Testnet
export const BRW_KEYPAIR = Keypair.fromSecret('SDW6MDSQADPIALPY5SAHQTEXPLTIZQC2YIJGSG3ZLPUKZ6YLVYLS7ZUA');
export const USDW_KEYPAIR = Keypair.fromSecret('SBALCQUATVXGHPPMXUIE3HHKTCGELQZI74YSCKQ2WZR43HA5EBTMPOGO');

export const BRW_ISSUER = 'GCJIRFZQJAO6JSYS4YFXFHLVJ6R4WWWB2VTREMRK7WXNNLMGIAXBBNC6';
export const USDW_ISSUER = 'GDKZT3AXAOMMYVVG3TKFVUYDJODAIAL2ADHNJYQLK2PJQ6CE2U6KKFLQ';

// Chave determinística fixa para a conta do DeFi Vault na Testnet
const vaultSeed = new Uint8Array(32);
vaultSeed.set([119, 97, 108, 108, 101, 116, 110, 111, 119, 45, 118, 97, 117, 108, 116]); // "walletnow-vault"
export const VAULT_KEYPAIR = Keypair.fromRawEd25519Seed(vaultSeed);
export const VAULT_ADDRESS = VAULT_KEYPAIR.publicKey();

let brwIssuerActivated = false;
let usdwIssuerActivated = false;

// Função auxiliar para garantir que a conta emissora foi ativada pelo Friendbot na testnet
export async function ensureIssuerActive(assetCode: string) {
  if (assetCode === 'BRW' && brwIssuerActivated) return;
  if (assetCode === 'USDW' && usdwIssuerActivated) return;

  const keypair = assetCode === 'BRW' ? BRW_KEYPAIR : USDW_KEYPAIR;
  const publicKey = keypair.publicKey();

  try {
    const res = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
    if (res.ok) {
      if (assetCode === 'BRW') brwIssuerActivated = true;
      if (assetCode === 'USDW') usdwIssuerActivated = true;
      // Atraso de 2.5s para propagar no Horizon
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  } catch (err) {
    console.error(`[Playground] Failed to activate issuer for ${assetCode}:`, err);
  }
}

// Mapeamentos em RAM para associar identidades, chaves públicas e privadas
export const PLAYGROUND_SECRETS = new Map<string, string>(); // publicKey -> secretKey
export const PLAYGROUND_IDENTITY_KEYS = new Map<string, string>(); // identityId -> publicKey

type UpdateStepFn = (id: PlaygroundStepId, status: PlaygroundStepStatus) => void;

export class PlaygroundIdentityEngine implements IIdentityEngine {
  private _identities = new Map<string, Identity>();
  private _session: IdentitySession | null = null;
  private _counter = 0;

  constructor(private readonly updateStep?: UpdateStepFn) {}

  get status(): IIdentityEngine['status'] { return this._session ? 'authenticated' : 'unauthenticated'; }
  get session(): IdentitySession | null { return this._session; }
  get publicKey(): string | null { return this._session?.publicKey ?? null; }

  use() {}

  async create(params: CreateIdentityParams): Promise<IdentityAuthResult> {
    this.updateStep?.('identity', 'running');
    const id = `play-identity-${++this._counter}`;
    
    // Geração real de par de chaves Stellar
    const pair = Keypair.random();
    const publicKey = pair.publicKey();
    const secret = pair.secret();
    
    PLAYGROUND_SECRETS.set(publicKey, secret);
    PLAYGROUND_IDENTITY_KEYS.set(id, publicKey);

    const identity: Identity = {
      id,
      authMethod: params.method,
      label: 'label' in params ? params.label : undefined,
      createdAt: Date.now(),
      lastAuthAt: Date.now(),
      isActive: true,
    };
    this._identities.set(id, identity);
    this._session = { identityId: id, publicKey, network: 'testnet', startedAt: Date.now(), expiresAt: null, method: params.method };
    this.updateStep?.('identity', 'done');
    return { identity, session: this._session, publicKey, authenticatedAt: Date.now() };
  }

  async authenticate(identityId: string): Promise<IdentityAuthResult> {
    const identity = this._identities.get(identityId);
    if (!identity) throw new Error('Not found');
    const publicKey = PLAYGROUND_IDENTITY_KEYS.get(identityId);
    if (!publicKey) throw new Error('Public key not found for identity');
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

export class PlaygroundWalletEngine implements IWalletEngine {
  private _wallets = new Map<string, StellarWallet>();
  private _counter = 0;

  constructor(private readonly updateStep?: UpdateStepFn) {}

  get active(): StellarWallet | null { return Array.from(this._wallets.values()).find(w => w.isActive) ?? null; }
  get publicKey(): string | null { return this.active?.publicKey ?? null; }

  use() {}

  async create(params: any): Promise<StellarWallet> {
    this.updateStep?.('wallet', 'running');
    const id = `play-wallet-${++this._counter}`;
    const publicKey = PLAYGROUND_IDENTITY_KEYS.get(params.identityId);
    if (!publicKey) {
      throw new Error(`Public key not found for identity ${params.identityId}`);
    }
    const wallet: StellarWallet = {
      id,
      identityId: params.identityId,
      publicKey,
      network: params.network ?? 'testnet',
      custodyType: params.custodyType,
      label: params.label,
      createdAt: Date.now(),
      isActive: true,
    };
    this._wallets.set(id, wallet);
    this.updateStep?.('wallet', 'done');
    return wallet;
  }

  async import(): Promise<StellarWallet> { throw new Error('not implemented'); }
  async list(id: string): Promise<StellarWallet[]> { return Array.from(this._wallets.values()).filter(w => w.identityId === id); }
  async get(id: string): Promise<StellarWallet | null> { return this._wallets.get(id) ?? null; }
  async setActive(id: string): Promise<StellarWallet> { return this._wallets.get(id)!; }
  async remove(id: string): Promise<void> { this._wallets.delete(id); }

  async signTransaction(xdr: string): Promise<string> {
    const pubKey = this.publicKey;
    if (!pubKey) throw new Error('No active wallet');
    const secret = PLAYGROUND_SECRETS.get(pubKey);
    if (!secret) throw new Error('Secret key not found for active wallet');

    const pair = Keypair.fromSecret(secret);
    const tx = TransactionBuilder.fromXDR(xdr, 'Test SDF Network ; September 2015');
    tx.sign(pair);
    return tx.toXDR();
  }
}

export class PlaygroundAccountEngine implements IAccountEngine {
  constructor(private readonly updateStep?: UpdateStepFn) {}

  async existsOnChain(publicKey: string): Promise<boolean> {
    this.updateStep?.('account', 'running');
    try {
      await server.loadAccount(publicKey);
      this.updateStep?.('account', 'done');
      return true;
    } catch (err: any) {
      this.updateStep?.('account', 'done');
      if (err.name === 'NotFoundError' || err.response?.status === 404) {
        return false;
      }
      throw err;
    }
  }

  async getState(publicKey: string): Promise<StellarAccountState> {
    this.updateStep?.('account', 'running');
    try {
      const accountInfo = await server.loadAccount(publicKey);
      const xlmBalance = accountInfo.balances.find(b => b.asset_type === 'native')?.balance ?? '0';
      const balances = accountInfo.balances
        .filter(b => b.asset_type !== 'native' && b.asset_type !== 'liquidity_pool_shares')
        .map(b => {
          const bal = b as any;
          return {
            asset: {
              code: bal.asset_code,
              issuer: bal.asset_issuer,
              type: bal.asset_type as any,
              name: bal.asset_code,
              decimals: 7 as const,
            },
            balance: bal.balance,
            limit: bal.limit ?? '922337203685.4775807',
            isAuthorized: true,
          };
        });

      this.updateStep?.('account', 'done');
      return {
        publicKey,
        exists: true,
        xlmBalance,
        sequenceNumber: accountInfo.sequence,
        subentryCount: accountInfo.subentry_count,
        balances,
        signers: accountInfo.signers.map(s => ({
          key: s.key,
          publicKey: s.key,
          weight: s.weight,
          type: 'ed25519_public_key' as const,
        })),
        lastSyncAt: Date.now(),
      };
    } catch (err: any) {
      this.updateStep?.('account', 'done');
      return {
        publicKey,
        exists: false,
        xlmBalance: '0',
        sequenceNumber: '0',
        subentryCount: 0,
        balances: [],
        signers: [],
        lastSyncAt: Date.now(),
      };
    }
  }

  async sync(publicKey: string): Promise<StellarAccountState> {
    return this.getState(publicKey);
  }
}

export class PlaygroundGasStation {
  constructor(private readonly updateStep?: UpdateStepFn) {}

  async hasQuota(): Promise<boolean> { return true; }

  async sponsorAccountCreation(publicKey: string): Promise<string> {
    this.updateStep?.('sponsor', 'running');
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Friendbot sponsorship failed: ${text}`);
      }
      const data = await res.json();
      this.updateStep?.('sponsor', 'done');
      return data.hash;
    } catch (err: any) {
      this.updateStep?.('sponsor', 'error');
      throw err;
    }
  }

  async sponsorTrustlines(publicKey: string, assets: string[]): Promise<any> {
    this.updateStep?.('trustlines', 'running');
    try {
      const secret = PLAYGROUND_SECRETS.get(publicKey);
      if (!secret) throw new Error(`Secret key not found for account ${publicKey}`);
      const keypair = Keypair.fromSecret(secret);

      const account = await server.loadAccount(publicKey);
      let txBuilder = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: 'Test SDF Network ; September 2015',
      });

      for (const assetCode of assets) {
        const issuer = assetCode === 'BRW' ? BRW_ISSUER : (assetCode === 'USDW' ? USDW_ISSUER : BRW_ISSUER);
        const assetObj = new Asset(assetCode, issuer);
        txBuilder = txBuilder.addOperation(
          Operation.changeTrust({
            asset: assetObj,
            limit: '1000000000',
          })
        );
      }

      const tx = txBuilder.setTimeout(30).build();
      tx.sign(keypair);

      const result = await server.submitTransaction(tx);
      this.updateStep?.('trustlines', 'done');
      return {
        txHash: result.hash,
        configured: assets,
        failed: [],
      };
    } catch (err: any) {
      this.updateStep?.('trustlines', 'error');
      throw err;
    }
  }
}

export class PlaygroundTestnetFaucet {
  constructor(private readonly updateStep?: UpdateStepFn) {}

  async activateAccount(publicKey: string): Promise<any> {
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Friendbot activation failed: ${text}`);
      }
      const data = await res.json();
      return { txHash: data.hash };
    } catch (err: any) {
      throw err;
    }
  }

  async fundTestTokens(publicKey: string, asset: string): Promise<any> {
    try {
      await ensureIssuerActive(asset);

      const issuerKeypair = asset === 'BRW' ? BRW_KEYPAIR : USDW_KEYPAIR;
      const issuerPub = issuerKeypair.publicKey();

      const issuerAccount = await server.loadAccount(issuerPub);
      const assetObj = new Asset(asset, issuerPub);

      const tx = new TransactionBuilder(issuerAccount, {
        fee: '100',
        networkPassphrase: 'Test SDF Network ; September 2015',
      })
      .addOperation(
        Operation.payment({
          destination: publicKey,
          asset: assetObj,
          amount: '100',
        })
      )
      .setTimeout(30)
      .build();

      tx.sign(issuerKeypair);
      const result = await server.submitTransaction(tx);
      return {
        txHash: result.hash,
        amount: '100',
      };
    } catch (err: any) {
      console.error(`[Playground] Failed to fund test tokens for ${asset}:`, err);
      throw err;
    }
  }
}

export class PlaygroundSessionPort {
  constructor(private readonly updateStep?: UpdateStepFn) {}

  async createToken(userId: string, publicKey: string): Promise<string> {
    this.updateStep?.('session', 'running');
    const token = `play_sess_${userId}_${publicKey.slice(0, 8)}`;
    this.updateStep?.('session', 'done');
    return token;
  }
}

export class PlaygroundAnalyticsPort {
  async track(): Promise<void> {}
}
