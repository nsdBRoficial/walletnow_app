/**
 * @module packages/crypto/src/InMemoryStellarSigner.ts
 * @description Primitiva criptográfica (@walletnow/crypto - InMemoryStellarSigner) para derivação Ed25519, assinatura em memória e cifragem WebCrypto AES-GCM (exporta: InMemoryStellarSigner).
 */
import type { IStellarSigner } from '@walletnow/contracts';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

export class InMemoryStellarSigner implements IStellarSigner {
  private keypair: Keypair | null = null;

  constructor(secretKey?: string) {
    if (secretKey) {
      this.keypair = Keypair.fromSecret(secretKey);
    }
  }

  get publicKey(): string {
    this._ensureInitialized();
    return this.keypair!.publicKey();
  }

  async signTransaction(xdrBase64: string, networkPassphrase: string): Promise<string> {
    this._ensureInitialized();

    const tx = TransactionBuilder.fromXDR(xdrBase64, networkPassphrase);
    tx.sign(this.keypair!);
    return tx.toXDR();
  }

  async signPayload(payload: Uint8Array): Promise<Uint8Array> {
    this._ensureInitialized();
    return this.keypair!.sign(Buffer.from(payload));
  }

  isReady(): boolean {
    return this.keypair !== null;
  }

  zeroize(): void {
    // There is no explicit memory zeroize in JS, but we drop the reference
    this.keypair = null;
  }

  private _ensureInitialized(): void {
    if (!this.keypair) {
      throw new Error('Signer is not initialized with a secret key');
    }
  }
}
