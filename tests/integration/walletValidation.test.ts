import { describe, it, expect } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { isValidPublicKey, isValidSecretKey } from '../../src/utils/stellarValidation';

describe('Stellar Keypair Validation', () => {
  it('should validate a correct public key', () => {
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    
    expect(isValidPublicKey(publicKey)).toBe(true);
  });

  it('should validate a correct secret key', () => {
    const keypair = Keypair.random();
    const secretKey = keypair.secret();
    
    expect(isValidSecretKey(secretKey)).toBe(true);
  });

  it('should invalidate an empty string', () => {
    expect(isValidPublicKey('')).toBe(false);
    expect(isValidSecretKey('')).toBe(false);
    expect(isValidPublicKey(null as any)).toBe(false);
    expect(isValidSecretKey(undefined as any)).toBe(false);
  });

  it('should invalidate keys with wrong prefixes', () => {
    const keypair = Keypair.random();
    // Invertendo prefixos
    const wrongPrefixPublic = 'S' + keypair.publicKey().slice(1);
    const wrongPrefixSecret = 'G' + keypair.secret().slice(1);

    expect(isValidPublicKey(wrongPrefixPublic)).toBe(false);
    expect(isValidSecretKey(wrongPrefixSecret)).toBe(false);
  });

  it('should invalidate corrupted keys even with correct prefix', () => {
    const corruptedPublic = 'G' + 'A'.repeat(55); // 56 chars but not a valid ED25519
    const corruptedSecret = 'S' + 'A'.repeat(55);

    expect(isValidPublicKey(corruptedPublic)).toBe(false);
    expect(isValidSecretKey(corruptedSecret)).toBe(false);
  });
});
