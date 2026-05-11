import { StrKey } from '@stellar/stellar-sdk';

/**
 * Utilitários de Validação Rígida para a Rede Stellar.
 * Foco em evitar chaves malformadas, corrompidas ou com prefixos incorretos.
 */

/**
 * Verifica se a string fornecida é uma Chave Pública válida no padrão Ed25519.
 * Em Stellar, as chaves públicas iniciam estritamente com a letra 'G'.
 * 
 * @param key A chave pública a ser validada.
 * @returns boolean true se for válida.
 */
export const isValidPublicKey = (key: string | null | undefined): boolean => {
    if (!key) return false;
    
    // Verifica primeiro o prefixo (Hard validation)
    if (!key.startsWith('G')) {
        return false;
    }

    // Utiliza a validação algorítmica do próprio SDK para garantir a integridade
    return StrKey.isValidEd25519PublicKey(key);
};

/**
 * Verifica se a string fornecida é uma Chave Secreta (Private Key) válida no padrão Ed25519.
 * Em Stellar, as chaves secretas iniciam estritamente com a letra 'S'.
 * 
 * @param key A chave secreta a ser validada.
 * @returns boolean true se for válida.
 */
export const isValidSecretKey = (key: string | null | undefined): boolean => {
    if (!key) return false;
    
    // Verifica primeiro o prefixo (Hard validation)
    if (!key.startsWith('S')) {
        return false;
    }

    // Utiliza a validação algorítmica do próprio SDK
    return StrKey.isValidEd25519SecretSeed(key);
};
