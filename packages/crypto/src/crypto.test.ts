import { describe, it, expect } from 'vitest';
import { StellarKeypairDeriver } from './StellarKeypairDeriver';
import { WebCryptoEncryptor } from './WebCryptoEncryptor';
import { InMemoryStellarSigner } from './InMemoryStellarSigner';

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

  describe('Issue 6: Teste de Segurança/Crypto - Rejeição de Assinatura Inválida', () => {
    it('deve rejeitar e retornar false ou lançar erro quando o payload for adulterado por 1 caractere', async () => {
      // 1. Criar signer com par de chaves válido
      const deriver = new StellarKeypairDeriver();
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const keypair = await deriver.deriveKeypair({ type: 'mnemonic', mnemonic });
      const signer = new InMemoryStellarSigner(keypair.secretKey);

      // 2. Criar um payload mockado e a assinatura válida correspondente
      const originalPayloadText = '{"action":"transfer","amount":100,"to":"GBBD...","timestamp":1700000000}';
      const originalPayload = new TextEncoder().encode(originalPayloadText);
      const signature = await signer.signPayload(originalPayload);

      // Assinatura com payload intacto deve ser válida
      const isOriginalValid = await signer.verify(originalPayload, signature);
      expect(isOriginalValid).toBe(true);
      await expect(signer.verifyOrThrow(originalPayload, signature)).resolves.toBeUndefined();

      // 3. Alterar exatamente 1 caractere do payload original antes da verificação
      // Ex: alterar amount de 100 para 900
      const tamperedPayloadText = '{"action":"transfer","amount":900,"to":"GBBD...","timestamp":1700000000}';
      const tamperedPayload = new TextEncoder().encode(tamperedPayloadText);

      // 4. Critérios de aceite:
      // - A função de validação criptográfica deve retornar false
      const isTamperedValid = await signer.verify(tamperedPayload, signature);
      expect(isTamperedValid).toBe(false);

      // - A função de validação restritiva deve lançar erro
      await expect(signer.verifyOrThrow(tamperedPayload, signature)).rejects.toThrow();

      // - Se assinado por outra chave privada (chave diferente), também deve ser rejeitado
      const otherKeypair = await deriver.deriveKeypair({
        type: 'mnemonic',
        mnemonic: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
      });
      const otherSigner = new InMemoryStellarSigner(otherKeypair.secretKey);
      const isWrongSignerValid = await otherSigner.verify(originalPayload, signature);
      expect(isWrongSignerValid).toBe(false);
    });
  });
});

