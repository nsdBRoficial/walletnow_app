/**
 * @module src/utils/bip39Wallet.ts
 * @description Geração, validação e derivação determinística de pares de chaves Stellar (Ed25519)
 * a partir de mnemônicas BIP39 de 12 palavras utilizando o caminho SEP-0005 (m/44'/148'/0').
 */
/**
 * bip39Wallet.ts
 *
 * Utilitário de derivação determinística de carteiras Stellar via BIP39/SLIP-0010.
 *
 * PADRÕES IMPLEMENTADOS:
 * - BIP39: Geração e validação de mnemonic (12 palavras / 128 bits de entropia)
 * - SLIP-0010: Derivação hierárquica determinística com ed25519
 * - SEP-0005: Path de derivação padrão Stellar (m/44'/148'/0')
 *
 * SEGURANÇA:
 * - mnemonic NUNCA é logada (nem em desenvolvimento)
 * - mnemonic NUNCA é enviada ao Supabase ou qualquer servidor
 * - Toda criptografia local via DeviceVault (AES-GCM / WebCrypto)
 * - A seed phrase só existe em memória durante a derivação, não persiste em plaintext
 *
 * COMPATIBILIDADE COM WALLETS LEGADAS:
 * - Wallets criadas antes desta feature (Keypair.random()) são "legadas"
 * - Wallets legadas continuam funcionando normalmente
 * - A seed phrase BIP39 NíO pode ser gerada retroativamente para wallets legadas
 * - Usuários legados devem criar uma nova carteira para habilitar o Pro Mode
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
 * @see https://github.com/satoshilabs/slips/blob/master/slip-0010.md
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0005.md
 * @module bip39Wallet
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { Keypair } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

// Path de derivação SEP-0005 para Stellar
// m / purpose' / coin_type' / account'
// 44' = BIP44 purpose
// 148' = Stellar coin type (SLIP-0044)
// 0'  = primeira conta
const STELLAR_DERIVATION_PATH = "m/44'/148'/0'";

/**
 * Resultado da derivação de carteira a partir de mnemonic.
 */
export interface DerivedWallet {
  publicKey: string;
  secretKey: string;
  path: string;
}

/**
 * Gera uma nova mnemonic BIP39 com 12 palavras (128 bits de entropia).
 *
 * SEGURANÇA: Usa `crypto.getRandomValues` internamente via @scure/bip39.
 * A entropia é gerada pelo WebCrypto API do navegador, não por Math.random().
 *
 * @returns 12 palavras em inglês separadas por espaço
 */
export function generateMnemonic(): string {
  // 128 bits = 12 palavras (padrão mais comum — equivalente ao MetaMask)
  return bip39.generateMnemonic(wordlist, 128);
}

/**
 * Valida uma mnemonic BIP39.
 * Verifica checksum e pertencimento à wordlist padrão.
 *
 * @param mnemonic String de 12 palavras separadas por espaço
 * @returns true se válida, false se inválida
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

/**
 * Deriva um par de chaves Stellar (ED25519) a partir de uma mnemonic BIP39.
 *
 * Fluxo:
 * 1. mnemonic → seed (64 bytes via PBKDF2-HMAC-SHA512 — padrão BIP39)
 * 2. seed → root HD key (SLIP-0010 / ed25519)
 * 3. root → child key via path SEP-0005 (m/44'/148'/0')
 * 4. child private key → Stellar Keypair (ED25519 raw seed)
 *
 * IMPORTANTE: A derivação é síncrona e ocorre em memória.
 * O resultado (secretKey) deve ser criptografado imediatamente.
 *
 * @param mnemonic String de 12 palavras BIP39 válidas
 * @returns DerivedWallet com publicKey, secretKey e path de derivação
 * @throws Error se a mnemonic for inválida ou a derivação falhar
 */
export function deriveKeypairFromMnemonic(mnemonic: string): DerivedWallet {
  const normalizedMnemonic = mnemonic.trim().toLowerCase();

  if (!validateMnemonic(normalizedMnemonic)) {
    throw new Error('Mnemonic BIP39 inválida. Verifique as 12 palavras e tente novamente.');
  }

  // Etapa 1: mnemonic → seed (sem passphrase adicional — compatível com hardware wallets padrão)
  const seed = bip39.mnemonicToSeedSync(normalizedMnemonic);

  // Etapa 2: seed → root HD key (SLIP-0010 com ed25519)
  const root = HDKey.fromMasterSeed(seed);

  // Etapa 3: derivação pelo path SEP-0005
  const child = root.derive(STELLAR_DERIVATION_PATH);

  if (!child.privateKey) {
    throw new Error('Falha na derivação SLIP-0010: privateKey não disponível.');
  }

  // Etapa 4: raw private key (32 bytes) → Stellar Keypair (ED25519)
  const keypair = Keypair.fromRawEd25519Seed(Buffer.from(child.privateKey));

  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
    path: STELLAR_DERIVATION_PATH,
  };
}

/**
 * Verifica se uma mnemonic deriva o mesmo publicKey de um endereço existente.
 * Útil para validar recovery de carteira.
 *
 * @param mnemonic Mnemonic a verificar
 * @param expectedPublicKey Chave pública da carteira existente
 * @returns true se a mnemonic deriva o mesmo endereço
 */
export function verifyMnemonicMatchesWallet(
  mnemonic: string,
  expectedPublicKey: string
): boolean {
  try {
    const derived = deriveKeypairFromMnemonic(mnemonic);
    return derived.publicKey === expectedPublicKey;
  } catch {
    return false;
  }
}

/**
 * Retorna as palavras individuais de uma mnemonic para exibição na UI.
 * As palavras são retornadas numeradas (1-indexed) para facilitar o backup.
 *
 * @param mnemonic Mnemonic BIP39
 * @returns Array de { index, word } com as 12 palavras
 */
export function getMnemonicWords(mnemonic: string): { index: number; word: string }[] {
  return mnemonic.trim().split(/\s+/).map((word, i) => ({
    index: i + 1,
    word,
  }));
}
