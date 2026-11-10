/**
 * @module packages\providers\provider-etherfuse\src\EtherfuseV2ApiService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/provider-etherfuse — EtherfuseV2ApiService
 *
 * Implementa o fluxo programático validado end-to-end:
 *   createCustomer → KYC → registrar PIX → quote → createOrder → settle
 *
 * SEGURANÇA: Todas as chamadas passam pelo proxy Supabase Edge Function.
 * A API key Etherfuse nunca é exposta ao browser.
 *
 * NOTA: A URL do proxy é injetada via `proxyEndpoint` para desacoplar do Vite.
 *
 * @see https://github.com/wmendes/etherfuse-pix-demo/
 */

import {
  type EfV2CustomerResponse,
  type EfV2KycStatusResponse,
  type EfV2KycStatus,
  type EfV2AssetsResponse,
  type EfV2QuoteResult,
  type EfV2OrderResult,
  type EfV2OrderStatus,
  SANDBOX_KYC_MOCK_IDENTITY,
  SANDBOX_PIX_CPF_MOCK,
} from './etherfuse.types.js';

import { TESOURO_FALLBACK_IDENTIFIER } from './etherfuse.config.js';

const LOG_TAG = '[WalletNow][EtherfuseV2]';

// ─── Erro HTTP ────────────────────────────────────────────────────────────────

export class EfV2HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'EfV2HttpError';
  }
}

// ─── Helper HTTP ──────────────────────────────────────────────────────────────

/**
 * Envia requisição autenticada via proxy Supabase.
 * A URL do proxy é injetada pelo consumidor para desacoplar do Vite.
 */
async function proxyRequest<T>(
  proxyEndpoint: string,
  supabaseAnonKey: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ endpoint, method, body }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = `Etherfuse V2 API ${response.status}: ${responseText.substring(0, 500)}`;
    try {
      const errJson = JSON.parse(responseText) as {
        error?: { code?: string; message?: string } | string;
      };
      if (typeof errJson.error === 'object' && errJson.error?.message) {
        errorMessage = `[${errJson.error.code ?? 'EF_V2_ERROR'}] ${errJson.error.message}`;
      } else if (typeof errJson.error === 'string') {
        errorMessage = errJson.error;
      }
    } catch {
      // Resposta não é JSON — mantém mensagem original
    }
    throw new EfV2HttpError(response.status, errorMessage);
  }

  if (!responseText) return undefined as T;
  return JSON.parse(responseText) as T;
}

// ─── Configuração de Contexto do Serviço ─────────────────────────────────────

export interface EtherfuseApiServiceConfig {
  /** URL completa do proxy Supabase Edge Function */
  proxyEndpoint: string;
  /** Anon key do Supabase para autenticar o proxy */
  supabaseAnonKey: string;
}

// ─── EtherfuseV2ApiService ────────────────────────────────────────────────────

/**
 * Cria uma instância configurada do serviço de API da Etherfuse V2.
 *
 * Fluxo validado (sandbox):
 *   1. createCustomer → obtém customerId + bankAccountId
 *   2. submitKycIdentity + submitKycDocuments + acceptAgreements
 *   3. pollKycStatus → aguarda 'approved'
 *   4. registerPixAccount → registra chave CPF mock
 *   5. resolveTesouroIdentifier → obtém CODE:ISSUER real
 *   6. getQuote → cotação BRL → TESOURO
 *   7. createOnRampOrder → cria ordem com bankAccountId real
 *   8. simulateFiatReceived → apenas sandbox
 *   9. pollUntilCompleted → aguarda liquidação
 */
