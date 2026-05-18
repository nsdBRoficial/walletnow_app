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
  sourceAmount: string;            // BRL
  destinationAmount: string;       // TESOURO (após fee)
  exchangeRate: string;
  feeAmount: string;
  expiresAt: string;
  // Campo raw da API — identifier resolvido do asset (ex: "TESOURO:GC3CW...")
  resolvedTargetAsset?: string;
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
  | 'checking_kyc'
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
 * SEGURANÇA: Todas as chamadas passam pelo proxy Supabase (API Key server-side).
 *
 * CORREÇÕES APLICADAS (vs. versão anterior):
 *  1. createOrder usa `bankAccountId` REAL recuperado de getFiatAccounts
 *     (não um UUID sintético gerado localmente — a API rejeita UUIDs desconhecidos)
 *  2. getQuote usa o `identifier` resolvido via GET /ramp/assets
 *     (ex: "TESOURO:GC3CW7..." em vez do código puro)
 *  3. bankAccountId em onboarding-url é gerado fresh a cada chamada
 *     e deve ser recuperado da API após registro, não reutilizado
 */
export const EtherfuseOnRampService = {

  /**
   * Chama o proxy Edge Function. Retorna unknown — caller faz cast explícito.
   * Nunca engole erros: lança exceção com a mensagem completa da Etherfuse.
   */
  async _call(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<unknown> {
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Log completo para diagnóstico (sanitizar API key)
    logger.info('[WalletNow][EtherfuseProxy]', `► ${method} ${endpoint}`, {
      payload: body ? JSON.stringify(body).substring(0, 500) : '(nenhum)',
    });

    const response = await fetch(ETHERFUSE_PROXY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ endpoint, method, body }),
    });

    const responseText = await response.text();
    const statusIcon = response.ok ? '✅' : '❌';

    logger.info('[WalletNow][EtherfuseProxy]', `${statusIcon} ${method} ${endpoint} → HTTP ${response.status}`, {
      responseBody: responseText.substring(0, 1000),
    });

    if (!response.ok) {
      // Tentar parsear mensagem de erro estruturada da Etherfuse
      let errorMessage = `Etherfuse API ${response.status}: ${responseText.substring(0, 500)}`;
      try {
        const errJson = JSON.parse(responseText) as { error?: { code?: string; message?: string } | string };
        if (typeof errJson.error === 'object' && errJson.error?.message) {
          errorMessage = `[${errJson.error.code || 'ETHERFUSE_ERROR'}] ${errJson.error.message}`;
        } else if (typeof errJson.error === 'string') {
          errorMessage = errJson.error;
        }
      } catch {
        // response não é JSON
      }
      logger.error('[WalletNow][EtherfuseProxy]', `Erro HTTP ${response.status} em ${endpoint}`, {
        errorMessage,
        fullResponse: responseText,
      });
      throw new Error(errorMessage);
    }

    if (!responseText) return undefined;
    return JSON.parse(responseText);
  },

  // ─── PASSO 0 (Diagnóstico): Buscar assets disponíveis ──────────────────────

  /**
   * GET /ramp/assets — Lista os assets disponíveis e seus `identifier`s completos.
   * Necessário para obter o identifier correto do TESOURO (ex: "TESOURO:GC3CW7...").
   * A API Etherfuse usa o identifier completo nos quoteAssets, não apenas o código.
   */
  async getAssets(blockchain = 'stellar', currency = 'brl', wallet = ''): Promise<{
    assets: Array<{ symbol: string; identifier: string; name: string; currency: string | null }>
  }> {
    const params = new URLSearchParams({ blockchain, currency, wallet });
    const result = (await this._call(`/ramp/assets?${params.toString()}`)) as Record<string, unknown>;
    logger.info('[WalletNow][Treasury]', '📋 Assets disponíveis na Etherfuse:', { result: JSON.stringify(result) });
    return result as { assets: Array<{ symbol: string; identifier: string; name: string; currency: string | null }> };
  },

  // ─── PASSO 0b (Diagnóstico): Verificar status KYC atual ───────────────────

  /**
   * GET /ramp/customer/{customerId}/kyc/{publicKey}
   * Crucial: a Etherfuse sandbox requer KYC aprovado antes de createOrder.
   * Status possíveis: not_started | proposed | approved | approved_chain_deploying | rejected
   */
  async getKycStatus(customerId: string, publicKey: string): Promise<{
    status: string;
    onChainMarked?: boolean;
    currentRejectionReason?: string | null;
  }> {
    logger.info('[WalletNow][Treasury]', 'Verificando status KYC...', { customerId });
    try {
      const result = (await this._call(
        `/ramp/customer/${customerId}/kyc/${publicKey}`
      )) as { status: string; onChainMarked?: boolean; currentRejectionReason?: string | null };
      logger.info('[WalletNow][Treasury]', `KYC Status: ${result.status}`, {
        customerId,
        onChainMarked: result.onChainMarked,
        rejection: result.currentRejectionReason,
      });
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error('[WalletNow][Treasury]', 'Erro ao verificar KYC', { error: msg });
      return { status: 'not_started' };
    }
  },

  // ─── PASSO 0c (Diagnóstico): Listar bank accounts reais do customer ────────

  /**
   * POST /ramp/customer/{customerId}/bank-accounts
   * CRÍTICO: O bankAccountId enviado em createOrder DEVE existir na Etherfuse.
   * UUIDs gerados localmente no frontend causam HTTP 400 "bankAccountId not found".
   */
  async getFiatAccounts(customerId: string): Promise<Array<{
    bankAccountId: string;
    status: string;
    pixKey?: string;
    pixKeyType?: string;
    accountHolderName?: string;
    compliant?: boolean;
    createdAt?: string;
  }>> {
    logger.info('[WalletNow][Treasury]', 'Buscando bank accounts do customer...', { customerId });
    try {
      const result = (await this._call(
        `/ramp/customer/${customerId}/bank-accounts`,
        'POST',
        { pageSize: 100, pageNumber: 0 }
      )) as { items?: Array<Record<string, unknown>>; totalItems?: number };

      const accounts = (result.items || []) as Array<{
        bankAccountId: string;
        status: string;
        pixKey?: string;
        pixKeyType?: string;
        accountHolderName?: string;
        compliant?: boolean;
        createdAt?: string;
      }>;

      logger.info('[WalletNow][Treasury]', `✅ ${accounts.length} bank account(s) encontrados`, {
        accounts: JSON.stringify(accounts.map(a => ({
          id: a.bankAccountId,
          status: a.status,
          compliant: a.compliant,
          pixKey: a.pixKey ? a.pixKey.substring(0, 8) + '...' : null,
        }))),
      });
      return accounts;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error('[WalletNow][Treasury]', 'Erro ao buscar bank accounts', { error: msg });
      return [];
    }
  },

  // ─── PASSO 1: Registrar customer ───────────────────────────────────────────

  /**
   * POST /ramp/onboarding-url — Registra o cliente na Etherfuse.
   *
   * NOTA DE SEGURANÇA: O bankAccountId aqui é um UUID TEMPORÁRIO apenas para
   * iniciar o fluxo de KYC. O bankAccountId REAL para createOrder é obtido
   * via getFiatAccounts() após o KYC ser completado.
   */
  async registerCustomer(publicKey: string): Promise<EtherfuseCustomerResult> {
    const customerId = crypto.randomUUID();
    const bankAccountId = crypto.randomUUID(); // apenas para onboarding-url

    logger.info('[WalletNow][Etherfuse]', 'Registrando customer Etherfuse...', {
      publicKey: publicKey.substring(0, 8) + '...',
      customerId,
      bankAccountId,
    });

    try {
      const result = (await this._call('/ramp/onboarding-url', 'POST', {
        customerId,
        bankAccountId,
        publicKey,
        blockchain: 'stellar',
      })) as { presigned_url: string };

      logger.info('[WalletNow][Etherfuse]', '✅ Customer registrado com sucesso.', {
        customerId,
        hasKycUrl: !!result.presigned_url,
      });

      return {
        customerId,
        bankAccountId, // ATENÇÃO: este não é o bankAccountId real para createOrder
        kycUrl: result.presigned_url,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';

      // 409 = publicKey já registrada → recuperar customerId existente
      if (msg.includes('409') || msg.toLowerCase().includes('already')) {
        logger.info('[WalletNow][Etherfuse]', 'PublicKey já registrada. Recuperando customer existente...', {});

        const match = msg.match(/see org:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
          || msg.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        const existingCustomerId = match ? match[1] : customerId;

        logger.info('[WalletNow][Etherfuse]', `Customer existente encontrado: ${existingCustomerId}`, {});

        // Gerar nova URL de KYC para customer existente
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
        } catch (innerErr: unknown) {
          const innerMsg = innerErr instanceof Error ? innerErr.message : 'unknown';
          logger.warn('[WalletNow][Etherfuse]', 'Não foi possível obter nova URL KYC. Customer pode já estar aprovado.', { error: innerMsg });
          return { customerId: existingCustomerId, bankAccountId: crypto.randomUUID(), kycUrl: '' };
        }
      }
      throw err;
    }
  },

  // ─── PASSO 2: Obter cotação ─────────────────────────────────────────────────

  /**
   * POST /ramp/quote — Obtém cotação BRL → TESOURO.
   *
   * CORREÇÃO CRÍTICA: O `targetAsset` deve usar o `identifier` completo retornado
   * por GET /ramp/assets (ex: "TESOURO:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4"),
   * não apenas o código "TESOURO".
   *
   * Quotes expiram em ~2 minutos — createOrder deve ser chamado imediatamente após.
   */
  async getQuote(customerId: string, publicKey: string, amountBRL: string): Promise<EtherfuseQuoteResult> {
    const quoteId = crypto.randomUUID();

    logger.info('[WalletNow][Treasury]', 'Solicitando cotação BRL → TESOURO...', {
      amountBRL,
      customerId: customerId.substring(0, 8) + '...',
      quoteId,
    });

    // Passo 1: Resolver o identifier completo do TESOURO via /ramp/assets
    let resolvedTargetAsset = 'TESOURO:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';
    try {
      const assetsResponse = await this.getAssets('stellar', 'brl', publicKey);
      const tesouro = assetsResponse.assets.find(a => a.symbol === 'TESOURO');
      if (tesouro?.identifier) {
        resolvedTargetAsset = tesouro.identifier;
        logger.info('[WalletNow][Treasury]', `✅ TESOURO identifier resolvido: ${resolvedTargetAsset}`, {});
      } else {
        logger.warn('[WalletNow][Treasury]', 'TESOURO não encontrado em /ramp/assets. Usando identifier hardcoded.', {
          assetsFound: assetsResponse.assets.map(a => a.symbol),
        });
      }
    } catch (assetsErr: unknown) {
      const msg = assetsErr instanceof Error ? assetsErr.message : 'unknown';
      logger.warn('[WalletNow][Treasury]', 'Falha ao resolver assets. Usando identifier hardcoded.', { error: msg });
    }

    const result = (await this._call('/ramp/quote', 'POST', {
      quoteId,
      customerId,
      blockchain: 'stellar',
      quoteAssets: {
        type: 'onramp',
        sourceAsset: 'BRL',
        targetAsset: resolvedTargetAsset,
      },
      sourceAmount: String(amountBRL),
    })) as Record<string, unknown>;

    logger.info('[WalletNow][Treasury]', '✅ Quote recebida.', {
      quoteId: result.quoteId,
      sourceAmount: result.sourceAmount,
      destinationAmount: result.destinationAmountAfterFee || result.destinationAmount,
      rate: result.exchangeRate,
      fee: result.feeAmount,
      expiresAt: result.expiresAt,
    });

    return {
      quoteId: (result.quoteId as string) || quoteId,
      sourceAmount: (result.sourceAmount as string) || amountBRL,
      destinationAmount: (result.destinationAmountAfterFee as string) || (result.destinationAmount as string) || '0',
      exchangeRate: (result.exchangeRate as string) || '1',
      feeAmount: (result.feeAmount as string) || '0',
      expiresAt: (result.expiresAt as string) || new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      resolvedTargetAsset,
    };
  },

  // ─── PASSO 3: Criar ordem ───────────────────────────────────────────────────

  /**
   * POST /ramp/order — Cria a ordem de on-ramp e retorna instruções PIX.
   *
   * CORREÇÃO CRÍTICA: O `bankAccountId` DEVE ser o ID de um bank account
   * previamente registrado na Etherfuse para este customer.
   * UUIDs sintéticos causam HTTP 400.
   *
   * Fluxo correto:
   *  1. registerCustomer() → obtém customerId
   *  2. KYC via URL retornada (obrigatório para TESOURO sandbox)
   *  3. getFiatAccounts(customerId) → obtém bankAccountId REAL
   *  4. createOrder(customerId, bankAccountId_REAL, quoteId, publicKey)
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
      customerId: customerId.substring(0, 8) + '...',
      quoteId: quoteId.substring(0, 8) + '...',
      bankAccountId: bankAccountId.substring(0, 8) + '...',
      publicKey: publicKey.substring(0, 8) + '...',
    });

    // Log de diagnóstico completo antes de enviar
    logger.info('[WalletNow][Treasury]', '🔍 Payload de createOrder (completo):', {
      orderId,
      bankAccountId,
      publicKey,
      quoteId,
    });

    const result = (await this._call('/ramp/order', 'POST', {
      orderId,
      bankAccountId,
      publicKey,
      quoteId,
    })) as Record<string, unknown>;

    // A resposta pode ser { onramp: {...} } ou direto
    const order = (result.onramp || result) as Record<string, unknown>;

    logger.info('[WalletNow][Treasury]', '✅ Ordem criada! Instruções PIX disponíveis.', {
      orderId: order.orderId || orderId,
      hasPixCode: !!order.depositPixCode,
      hasPixKey: !!order.depositPixKey,
      pixKeyType: order.depositPixKeyType,
      depositAmount: order.depositAmount,
    });

    return {
      orderId: (order.orderId as string) || orderId,
      status: (order.status as EtherfuseOrderResult['status']) || 'created',
      pixKey: order.depositPixKey as string | undefined,
      pixCode: order.depositPixCode as string | undefined,
      pixKeyType: order.depositPixKeyType as string | undefined,
      amountInFiat: (order.depositAmount as string) || (order.amountInFiat as string),
    };
  },

  // ─── PASSO 4 (SANDBOX): Simular PIX recebido ───────────────────────────────

  /**
   * POST /ramp/order/{orderId}/simulate-fiat-received
   * APENAS para ambiente sandbox. Em produção, o usuário paga o PIX real.
   */
  async simulateFiatReceived(orderId: string): Promise<boolean> {
    logger.info('[WalletNow][Treasury]', '🧪 SANDBOX: Simulando PIX recebido...', { orderId });

    try {
      await this._call(`/ramp/order/${orderId}/simulate-fiat-received`, 'POST', {});
      logger.info('[WalletNow][Treasury]', '✅ SANDBOX: Simulação PIX enviada com sucesso.', { orderId });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error('[WalletNow][Treasury]', '❌ SANDBOX: Falha ao simular PIX', { error: msg, orderId });
      return false;
    }
  },

  // ─── PASSO 5: Consultar status da ordem ────────────────────────────────────

  async getOrderStatus(orderId: string): Promise<EtherfuseOrderResult | null> {
    try {
      const result = (await this._call(`/ramp/order/${orderId}`)) as Record<string, unknown>;
      return {
        orderId: (result.orderId as string) || orderId,
        status: result.status as EtherfuseOrderResult['status'],
        amountInTokens: result.amountInTokens as string | undefined,
        confirmedTxSignature: result.confirmedTxSignature as string | undefined,
        pixKey: result.depositPixKey as string | undefined,
        pixCode: result.depositPixCode as string | undefined,
        amountInFiat: (result.amountInFiat as string) || (result.depositAmount as string),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error('[WalletNow][Treasury]', 'Erro ao consultar status da ordem', { error: msg, orderId });
      return null;
    }
  },

  // ─── PASSO 6: Polling até completed ────────────────────────────────────────

  async pollUntilCompleted(
    orderId: string,
    onStatus?: (status: string) => void,
    maxWaitMs = 90_000,
  ): Promise<EtherfuseOrderResult | null> {
    const INTERVAL_MS = 3_000;
    const startTime = Date.now();

    logger.info('[WalletNow][Treasury]', 'Iniciando polling de status da ordem...', { orderId });

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, INTERVAL_MS));

      const order = await this.getOrderStatus(orderId);
      if (!order) continue;

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      logger.info('[WalletNow][Treasury]', `Order status: ${order.status}`, {
        orderId,
        elapsed: elapsed + 's',
      });

      onStatus?.(order.status);

      if (order.status === 'completed') {
        logger.info('[WalletNow][Treasury]', '🎉 Ordem completada! TESOURO recebido.', {
          orderId,
          txSignature: order.confirmedTxSignature,
          amountInTokens: order.amountInTokens,
        });
        return order;
      }

      if (order.status === 'failed' || order.status === 'canceled') {
        logger.error('[WalletNow][Treasury]', `❌ Ordem ${order.status}`, { orderId });
        return order;
      }
    }

    logger.error('[WalletNow][Treasury]', '⏱️ Timeout aguardando confirmação da ordem', { orderId, maxWaitMs });
    return null;
  },
};
