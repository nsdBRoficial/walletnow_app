import { ETHERFUSE_PROXY_ENDPOINT } from './etherfuseAssetConfig';
import { logger } from '../../../utils/logger';

// ─── Tipos de Request/Response da API Etherfuse ────────────────────────────

export interface EtherfuseCustomerResult {
  customerId: string;
  bankAccountId: string;
  kycUrl: string;
}

export interface EtherfuseQuoteResult {
  quoteId: string;
  sourceAmount: string;       // BRL
  destinationAmount: string;  // TESOURO
  exchangeRate: string;
  feeAmount: string;
  expiresAt: string;
}

export interface EtherfuseOrderResult {
  orderId: string;
  status: 'created' | 'funded' | 'completed' | 'failed' | 'refunded' | 'canceled';
  pixKey?: string;
  pixCode?: string;           // BR-Code / EMV copy-paste
  pixKeyType?: string;
  amountInFiat?: string;
  amountInTokens?: string;
  confirmedTxSignature?: string;
}

export type OnRampPhase =
  | 'idle'
  | 'registering'
  | 'kyc_required'
  | 'getting_quote'
  | 'quote_ready'
  | 'creating_order'
  | 'awaiting_pix'
  | 'settling'
  | 'completed'
  | 'failed';

// ─── Serviço On-Ramp Etherfuse ─────────────────────────────────────────────

/**
 * EtherfuseOnRampService
 *
 * Implementa o fluxo completo de on-ramp BRL → TESOURO via PIX.
 *
 * Fluxo:
 *  1. registerCustomer → obtém customerId + URL KYC
 *  2. KYC via iframe (feito na UI)
 *  3. getQuote → cotação BRL→TESOURO
 *  4. createOrder → instrução PIX retornada
 *  5. simulateFiatReceived (SANDBOX ONLY) → trigger do mint
 *  6. pollOrderStatus → aguarda 'completed'
 *
 * SEGURANÇA: Todas as chamadas passam pelo proxy Supabase (API Key server-side).
 */
