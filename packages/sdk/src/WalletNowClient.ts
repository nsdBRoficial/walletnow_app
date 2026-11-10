/**
 * @module packages/sdk/src/WalletNowClient.ts
 * @description SDK unificado (@walletnow/sdk - WalletNowClient) — fachada pública WalletNowOS, TestnetKit e simuladores interativos (exporta: WalletNowClientConfig, WalletNowClient).
 */
/**
 * @walletnow/sdk — WalletNowClient
 *
 * Facade de alto nível para o WalletNow OS.
 * Oculta toda a infraestrutura (Kernel, Engines, Storage) do builder.
 * Expõe apenas os domínios de negócio, como Onboarding.
 */

import { WalletNowOS } from '@walletnow/providers';
import { OnboardingOrchestrator } from '@walletnow/onboarding';
import type { OnboardingContext } from '@walletnow/onboarding';
import type { IIdentityEngine, IWalletEngine, IAccountEngine } from '@walletnow/contracts';
import { TransactionBuilder, Keypair, Horizon, Transaction, Networks } from '@stellar/stellar-sdk';

// Mock do Sponsor para Testnet
const sponsorKeypair = Keypair.random();
let sponsorFunded = false;

import { NftOrchestrator } from '@walletnow/nft';

export interface WalletNowClientConfig {
  apiKey?: string;
  network?: 'mainnet' | 'testnet';
  engines?: Partial<OnboardingContext>;
}

export class WalletNowClient {
  private constructor(
    private readonly os: WalletNowOS,
    public readonly onboarding: OnboardingOrchestrator,
    public readonly nft: NftOrchestrator,
  ) {}

  /**
   * Inicializa o WalletNow SDK.
   * Dá boot no WalletNow OS e instancializa os domínios de negócio.
   */
  static async init(config: WalletNowClientConfig): Promise<WalletNowClient> {
    const network = config.network ?? 'testnet';

    // 1. Inicializa o Kernel (WalletNowOS)
    const os = new WalletNowOS();
    await os.boot({ network });

    // 2. Extrai engines do OS para compor o contexto do domínio Onboarding
    // NOTA: Em uma implementação real, os ports (gasStation, faucet, etc)
    // seriam implementações concretas que chamam a API do WalletNow Cloud.
    
    // Configure Identity Engine with mock adapters
    const identity = config.engines?.identity ?? os.identity;
    if (!config.engines?.identity) {
      identity.use({
        method: 'passkeys',
        create: async () => ({ identity: { id: 'mock', authMethod: 'passkeys', createdAt: Date.now(), lastAuthAt: Date.now(), isActive: true }, session: {} as any, publicKey: Keypair.random().publicKey(), authenticatedAt: Date.now() }),
        authenticate: async () => ({ identity: { id: 'mock', authMethod: 'passkeys', createdAt: Date.now(), lastAuthAt: Date.now(), isActive: true }, session: {} as any, publicKey: Keypair.random().publicKey(), authenticatedAt: Date.now() }),
        sign: async () => new Uint8Array(),
        isAvailable: async () => true
      });
      identity.use({
        method: 'keypair',
        create: async () => ({ identity: { id: 'mock', authMethod: 'keypair', createdAt: Date.now(), lastAuthAt: Date.now(), isActive: true }, session: {} as any, publicKey: Keypair.random().publicKey(), authenticatedAt: Date.now() }),
        authenticate: async () => ({ identity: { id: 'mock', authMethod: 'keypair', createdAt: Date.now(), lastAuthAt: Date.now(), isActive: true }, session: {} as any, publicKey: Keypair.random().publicKey(), authenticatedAt: Date.now() }),
        sign: async () => new Uint8Array(),
        isAvailable: async () => true
      });
    }

    const onboardingCtx: OnboardingContext = {
      identity: identity,
      wallet: config.engines?.wallet ?? os.wallet,
      account: config.engines?.account ?? os.account,
      
      // Fakes implementados para Teste End-to-End
      gasStation: config.engines?.gasStation ?? ({
        hasQuota: async () => true,
        sponsorAccountCreation: async (pubKey: string) => {
          console.log('[GasStationMock] Sponsoring account via Friendbot...', pubKey);
          const res = await fetch(`https://friendbot.stellar.org/?addr=${pubKey}`);
          if (!res.ok) throw new Error('Friendbot failed to sponsor account');
        },
        sponsorTransaction: async (signedXdr: string, network: any) => {
          console.log('[GasStationMock] Sponsoring transaction with FeeBump...');
          
          if (!sponsorFunded) {
             console.log('[GasStationMock] Funding Sponsor Account via Friendbot first...');
             const res = await fetch(`https://friendbot.stellar.org/?addr=${sponsorKeypair.publicKey()}`);
             if (!res.ok) throw new Error('Failed to fund Sponsor Account');
             sponsorFunded = true;
          }
          
          const networkPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
          const innerTx = new Transaction(signedXdr, networkPassphrase);
          
          const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
             sponsorKeypair,
             '1000', // max fee
             innerTx,
             networkPassphrase
          );
          
          feeBumpTx.sign(sponsorKeypair);
          
          const server = new Horizon.Server('https://horizon-testnet.stellar.org');
          console.log('[GasStationMock] Submitting FeeBump Transaction to Horizon...');
          const response = await server.submitTransaction(feeBumpTx);
          console.log('[GasStationMock] FeeBump transaction submitted successfully:', response.hash);
          
          return { txHash: response.hash };
        }
      } as any),
      faucet: config.engines?.faucet ?? ({} as any),
      session: config.engines?.session ?? ({
        createToken: async () => `mock_jwt_session_${Date.now()}`
      } as any),
      analytics: config.engines?.analytics ?? ({
        track: async (event: any) => console.log('[AnalyticsMock] Event Tracked:', event.name)
      } as any),
      
      network,
    };

    // 3. Instancia o Domínio Onboarding
    const onboarding = new OnboardingOrchestrator(onboardingCtx);

    // 4. Instancia o Domínio NFT
    const nft = new NftOrchestrator({
      network,
      gasStation: onboardingCtx.gasStation,
    });

    return new WalletNowClient(os, onboarding, nft);
  }

  /**
   * Encerra todos os serviços em background.
   */
  async destroy(): Promise<void> {
    await this.os.shutdown();
  }
}
