/**
 * @module src/services/providers/etherfuseV2/etherfuseV2ApiService.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseV2ApiService) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: EfV2HttpError, EtherfuseV2ApiService).
 */
/**
 * EtherfuseV2ApiService — Fluxo Programático Validado
 *
 * Implementa o fluxo end-to-end validado no demo `etherfuse-pix-demo`:
 *   createCustomer → KYC programático → registrar PIX → quote → createOrder → settle
 *
 * DIFERENÇA FUNDAMENTAL vs V1:
 *   V1: bankAccountId obtido via getFiatAccounts() após KYC hospedado
 *   V2: bankAccountId retornado diretamente em createCustomer() (fluxo programático)
 *
 * SEGURANÇA: Todas as chamadas passam pelo proxy Supabase Edge Function.
 * A API key Etherfuse nunca é exposta ao browser.
 *
 * @see docs/ETHERFUSE_V2_VALIDATED_FLOW.md
 */

import { logger } from '../../../utils/logger';
import {
  EfV2CustomerResponse,
  EfV2KycStatusResponse,
  EfV2KycStatus,
  EfV2AssetsResponse,
  EfV2QuoteResult,
  EfV2OrderResult,
  EfV2OrderStatus,
  SANDBOX_KYC_MOCK_IDENTITY,
  SANDBOX_PIX_CPF_MOCK,
} from './etherfuseV2Types';

// ─── Constantes ────────────────────────────────────────────────────────────────

const LOG_TAG = '[WalletNow][EtherfuseV2]';

/** Identifier hardcoded do TESOURO como fallback se /ramp/assets falhar */
const TESOURO_FALLBACK_IDENTIFIER = 'TESOURO:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';

