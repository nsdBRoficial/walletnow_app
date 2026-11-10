/**
 * @module src/security/deviceVault.ts
 * @description Cofre criptográfico local baseado em WebCrypto (PBKDF2 100k SHA-256 + AES-GCM-256)
 * para proteção de chaves secretas Stellar em repouso e controle de segredos em memória volátil.
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../utils/logger';

// Constantes de criptografia
const ALGORITHM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const SALT_STORAGE_KEY = '@walletnow:vault:salt';

// Objeto em memória volátil para manter o secret disponível durante a sessão sem tocar no disco
let volatileSecret: string | null = null;

// Helpers base64 (browser safe)
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export const DeviceVault = {
  /**
   * Recupera ou gera um Salt único para este dispositivo.
   */
  _getDeviceSalt(): Uint8Array {
    const stored = localStorage.getItem(SALT_STORAGE_KEY);
    if (stored) {
      return base64ToArrayBuffer(stored);
    }
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(SALT_STORAGE_KEY, arrayBufferToBase64(newSalt));
    return newSalt;
  },

  /**
   * Gera (deriva) uma chave AES-GCM baseada no ID do usuário e um Salt do dispositivo via PBKDF2.
   * A chave não é exportável por padrão no WebCrypto.
   */
  async generateEncryptionKey(userId: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(userId),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const salt = this._getDeviceSalt();

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: ALGORITHM, length: 256 },
      false, // extractable = false (A chave em si nunca sai do WebCrypto de forma plana)
      ['encrypt', 'decrypt']
    );

    return key;
  },

  /**
   * Criptografa o secret com a chave AES-GCM e um IV seguro.
   */
  async encryptSecret(secret: string, key: CryptoKey): Promise<{ ciphertext: string, iv: string, version: number }> {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv },
      key,
      enc.encode(secret)
    );

    const ciphertextBase64 = arrayBufferToBase64(encryptedBuffer);
    const ivBase64 = arrayBufferToBase64(iv);

    return {
      ciphertext: ciphertextBase64,
      iv: ivBase64,
      version: 1
    };
  },

  /**
   * Descriptografa o ciphertext usando a chave AES-GCM e o IV.
   */
  async decryptSecret(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
    const encryptedBuffer = base64ToArrayBuffer(ciphertextBase64);
    const iv = base64ToArrayBuffer(ivBase64);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: iv },
        key,
        encryptedBuffer
      );
      
      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (e) {
      logger.error('[WalletNow][DeviceVault]', 'Falha ao descriptografar secret', e);
      throw new Error('Falha de decriptografia.', { cause: e });
    }
  },

  /**
   * Armazena o secret em memória volátil, para uso na sessão atual.
   */
  setVolatileSecret(secret: string) {
    volatileSecret = secret;
  },

  /**
   * Retorna o secret da memória volátil.
   */
  getVolatileSecret(): string | null {
    return volatileSecret;
  },

  /**
   * Limpa buffers e variáveis globais sensíveis (Logout / Travar).
   */
  clearSensitiveMemory() {
    volatileSecret = null;
    logger.info('[WalletNow][DeviceVault]', 'Memória sensível apagada.');
  }
};
