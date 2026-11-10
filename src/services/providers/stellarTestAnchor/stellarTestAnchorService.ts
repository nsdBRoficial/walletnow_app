/**
 * @module src\services\providers\stellarTestAnchor\stellarTestAnchorService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module Services/Providers/StellarTestAnchor
 *
 * StellarTestAnchorService — Serviço de Liquidação On-Chain de XLM Nativo
 *
 * Responsabilidade Arquitetural (SRP):
 * Orquestrar e assinar a transação de pagamento on-chain da conta de tesouraria
 * (Treasury Hot Wallet) para a carteira de autocustódia do usuário na rede Stellar Testnet.
 *
 * Mecanismos de Robustez:
 * - Trava de concorrência em memória (`settlementLock`) para mitigar ataques de double-spending ou retries concorrentes.
 * - Suporte a Memo Text para rastreabilidade de correlação com o gateway bancário (Woovi).
 * - Decodificação e tratamento granular de erros XDR de resposta do Horizon (`decodeHorizonResultXdr`).
 *
 * @updated Setembro de 2026
 */

import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Networks,
  Asset,
  Operation,
  Memo,
} from '@stellar/stellar-sdk';
import { logger } from '../../../utils/logger';
import { decodeHorizonResultXdr } from '../../../utils/decodeHorizonResultXdr';
import { StellarNetwork } from '../../../config/stellarNetwork';

const HORIZON_URL = StellarNetwork.horizonUrl;

const isTreasuryConfigured = (): boolean => {
  return !!import.meta.env.VITE_STELLAR_TREASURY_SECRET;
};

const getTreasurySecret = (): string => {
  return import.meta.env.VITE_STELLAR_TREASURY_SECRET || '';
};

/** Trava de concorrência para prevenir double-settlement */
const settlementLock = new Set<string>();

/** Resultado do processo de settlement */
export interface SettlementResult {
  success: boolean;
  txHash?: string;
  ledger?: number;
  error?: string;
}

/**
 * StellarTestAnchorService
 *
 * Orquestrador de settlement Stellar para o provider TestAnchor (XLM).
 */
