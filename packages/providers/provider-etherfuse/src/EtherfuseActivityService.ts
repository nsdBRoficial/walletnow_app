/**
 * @module packages/providers/provider-etherfuse/src/EtherfuseActivityService.ts
 * @description Infraestrutura de provedores (@walletnow/providers - EtherfuseActivityService) — registro, barramento de eventos e adaptadores externos (exporta: EtherfuseActivityService).
 */
/**
 * @walletnow/provider-etherfuse — EtherfuseActivityService
 *
 * Gerencia histórico de atividades (ordens) no localStorage
 * e consulta transações de TESOURO via Horizon Stellar (fallback).
 */

import { Horizon } from '@stellar/stellar-sdk';
import type { EfV2Activity } from './etherfuse.types.js';
import { ETHERFUSE_HORIZON_URL } from './etherfuse.config.js';

const STORAGE_PREFIX = 'walletnow_ef2_activity_';
const TESOURO_ISSUER = 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';

export const EtherfuseActivityService = {
  /**
   * Salva uma nova atividade no histórico local persistente da carteira.
   */
  saveActivity(publicKey: string, activity: EfV2Activity): void {
    const activities = this.getActivities(publicKey);

    const existingIndex = activities.findIndex((a) => a.orderId === activity.orderId);
    if (existingIndex >= 0) {
      activities[existingIndex] = activity;
    } else {
      activities.unshift(activity);
    }

    try {
      localStorage.setItem(`${STORAGE_PREFIX}${publicKey}`, JSON.stringify(activities));
    } catch (e) {
      console.error('[WalletNow][EtherfuseActivity] Failed to save activity', String(e));
    }
  },

  /**
   * Recupera todo o histórico salvo localmente.
   */
  getActivities(publicKey: string): EfV2Activity[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${publicKey}`);
      if (!raw) return [];
      return JSON.parse(raw) as EfV2Activity[];
    } catch {
      return [];
    }
  },

  /**
   * Tenta localizar a transação on-chain mais recente de recebimento de TESOURO
   * na carteira via Horizon (fallback quando Etherfuse não retorna o txHash).
   *
   * Faz até 5 tentativas com intervalo de 3s entre elas para aguardar indexação.
   */
  async findLatestTesouroTransaction(publicKey: string): Promise<{
    txHash: string;
    explorerUrl: string;
    createdAt: string;
  } | null> {
    console.info('[WalletNow][EtherfuseActivity] Searching settlement transaction via Horizon', {
      publicKey,
    });

    const server = new Horizon.Server(ETHERFUSE_HORIZON_URL);

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const page = await server
          .operations()
          .forAccount(publicKey)
          .limit(20)
          .order('desc')
          .call();

        for (const record of page.records) {
           
          const r = record as any;
          const asset_code: string | null = r.asset_code ?? r.source_asset_code ?? null;
          const asset_issuer: string | null = r.asset_issuer ?? r.source_asset_issuer ?? null;

          const matchesStructure =
            asset_code === 'TESOURO' ||
            asset_issuer === TESOURO_ISSUER ||
            r.buying_asset_code === 'TESOURO' ||
            r.selling_asset_code === 'TESOURO';

          const serialized = JSON.stringify(record);
          const matchesSerialization =
            serialized.includes('TESOURO') || serialized.includes(TESOURO_ISSUER);

          if (matchesStructure || matchesSerialization) {
            const txHash: string = record.transaction_hash;
            const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
            return { txHash, explorerUrl, createdAt: record.created_at };
          }
        }

        console.warn(
          `[WalletNow][EtherfuseActivity] TESOURO tx not found — attempt ${attempt}/5`,
        );

        if (attempt < 5) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error(
          `[WalletNow][EtherfuseActivity] Horizon fallback failed — attempt ${attempt}`,
          String(err),
        );
        if (attempt < 5) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    console.warn('[WalletNow][EtherfuseActivity] No TESOURO deposit found after all attempts.');
    return null;
  },
};