export const EtherfuseOnRampService = {

  /**
   * Chama o proxy Edge Function. Internamente gerencia headers de autenticação.
   */
  async _call(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<unknown> {
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(ETHERFUSE_PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ endpoint, method, body }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Etherfuse API ${response.status}: ${text.substring(0, 200)}`);
    }
    const text = await response.text();
    if (!text) return undefined;
    return JSON.parse(text);
  },

  /**
   * Passo 1: Registra o cliente na Etherfuse e obtém URL de KYC.
   * Se o publicKey já estiver registrado (409), recupera o customer existente.
   */
  async registerCustomer(publicKey: string): Promise<EtherfuseCustomerResult> {
    const customerId = crypto.randomUUID();
    const bankAccountId = crypto.randomUUID();

    logger.info('[WalletNow][Etherfuse]', 'Registrando customer Etherfuse...', {
      publicKey: publicKey.substring(0, 8) + '...',
      customerId,
    });

    try {
      const result = (await this._call('/ramp/onboarding-url', 'POST', {
        customerId,
        bankAccountId,
        publicKey,
        blockchain: 'stellar',
      })) as { presigned_url: string };

      logger.info('[WalletNow][Etherfuse]', '✅ Customer registrado com sucesso.', { customerId });

      return {
        customerId,
        bankAccountId,
        kycUrl: result.presigned_url,
      };
    } catch (err: any) {
      // 409 = publicKey já registrado → extrair customerId existente da mensagem
      if (err.message?.includes('409') || err.message?.includes('already')) {
        logger.info('[WalletNow][Etherfuse]', 'PublicKey já registrada. Recuperando customer existente...', {});

        // Tentar extrair UUID da mensagem de erro (padrão Etherfuse: "see org: <uuid>")
        const match = err.message.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        const existingCustomerId = match ? match[1] : customerId;

        // Obter nova URL de KYC para o customer existente
        try {
          const newBankAccountId = crypto.randomUUID();
          const result = (await this._call('/ramp/onboarding-url', 'POST', {
            customerId: existingCustomerId,
            bankAccountId: newBankAccountId,
            publicKey,
            blockchain: 'stellar',
          })) as { presigned_url: string };
          return {
            customerId: existingCustomerId,
            bankAccountId: newBankAccountId,
            kycUrl: result.presigned_url,
          };
        } catch {
          // Fallback: retornar sem URL de KYC (pode já estar aprovado)
          return { customerId: existingCustomerId, bankAccountId: crypto.randomUUID(), kycUrl: '' };
        }
      }
      throw err;
    }
  },

  /**
   * Passo 2: Consulta status KYC do customer.
   */
  async getKycStatus(customerId: string, publicKey: string): Promise<string> {
    try {
      const result = (await this._call(
        `/ramp/customer/${customerId}/kyc/${publicKey}`
      )) as { status: string };
      logger.info('[WalletNow][Etherfuse]', `KYC Status: ${result.status}`, { customerId });
      return result.status;
    } catch {
      return 'not_started';
    }
  },

  /**
   * Passo 3: Solicita cotação BRL → TESOURO.
   * Quotes expiram em 2 minutos — solicitar imediatamente antes de criar a ordem.
   */
  async getQuote(customerId: string, publicKey: string, amountBRL: string): Promise<EtherfuseQuoteResult> {
    const quoteId = crypto.randomUUID();

    logger.info('[WalletNow][Treasury]', 'Solicitando cotação BRL → TESOURO...', {
      amountBRL,
      quoteId,
    });

    const result = (await this._call('/ramp/quote', 'POST', {
      quoteId,
      customerId,
      blockchain: 'stellar',
      quoteAssets: {
        type: 'onramp',
        sourceAsset: 'BRL',
        targetAsset: `TESOURO:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4`,
      },
      sourceAmount: amountBRL,
    })) as Record<string, string>;

    logger.info('[WalletNow][Treasury]', '✅ Quote recebida.', {
      sourceAmount: result.sourceAmount,
      destinationAmount: result.destinationAmount || result.destinationAmountAfterFee,
      rate: result.exchangeRate,
      fee: result.feeAmount,
      expiresAt: result.expiresAt,
    });

    return {
      quoteId: result.quoteId || quoteId,
      sourceAmount: result.sourceAmount,
      destinationAmount: result.destinationAmountAfterFee || result.destinationAmount || '0',
      exchangeRate: result.exchangeRate || '1',
      feeAmount: result.feeAmount || '0',
      expiresAt: result.expiresAt || new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    };
  },

  /**
   * Passo 4: Cria a ordem de on-ramp e retorna instruções PIX.
   */
  async createOrder(
    customerId: string,
    bankAccountId: string,
    quoteId: string,
    publicKey: string,
  ): Promise<EtherfuseOrderResult> {
    const orderId = crypto.randomUUID();

    logger.info('[WalletNow][Treasury]', 'Criando ordem on-ramp Etherfuse...', {
      orderId,
      customerId,
      quoteId,
    });

    const result = (await this._call('/ramp/order', 'POST', {
      orderId,
      bankAccountId,
      publicKey,
      quoteId,
    })) as Record<string, any>;

    // A resposta pode ser { onramp: {...} } ou direto
    const order = result.onramp || result;

    logger.info('[WalletNow][Treasury]', '✅ Ordem criada. Instruções PIX disponíveis.', {
      orderId: order.orderId || orderId,
      hasPixCode: !!order.depositPixCode,
      hasPixKey: !!order.depositPixKey,
    });

    return {
      orderId: order.orderId || orderId,
      status: order.status || 'created',
      pixKey: order.depositPixKey,
      pixCode: order.depositPixCode,
      pixKeyType: order.depositPixKeyType,
      amountInFiat: order.depositAmount || order.amountInFiat,
    };
  },

  /**
   * Passo 5 (SANDBOX ONLY): Simula o recebimento do pagamento PIX.
   * Em produção, o usuário realmente paga o PIX e o webhook é acionado.
   */
  async simulateFiatReceived(orderId: string): Promise<boolean> {
    logger.info('[WalletNow][Treasury]', '🧪 SANDBOX: Simulando PIX recebido...', { orderId });

    try {
      await this._call(`/ramp/order/${orderId}/simulate-fiat-received`, 'POST', {});
      logger.info('[WalletNow][Treasury]', '✅ SANDBOX: Simulação PIX enviada.', { orderId });
      return true;
    } catch (err: any) {
      logger.error('[WalletNow][Treasury]', '❌ SANDBOX: Falha ao simular PIX', err);
      return false;
    }
  },

  /**
   * Passo 6: Consulta o status da ordem até 'completed'.
   */
  async getOrderStatus(orderId: string): Promise<EtherfuseOrderResult | null> {
    try {
      const result = (await this._call(`/ramp/order/${orderId}`)) as Record<string, any>;
      return {
        orderId: result.orderId || orderId,
        status: result.status,
        amountInTokens: result.amountInTokens,
        confirmedTxSignature: result.confirmedTxSignature,
        pixKey: result.depositPixKey,
        pixCode: result.depositPixCode,
        amountInFiat: result.amountInFiat || result.depositAmount,
      };
    } catch {
      return null;
    }
  },

  /**
   * Polling com timeout: aguarda até a ordem ser 'completed' ou 'failed'.
   * Retorna o resultado final ou null se timeout.
   *
   * @param orderId - ID da ordem a monitorar
   * @param onStatus - callback chamado a cada atualização de status
   * @param maxWaitMs - tempo máximo de espera em ms (default: 60s)
   */
  async pollUntilCompleted(
    orderId: string,
    onStatus?: (status: string) => void,
    maxWaitMs = 60_000,
  ): Promise<EtherfuseOrderResult | null> {
    const INTERVAL_MS = 3_000;
    const startTime = Date.now();

    logger.info('[WalletNow][Treasury]', 'Iniciando polling de status da ordem...', { orderId });

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, INTERVAL_MS));

      const order = await this.getOrderStatus(orderId);
      if (!order) continue;

      logger.info('[WalletNow][Treasury]', `Order status: ${order.status}`, {
        orderId,
        elapsed: Math.round((Date.now() - startTime) / 1000) + 's',
      });

      onStatus?.(order.status);

      if (order.status === 'completed') {
        logger.info('[WalletNow][Treasury]', '🎉 Ordem completada! TESOURO recebido.', {
          orderId,
          txSignature: order.confirmedTxSignature,
        });
        return order;
      }

      if (order.status === 'failed' || order.status === 'canceled') {
        logger.error('[WalletNow][Treasury]', `❌ Ordem ${order.status}`, { orderId });
        return order;
      }
    }

    logger.error('[WalletNow][Treasury]', '⏱️ Timeout aguardando confirmação da ordem', { orderId });
    return null;
  },
};