export const StellarTestAnchorService = {

  /**
   * Executa o settlement real de XLM da treasury wallet → carteira do usuário.
   *
   * @param userPublicKey Chave pública G... do destinatário
   * @param amount Valor em string (ex: "10.00")
   * @param correlationID ID da cobrança Woovi para Memo X402
   */
  async settleXLM(
    userPublicKey: string,
    amount: string,
    correlationID: string
  ): Promise<SettlementResult> {
    // Prevenção de double-settlement
    const lockKey = `xlm_settle_${correlationID}`;
    if (settlementLock.has(lockKey)) {
      logger.warn(
        '[WalletNow][TestAnchor]',
        `⚠️ Double-settlement bloqueado para: ${correlationID}`
      );
      return { success: false, error: 'Settlement já em andamento para este pagamento.' };
    }
    settlementLock.add(lockKey);

    const treasuryPublicKey = isTreasuryConfigured()
      ? Keypair.fromSecret(getTreasurySecret()).publicKey()
      : 'N/A';

    try {
      if (!isTreasuryConfigured()) {
        throw new Error(
          'Treasury wallet não configurada. Adicione VITE_STELLAR_TREASURY_SECRET ao .env.'
        );
      }

      const treasurySecret = getTreasurySecret();
      const server = new Horizon.Server(HORIZON_URL);
      const treasuryKeypair = Keypair.fromSecret(treasurySecret);
      const actualTreasuryPubKey = treasuryKeypair.publicKey();

      logger.info(
        '[WalletNow][TestAnchor]',
        `🚀 Iniciando settlement XLM → ${userPublicKey.slice(0, 8)}... | Valor: ${amount} XLM | X402: ${correlationID}`
      );

      // --- LOG SALDOS ANTES ---
      const treasuryAccountBefore = await server.loadAccount(actualTreasuryPubKey);
      const treasuryBalanceBefore = treasuryAccountBefore.balances.find((b: any) => b.asset_type === 'native');
      
      let userBalanceBefore = '0.0000000';
      try {
        const userAccountBefore = await server.loadAccount(userPublicKey);
        const uBalance = userAccountBefore.balances.find((b: any) => b.asset_type === 'native');
        if (uBalance) userBalanceBefore = uBalance.balance;
      } catch (e: any) {
        logger.warn('[WalletNow][TestAnchor]', `Conta do usuário não encontrada (ainda não ativada?): ${e.message}`);
      }

      logger.info('[WalletNow][Settlement]', 'Saldos ANTES do settlement:', {
        treasury_xlm: treasuryBalanceBefore?.balance || '0.0000000',
        user_xlm: userBalanceBefore,
      });

      // --- CRIAÇíO DA TRANSAÇíO ---
      // Memo X402 para rastreabilidade
      const x402Memo = Memo.text(`X402:${correlationID.slice(0, 22)}`);

      // Payment Operation com Asset.native()
      const paymentOperation = Operation.payment({
        destination: userPublicKey,
        asset: Asset.native(),
        amount: parseFloat(amount).toFixed(7),
      });

      logger.info('[WalletNow][TestAnchor]', `💸 Executando payment XLM: ${amount} XLM`);

      const transaction = new TransactionBuilder(treasuryAccountBefore, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
        memo: x402Memo,
      })
        .addOperation(paymentOperation)
        .setTimeout(30)
        .build();

      logger.info('[TreasuryDebug] Dados da Transação de Payment (XLM):', JSON.stringify({
        sourceAccount: actualTreasuryPubKey,
        destinationAccount: userPublicKey,
        amount: parseFloat(amount).toFixed(7),
        sequence: treasuryAccountBefore.sequenceNumber(),
        asset: 'native',
      }, null, 2));

      logger.info('[WalletNow][TestAnchor]', `Assinando transação com a Treasury Secret...`);
      transaction.sign(treasuryKeypair);

      logger.info('[WalletNow][TestAnchor]', `Submetendo transação ao Horizon da Testnet...`);
      const response = await server.submitTransaction(transaction);

      // --- LOG SALDOS DEPOIS ---
      const treasuryAccountAfter = await server.loadAccount(actualTreasuryPubKey);
      const treasuryBalanceAfter = treasuryAccountAfter.balances.find((b: any) => b.asset_type === 'native');
      
      let userBalanceAfter = '0.0000000';
      try {
        const userAccountAfter = await server.loadAccount(userPublicKey);
        const uBalance = userAccountAfter.balances.find((b: any) => b.asset_type === 'native');
        if (uBalance) userBalanceAfter = uBalance.balance;
      } catch (e) {
        logger.warn('[WalletNow][TestAnchor]', `Conta do usuário não encontrada após settlement.`);
      }

      logger.info('[WalletNow][Settlement]', 'Saldos DEPOIS do settlement:', {
        treasury_xlm: treasuryBalanceAfter?.balance || '0.0000000',
        user_xlm: userBalanceAfter,
      });

      logger.info(
        '[WalletNow][TestAnchor]',
        `✨ Settlement XLM concluído! Hash: ${response.hash} | Ledger: ${response.ledger} | X402: ${correlationID}`
      );

      return { success: true, txHash: response.hash, ledger: response.ledger };
    } catch (error: any) {
      const extras = error?.response?.data?.extras;
      const resultXdr = extras?.result_xdr;
      const resultCodes = extras?.result_codes;

      logger.error('[WalletNow][TestAnchor]', `❌ Erro capturado no submitTransaction.`);
      logger.error('[WalletNow][TestAnchor]', `Extras da Horizon:`, {
        resultCodes,
        resultXdr: resultXdr || 'N/A',
      });

      if (resultXdr) {
        logger.info('[Retry]', `Tentando decodificar result_xdr para auditoria profunda...`);
        const decodedXdr = decodeHorizonResultXdr(resultXdr);
        logger.error('[WalletNow][TestAnchor]', `Decodificação Completa do result_xdr:`, decodedXdr);
      }

      const errorMsg = resultCodes
        ? `Stellar TX=${resultCodes.transaction} | OPS=${resultCodes.operations?.join(',')}`
        : error.message;

      return { success: false, error: errorMsg };
    } finally {
      settlementLock.delete(lockKey);
    }
  },

  /**
   * Verifica o saldo de XLM da treasury wallet.
   */
  async getTreasuryBalance(): Promise<string> {
    try {
      if (!isTreasuryConfigured()) return '0.00';

      const server = new Horizon.Server(HORIZON_URL);
      const treasuryKeypair = Keypair.fromSecret(getTreasurySecret());
      const account = await server.loadAccount(treasuryKeypair.publicKey());

      const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');

      return xlmBalance ? xlmBalance.balance : '0.00';
    } catch {
      return '0.00';
    }
  },
};
