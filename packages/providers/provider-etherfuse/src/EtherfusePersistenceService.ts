/**
 * @module packages/providers/provider-etherfuse/src/EtherfusePersistenceService.ts
 * @description Infraestrutura de provedores (@walletnow/providers - EtherfusePersistenceService) — registro, barramento de eventos e adaptadores externos (exporta: EtherfusePersistenceService).
 */
/**
 * @walletnow/provider-etherfuse — EtherfusePersistenceService
 *
 * Persiste dados de onboarding do customer no localStorage do browser.
 * Sem dependências externas — apenas localStorage (browser API).
 */

import type { EfV2PersistenceData } from './etherfuse.types.js';

const STORAGE_PREFIX = 'walletnow_ef2_';
const CURRENT_VERSION = 1;

export const EtherfusePersistenceService = {
  /**
   * Salva os dados de onboarding da Etherfuse localmente (V2).
   */
  saveCustomer(publicKey: string, customerId: string, bankAccountId: string): void {
    const data: EfV2PersistenceData = {
      version: CURRENT_VERSION,
      customerId,
      bankAccountId,
      createdAt: new Date().toISOString(),
      walletPublicKey: publicKey,
    };
    localStorage.setItem(`${STORAGE_PREFIX}${publicKey}`, JSON.stringify(data));
  },

  /**
   * Recupera os dados do onboarding (V2).
   */
  getCustomer(publicKey: string): EfV2PersistenceData | null {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${publicKey}`);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as EfV2PersistenceData;
      if (data.version !== CURRENT_VERSION || data.walletPublicKey !== publicKey) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Remove a identidade local do cache.
   */
  clearCustomer(publicKey: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${publicKey}`);
  },
};
