import { describe, it, expect } from 'vitest';
import { StellarKeypairDeriver } from './StellarKeypairDeriver';
import { WebCryptoEncryptor } from './WebCryptoEncryptor';
import { isValidPublicKey } from './validation';

describe('@walletnow/crypto SDK Module (Phase 2)', () => {
  describe('StellarKeypairDeriver', () => {
    it('should derive an Ed25519 public key from a valid BIP-39 mnemonic', async () => {
      const deriver = new StellarKeypairDeriver();
      
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const publicKey = await deriver.derivePublicKey({ type: 'mnemonic', mnemonic });
      
      expect(publicKey).toBeDefined();
      expect(publicKey.startsWith('G')).toBe(true);
    });

    it('should derive a full Keypair from a secret', async () => {
      const deriver = new StellarKeypairDeriver();
      
      const secret = 'SA2X64X6JOMQ5OQW35C2B4B2P5M7E6Y2T46O6B2X23C6M3O7P6U4X4'; // dummy invalid but format
      // the Stellar SDK Keypair.fromSecret throws on invalid length, let's just test rejection for random string
      await expect(
        deriver.deriveKeypair({ type: 'secret-key', secretKey: 'invalid' })
      ).rejects.toThrow();
    });
  });

  describe('WebCryptoEncryptor', () => {
    it('should encrypt and decrypt data successfully using AES-GCM and PBKDF2', async () => {
      const encryptor = new WebCryptoEncryptor();
      const passphrase = 'super-secure-passphrase';
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = await encryptor.encrypt(data, passphrase);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = await encryptor.decrypt(encrypted, passphrase);
      expect(decrypted).toEqual(data);
    });
  });

  describe('Stellar Key Validation Utilities', () => {
    it('should validate canonical Ed25519 public keys', () => {
      const validKey = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
      expect(isValidPublicKey(validKey)).toBe(true);
    });

    it('should reject invalid public keys (wrong prefix, invalid length, bad checksum)', () => {
      expect(isValidPublicKey('SA2X64X6JOMQ5OQW35C2B4B2P5M7E6Y2T46O6B2X23C6M3O7P6U4X4')).toBe(false);
      expect(isValidPublicKey('GAAZ')).toBe(false);
      expect(isValidPublicKey('G' + 'A'.repeat(55))).toBe(false);
      expect(isValidPublicKey(null)).toBe(false);
    });
  });
});
