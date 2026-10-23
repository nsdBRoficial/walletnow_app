import { StrKey } from '@stellar/stellar-sdk';

/**
 * Utilitários Canônicos de Validação Rígida para a Rede Stellar.
 * Padrão WalletNow Crypto Engine — Foco em prevenir chaves malformadas, corrompidas ou com prefixos incorretos.
 */

/**
 * Comprimento canônico de uma chave pública ou secreta Ed25519 codificada em Base32 na Stellar (56 caracteres).
 */
export const STELLAR_ED25519_KEY_LENGTH = 56;

/**
 * Verifica se o valor fornecido é uma Chave Pública válida no padrão Ed25519 da Stellar.
 * Em Stellar, as chaves públicas iniciam estritamente com a letra 'G' e possuem exatamente 56 caracteres.
 * 
 * Critérios rigorosos:
 * 1. Deve ser do tipo string (não null, undefined, object ou number).
 * 2. Deve ter exatamente 56 caracteres.
 * 3. Deve iniciar com o prefixo 'G' (identificador de conta Ed25519 pública).
 * 4. Deve ser decodificável em Base32 RFC 4648 sem caracteres ilegais.
 * 5. Deve possuir checksum CRC16 válido correspondente ao payload.
 * 
 * @param key Valor a ser validado.
 * @returns boolean true se for uma chave pública válida.
 */
export const isValidPublicKey = (key: unknown): key is string => {
  if (typeof key !== 'string') {
    return false;
  }

  if (key.length !== STELLAR_ED25519_KEY_LENGTH || !key.startsWith('G')) {
    return false;
  }

  try {
    return StrKey.isValidEd25519PublicKey(key);
  } catch {
    return false;
  }
};

/**
 * Verifica se o valor fornecido é uma Chave Secreta (Seed / Private Key) válida no padrão Ed25519 da Stellar.
 * Em Stellar, as chaves secretas iniciam estritamente com a letra 'S' e possuem exatamente 56 caracteres.
 * 
 * @param key Valor a ser validado.
 * @returns boolean true se for uma chave secreta válida.
 */
export const isValidSecretKey = (key: unknown): key is string => {
  if (typeof key !== 'string') {
    return false;
  }

  if (key.length !== STELLAR_ED25519_KEY_LENGTH || !key.startsWith('S')) {
    return false;
  }

  try {
    return StrKey.isValidEd25519SecretSeed(key);
  } catch {
    return false;
  }
};
