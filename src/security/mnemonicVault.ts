/**
 * @module src\security\mnemonicVault.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * mnemonicVault.ts
 *
 * Vault criptografado local para armazenamento seguro da mnemonic BIP39.
 *
 * SEGURANÇA:
 * - mnemonic criptografada com AES-GCM-256 via WebCrypto API
 * - Chave de encriptação derivada via PBKDF2 (userId + salt do dispositivo)
 * - mnemonic NUNCA armazenada em plaintext
 * - mnemonic NUNCA enviada a servidores
 * - mnemonic NUNCA logada (nem em debug)
 * - Memória volátil limpa no logout via clearSensitiveMnemonicMemory()
 *
 * MODELO HÍBRIDO:
 * - Wallets BIP39 (novas): mnemonic armazenada criptografada
 * - Wallets legadas (antigas, Keypair.random()): sem mnemonic — versão 'legacy'
 *
 * @module mnemonicVault
 */

import { DeviceVault } from './deviceVault';
import { logger } from '../utils/logger';

// Chaves de armazenamento no localStorage
const MNEMONIC_KEY_PREFIX = '@walletnow:mnemonic:';
const WALLET_VERSION_KEY = '@walletnow:wallet:version:';

/** Versão do tipo de carteira */
export type WalletVersion = 'bip39' | 'legacy';

/** Dados criptografados da mnemonic armazenados no localStorage */
interface EncryptedMnemonicData {
  ciphertext: string;
  iv: string;
  version: number; // versão do formato de vault (para migrações futuras)
  walletVersion: WalletVersion;
  createdAt: string; // ISO timestamp
}

/** Estado em memória volátil durante a sessão — limpa no logout */
let volatileMnemonic: string | null = null;

export const MnemonicVault = {

  /**
   * Salva a mnemonic criptografada no localStorage.
   * NUNCA salva em plaintext.
   *
   * @param mnemonic 12 palavras BIP39 separadas por espaço
   * @param userId ID do usuário Supabase (usado para derivar chave de encriptação)
   */
  async saveMnemonic(mnemonic: string, userId: string): Promise<void> {
    if (!userId || userId.trim() === '') {
      throw new Error('Falha de segurança: userId inválido para vault.');
    }

    // Validação básica: nunca salvar mnemonic vazia ou muito curta
    const words = mnemonic.trim().split(/\s+/);
    if (words.length < 12) {
      throw new Error('Mnemonic inválida: deve ter pelo menos 12 palavras.');
    }

    try {
      const encKey = await DeviceVault.generateEncryptionKey(userId);
      const encrypted = await DeviceVault.encryptSecret(mnemonic.trim(), encKey);

      const data: EncryptedMnemonicData = {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: 1,
        walletVersion: 'bip39',
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(`${MNEMONIC_KEY_PREFIX}${userId}`, JSON.stringify(data));
      localStorage.setItem(`${WALLET_VERSION_KEY}${userId}`, 'bip39');

      // Manter em memória volátil para acesso imediato na sessão
      volatileMnemonic = mnemonic.trim();

      // Intencionalmente sem log de sucesso para não vazar timing info
    } catch (err) {
      logger.error('[MnemonicVault]', 'Falha ao salvar mnemonic criptografada', err);
      throw new Error('Falha ao salvar frase de recuperação. Tente novamente.', { cause: err });
    }
  },

  /**
   * Carrega e descriptografa a mnemonic do localStorage.
   * Se já estiver em memória volátil, retorna diretamente (evita re-derivação de chave).
   *
   * @param userId ID do usuário Supabase
   * @returns mnemonic descriptografada ou null se não existir
   */
  async loadMnemonic(userId: string): Promise<string | null> {
    // Fast path: se já está em memória volátil, retorna imediatamente
    if (volatileMnemonic) {
      return volatileMnemonic;
    }

    const raw = localStorage.getItem(`${MNEMONIC_KEY_PREFIX}${userId}`);
    if (!raw) {
      return null; // Carteira legada ou sem mnemonic
    }

    try {
      const data: EncryptedMnemonicData = JSON.parse(raw);
      const encKey = await DeviceVault.generateEncryptionKey(userId);
      const mnemonic = await DeviceVault.decryptSecret(data.ciphertext, data.iv, encKey);

      // Atualiza memória volátil
      volatileMnemonic = mnemonic;
      return mnemonic;
    } catch (err) {
      logger.error('[MnemonicVault]', 'Falha ao descriptografar mnemonic', err);
      return null;
    }
  },

  /**
   * Verifica se o usuário tem uma mnemonic salva (é carteira BIP39).
   *
   * @param userId ID do usuário Supabase
   * @returns true se tem mnemonic armazenada
   */
  hasMnemonic(userId: string): boolean {
    return localStorage.getItem(`${MNEMONIC_KEY_PREFIX}${userId}`) !== null;
  },

  /**
   * Retorna a versão da carteira do usuário.
   *
   * @param userId ID do usuário Supabase
   * @returns 'bip39' | 'legacy' | null (sem carteira)
   */
  getWalletVersion(userId: string): WalletVersion | null {
    const version = localStorage.getItem(`${WALLET_VERSION_KEY}${userId}`);
    if (version === 'bip39') return 'bip39';
    if (version === 'legacy') return 'legacy';

    // Inferir a partir de localStorage (compatibilidade com wallets antigas)
    const hasSecret = localStorage.getItem(`@walletnow:secret:${userId}`) !== null;
    if (hasSecret) return 'legacy';

    return null;
  },

  /**
   * Marca uma carteira como legada (criada antes da feature BIP39).
   * Chamado durante o provisionamento de wallets novas para compatibilidade.
   *
   * @param userId ID do usuário Supabase
   */
  markAsLegacy(userId: string): void {
    // Só marca como legacy se ainda não tiver versão definida
    if (!localStorage.getItem(`${WALLET_VERSION_KEY}${userId}`)) {
      localStorage.setItem(`${WALLET_VERSION_KEY}${userId}`, 'legacy');
    }
  },

  /**
   * Limpa a mnemonic da memória volátil.
   * DEVE ser chamado no logout para garantir que a seed não vaza entre sessões.
   */
  clearSensitiveMnemonicMemory(): void {
    volatileMnemonic = null;
    logger.info('[MnemonicVault]', 'Memória da mnemonic apagada.');
  },

  /**
   * Remove completamente a mnemonic do localStorage e da memória.
   * USAR COM EXTREMA CAUTELA — o usuário perderá acesso à seed phrase.
   *
   * @param userId ID do usuário Supabase
   */
  deleteMnemonic(userId: string): void {
    localStorage.removeItem(`${MNEMONIC_KEY_PREFIX}${userId}`);
    localStorage.removeItem(`${WALLET_VERSION_KEY}${userId}`);
    volatileMnemonic = null;
    logger.info('[MnemonicVault]', 'Mnemonic removida do vault local.');
  },
};
