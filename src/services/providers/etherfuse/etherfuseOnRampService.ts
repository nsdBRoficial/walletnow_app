/**
 * @module src\services\providers\etherfuse\etherfuseOnRampService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { ETHERFUSE_PROXY_ENDPOINT } from './etherfuseAssetConfig';
import { logger } from '../../../utils/logger';

// ─── Tipos de Request/Response da API Etherfuse ────────────────────────────

export interface EtherfuseCustomerResult {
  customerId: string;
  bankAccountId: string; // UUID temporário usado apenas para onboarding-url
  kycUrl: string;
}

export interface EtherfuseQuoteResult {
  quoteId: string;
  sourceAmount: string;            // BRL
  destinationAmount: string;       // TESOURO (após fee)
  exchangeRate: string;
  feeAmount: string;
  expiresAt: string;
  resolvedTargetAsset?: string;
}

export interface EtherfuseOrderResult {
  orderId: string;
  status: 'created' | 'funded' | 'completed' | 'failed' | 'refunded' | 'canceled';
  pixKey?: string;
  pixCode?: string;
  pixKeyType?: string;
  amountInFiat?: string;
  amountInTokens?: string;
  confirmedTxSignature?: string;
}

export interface EtherfuseBankAccount {
  bankAccountId: string;
  status: string;
  pixKey?: string;
  pixKeyType?: string;
  accountHolderName?: string;
  compliant?: boolean;
  createdAt?: string;
}

/**
 * Código de erro para contaminação de sandbox.
 * Lançado quando a publicKey já está registrada (HTTP 409).
 * REGRA DO EXPERIMENTO: sem recovery silencioso.
 */
export const SANDBOX_CONTAMINATION_ERROR = 'SANDBOX_CONTAMINATION';

/**
 * Código de erro para proxy account não provisionado.
 * Lançado quando getFiatAccounts retorna lista vazia após KYC aprovado.
 * HIPÓTESE: proxy account só é provisionado via fluxo hospedado Etherfuse.
 */
export const PROXY_ACCOUNT_NOT_PROVISIONED_ERROR = 'PROXY_ACCOUNT_NOT_PROVISIONED';

// ─── Helper de log de experimento ──────────────────────────────────────────

interface ExperimentSnapshot {
  phase: string;
  customerId?: string;
  kycStatus?: string;
  bankAccountsCount?: number;
  extra?: Record<string, unknown>;
}

function logExperiment(snapshot: ExperimentSnapshot): void {
  logger.info('[WalletNow][Experiment]', `Phase: ${snapshot.phase}`, {
    timestamp: new Date().toISOString(),
    phase: snapshot.phase,
    customerId: snapshot.customerId || 'not_set',
    kycStatus: snapshot.kycStatus || 'not_checked',
    bankAccountsCount: snapshot.bankAccountsCount ?? 'not_checked',
    ...snapshot.extra,
  });
}

// ─── Serviço On-Ramp Etherfuse ─────────────────────────────────────────────

/**
 * EtherfuseOnRampService — Experimento KYC-First
 *
 * Implementa o fluxo institucional completo de on-ramp BRL → TESOURO via PIX.
 *
 * REGRAS DO EXPERIMENTO:
 *  1. 409 Conflict → SANDBOX_CONTAMINATION — sem recovery silencioso
 *  2. getFiatAccounts retorna [] → PROXY_ACCOUNT_NOT_PROVISIONED — sem fallback fake
 *  3. Nenhum bankAccountId UUID sintético para createOrder
 *  4. KYC via fluxo HOSPEDADO Etherfuse (onboarding-url iframe), não programático
 *  5. Onboarding-url só é chamado uma vez no início; link exibido ao usuário
 *  6. Quote e createOrder chamados SOMENTE após kycStatus = approved
 *
 * SEGURANÇA: Todas as chamadas passam pelo proxy Supabase (API Key server-side).
 */
