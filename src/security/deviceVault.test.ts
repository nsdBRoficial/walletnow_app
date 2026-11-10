/**
 * @module src/security/deviceVault.test.ts
 * @description Testes unitários do cofre criptográfico local DeviceVault (PBKDF2 + AES-GCM-256).
 * Valida confidencialidade, autenticidade (tag GCM), unicidade de IV, isolamento entre usuários e limpeza de memória.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { DeviceVault } from './deviceVault';

describe('DeviceVault — Criptografia Local AES-GCM-256 & PBKDF2', () => {
  beforeEach(() => {
    localStorage.clear();
    DeviceVault.clearSensitiveMemory();
  });

  it('deve gerar e persistir um salt único de 16 bytes por dispositivo no localStorage', () => {
    const salt1 = DeviceVault._getDeviceSalt();
    const salt2 = DeviceVault._getDeviceSalt();

    expect(salt1).toBeInstanceOf(Uint8Array);
    expect(salt1.byteLength).toBe(16);
    expect(Array.from(salt1)).toEqual(Array.from(salt2));
    expect(localStorage.getItem('@walletnow:vault:salt')).toBeTruthy();
  });

  it('deve derivar uma CryptoKey AES-GCM-256 não exportável via PBKDF2', async () => {
    const key = await DeviceVault.generateEncryptionKey('user-uuid-001');

    expect(key.algorithm.name).toBe('AES-GCM');
    expect(key.extractable).toBe(false);
    expect(key.usages).toContain('encrypt');
    expect(key.usages).toContain('decrypt');
  });

  it('deve cifrar e decifrar uma Secret Key Stellar preservando 100% de fidelidade (round-trip)', async () => {
    const originalSecret = Keypair.random().secret();
    const key = await DeviceVault.generateEncryptionKey('user-uuid-001');

    const encrypted = await DeviceVault.encryptSecret(originalSecret, key);

    expect(encrypted.version).toBe(1);
    expect(encrypted.ciphertext).not.toContain(originalSecret);
    expect(encrypted.iv).toBeTruthy();

    const decrypted = await DeviceVault.decryptSecret(encrypted.ciphertext, encrypted.iv, key);
    expect(decrypted).toBe(originalSecret);
  });

  it('deve gerar um IV aleatório distinto para cada operação de cifragem do mesmo segredo', async () => {
    const secret = Keypair.random().secret();
    const key = await DeviceVault.generateEncryptionKey('user-uuid-001');

    const enc1 = await DeviceVault.encryptSecret(secret, key);
    const enc2 = await DeviceVault.encryptSecret(secret, key);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('deve rejeitar a decriptografia quando tentada com a chave de outro usuário', async () => {
    const secret = Keypair.random().secret();
    const keyAlice = await DeviceVault.generateEncryptionKey('alice-id');
    const keyMallory = await DeviceVault.generateEncryptionKey('mallory-id');

    const encrypted = await DeviceVault.encryptSecret(secret, keyAlice);

    await expect(
      DeviceVault.decryptSecret(encrypted.ciphertext, encrypted.iv, keyMallory)
    ).rejects.toThrow('Falha de decriptografia.');
  });

  it('deve rejeitar a decriptografia quando o ciphertext ou a tag de autenticação GCM forem adulterados', async () => {
    const secret = Keypair.random().secret();
    const key = await DeviceVault.generateEncryptionKey('user-uuid-001');
    const encrypted = await DeviceVault.encryptSecret(secret, key);

    // Corrompe os últimos caracteres do Base64 (tag GCM)
    const tampered =
      encrypted.ciphertext.slice(0, -4) +
      (encrypted.ciphertext.endsWith('AAAA') ? 'BBBB' : 'AAAA');

    await expect(
      DeviceVault.decryptSecret(tampered, encrypted.iv, key)
    ).rejects.toThrow('Falha de decriptografia.');
  });

  it('deve manter o segredo em memória volátil durante a sessão e limpá-lo integralmente no logout', () => {
    const secret = Keypair.random().secret();

    expect(DeviceVault.getVolatileSecret()).toBeNull();
    DeviceVault.setVolatileSecret(secret);
    expect(DeviceVault.getVolatileSecret()).toBe(secret);

    DeviceVault.clearSensitiveMemory();
    expect(DeviceVault.getVolatileSecret()).toBeNull();
  });
});
