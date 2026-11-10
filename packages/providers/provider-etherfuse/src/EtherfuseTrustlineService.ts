/**
 * @module packages/providers/provider-etherfuse/src/EtherfuseTrustlineService.ts
 * @description Infraestrutura de provedores (@walletnow/providers - EtherfuseTrustlineService) — registro, barramento de eventos e adaptadores externos (exporta: EtherfuseTrustlineService).
 */
/**
 * @walletnow/provider-etherfuse — EtherfuseTrustlineService
 *
 * Serviço REAL de Trustline para o ativo TESOURO da Etherfuse.
 *
 * IMPORTANTE: Este serviço assina transações localmente no browser usando a
 * secret key do usuário. A secretKey NUNCA é enviada ao servidor.
 *
 * Asset: TESOURO
 * Issuer: GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4
 * Network: Stellar Testnet (Sandbox Etherfuse)
 */

import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { ETHERFUSE_ASSET_CONFIG, ETHERFUSE_HORIZON_URL } from './etherfuse.config.js';
import type { TrustlineResult } from './etherfuse.types.js';

const TIMEOUT_SECONDS = 180;
const BASE_FEE = '100000'; // 0.01 XLM — prioritized fee

export const EtherfuseTrustlineService = {
  /**
   * Verifica se a trustline do TESOURO já existe para a conta do usuário.
   * Chama o Horizon diretamente — operação de leitura segura.
   */
  async checkTrustlineExists(publicKey: string): Promise<boolean> {
    try {
      const server = new Horizon.Server(ETHERFUSE_HORIZON_URL);
      const account = await server.loadAccount(publicKey);

       
      const hasTrustline = account.balances.some((b: any) =>
        b.asset_type !== 'native' &&
        b.asset_code === ETHERFUSE_ASSET_CONFIG.assetCode &&
        b.asset_issuer === ETHERFUSE_ASSET_CONFIG.issuer,
      );

      console.info(
        '[WalletNow][Trustline]',
        `Trustline ${ETHERFUSE_ASSET_CONFIG.assetCode} existe: ${hasTrustline}`,
      );
      return hasTrustline;
    } catch (error) {
      console.error('[WalletNow][Trustline] Erro ao verificar trustline', error);
      return false;
    }
  },

  /**
   * Constrói, assina e submete uma transação changeTrust REAL na Stellar Testnet.
   *
   * SEGURANÇA: A secretKey nunca sai do browser. A assinatura é feita
   * localmente via Stellar SDK. Apenas o XDR assinado é enviado ao Horizon.
   *
   * @param publicKey - Stellar public key G...
   * @param secretKey - Stellar secret key S... (armazenada localmente)
   */
  async createTrustline(publicKey: string, secretKey: string): Promise<TrustlineResult> {
    try {
      const exists = await this.checkTrustlineExists(publicKey);
      if (exists) {
        return { success: true, alreadyExists: true };
      }

      const server = new Horizon.Server(ETHERFUSE_HORIZON_URL);
      const account = await server.loadAccount(publicKey);

      const tesouroAsset = new Asset(
        ETHERFUSE_ASSET_CONFIG.assetCode,
        ETHERFUSE_ASSET_CONFIG.issuer,
      );

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: tesouroAsset,
          }),
        )
        .setTimeout(TIMEOUT_SECONDS)
        .build();

      const keypair = Keypair.fromSecret(secretKey);
      transaction.sign(keypair);

      const result = await server.submitTransaction(transaction);
      const hash = result.hash;
      const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${hash}`;

      console.info(
        '[WalletNow][Trustline]',
        `✅ Trustline ${ETHERFUSE_ASSET_CONFIG.assetCode} criada!`,
        { hash, explorerUrl },
      );

      return { success: true, transactionHash: hash, explorerUrl };
    } catch (error: unknown) {
       
      const e = error as any;
      const message =
        e?.response?.data?.extras?.result_codes?.operations?.[0] ??
        e?.response?.data?.title ??
        e?.message ??
        'Erro desconhecido ao criar trustline';

      console.error(
        '[WalletNow][Trustline]',
        `❌ Falha ao criar trustline ${ETHERFUSE_ASSET_CONFIG.assetCode}`,
        { error: message },
      );

      return { success: false, error: message };
    }
  },
};
