import { type IStellarSigner, CryptoError } from '@walletnow/contracts';
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

  async verify(payload: Uint8Array, signature: Uint8Array): Promise<boolean> {
    this._ensureInitialized();
    try {
      return this.keypair!.verify(Buffer.from(payload), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async verifyOrThrow(payload: Uint8Array, signature: Uint8Array): Promise<void> {
    const isValid = await this.verify(payload, signature);
    if (!isValid) {
      throw new CryptoError(
        'VERIFICATION_FAILED',
        'Assinatura criptográfica inválida para o payload fornecido.',
        { publicKey: this.publicKey }
      );
    }
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