/** Proxy Supabase para chamadas server-side à API Etherfuse */
const getProxyEndpoint = (): string =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/etherfuse-proxy`;

// ─── Helper HTTP ──────────────────────────────────────────────────────────────

export class EfV2HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'EfV2HttpError';
  }
}

/**
 * Envia requisição autenticada via proxy Supabase.
 * Lança erro detalhado em caso de falha — nunca engole silenciosamente.
 */
async function proxyRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<T> {
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  logger.info(LOG_TAG, `► ${method} ${endpoint}`, {
    timestamp: new Date().toISOString(),
    payload: body ? JSON.stringify(body).substring(0, 500) : '(nenhum)',
  });

  const response = await fetch(getProxyEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ endpoint, method, body }),
  });

  const responseText = await response.text();
  const statusIcon = response.ok ? '✅' : '❌';

  logger.info(LOG_TAG, `${statusIcon} ${method} ${endpoint} → HTTP ${response.status}`, {
    timestamp: new Date().toISOString(),
    responseBody: responseText.substring(0, 1000),
  });

  if (!response.ok) {
    let errorMessage = `Etherfuse V2 API ${response.status}: ${responseText.substring(0, 500)}`;
    try {
      const errJson = JSON.parse(responseText) as { error?: { code?: string; message?: string } | string };
      if (typeof errJson.error === 'object' && errJson.error?.message) {
        errorMessage = `[${errJson.error.code || 'EF_V2_ERROR'}] ${errJson.error.message}`;
      } else if (typeof errJson.error === 'string') {
        errorMessage = errJson.error;
      }
    } catch {
      // Resposta não é JSON — mantém mensagem original
    }

    logger.error(LOG_TAG, `Erro HTTP ${response.status} em ${endpoint}`, {
      timestamp: new Date().toISOString(),
      errorMessage,
      fullResponse: responseText,
    });

    throw new EfV2HttpError(response.status, errorMessage);
  }

  if (!responseText) return undefined as T;
  return JSON.parse(responseText) as T;
}

// ─── EtherfuseV2ApiService ────────────────────────────────────────────────────

/**
 * Serviço principal do fluxo programático Etherfuse V2.
 *
 * Fluxo validado (sandbox):
 *   1. createCustomer → obtém customerId + bankAccountId direto
 *   2. submitKycIdentity + submitKycDocuments + acceptAgreements
 *   3. pollKycStatus → aguarda 'approved'
 *   4. registerPixAccount → registra chave CPF mock
 *   5. resolveTesouroIdentifier → obtém CODE:ISSUER real
 *   6. getQuote → cotação BRL → TESOURO
 *   7. createOnRampOrder → cria ordem com bankAccountId real
 *   8. simulateFiatReceived → apenas sandbox
 *   9. pollUntilCompleted → aguarda liquidação
 */
export const EtherfuseV2ApiService = {

  // ─── PASSO 1: Criar Customer ────────────────────────────────────────────────

  /**
   * POST /ramp/onboarding-url
   *
   * @throws Error se a resposta não contiver presigned_url
   */
  async createCustomer(
    email: string,
    publicKey: string,
    country = 'BR',
  ): Promise<EfV2CustomerResponse> {
    logger.info(LOG_TAG, 'PASSO 1: Criando customer programático (onboarding-url)...', {
      timestamp: new Date().toISOString(),
      publicKey: publicKey.substring(0, 12) + '...',
      country,
    });

    const customerId = crypto.randomUUID();
    const bankAccountId = crypto.randomUUID();

    const result = await proxyRequest<{ presigned_url: string }>('/ramp/onboarding-url', 'POST', {
      customerId,
      bankAccountId,
      publicKey,
      blockchain: 'stellar',
    });

    if (!result.presigned_url) {
      const msg = 'EtherfuseV2: onboarding-url não retornou presigned_url.';
      logger.error(LOG_TAG, msg, { result: JSON.stringify(result) });
      throw new Error(msg);
    }

    logger.info(LOG_TAG, '✅ Customer criado (onboarding-url).', {
      timestamp: new Date().toISOString(),
      customerId,
    });

    return {
      id: customerId,
      bankAccountId,
      presignedUrl: result.presigned_url,
    };
  },

  // ─── PASSO 2: KYC Programático ─────────────────────────────────────────────

  /**
   * POST /ramp/customer/{customerId}/kyc
   */
  async submitKycIdentity(customerId: string, publicKey: string): Promise<void> {
    logger.info(LOG_TAG, 'PASSO 2a: Submetendo identidade KYC (mock sandbox)...', {
      timestamp: new Date().toISOString(),
      customerId,
    });

    const identityPayload = {
      pubkey: publicKey,
      identity: {
        id: publicKey,
        email: SANDBOX_KYC_MOCK_IDENTITY.email,
        phoneNumber: SANDBOX_KYC_MOCK_IDENTITY.phone,
        occupation: 'Software Engineer',
        name: { givenName: SANDBOX_KYC_MOCK_IDENTITY.firstName, familyName: SANDBOX_KYC_MOCK_IDENTITY.lastName },
        dateOfBirth: SANDBOX_KYC_MOCK_IDENTITY.dateOfBirth,
        address: {
          street: SANDBOX_KYC_MOCK_IDENTITY.address.street,
          city: SANDBOX_KYC_MOCK_IDENTITY.address.city,
          region: SANDBOX_KYC_MOCK_IDENTITY.address.region, // Use region
          country: SANDBOX_KYC_MOCK_IDENTITY.address.country,
          postalCode: SANDBOX_KYC_MOCK_IDENTITY.address.postalCode,
        },
      },
    };

    await proxyRequest<unknown>(
      `/ramp/customer/${customerId}/kyc`,
      'POST',
      identityPayload,
    );

    logger.info(LOG_TAG, '✅ Identidade KYC submetida.', { customerId });
  },

  /**
   * POST /ramp/customer/{customerId}/kyc/documents
   */
  async submitKycDocuments(customerId: string, publicKey: string): Promise<void> {
    logger.info(LOG_TAG, 'PASSO 2b: Submetendo documentos KYC (mock base64)...', {
      timestamp: new Date().toISOString(),
      customerId,
    });

    const MOCK_IMAGE_BASE64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await proxyRequest<unknown>(
      `/ramp/customer/${customerId}/kyc/documents`,
      'POST',
      {
        pubkey: publicKey,
        documentType: 'document',
        images: [
          { label: 'id_front', image: MOCK_IMAGE_BASE64 },
          { label: 'id_back', image: MOCK_IMAGE_BASE64 },
        ],
      },
    );

    await proxyRequest<unknown>(
      `/ramp/customer/${customerId}/kyc/documents`,
      'POST',
      {
        pubkey: publicKey,
        documentType: 'selfie',
        images: [{ label: 'selfie', image: MOCK_IMAGE_BASE64 }],
      },
    );

    logger.info(LOG_TAG, '✅ Documentos KYC submetidos.', { customerId });
  },

  /**
   * POST /ramp/agreements
   */
  async acceptAgreements(presignedUrl: string, customerId?: string): Promise<void> {
    logger.info(LOG_TAG, 'PASSO 2c: Aceitando acordos Etherfuse...', {
      timestamp: new Date().toISOString(),
    });

    // Novo fluxo: único endpoint /ramp/agreements
    await proxyRequest<unknown>('/ramp/agreements', 'POST', { presignedUrl, customerId });

    logger.info(LOG_TAG, '✅ Acordos aceitos.');
  },

  // ─── PASSO 3: Verificar Status KYC ────────────────────────────────────────

  /**
   * GET /ramp/customer/{customerId}/kyc/{publicKey}
   *
   * Consulta status KYC. O sandbox auto-aprova após submitKycIdentity.
   */
  async getKycStatus(customerId: string, publicKey: string): Promise<EfV2KycStatusResponse> {
    const result = await proxyRequest<EfV2KycStatusResponse>(
      `/ramp/customer/${customerId}/kyc/${publicKey}`,
    );

    logger.info(LOG_TAG, `KYC status: ${result.status}`, {
      timestamp: new Date().toISOString(),
      customerId,
      status: result.status,
    });

    return result;
  },

  /**
   * Polling do status KYC até `approved` ou `rejected`.
   *
   * @param customerId - ID do customer
   * @param publicKey - Stellar public key
   * @param onStatus - Callback para atualização de UI
   * @param maxWaitMs - Timeout em ms (padrão: 60s)
   */
  async pollKycUntilApproved(
    customerId: string,
    publicKey: string,
    onStatus?: (status: EfV2KycStatus) => void,
    maxWaitMs = 60_000,
  ): Promise<EfV2KycStatus> {
    const INTERVAL_MS = 3_000;
    const startTime = Date.now();

    logger.info(LOG_TAG, 'Iniciando polling de KYC...', {
      timestamp: new Date().toISOString(),
      customerId,
      maxWaitMs,
    });

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));

      const statusResult = await this.getKycStatus(customerId, publicKey);
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      logger.info(LOG_TAG, `KYC polling: ${statusResult.status} (${elapsed}s)`, {
        timestamp: new Date().toISOString(),
        customerId,
        elapsed: elapsed + 's',
      });

      onStatus?.(statusResult.status);

      if (
        statusResult.status === 'approved' ||
        statusResult.status === 'approved_chain_deploying'
      ) {
        logger.info(LOG_TAG, '✅ KYC aprovado pelo sandbox.', { customerId });
        return statusResult.status;
      }

      if (statusResult.status === 'rejected') {
        const reason = statusResult.currentRejectionReason || 'motivo não informado';
        logger.error(LOG_TAG, `❌ KYC rejeitado: ${reason}`, { customerId });
        throw new Error(`KYC Rejeitado: ${reason}`);
      }
    }

    throw new Error(`[EtherfuseV2] Timeout (${maxWaitMs}ms) aguardando aprovação KYC.`);
  },
  // ─── PASSO 4: Registrar Conta PIX ─────────────────────────────────────────

  /**
   * POST /ramp/bank-account
   */
  async registerPixAccount(presignedUrl: string, cpf: string = SANDBOX_PIX_CPF_MOCK): Promise<string | undefined> {
    logger.info(LOG_TAG, 'PASSO 4: Registrando conta PIX (CPF mock sandbox)...', {
      timestamp: new Date().toISOString(),
      pixKey: cpf,
    });

    const result = await proxyRequest<any>(
      `/ramp/bank-account`,
      'POST',
      {
        presignedUrl,
        account: {
          transactionId: crypto.randomUUID(),
          firstName: SANDBOX_KYC_MOCK_IDENTITY.firstName,
          lastName: SANDBOX_KYC_MOCK_IDENTITY.lastName,
          pixKey: cpf,
          pixKeyType: 'cpf',
          cpf: cpf,
        },
      },
    );

    logger.info(LOG_TAG, '✅ Conta PIX registrada.', {
      pixKeyType: 'cpf',
      bankAccountId: result?.bankAccountId || result?.id || 'não retornado',
    });
    
    return result?.bankAccountId || result?.id;
  },

  // ─── PASSO 5: Resolver Asset TESOURO ───────────────────────────────────────

  /**
   * GET /ramp/assets — Resolve o identifier completo do TESOURO.
   * Formato retornado: "TESOURO:GC3CW7..."
   *
   * Fallback: identifier hardcoded se a API falhar.
   */
  async resolveTesouroIdentifier(publicKey: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        blockchain: 'stellar',
        currency: 'brl',
        wallet: publicKey,
      });

      const result = await proxyRequest<EfV2AssetsResponse>(
        `/ramp/assets?${params.toString()}`,
      );

      const tesouro = result.assets.find((a) => a.symbol === 'TESOURO');
      if (tesouro?.identifier) {
        logger.info(LOG_TAG, `✅ TESOURO identifier resolvido: ${tesouro.identifier}`, {
          timestamp: new Date().toISOString(),
        });
        return tesouro.identifier;
      }

      logger.warn(LOG_TAG, 'TESOURO não encontrado em /ramp/assets. Usando fallback hardcoded.', {
        timestamp: new Date().toISOString(),
        assetsFound: result.assets.map((a) => a.symbol),
      });
      return TESOURO_FALLBACK_IDENTIFIER;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.warn(LOG_TAG, 'Falha ao resolver assets. Usando identifier hardcoded.', {
        timestamp: new Date().toISOString(),
        error: msg,
      });
      return TESOURO_FALLBACK_IDENTIFIER;
    }
  },

  // ─── PASSO 6: Cotação ──────────────────────────────────────────────────────

  /**
   * POST /ramp/quote — Obtém cotação BRL → TESOURO.
   *
   * REGRA: Só chamar após KYC aprovado e conta PIX registrada.
   * Quotes expiram em ~2 minutos — createOrder deve ser chamado imediatamente.
   */
  async getQuote(
    customerId: string,
    publicKey: string,
    amountBRL: string,
  ): Promise<EfV2QuoteResult> {
    const quoteId = crypto.randomUUID();

    logger.info(LOG_TAG, 'PASSO 6: Obtendo cotação BRL → TESOURO...', {
      timestamp: new Date().toISOString(),
      customerId,
      amountBRL,
      quoteId: quoteId.substring(0, 8) + '...',
    });

    const resolvedTargetAsset = await this.resolveTesouroIdentifier(publicKey);

    const result = await proxyRequest<Record<string, unknown>>('/ramp/quote', 'POST', {
      quoteId,
      customerId,
      blockchain: 'stellar',
      quoteAssets: {
        type: 'onramp',
        sourceAsset: 'BRL',
        targetAsset: resolvedTargetAsset,
      },
      sourceAmount: String(amountBRL),
    });

    logger.info(LOG_TAG, '✅ Cotação obtida.', {
      timestamp: new Date().toISOString(),
      quoteId: result.quoteId,
      sourceAmount: result.sourceAmount,
      destinationAmount: result.destinationAmountAfterFee || result.destinationAmount,
    });

    return {
      quoteId: (result.quoteId as string) || quoteId,
      sourceAmount: (result.sourceAmount as string) || amountBRL,
      destinationAmount:
        (result.destinationAmountAfterFee as string) ||
        (result.destinationAmount as string) ||
        '0',
      exchangeRate: (result.exchangeRate as string) || '1',
      feeAmount: (result.feeAmount as string) || '0',
      expiresAt:
        (result.expiresAt as string) ||
        new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      resolvedTargetAsset,
    };
  },

  // ─── PASSO 7: Criar Ordem On-Ramp ─────────────────────────────────────────

  /**
   * POST /ramp/order — Cria a ordem de on-ramp.
   *
   * REGRA V2: bankAccountId é o ID retornado em createCustomer().
   * Nunca usar UUID gerado localmente.
   */
  async createOnRampOrder(
    customerId: string,
    bankAccountId: string,
    quoteId: string,
    publicKey: string,
  ): Promise<EfV2OrderResult> {
    const orderId = crypto.randomUUID();

    // Log COMPLETO para diagnóstico — IDs não truncados
    logger.info(LOG_TAG, '📤 PASSO 7: createOrder (payload completo)', {
      timestamp: new Date().toISOString(),
      orderId,
      customerId,
      bankAccountId, // ID completo — validar que vem de createCustomer()
      quoteId,
      publicKey: publicKey.substring(0, 12) + '...',
    });

    const result = await proxyRequest<Record<string, unknown>>('/ramp/order', 'POST', {
      orderId,
      bankAccountId,
      publicKey,
      quoteId,
    });

    // Resposta pode ser { onramp: {...} } ou direta
    const order = (result.onramp || result) as Record<string, unknown>;

    logger.info(LOG_TAG, '✅ Ordem de on-ramp criada.', {
      timestamp: new Date().toISOString(),
      orderId: order.orderId || orderId,
      hasPixCode: !!order.depositPixCode,
      hasPixKey: !!order.depositPixKey,
      depositAmount: order.depositAmount,
    });

    return {
      orderId: (order.orderId as string) || orderId,
      status: (order.status as EfV2OrderStatus) || 'created',
      pixKey: order.depositPixKey as string | undefined,
      pixCode: order.depositPixCode as string | undefined,
      pixKeyType: order.depositPixKeyType as string | undefined,
      amountInFiat: (order.depositAmount as string) || (order.amountInFiat as string),
    };
  },

  // ─── PASSO 8 (SANDBOX): Simular PIX Recebido ──────────────────────────────

  /**
   * POST /ramp/order/fiat_received
   *
   * APENAS SANDBOX. Em produção o usuário paga o PIX real.
   * Simula o recebimento do PIX para avançar o ciclo de vida da ordem.
   */
  async simulateFiatReceived(orderId: string): Promise<boolean> {
    logger.info(LOG_TAG, '⚡ PASSO 8 (SANDBOX): Simulando PIX recebido...', {
      timestamp: new Date().toISOString(),
      orderId,
    });

    try {
      await proxyRequest<unknown>(
        `/ramp/order/fiat_received`,
        'POST',
        { orderId },
      );

      logger.info(LOG_TAG, '✅ Simulação PIX enviada com sucesso.', {
        timestamp: new Date().toISOString(),
        orderId,
      });

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error(LOG_TAG, '❌ Falha ao simular PIX', {
        timestamp: new Date().toISOString(),
        error: msg,
        orderId,
      });
      return false;
    }
  },

  // ─── PASSO 9: Consultar e Aguardar Conclusão ──────────────────────────────

  /** GET /ramp/order/{orderId} — Consulta status atual da ordem. */
  async getOrderStatus(orderId: string): Promise<EfV2OrderResult | null> {
    try {
      const result = await proxyRequest<Record<string, unknown>>(
        `/ramp/order/${orderId}`,
      );

      return {
        orderId: (result.orderId as string) || orderId,
        status: result.status as EfV2OrderStatus,
        amountInTokens: result.amountInTokens as string | undefined,
        confirmedTxSignature: result.confirmedTxSignature as string | undefined,
        pixKey: result.depositPixKey as string | undefined,
        pixCode: result.depositPixCode as string | undefined,
        amountInFiat:
          (result.amountInFiat as string) || (result.depositAmount as string),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error(LOG_TAG, 'Erro ao consultar status da ordem', {
        timestamp: new Date().toISOString(),
        error: msg,
        orderId,
      });
      return null;
    }
  },

  /**
   * Polling até `completed` (ou `failed`/`canceled`).
   *
   * @param orderId - ID da ordem
   * @param onStatus - Callback para atualização de UI
   * @param maxWaitMs - Timeout em ms (padrão: 90s)
   */
  async pollUntilCompleted(
    orderId: string,
    onStatus?: (status: string) => void,
    maxWaitMs = 90_000,
  ): Promise<EfV2OrderResult | null> {
    const INTERVAL_MS = 3_000;
    const startTime = Date.now();

    logger.info(LOG_TAG, 'PASSO 9: Polling até conclusão da ordem...', {
      timestamp: new Date().toISOString(),
      orderId,
      maxWaitMs,
    });

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));

      const order = await this.getOrderStatus(orderId);
      if (!order) continue;

      const elapsed = Math.round((Date.now() - startTime) / 1000);

      logger.info(LOG_TAG, `Order status: ${order.status} (${elapsed}s)`, {
        timestamp: new Date().toISOString(),
        orderId,
        elapsed: elapsed + 's',
        status: order.status,
      });

      onStatus?.(order.status);

      if (order.status === 'completed') {
        logger.info(LOG_TAG, '✅ Ordem completada! TESOURO liquidado na Stellar.', {
          timestamp: new Date().toISOString(),
          orderId,
          txSignature: order.confirmedTxSignature,
          amountInTokens: order.amountInTokens,
        });
        return order;
      }

      if (order.status === 'failed' || order.status === 'canceled') {
        logger.error(LOG_TAG, `❌ Ordem ${order.status}`, {
          timestamp: new Date().toISOString(),
          orderId,
        });
        return order;
      }
    }

    logger.error(LOG_TAG, '⏱️ Timeout aguardando conclusão da ordem', {
      timestamp: new Date().toISOString(),
      orderId,
      maxWaitMs,
    });

    return null;
  },
};
