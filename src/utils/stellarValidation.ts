import { StrKey } from '@stellar/stellar-sdk';

/**
 * Utilitários de Validação Rígida para a Rede Stellar.
 * Foco em evitar chaves malformadas, corrompidas ou com prefixos incorretos.
 */

/**
 * Comprimento canônico de uma chave pública ou secreta Ed25519 codificada em Base32 na Stellar.
 */
export const STELLAR_ED25519_KEY_LENGTH = 56;

/**
 * Verifica se a string fornecida é uma Chave Pública válida no padrão Ed25519.
 * Em Stellar, as chaves públicas iniciam estritamente com a letra 'G' e possuem exatamente 56 caracteres.
 * 
 * Critérios rigorosos:
 * 1. Deve ser string não nula e não vazia.
 * 2. Deve ter exatamente 56 caracteres.
 * 3. Deve iniciar obrigatoriamente com o prefixo 'G' (Ed25519 Public Key).
 * 4. Deve passar na validação algorítmica do StrKey (Base32 RFC 4648 e Checksum CRC16).
 * 
 * @param key A chave pública a ser validada.
 * @returns boolean true se for válida.
 */
export const isValidPublicKey = (key: unknown): key is string => {
    if (typeof key !== 'string') {
        return false;
    }

    // Verifica primeiro o comprimento exato e prefixo estrito 'G' (Hard validation)
    if (key.length !== STELLAR_ED25519_KEY_LENGTH || !key.startsWith('G')) {
        return false;
    }

    // Utiliza a validação algorítmica do próprio SDK para garantir decodificação Base32 e CRC16
    try {
        return StrKey.isValidEd25519PublicKey(key);
    } catch {
        return false;
    }
};

/**
 * Verifica se a string fornecida é uma Chave Secreta (Private Key / Seed) válida no padrão Ed25519.
 * Em Stellar, as chaves secretas iniciam estritamente com a letra 'S' e possuem exatamente 56 caracteres.
 * 
 * @param key A chave secreta a ser validada.
 * @returns boolean true se for válida.
 */
export const isValidSecretKey = (key: unknown): key is string => {
    if (typeof key !== 'string') {
        return false;
    }

    // Verifica primeiro o comprimento exato e prefixo estrito 'S' (Hard validation)
    if (key.length !== STELLAR_ED25519_KEY_LENGTH || !key.startsWith('S')) {
        return false;
    }

    // Utiliza a validação algorítmica do próprio SDK
    try {
        return StrKey.isValidEd25519SecretSeed(key);
    } catch {
        return false;
    }
};

