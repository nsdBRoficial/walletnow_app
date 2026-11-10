/**
 * @module src/services/providers/etherfuseV2/etherfuseActivityService.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseActivityService) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: EfV2Activity, EtherfuseActivityService).
 */
import { Horizon } from '@stellar/stellar-sdk';
import { logger } from '../../../utils/logger';
import { StellarNetwork } from '../../../config/stellarNetwork';

export interface EfV2Activity {
  orderId: string;
  txHash: string;
  explorerUrl: string;
  asset: string;
  amountBRL: string;
  amountToken: string;
  status: string;
  createdAt: string;
  completedAt: string;
  type: 'BUY TESOURO' | 'SELL TESOURO';
}

const STORAGE_PREFIX = 'walletnow_ef2_activity_';
const LOG_TAG = '[WalletNow][EtherfuseActivity]';

export const EtherfuseActivityService = {
  /**
   * Salva uma nova atividade no histórico local persistente da carteira.
   */
  saveActivity(publicKey: string, activity: EfV2Activity): void {
    const activities = this.getActivities(publicKey);
    
    // Evita duplicatas baseada na orderId
    const existingIndex = activities.findIndex(a => a.orderId === activity.orderId);
    if (existingIndex >= 0) {
      activities[existingIndex] = activity;
    } else {
      activities.unshift(activity); // Adiciona no início
    }

    try {
      localStorage.setItem(`${STORAGE_PREFIX}${publicKey}`, JSON.stringify(activities));
      logger.info(LOG_TAG, 'Activity saved locally', { orderId: activity.orderId });
    } catch (e) {
      logger.error(LOG_TAG, 'Failed to save activity', { error: String(e) });
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
   * Tenta localizar a transação on-chain mais recente de recebimento de TESOURO na carteira
   * caso a Etherfuse não retorne o txHash diretamente via API.
   */
  async findLatestTesouroTransaction(publicKey: string): Promise<{ txHash: string; explorerUrl: string; createdAt: string } | null> {
    logger.info(LOG_TAG, 'Searching settlement transaction via Horizon fallback', { publicKey });

    const TESOURO_ISSUER = 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';
    const server = StellarNetwork.createServer();

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        logger.info(LOG_TAG, `Attempt ${attempt}/5: Fetching operations from Horizon...`);
        
        const page = await server.operations()
          .forAccount(publicKey)
          .limit(20)
          .order('desc')
          .call();

        for (const record of page.records) {
          const type = record.type;
          const transaction_hash = record.transaction_hash;
          const created_at = record.created_at;
          const asset_code = (record as any).asset_code || (record as any).source_asset_code || null;
          const asset_issuer = (record as any).asset_issuer || (record as any).source_asset_issuer || null;

          // LOGAR TODAS AS OPERAÇÕES INSPECIONADAS
          logger.info(LOG_TAG, 'Inspecting operation', {
            id: record.id,
            type,
            transaction_hash,
            created_at,
            asset_code,
            asset_issuer
          });

          // 1. Validação estrutural
          const matchesStructure = 
            asset_code === 'TESOURO' ||
            asset_issuer === TESOURO_ISSUER ||
            (record as any).buying_asset_code === 'TESOURO' ||
            (record as any).selling_asset_code === 'TESOURO';

          // 2. Fallback resiliente via serialização JSON
          const serialized = JSON.stringify(record);
          const matchesSerialization = serialized.includes('TESOURO') || serialized.includes(TESOURO_ISSUER);

          if (matchesStructure || matchesSerialization) {
            logger.info(LOG_TAG, 'TESOURO transaction FOUND', { txHash: transaction_hash });

            const txHash = transaction_hash;
            const explorerUrl = StellarNetwork.getTxExplorerUrl(txHash);

            logger.info(LOG_TAG, 'Settlement operation found');
            logger.info(LOG_TAG, 'Stellar hash resolved', { txHash });
            logger.info(LOG_TAG, 'Explorer URL generated', { explorerUrl });
            logger.info(LOG_TAG, 'Activity persisted with tx hash', { txHash });

            return {
              txHash,
              explorerUrl,
              createdAt: created_at || new Date().toISOString()
            };
          }
        }

        logger.warn(LOG_TAG, `TESOURO transaction not found on this attempt (${attempt}/5)`);

        if (attempt < 5) {
          // Aguarda 3000ms antes da próxima tentativa para respeitar o delay de indexação
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err) {
        logger.error(LOG_TAG, `Horizon fallback search failed on attempt ${attempt}`, { error: String(err) });
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    logger.warn(LOG_TAG, 'No recent TESOURO deposit found via fallback after all attempts');
    return null;
  }
};
