import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { EtherfuseAssetConfig, ETHERFUSE_HORIZON_URL } from './etherfuseAssetConfig';
import { logger } from '../../../utils/logger';

const TIMEOUT_SECONDS = 180;
const BASE_FEE = '100000'; // 0.01 XLM — prioritized fee

/**
 * Resultado de uma operação de trustline.
 */
export interface TrustlineResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  alreadyExists?: boolean;
}

/**
 * Serviço REAL de Trustline para o ativo TESOURO da Etherfuse.
 *
 * IMPORTANTE: Este serviço assina transações localmente no browser usando a
 * secret key do usuário armazenada no localStorage (nunca enviada ao servidor).
 *
 * Asset: TESOURO
 * Issuer: GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4
 * Network: Stellar Testnet (Sandbox Etherfuse)
 */
export const EtherfuseTrustlineService = {
  /**
   * Verifica se a trustline do TESOURO já existe para a conta do usuário.
   * Chama o Horizon diretamente — operação de leitura segura.
   */
  async checkTrustlineExists(publicKey: string): Promise<boolean> {
    try {
      logger.info('[WalletNow][Trustline]', `Verificando trustline ${EtherfuseAssetConfig.assetCode} para ${publicKey.substring(0, 8)}...`);

      const server = new Horizon.Server(ETHERFUSE_HORIZON_URL);
      const account = await server.loadAccount(publicKey);

      const hasTrustline = account.balances.some((b: any) =>
        b.asset_type !== 'native' &&
        b.asset_code === EtherfuseAssetConfig.assetCode &&
        b.asset_issuer === EtherfuseAssetConfig.issuer
      );

      logger.info('[WalletNow][Trustline]', `Trustline ${EtherfuseAssetConfig.assetCode} existe: ${hasTrustline}`);
      return hasTrustline;
    } catch (error: any) {
      logger.error('[WalletNow][Trustline]', 'Erro ao verificar trustline', error);
      return false;
    }
  },

  /**
   * Constrói, assina e submete uma transação changeTrust REAL na Stellar Testnet.
   *
   * SEGURANÇA: A secretKey nunca sai do browser. A assinatura é feita
   * localmente via Stellar SDK. Apenas a transação assinada (XDR) é enviada ao Horizon.
   *
   * @param publicKey - Stellar public key do usuário
   * @param secretKey - Stellar secret key do usuário (armazenada localmente)
   * @returns TrustlineResult com hash da transação se bem-sucedida
   */
  async createTrustline(publicKey: string, secretKey: string): Promise<TrustlineResult> {
    try {
      logger.info('[WalletNow][Trustline]', `Iniciando criação de trustline REAL para ${EtherfuseAssetConfig.assetCode}`, {
        publicKey: publicKey.substring(0, 8) + '...',
        issuer: EtherfuseAssetConfig.issuer.substring(0, 8) + '...',
        network: 'TESTNET',
      });

      // 1. Verificar se já existe
      const exists = await this.checkTrustlineExists(publicKey);
      if (exists) {
        logger.info('[WalletNow][Trustline]', `Trustline ${EtherfuseAssetConfig.assetCode} já existe — nenhuma ação necessária.`);
        return { success: true, alreadyExists: true };
      }

      // 2. Carregar conta do Horizon para obter sequence number
      const server = new Horizon.Server(ETHERFUSE_HORIZON_URL);
      const account = await server.loadAccount(publicKey);

      // 3. Construir o ativo TESOURO com o issuer REAL
      const tesouroAsset = new Asset(
        EtherfuseAssetConfig.assetCode,
        EtherfuseAssetConfig.issuer
      );

      // 4. Construir a transação com operação changeTrust
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: tesouroAsset,
            // Limite padrão: máximo permitido pelo protocolo Stellar
          })
        )
        .setTimeout(TIMEOUT_SECONDS)
        .build();

      // 5. Assinar localmente com a secret key do usuário
      const keypair = Keypair.fromSecret(secretKey);
      transaction.sign(keypair);

      logger.info('[WalletNow][Trustline]', 'Transação construída e assinada localmente. Submetendo ao Horizon...');

      // 6. Submeter ao Horizon (Stellar Testnet)
      const result = await server.submitTransaction(transaction);

      const hash = result.hash;
      const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${hash}`;

      logger.info('[WalletNow][Treasury]', `✅ Trustline ${EtherfuseAssetConfig.assetCode} criada com sucesso!`, {
        hash,
        explorerUrl,
      });

      return {
        success: true,
        transactionHash: hash,
        explorerUrl,
      };
    } catch (error: any) {
      const message = error?.response?.data?.extras?.result_codes?.operations?.[0]
        || error?.response?.data?.title
        || error?.message
        || 'Erro desconhecido ao criar trustline';

      logger.error('[WalletNow][Trustline]', `❌ Falha ao criar trustline ${EtherfuseAssetConfig.assetCode}`, {
        error: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },
};
