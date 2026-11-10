/**
 * @module src/security/mnemonicVault.test.ts
 * @description Testes unitários do MnemonicVault para armazenamento criptografado de frases BIP39,
 * controle de versão de carteira (bip39 vs legacy) e sanitização de memória no logout.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MnemonicVault } from './mnemonicVault';
import { generateMnemonic } from '../utils/bip39Wallet';

describe('MnemonicVault — Armazenamento Criptografado de Seed BIP39', () => {
  const userId = 'user-bip39-test-01';

  beforeEach(() => {
    localStorage.clear();
    MnemonicVault.clearSensitiveMnemonicMemory();
  });

  it('deve rejeitar o salvamento quando userId for vazio ou inválido', async () => {
    const mnemonic = generateMnemonic();
    await expect(MnemonicVault.saveMnemonic(mnemonic, '')).rejects.toThrow(
      'userId inválido'
    );
    await expect(MnemonicVault.saveMnemonic(mnemonic, '   ')).rejects.toThrow(
      'userId inválido'
    );
  });

  it('deve rejeitar mnemônicas com menos de 12 palavras', async () => {
    await expect(
      MnemonicVault.saveMnemonic('abandon ability able about above', userId)
    ).rejects.toThrow('pelo menos 12 palavras');
  });

  it('deve criptografar a mnemônica no localStorage (nunca em plaintext) e recuperá-la intacta', async () => {
    const mnemonic = generateMnemonic();

    await MnemonicVault.saveMnemonic(mnemonic, userId);

    const rawStored = localStorage.getItem(`@walletnow:mnemonic:${userId}`);
    expect(rawStored).toBeTruthy();
    expect(rawStored).not.toContain(mnemonic);
    expect(MnemonicVault.hasMnemonic(userId)).toBe(true);
    expect(MnemonicVault.getWalletVersion(userId)).toBe('bip39');

    // Limpa memória volátil para forçar a decriptografia real a partir do localStorage
    MnemonicVault.clearSensitiveMnemonicMemory();

    const loaded = await MnemonicVault.loadMnemonic(userId);
    expect(loaded).toBe(mnemonic);
  });

  it('deve retornar null ao carregar mnemônica inexistente ou se os dados forem corrompidos', async () => {
    expect(await MnemonicVault.loadMnemonic('unknown-user')).toBeNull();

    localStorage.setItem(
      `@walletnow:mnemonic:${userId}`,
      JSON.stringify({ ciphertext: 'invalid-b64!!!', iv: 'bad', version: 1 })
    );
    expect(await MnemonicVault.loadMnemonic(userId)).toBeNull();
  });

  it('deve distinguir corretamente carteiras bip39, legacy e inexistentes', () => {
    expect(MnemonicVault.getWalletVersion('fresh-user')).toBeNull();

    MnemonicVault.markAsLegacy('legacy-user');
    expect(MnemonicVault.getWalletVersion('legacy-user')).toBe('legacy');

    // Inferência automática para carteiras antigas que possuem apenas @walletnow:secret:
    localStorage.setItem('@walletnow:secret:inferred-legacy', 'encrypted-blob');
    expect(MnemonicVault.getWalletVersion('inferred-legacy')).toBe('legacy');
  });

  it('deve remover completamente a mnemônica do disco e da memória em deleteMnemonic', async () => {
    const mnemonic = generateMnemonic();
    await MnemonicVault.saveMnemonic(mnemonic, userId);

    MnemonicVault.deleteMnemonic(userId);

    expect(MnemonicVault.hasMnemonic(userId)).toBe(false);
    expect(MnemonicVault.getWalletVersion(userId)).toBeNull();
    expect(await MnemonicVault.loadMnemonic(userId)).toBeNull();
  });
});