export const EtherfuseOnRampService = {

  /**
   * Chama o proxy Edge Function.
   * Nunca engole erros — lança exceção com mensagem completa da Etherfuse.
   */
  async _call(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<unknown> {
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    logger.info('[WalletNow][EtherfuseProxy]', `► ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
      responseBody: responseText.substring(0, 1000),
    });

    if (!response.ok) {
      let errorMessage = `Etherfuse API ${response.status}: ${responseText.substring(0, 500)}`;
      try {
        const errJson = JSON.parse(responseText) as { error?: { code?: string; message?: string } | string };
        if (typeof errJson.error === 'object' && errJson.error?.message) {
          errorMessage = `[${errJson.error.code || 'ETHERFUSE_ERROR'}] ${errJson.error.message}`;
        } else if (typeof errJson.error === 'string') {
          errorMessage = errJson.error;
        }
      } catch {
        // response não é JSON — mantém errorMessage original
      }
      logger.error('[WalletNow][EtherfuseProxy]', `Erro HTTP ${response.status} em ${endpoint}`, {
        timestamp: new Date().toISOString(),
        errorMessage,
        fullResponse: responseText,
      });
      throw new Error(errorMessage);
    }

    if (!responseText) return undefined;
    return JSON.parse(responseText);
  },

  // ─── Assets ────────────────────────────────────────────────────────────────

  /**
   * GET /ramp/assets — Lista assets disponíveis e seus identifiers completos.
   * Necessário para obter o identifier correto do TESOURO (ex: "TESOURO:GC3CW7...").
   */
  async getAssets(blockchain = 'stellar', currency = 'brl', wallet = ''): Promise<{
    assets: Array<{ symbol: string; identifier: string; name: string; currency: string | null }>
  }> {
    const params = new URLSearchParams({ blockchain, currency, wallet });
    const result = (await this._call(`/ramp/assets?${params.toString()}`)) as Record<string, unknown>;
    logger.info('[WalletNow][Experiment]', 'Assets disponíveis na Etherfuse', {
      timestamp: new Date().toISOString(),
      result: JSON.stringify(result),
    });
    return result as { assets: Array<{ symbol: string; identifier: string; name: string; currency: string | null }> };
  },

  // ─── PASSO 1: Registrar customer via onboarding-url ───────────────────────

  /**
   * POST /ramp/onboarding-url — Registra o cliente na Etherfuse e obtém URL do KYC hospedado.
   *
   * REGRA DO EXPERIMENTO:
   *  - 409 Conflict → lança SANDBOX_CONTAMINATION — sem recovery silencioso
   *  - O bankAccountId aqui é UUID temporário apenas para iniciar o fluxo hospedado
   *  - O bankAccountId REAL para createOrder é obtido via getFiatAccounts() após o KYC hospedado
   *
   * @throws Error com código SANDBOX_CONTAMINATION se publicKey já registrada
   */
  async registerCustomer(publicKey: string): Promise<EtherfuseCustomerResult> {
    const customerId = crypto.randomUUID();
    const bankAccountId = crypto.randomUUID(); // seed temporário — NíO usar em createOrder

    logExperiment({
      phase: 'etherfuse_customer_creation',
      customerId,
      extra: {
        publicKey: publicKey.substring(0, 12) + '...',
        note: 'Iniciando registro via onboarding-url',
      },
    });

    try {
      const result = (await this._call('/ramp/onboarding-url', 'POST', {
        customerId,
        bankAccountId,
        publicKey,
        blockchain: 'stellar',
      })) as { presigned_url: string };

      logExperiment({
        phase: 'etherfuse_customer_creation_success',
        customerId,
        extra: {
          hasKycUrl: !!result.presigned_url,
          note: 'Customer registrado. Fluxo hospedado Etherfuse disponível.',
        },
      });

      return {
        customerId,
        bankAccountId, // ATENÇíO: seed temporário, NíO é o bankAccountId real
        kycUrl: result.presigned_url,
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      // 409 = publicKey já registrada → ABORTAR (sem recovery silencioso)
      if (msg.includes('409') || msg.toLowerCase().includes('already') || msg.toLowerCase().includes('conflict')) {
        const contaminationMessage =
          `${SANDBOX_CONTAMINATION_ERROR}: publicKey already registered. ` +
          `Create a new wallet/user for clean provisioning test.`;

        logger.error('[WalletNow][Experiment]', '⛔ SANDBOX_CONTAMINATION detectado', {
          timestamp: new Date().toISOString(),
          phase: 'etherfuse_customer_creation_409',
          publicKey: publicKey.substring(0, 12) + '...',
          originalError: msg,
          action: 'ABORTING — sem recovery silencioso',
        });

        throw new Error(contaminationMessage);
      }

      logger.error('[WalletNow][Experiment]', '❌ Erro ao registrar customer', {
        timestamp: new Date().toISOString(),
        phase: 'etherfuse_customer_creation_error',
        error: msg,
      });

      throw err;
    }
  },

  // ─── PASSO 2: Verificar status KYC ────────────────────────────────────────

  /**
   * GET /ramp/customer/{customerId}/kyc/{publicKey}
   * Polling até status = approved.
   * Status possíveis: not_started | proposed | approved | approved_chain_deploying | rejected
   */
  async getKycStatus(customerId: string, publicKey: string): Promise<{
    status: string;
    onChainMarked?: boolean;
    currentRejectionReason?: string | null;
  }> {
    logExperiment({
      phase: 'etherfuse_kyc_polling',
      customerId,
      kycStatus: 'checking...',
    });

    const result = (await this._call(
      `/ramp/customer/${customerId}/kyc/${publicKey}`
    )) as { status: string; onChainMarked?: boolean; currentRejectionReason?: string | null };

    logExperiment({
      phase: 'etherfuse_kyc_polling',
      customerId,
      kycStatus: result.status,
      extra: {
        onChainMarked: result.onChainMarked,
        rejectionReason: result.currentRejectionReason,
      },
    });

    return result;
  },

  // ─── PASSO 3: Buscar bank accounts REAIS após KYC aprovado ────────────────

  /**
   * POST /ramp/customer/{customerId}/bank-accounts
   *
   * REGRA DO EXPERIMENTO:
   *  - NUNCA retornar lista vazia silenciosamente
   *  - Se items = [] → lança PROXY_ACCOUNT_NOT_PROVISIONED
   *  - Este erro valida a hipótese: proxy account não provisionado = KYC hospedado não completado
   *
   * @throws Error com código PROXY_ACCOUNT_NOT_PROVISIONED se lista estiver vazia
   */
  async getFiatAccounts(customerId: string): Promise<EtherfuseBankAccount[]> {
    logExperiment({
      phase: 'etherfuse_financial_onboarding',
      customerId,
      bankAccountsCount: 0,
      extra: { note: 'Buscando bank accounts após KYC aprovado...' },
    });

    const result = (await this._call(
      `/ramp/customer/${customerId}/bank-accounts`,
      'POST',
      { pageSize: 100, pageNumber: 0 }
    )) as { items?: Array<Record<string, unknown>>; totalItems?: number };

    const accounts = (result.items || []) as unknown as EtherfuseBankAccount[];

    logExperiment({
      phase: 'etherfuse_financial_onboarding',
      customerId,
      bankAccountsCount: accounts.length,
      extra: {
        totalItems: result.totalItems,
        accountIds: accounts.map(a => ({
          id: a.bankAccountId,
          status: a.status,
          compliant: a.compliant,
          hasPixKey: !!a.pixKey,
        })),
      },
    });

    // REGRA CRÍTICA DO EXPERIMENTO: sem fallback fake
    if (accounts.length === 0) {
      const errorMessage =
        `${PROXY_ACCOUNT_NOT_PROVISIONED_ERROR}: Bank accounts list is empty after KYC approval. ` +
        `This confirms proxy account was not provisioned. ` +
        `Complete the hosted Etherfuse onboarding flow (KYC iframe) with a clean wallet.`;

      logger.error('[WalletNow][Experiment]', '⛔ PROXY_ACCOUNT_NOT_PROVISIONED', {
        timestamp: new Date().toISOString(),
        phase: 'etherfuse_financial_onboarding_empty',
        customerId,
        bankAccountsCount: 0,
        hypothesis: 'Proxy account só é provisionado via fluxo hospedado Etherfuse (iframe)',
      });

      throw new Error(errorMessage);
    }

    logger.info('[WalletNow][Experiment]', `✅ ${accounts.length} bank account(s) reais encontrados`, {
      timestamp: new Date().toISOString(),
      phase: 'etherfuse_financial_onboarding_success',
      customerId,
      bankAccountsCount: accounts.length,
    });

    return accounts;
  },

  // ─── PASSO 4: Obter cotação ────────────────────────────────────────────────

  /**
   * POST /ramp/quote — Obtém cotação BRL → TESOURO.
   * REGRA: Só chamar após kycStatus = approved E bankAccounts disponíveis.
   * Quotes expiram em ~2 minutos — createOrder deve ser chamado imediatamente após.
   */
  async getQuote(customerId: string, publicKey: string, amountBRL: string): Promise<EtherfuseQuoteResult> {
    const quoteId = crypto.randomUUID();

    logExperiment({
      phase: 'etherfuse_quote',
      customerId,
      extra: { amountBRL, quoteId: quoteId.substring(0, 8) + '...' },
    });

    // Resolver identifier completo do TESOURO via /ramp/assets
    let resolvedTargetAsset = 'TESOURO:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';
    try {
      const assetsResponse = await this.getAssets('stellar', 'brl', publicKey);
      const tesouro = assetsResponse.assets.find(a => a.symbol === 'TESOURO');
      if (tesouro?.identifier) {
        resolvedTargetAsset = tesouro.identifier;
        logger.info('[WalletNow][Experiment]', `✅ TESOURO identifier resolvido: ${resolvedTargetAsset}`, {
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.warn('[WalletNow][Experiment]', 'TESOURO não encontrado em /ramp/assets. Usando identifier hardcoded.', {
          timestamp: new Date().toISOString(),
          assetsFound: assetsResponse.assets.map(a => a.symbol),
        });
      }
    } catch (assetsErr: unknown) {
      const msg = assetsErr instanceof Error ? assetsErr.message : 'unknown';
      logger.warn('[WalletNow][Experiment]', 'Falha ao resolver assets. Usando identifier hardcoded.', {
        timestamp: new Date().toISOString(),
        error: msg,
      });
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

    logExperiment({
      phase: 'etherfuse_quote_success',
      customerId,
      extra: {
        quoteId: result.quoteId,
        sourceAmount: result.sourceAmount,
        destinationAmount: result.destinationAmountAfterFee || result.destinationAmount,
        rate: result.exchangeRate,
        fee: result.feeAmount,
        expiresAt: result.expiresAt,
      },
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

  // ─── PASSO 5: Criar ordem ──────────────────────────────────────────────────

  /**
   * POST /ramp/order — Cria a ordem de on-ramp e retorna instruções PIX.
   *
   * REGRA DO EXPERIMENTO:
   *  - bankAccountId DEVE ser o ID real retornado por getFiatAccounts()
   *  - Nunca aceitar UUID gerado localmente aqui
   *  - Payload completo é logado (sem truncar IDs) para diagnóstico
   */
  async createOrder(
    customerId: string,
    bankAccountId: string,
    quoteId: string,
    publicKey: string,
  ): Promise<EtherfuseOrderResult> {
    const orderId = crypto.randomUUID();

    // Log COMPLETO do payload — diagnóstico do experimento
    logger.info('[WalletNow][Experiment]', '📤 createOrder payload (COMPLETO)', {
      timestamp: new Date().toISOString(),
      phase: 'etherfuse_order',
      orderId,
      customerId,       // ID completo — não truncado
      bankAccountId,    // ID completo — validar que NíO é UUID fake local
      quoteId,          // ID completo
      publicKey: publicKey.substring(0, 12) + '...',
    });

    const result = (await this._call('/ramp/order', 'POST', {
      orderId,
      bankAccountId,
      publicKey,
      quoteId,
    })) as Record<string, unknown>;

    // A resposta pode ser { onramp: {...} } ou direta
    const order = (result.onramp || result) as Record<string, unknown>;

    logExperiment({
      phase: 'etherfuse_order_success',
      customerId,
      extra: {
        orderId: order.orderId || orderId,
        hasPixCode: !!order.depositPixCode,
        hasPixKey: !!order.depositPixKey,
        pixKeyType: order.depositPixKeyType,
        depositAmount: order.depositAmount,
      },
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

  // ─── PASSO 6 (SANDBOX): Simular PIX recebido ──────────────────────────────

  /**
   * POST /ramp/order/{orderId}/simulate-fiat-received
   * APENAS sandbox. Em produção o usuário paga o PIX real.
   */
  async simulateFiatReceived(orderId: string): Promise<boolean> {
    logExperiment({
      phase: 'etherfuse_settling',
      extra: { orderId, note: 'SANDBOX: Simulando PIX recebido' },
    });

    try {
      await this._call(`/ramp/order/${orderId}/simulate-fiat-received`, 'POST', {});
      logger.info('[WalletNow][Experiment]', '✅ SANDBOX: Simulação PIX enviada com sucesso.', {
        timestamp: new Date().toISOString(),
        orderId,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error('[WalletNow][Experiment]', '❌ SANDBOX: Falha ao simular PIX', {
        timestamp: new Date().toISOString(),
        error: msg,
        orderId,
      });
      return false;
    }
  },

  // ─── PASSO 7: Consultar status da ordem ───────────────────────────────────

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
      logger.error('[WalletNow][Experiment]', 'Erro ao consultar status da ordem', {
        timestamp: new Date().toISOString(),
        error: msg,
        orderId,
      });
      return null;
    }
  },

  // ─── PASSO 8: Polling até completed ───────────────────────────────────────

  async pollUntilCompleted(
    orderId: string,
    onStatus?: (status: string) => void,
    maxWaitMs = 90_000,
  ): Promise<EtherfuseOrderResult | null> {
    const INTERVAL_MS = 3_000;
    const startTime = Date.now();

    logExperiment({
      phase: 'etherfuse_settling',
      extra: { orderId, maxWaitMs },
    });

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, INTERVAL_MS));

      const order = await this.getOrderStatus(orderId);
      if (!order) continue;

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      logger.info('[WalletNow][Experiment]', `Order status: ${order.status}`, {
        timestamp: new Date().toISOString(),
        phase: 'etherfuse_settling',
        orderId,
        elapsed: elapsed + 's',
        status: order.status,
      });

      onStatus?.(order.status);

      if (order.status === 'completed') {
        logExperiment({
          phase: 'etherfuse_done',
          extra: {
            orderId,
            txSignature: order.confirmedTxSignature,
            amountInTokens: order.amountInTokens,
          },
        });
        return order;
      }

      if (order.status === 'failed' || order.status === 'canceled') {
        logger.error('[WalletNow][Experiment]', `❌ Ordem ${order.status}`, {
          timestamp: new Date().toISOString(),
          orderId,
        });
        return order;
      }
    }

    logger.error('[WalletNow][Experiment]', '⏱️ Timeout aguardando confirmação da ordem', {
      timestamp: new Date().toISOString(),
      orderId,
      maxWaitMs,
    });
    return null;
  },
};