export function createEtherfuseV2ApiService(config: EtherfuseApiServiceConfig) {
  const { proxyEndpoint, supabaseAnonKey } = config;

  function req<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<T> {
    return proxyRequest<T>(proxyEndpoint, supabaseAnonKey, endpoint, method, body);
  }

  return {
    // ─── PASSO 1: Criar Customer ──────────────────────────────────────────────

    async createCustomer(
      publicKey: string,
      _email?: string,
      country = 'BR',
    ): Promise<EfV2CustomerResponse> {
      console.info(LOG_TAG, 'PASSO 1: Criando customer programático (onboarding-url)...', {
        publicKey: publicKey.substring(0, 12) + '...',
        country,
      });

      const customerId = crypto.randomUUID();
      const bankAccountId = crypto.randomUUID();

      const result = await req<{ presigned_url: string }>('/ramp/onboarding-url', 'POST', {
        customerId,
        bankAccountId,
        publicKey,
        blockchain: 'stellar',
      });

      if (!result.presigned_url) {
        throw new Error('EtherfuseV2: onboarding-url não retornou presigned_url.');
      }

      console.info(LOG_TAG, '✅ Customer criado (onboarding-url).', { customerId });

      return {
        id: customerId,
        bankAccountId,
        presignedUrl: result.presigned_url,
      };
    },

    // ─── PASSO 2: KYC Programático ───────────────────────────────────────────

    async submitKycIdentity(customerId: string, publicKey: string): Promise<void> {
      console.info(LOG_TAG, 'PASSO 2a: Submetendo identidade KYC (mock sandbox)...', { customerId });

      const identityPayload = {
        pubkey: publicKey,
        identity: {
          id: publicKey,
          email: SANDBOX_KYC_MOCK_IDENTITY.email,
          phoneNumber: SANDBOX_KYC_MOCK_IDENTITY.phone,
          occupation: 'Software Engineer',
          name: {
            givenName: SANDBOX_KYC_MOCK_IDENTITY.firstName,
            familyName: SANDBOX_KYC_MOCK_IDENTITY.lastName,
          },
          dateOfBirth: SANDBOX_KYC_MOCK_IDENTITY.dateOfBirth,
          address: SANDBOX_KYC_MOCK_IDENTITY.address,
          idNumbers: [{ value: SANDBOX_KYC_MOCK_IDENTITY.taxId, type: 'CPF' }],
        },
      };

      await req<unknown>(`/ramp/customer/${customerId}/kyc`, 'POST', identityPayload);
      console.info(LOG_TAG, '✅ Identidade KYC submetida.', { customerId });
    },

    async submitKycDocuments(customerId: string, publicKey: string): Promise<void> {
      console.info(LOG_TAG, 'PASSO 2b: Submetendo documentos KYC (mock base64)...', { customerId });

      const MOCK_IMAGE_BASE64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await req<unknown>(`/ramp/customer/${customerId}/kyc/documents`, 'POST', {
        pubkey: publicKey,
        documentType: 'document',
        images: [
          { label: 'id_front', image: MOCK_IMAGE_BASE64 },
          { label: 'id_back', image: MOCK_IMAGE_BASE64 },
        ],
      });

      await req<unknown>(`/ramp/customer/${customerId}/kyc/documents`, 'POST', {
        pubkey: publicKey,
        documentType: 'selfie',
        images: [{ label: 'selfie', image: MOCK_IMAGE_BASE64 }],
      });

      console.info(LOG_TAG, '✅ Documentos KYC submetidos.', { customerId });
    },

    async acceptAgreements(presignedUrl: string): Promise<void> {
      console.info(LOG_TAG, 'PASSO 2c: Aceitando acordos Etherfuse...');
      await req<unknown>('/ramp/agreements/electronic-signature', 'POST', { presignedUrl });
      await req<unknown>('/ramp/agreements/terms-and-conditions', 'POST', { presignedUrl });
      await req<unknown>('/ramp/agreements/customer-agreement', 'POST', { presignedUrl });
      console.info(LOG_TAG, '✅ Acordos aceitos.');
    },

    // ─── PASSO 3: Status KYC ─────────────────────────────────────────────────

    async getKycStatus(customerId: string, publicKey: string): Promise<EfV2KycStatusResponse> {
      const result = await req<EfV2KycStatusResponse>(
        `/ramp/customer/${customerId}/kyc/${publicKey}`,
      );
      console.info(LOG_TAG, `KYC status: ${result.status}`, { customerId, status: result.status });
      return result;
    },

    async pollKycUntilApproved(
      customerId: string,
      publicKey: string,
      onStatus?: (status: EfV2KycStatus) => void,
      maxWaitMs = 60_000,
    ): Promise<EfV2KycStatus> {
      const INTERVAL_MS = 3_000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, INTERVAL_MS));

        const statusResult = await this.getKycStatus(customerId, publicKey);
        onStatus?.(statusResult.status);

        if (
          statusResult.status === 'approved' ||
          statusResult.status === 'approved_chain_deploying'
        ) {
          console.info(LOG_TAG, '✅ KYC aprovado.', { customerId });
          return statusResult.status;
        }

        if (statusResult.status === 'rejected') {
          const reason = statusResult.currentRejectionReason ?? 'motivo não informado';
          throw new Error(`KYC Rejeitado: ${reason}`);
        }
      }

      throw new Error(`[EtherfuseV2] Timeout (${maxWaitMs}ms) aguardando aprovação KYC.`);
    },

    // ─── PASSO 4: PIX ────────────────────────────────────────────────────────

    async registerPixAccount(
      presignedUrl: string,
      cpf: string = SANDBOX_PIX_CPF_MOCK,
    ): Promise<void> {
      console.info(LOG_TAG, 'PASSO 4: Registrando conta PIX (CPF mock sandbox)...');
      await req<unknown>('/ramp/bank-account', 'POST', {
        presignedUrl,
        account: {
          transactionId: crypto.randomUUID(),
          firstName: SANDBOX_KYC_MOCK_IDENTITY.firstName,
          lastName: SANDBOX_KYC_MOCK_IDENTITY.lastName,
          pixKey: cpf,
          pixKeyType: 'cpf',
          cpf,
        },
      });
      console.info(LOG_TAG, '✅ Conta PIX registrada.');
    },

    // ─── PASSO 5: Resolver Asset TESOURO ─────────────────────────────────────

    async resolveTesouroIdentifier(publicKey: string): Promise<string> {
      try {
        const params = new URLSearchParams({
          blockchain: 'stellar',
          currency: 'brl',
          wallet: publicKey,
        });

        const result = await req<EfV2AssetsResponse>(`/ramp/assets?${params.toString()}`);
        const tesouro = result.assets.find((a) => a.symbol === 'TESOURO');
        if (tesouro?.identifier) {
          console.info(LOG_TAG, `✅ TESOURO identifier resolvido: ${tesouro.identifier}`);
          return tesouro.identifier;
        }

        console.warn(LOG_TAG, 'TESOURO não encontrado em /ramp/assets. Usando fallback.');
        return TESOURO_FALLBACK_IDENTIFIER;
      } catch {
        console.warn(LOG_TAG, 'Falha ao resolver assets. Usando identifier hardcoded.');
        return TESOURO_FALLBACK_IDENTIFIER;
      }
    },

    // ─── PASSO 6: Quote ───────────────────────────────────────────────────────

    async getQuote(
      customerId: string,
      publicKey: string,
      amountBRL: string,
    ): Promise<EfV2QuoteResult> {
      const quoteId = crypto.randomUUID();
      const resolvedTargetAsset = await this.resolveTesouroIdentifier(publicKey);

      const result = await req<Record<string, unknown>>('/ramp/quote', 'POST', {
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

      console.info(LOG_TAG, '✅ Cotação obtida.', {
        quoteId: result['quoteId'],
        sourceAmount: result['sourceAmount'],
        destinationAmount: result['destinationAmountAfterFee'] ?? result['destinationAmount'],
      });

      return {
        quoteId: (result['quoteId'] as string) || quoteId,
        sourceAmount: (result['sourceAmount'] as string) || amountBRL,
        destinationAmount:
          (result['destinationAmountAfterFee'] as string) ||
          (result['destinationAmount'] as string) ||
          '0',
        exchangeRate: (result['exchangeRate'] as string) || '1',
        feeAmount: (result['feeAmount'] as string) || '0',
        expiresAt:
          (result['expiresAt'] as string) ||
          new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        resolvedTargetAsset,
      };
    },

    // ─── PASSO 7: Criar Ordem On-Ramp ────────────────────────────────────────

    async createOnRampOrder(
      customerId: string,
      bankAccountId: string,
      quoteId: string,
      publicKey: string,
    ): Promise<EfV2OrderResult> {
      const orderId = crypto.randomUUID();
      console.info(LOG_TAG, '📤 PASSO 7: createOrder', {
        orderId,
        customerId,
        bankAccountId,
        quoteId,
        publicKey: publicKey.substring(0, 12) + '...',
      });

      const result = await req<Record<string, unknown>>('/ramp/order', 'POST', {
        orderId,
        bankAccountId,
        publicKey,
        quoteId,
      });

      const order = (result['onramp'] || result) as Record<string, unknown>;
      console.info(LOG_TAG, '✅ Ordem de on-ramp criada.', {
        orderId: order['orderId'] || orderId,
        hasPixCode: !!(order['depositPixCode']),
      });

      return {
        orderId: (order['orderId'] as string) || orderId,
        status: (order['status'] as EfV2OrderStatus) || 'created',
        ...(order['depositPixKey'] !== undefined ? { pixKey: order['depositPixKey'] as string } : {}),
        ...(order['depositPixCode'] !== undefined ? { pixCode: order['depositPixCode'] as string } : {}),
        ...(order['depositPixKeyType'] !== undefined ? { pixKeyType: order['depositPixKeyType'] as string } : {}),
        ...(((order['depositAmount'] as string) || (order['amountInFiat'] as string))
          ? { amountInFiat: (order['depositAmount'] as string) || (order['amountInFiat'] as string) }
          : {}),
      };
    },

    // ─── PASSO 8 (SANDBOX): Simular PIX ─────────────────────────────────────

    async simulateFiatReceived(orderId: string): Promise<boolean> {
      console.info(LOG_TAG, '⚡ PASSO 8 (SANDBOX): Simulando PIX recebido...', { orderId });
      try {
        await req<unknown>('/ramp/order/fiat_received', 'POST', { orderId });
        console.info(LOG_TAG, '✅ Simulação PIX enviada.', { orderId });
        return true;
      } catch {
        console.error(LOG_TAG, '❌ Falha ao simular PIX', { orderId });
        return false;
      }
    },

    // ─── PASSO 9: Status da Ordem ────────────────────────────────────────────

    async getOrderStatus(orderId: string): Promise<EfV2OrderResult | null> {
      try {
        const result = await req<Record<string, unknown>>(`/ramp/order/${orderId}`);
        return {
          orderId: (result['orderId'] as string) || orderId,
          status: result['status'] as EfV2OrderStatus,
          ...(result['amountInTokens'] !== undefined ? { amountInTokens: result['amountInTokens'] as string } : {}),
          ...(result['confirmedTxSignature'] !== undefined ? { confirmedTxSignature: result['confirmedTxSignature'] as string } : {}),
          ...(result['depositPixKey'] !== undefined ? { pixKey: result['depositPixKey'] as string } : {}),
          ...(result['depositPixCode'] !== undefined ? { pixCode: result['depositPixCode'] as string } : {}),
          ...((result['amountInFiat'] || result['depositAmount'])
            ? { amountInFiat: (result['amountInFiat'] as string) || (result['depositAmount'] as string) }
            : {}),
        };
      } catch {
        console.error(LOG_TAG, 'Erro ao consultar status da ordem', { orderId });
        return null;
      }
    },

    async pollUntilCompleted(
      orderId: string,
      onStatus?: (status: string) => void,
      maxWaitMs = 90_000,
    ): Promise<EfV2OrderResult | null> {
      const INTERVAL_MS = 3_000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, INTERVAL_MS));

        const order = await this.getOrderStatus(orderId);
        if (!order) continue;

        onStatus?.(order.status);

        if (order.status === 'completed') {
          console.info(LOG_TAG, '✅ Ordem completada! TESOURO liquidado na Stellar.', {
            orderId,
            txSignature: order.confirmedTxSignature,
          });
          return order;
        }

        if (order.status === 'failed' || order.status === 'canceled') {
          console.error(LOG_TAG, `❌ Ordem ${order.status}`, { orderId });
          return order;
        }
      }

      console.error(LOG_TAG, '⏱️ Timeout aguardando conclusão da ordem', { orderId, maxWaitMs });
      return null;
    },
  };
}

/** Tipo inferido do serviço para uso como interface */
export type EtherfuseV2ApiService = ReturnType<typeof createEtherfuseV2ApiService>;
