/**
 * @module packages/crypto/src/WebCryptoEncryptor.ts
 * @description Primitiva criptográfica (@walletnow/crypto - WebCryptoEncryptor) para derivação Ed25519, assinatura em memória e cifragem WebCrypto AES-GCM (exporta: WebCryptoEncryptor).
 */
/**
 * @packageDocumentation
 * @module @walletnow/crypto
 *
 * WebCryptoEncryptor — Criptografia Autenticada com Padrão Militar (AES-GCM-256)
 *
 * Responsabilidade Única (SRP):
 * Prover encriptação e decriptação simétrica de alta segurança para o cofre
 * DeviceVault local utilizando a Web Crypto API nativa (disponível em browsers modernos e Node.js).
 *
 * Especificação Técnica:
 * - Algoritmo: AES-GCM (Galois/Counter Mode) com chave de 256 bits.
 * - Derivação de Chave (KDF): PBKDF2 com 100.000 iterações e HMAC-SHA-256.
 * - Vetor de Inicialização (IV): 12 bytes gerados criptograficamente via CSPRNG por operação.
 * - Salt: 16 bytes pseudoaleatórios únicos por encriptação.
 *
 * @updated Setembro de 2026
 * @implements {IEncryptor}
 */

import type { IEncryptor, EncryptedData } from '@walletnow/contracts';

export class WebCryptoEncryptor implements IEncryptor {
  // Configurações do PBKDF2 e AES-GCM
  private readonly ITERATIONS = 100000;
  private readonly HASH_ALGO = 'SHA-256';
  private readonly AES_LENGTH = 256;
  
  // Utiliza a Web Crypto API (disponível no Browser e no Node.js via globalThis.crypto)
  private get crypto(): Crypto {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto;
    }
    throw new Error('Web Crypto API is not available in this environment');
  }

  private async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await this.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return this.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: this.HASH_ALGO
      },
      passphraseKey,
      { name: 'AES-GCM', length: this.AES_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data: Uint8Array, passphrase: string): Promise<EncryptedData> {
    const salt = this.crypto.getRandomValues(new Uint8Array(16));
    const iv = this.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(passphrase, salt);

    const ciphertextBuffer = await this.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    return {
      ciphertext: new Uint8Array(ciphertextBuffer),
      iv: new Uint8Array(iv),
      salt: new Uint8Array(salt),
      algorithm: 'AES-GCM-256',
      iterations: this.ITERATIONS
    };
  }

  async decrypt(encrypted: EncryptedData, passphrase: string): Promise<Uint8Array> {
    const salt = encrypted.salt;
    const iv = encrypted.iv;
    const ciphertext = encrypted.ciphertext;

    const key = await this.deriveKey(passphrase, salt);

    const plaintextBuffer = await this.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    return new Uint8Array(plaintextBuffer);
  }

}
