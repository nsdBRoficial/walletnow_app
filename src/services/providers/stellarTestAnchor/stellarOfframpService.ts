/**
 * @module src/services/providers/stellarTestAnchor/stellarOfframpService.ts
 * @description Provedor Stellar Test Anchor (stellarOfframpService) — autenticação SEP-10, rampas interativas SEP-24 e liquidação XLM/SRT (exporta: OfframpSession, OfframpStatus, OfframpInfo, StellarOfframpService).
 */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Keypair, Transaction, Networks, Asset } from '@stellar/stellar-sdk';
import { logger } from '../../../utils/logger';

const ANCHOR_DOMAIN = 'testanchor.stellar.org';
const TOML_URL = `https://${ANCHOR_DOMAIN}/.well-known/stellar.toml`;

export interface OfframpSession {
  id: string;
  url: string;
}

export interface OfframpStatus {
  status: string;
  amount_in?: string;
  amount_out?: string;
  message?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
}

export interface OfframpInfo {
  enabled: boolean;
  min_amount: number;
  max_amount: number;
}

export const StellarOfframpService = {
  /**
   * Resolve o stellar.toml do Anchor para descobrir endpoints.
   */
  async getAnchorEndpoints() {
    logger.info('[WalletNow][Anchor]', `Resolvendo TOML de ${ANCHOR_DOMAIN}...`);
    const res = await fetch(TOML_URL);
    if (!res.ok) throw new Error('Falha ao buscar stellar.toml');
    const text = await res.text();

    const authEndpoint = text.match(/WEB_AUTH_ENDPOINT\s*=\s*"(.*?)"/)?.[1];
    const sep24Endpoint = text.match(/TRANSFER_SERVER_SEP0024\s*=\s*"(.*?)"/)?.[1];
    const sep6Endpoint = text.match(/TRANSFER_SERVER\s*=\s*"(.*?)"/)?.[1];

    if (!authEndpoint || !sep24Endpoint) {
      throw new Error('Endpoints SEP-10/SEP-24 não encontrados no stellar.toml');
    }

    return { authEndpoint, sep24Endpoint, sep6Endpoint };
  },

  /**
   * Consulta as capacidades e limites do Anchor (SEP-24 /info)
   */
  async getAnchorInfo(sep24Endpoint: string, assetCode: string = 'native'): Promise<OfframpInfo> {
    logger.info('[WalletNow][Anchor]', `Consultando limites para ${assetCode} no endpoint /info...`);
    const res = await fetch(`${sep24Endpoint}/info`);
    
    if (!res.ok) {
      throw new Error(`Falha ao consultar /info: HTTP ${res.status}`);
    }

    const data = await res.json();
    logger.info('[WalletNow][Anchor]', 'Resposta do /info:', JSON.stringify(data, null, 2));

    const withdrawInfo = data?.withdraw?.[assetCode];
    if (!withdrawInfo || !withdrawInfo.enabled) {
      throw new Error(`Asset ${assetCode} não está habilitado para saque neste Anchor.`);
    }

    return {
      enabled: withdrawInfo.enabled,
      min_amount: Number(withdrawInfo.min_amount) || 0,
      max_amount: Number(withdrawInfo.max_amount) || Infinity
    };
  },

  /**
   * Autenticação SEP-10 usando a chave secreta do usuário.
   */
  async authenticate(userPublicKey: string, userSecret: string, authEndpoint: string): Promise<string> {
    logger.info('[WalletNow][Anchor]', 'Iniciando autenticação SEP-10...');
    
    // 1. Obter desafio
    const challengeRes = await fetch(`${authEndpoint}?account=${userPublicKey}`);
    const challengeData = await challengeRes.json();
    if (!challengeData.transaction) throw new Error('Falha ao obter desafio SEP-10');

    // 2. Assinar desafio
    const tx = new Transaction(challengeData.transaction, Networks.TESTNET);
    const keypair = Keypair.fromSecret(userSecret);
    tx.sign(keypair);
    const signedXdr = tx.toXDR();

    // 3. Obter token JWT
    logger.info('[WalletNow][Anchor]', 'Enviando desafio assinado...');
    const tokenRes = await fetch(authEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: signedXdr }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.token) throw new Error('Falha na resposta do token SEP-10');

    logger.info('[WalletNow][Anchor]', 'Autenticação SEP-10 concluída com sucesso.');
    return tokenData.token;
  },

  /**
   * Inicia o Withdraw via SEP-24
   */
  async initInteractiveWithdraw(userPublicKey: string, jwt: string, sep24Endpoint: string, amount: string): Promise<OfframpSession> {
    logger.info('[WalletNow][OffRamp]', `Iniciando sessão de withdraw (SEP-24) de ${amount} XLM...`);

    const formData = new FormData();
    formData.append('asset_code', 'native');
    formData.append('account', userPublicKey);
    formData.append('amount', amount);

    // Converte FormData para objeto para logar
    const formProps = Object.fromEntries(formData);
    logger.info('[WalletNow][OffRamp]', 'Enviando payload SEP-24:', JSON.stringify(formProps, null, 2));

    const res = await fetch(`${sep24Endpoint}/transactions/withdraw/interactive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      body: formData,
    });

    const data = await res.json();
    logger.info('[WalletNow][OffRamp]', `Resposta SEP-24 (HTTP ${res.status}):`, JSON.stringify(data, null, 2));

    if (!res.ok) {
      throw new Error(`Erro SEP-24 HTTP ${res.status}: ${data.error || JSON.stringify(data)}`);
    }

    logger.info('[WalletNow][OffRamp]', 'Sessão interativa gerada.', {
      id: data.id,
      url: data.url
    });

    return {
      id: data.id,
      url: data.url
    };
  },

  /**
   * Consulta o status da transação no Anchor.
   */
  async getTransactionStatus(transactionId: string, jwt: string, sep24Endpoint: string): Promise<OfframpStatus> {
    const res = await fetch(`${sep24Endpoint}/transaction?id=${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.transaction) {
      throw new Error(`Falha ao consultar status da transação. HTTP ${res.status}: ${JSON.stringify(data)}`);
    }

    return {
      status: data.transaction.status,
      amount_in: data.transaction.amount_in,
      amount_out: data.transaction.amount_out,
      message: data.transaction.message,
      withdraw_anchor_account: data.transaction.withdraw_anchor_account,
      withdraw_memo: data.transaction.withdraw_memo,
      withdraw_memo_type: data.transaction.withdraw_memo_type
    };
  }
};
