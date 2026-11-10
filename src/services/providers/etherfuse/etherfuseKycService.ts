/**
 * @module src/services/providers/etherfuse/etherfuseKycService.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseKycService) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: KycAddress, KycPayload, KycSubmitResult, EtherfuseKycService).
 */
import { ETHERFUSE_PROXY_ENDPOINT } from './etherfuseAssetConfig';
import { logger } from '../../../utils/logger';

export interface KycAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface KycPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  taxId: string;
  occupation: string;
  phoneNumber: string; // +55...
  address: KycAddress;
}

export interface KycSubmitResult {
  status: string;
  [key: string]: unknown;
}

/**
 * @deprecated
 *
 * EtherfuseKycService — KYC PROGRAMÁTICO (NíO UTILIZADO NO FLUXO PRINCIPAL)
 *
 * DECISíO ARQUITETURAL (Experimento KYC-First — 2026-05-19):
 *   O fluxo de KYC programático via POST /ramp/customer/:id/kyc foi descontinuado
 *   como fluxo principal. O KYC e o cadastro bancário (proxy account) da Etherfuse
 *   são provisionados EXCLUSIVAMENTE via o fluxo hospedado (onboarding-url iframe).
 *
 * MOTIVO:
 *   - O KYC programático muda o status para "proposed"/"approved" mas NíO
 *     provisiona o Proxy Account na Etherfuse.
 *   - Sem proxy account, POST /ramp/customer/:id/bank-accounts retorna { items: [] }.
 *   - Sem bankAccountId real, createOrder falha com "Proxy account not found".
 *
 * REFERÊNCIA:
 *   - regional-starter-pack: capabilities.fiatAccountRegistration = 'hosted'
 *   - https://github.com/ElliotFriend/regional-starter-pack
 *
 * MANTIDO APENAS PARA REFERÊNCIA FUTURA. Não instanciar em produção.
 */
export class EtherfuseKycService {
  /**
   * @deprecated Usar o fluxo hospedado Etherfuse (onboarding-url iframe) em vez deste método.
   *
   * Submete os dados de KYC diretamente para a API da Etherfuse.
   * NíO provisiona o proxy account — usar apenas para referência ou testes isolados.
   */
  static async submitKyc(customerId: string, payload: KycPayload): Promise<KycSubmitResult> {
    logger.warn('[WalletNow][KYC]', `⚠️ DEPRECATED: submitKyc programático chamado para customer ${customerId}. Usar fluxo hospedado.`);
    logger.info('[WalletNow][KYC]', `Enviando payload de KYC para o customer ${customerId}`);

    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      const response = await fetch(ETHERFUSE_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          endpoint: `/ramp/customer/${customerId}/kyc`,
          method: 'POST',
          body: {
            identity: {
              id: customerId,
              email: 'user@walletnow.app',
              idNumbers: [{ value: payload.taxId, type: 'CPF' }],
              name: {
                givenName: payload.firstName,
                familyName: payload.lastName,
              },
              dateOfBirth: payload.dateOfBirth,
              occupation: payload.occupation,
              phoneNumber: payload.phoneNumber,
              address: {
                street: payload.address.street,
                city: payload.address.city,
                region: payload.address.state,
                postalCode: payload.address.postalCode,
                country: payload.address.country,
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Falha ao submeter KYC: ${response.status} - ${errText}`);
      }

      const data = await response.json() as KycSubmitResult;
      logger.info('[WalletNow][KYC]', `KYC submetido. Status: ${data.status || 'OK'}`, data);
      return data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[WalletNow][KYC]', `❌ Erro ao submeter KYC para customer ${customerId}`, { error: msg });
      throw error;
    }
  }
}
