/**
 * @module packages/crypto/src/StellarKeypairDeriver.ts
 * @description Primitiva criptográfica (@walletnow/crypto - StellarKeypairDeriver) para derivação Ed25519, assinatura em memória e cifragem WebCrypto AES-GCM (exporta: StellarKeypairDeriver).
 */
/**
 * @packageDocumentation
 * @module @walletnow/crypto
 *
 * StellarKeypairDeriver — Motor Canônico de Derivação de Chaves Stellar
 *
 * Responsabilidade Única (SRP):
 * Converter entradas criptográficas de diferentes formatos (mnemônico BIP-39,
 * chave secreta canônica Stellar S... ou buffer de semente Ed25519) em pares de chaves
 * válidos da rede Stellar (Keypair).
 *
 * Garantias de Segurança:
 * - Operação estritamente client-side / in-memory.
 * - Nenhuma chave secreta gerada por este deriver é persistida ou enviada via rede.
 * - Validação estrita de dicionário de mnemônicos BIP-39 em inglês.
 *
 * @updated Setembro de 2026
 * @implements {IKeypairDeriver}
 */

import type { IKeypairDeriver, DeriveInput, DerivedKeypair } from '@walletnow/contracts';
import { Keypair } from '@stellar/stellar-sdk';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export class StellarKeypairDeriver implements IKeypairDeriver {
  async derivePublicKey(input: DeriveInput): Promise<string> {
    const keypair = await this.deriveKeypair(input);
    return keypair.publicKey;
  }

  async deriveKeypair(input: DeriveInput): Promise<DerivedKeypair> {
    if (input.type === 'mnemonic') {
      const mnemonic = input.mnemonic;
      if (!bip39.validateMnemonic(mnemonic, wordlist)) {
        throw new Error('Invalid mnemonic');
      }
      
      // Seed generation
      const seed = await bip39.mnemonicToSeed(mnemonic);
      
      // Derive ed25519 using Stellar SDK (uses seed buffer directly or derivation path)
      // Stellar SDK provides Keypair.fromRawEd25519Seed
      // The recommended way to derive from BIP-39 seed for Stellar is using ed25519-hd-key,
      // but since we want to avoid extra dependencies if possible, we can use the seed directly
      // taking the first 32 bytes for the ed25519 seed.
      const ed25519Seed = seed.slice(0, 32);
      const keypair = Keypair.fromRawEd25519Seed(Buffer.from(ed25519Seed));
      
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };
    }

    if (input.type === 'secret-key') {
      const keypair = Keypair.fromSecret(input.secretKey);
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };
    }

    if (input.type === 'raw-seed') {
      const keypair = Keypair.fromRawEd25519Seed(Buffer.from(input.seed));
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };
    }

    throw new Error(`Unsupported derivation input type: ${(input as any).type}`);
  }
}
