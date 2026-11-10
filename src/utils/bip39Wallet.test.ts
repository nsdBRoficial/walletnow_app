/**
 * @module src/utils/bip39Wallet.test.ts
 * @description Testes unitários para geração, validação e derivação determinística de carteiras Stellar
 * segundo os padrões BIP39, SLIP-0010 e SEP-0005 (m/44'/148'/0').
 */
import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  deriveKeypairFromMnemonic,
  verifyMnemonicMatchesWallet,
  getMnemonicWords,
} from './bip39Wallet';
import { isValidPublicKey, isValidSecretKey } from './stellarValidation';

describe('bip39Wallet & stellarValidation — Derivação Determinística SEP-0005', () => {
  // Vetor padrão BIP39 de 12 palavras
  const KNOWN_MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  it('deve gerar uma mnemônica BIP39 válida de 12 palavras com entropia criptográfica', () => {
    const m1 = generateMnemonic();
    const m2 = generateMnemonic();

    expect(m1.split(' ')).toHaveLength(12);
    expect(validateMnemonic(m1)).toBe(true);
    expect(m1).not.toBe(m2);
  });

  it('deve validar corretamente mnemônicas válidas (com espaços/maiúsculas) e rejeitar checksums ou palavras inválidas', () => {
    expect(validateMnemonic(`  ${KNOWN_MNEMONIC.toUpperCase()}  `)).toBe(true);
    expect(
      validateMnemonic(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'
      )
    ).toBe(false);
    expect(validateMnemonic('palavra inexistente fora da lista bip39')).toBe(false);
  });

  it('deve derivar deterministicamente o mesmo par de chaves Ed25519 Stellar no path m/44\'/148\'/0\'', () => {
    const d1 = deriveKeypairFromMnemonic(KNOWN_MNEMONIC);
    const d2 = deriveKeypairFromMnemonic(`  ${KNOWN_MNEMONIC.toUpperCase()} \n`);

    expect(d1.path).toBe("m/44'/148'/0'");
    expect(d1.publicKey).toBe(d2.publicKey);
    expect(d1.secretKey).toBe(d2.secretKey);
    expect(isValidPublicKey(d1.publicKey)).toBe(true);
    expect(isValidSecretKey(d1.secretKey)).toBe(true);
  });

  it('deve lançar erro explícito ao tentar derivar chaves de uma mnemônica inválida', () => {
    expect(() => deriveKeypairFromMnemonic('invalid mnemonic words here')).toThrow(
      'Mnemonic BIP39 inválida'
    );
  });

  it('deve verificar correspondência entre mnemônica e chave pública existente (recovery check)', () => {
    const derived = deriveKeypairFromMnemonic(KNOWN_MNEMONIC);

    expect(verifyMnemonicMatchesWallet(KNOWN_MNEMONIC, derived.publicKey)).toBe(true);
    expect(verifyMnemonicMatchesWallet(KNOWN_MNEMONIC, 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF')).toBe(false);
    expect(verifyMnemonicMatchesWallet('invalid seed', derived.publicKey)).toBe(false);
  });

  it('deve numerar as 12 palavras de 1 a 12 para exibição de backup', () => {
    const words = getMnemonicWords(KNOWN_MNEMONIC);
    expect(words).toHaveLength(12);
    expect(words[0]).toEqual({ index: 1, word: 'abandon' });
    expect(words[11]).toEqual({ index: 12, word: 'about' });
  });
});
