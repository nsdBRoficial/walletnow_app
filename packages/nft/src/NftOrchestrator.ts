/**
 * @module packages\nft\src\NftOrchestrator.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { Asset, Operation, TransactionBuilder, Keypair, Networks, Horizon } from '@stellar/stellar-sdk';
import type { IGasStationPort } from '@walletnow/onboarding';

export interface MintNftParams {
  code: string;
  supply?: string;
  issuerSecret: string;
  receiverPublicKey: string;
  receiverSecret?: string;
  metadataUrl?: string;
}

export interface NftContext {
  network: 'mainnet' | 'testnet';
  gasStation?: IGasStationPort;
}

export class NftOrchestrator {
  private horizon: Horizon.Server;

  constructor(private readonly context: NftContext) {
    const horizonUrl = this.context.network === 'mainnet' 
      ? 'https://horizon.stellar.org' 
      : 'https://horizon-testnet.stellar.org';
    this.horizon = new Horizon.Server(horizonUrl);
  }

  /**
   * Mints an NFT from the Issuer to the Receiver.
   */
  async mintNft(params: MintNftParams): Promise<{ txHash: string; asset: Asset }> {
    const supply = params.supply || '1';
    const issuerPair = Keypair.fromSecret(params.issuerSecret);
    const nftAsset = new Asset(params.code, issuerPair.publicKey());
    const networkPassphrase = this.context.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

    const issuerAccount = await this.horizon.loadAccount(issuerPair.publicKey());

    // Create the inner transaction
    const txBuilder = new TransactionBuilder(issuerAccount, {
      fee: '100', // Base fee, will be bumped by gas station
      networkPassphrase,
    });

    // 1. Receiver must trust the asset
    // We add a ChangeTrust operation. It needs to be signed by the receiver.
    txBuilder.addOperation(
      Operation.changeTrust({
        asset: nftAsset,
        limit: supply,
        source: params.receiverPublicKey,
      })
    );

    // 2. Issuer pays the asset to the receiver
    txBuilder.addOperation(
      Operation.payment({
        destination: params.receiverPublicKey,
        asset: nftAsset,
        amount: supply,
        source: issuerPair.publicKey(),
      })
    );

    const transaction = txBuilder.setTimeout(300).build();

    // Sign with Issuer
    transaction.sign(issuerPair);

    // Sign with Receiver (if available - useful for backend bots)
    if (params.receiverSecret) {
      const receiverPair = Keypair.fromSecret(params.receiverSecret);
      transaction.sign(receiverPair);
    } else {
       throw new Error('receiverSecret is required for full mint execution. In a real scenario, the XDR should be sent to the frontend for the user to sign.');
    }

    if (this.context.gasStation) {
       // Send to GasStation for fee bump
       const xdr = transaction.toXDR();
       const result = await this.context.gasStation.sponsorTransaction(xdr, this.context.network);
       return { txHash: result.txHash, asset: nftAsset };
    } else {
       // Submit directly
       const response = await this.horizon.submitTransaction(transaction);
       return { txHash: response.hash, asset: nftAsset };
    }
  }
}
