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
  [key: string]: any;
}

export class EtherfuseKycService {
  /**
   * Submete os dados de KYC diretamente para a API da Etherfuse.
   * Utilizado em ambientes Sandbox para aprovação programática,
   * pulando o fluxo web hosted que pode ficar preso em 'proposed'.
   */
  static async submitKyc(customerId: string, payload: KycPayload): Promise<KycSubmitResult> {
    logger.info('[WalletNow][KYC]', `Enviando payload de KYC para o customer ${customerId}`);

    try {
      const response = await fetch(ETHERFUSE_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: `/ramp/customer/${customerId}/kyc`,
          method: 'POST',
          body: {
            identity: {
              id: customerId,
              email: "user@walletnow.app",
              idNumbers: [{ value: payload.taxId, type: "CPF" }],
              name: {
                givenName: payload.firstName,
                familyName: payload.lastName
              },
              dateOfBirth: payload.dateOfBirth,
              occupation: payload.occupation,
              phoneNumber: payload.phoneNumber,
              address: {
                street: payload.address.street,
                city: payload.address.city,
                region: payload.address.state,
                postalCode: payload.address.postalCode,
                country: payload.address.country
              }
            }
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Falha ao submeter KYC: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      logger.info('[WalletNow][KYC]', `✅ KYC submetido com sucesso. Status retornado: ${data.status || 'OK'}`, data);
      return data as KycSubmitResult;
    } catch (error: any) {
      logger.error('[WalletNow][KYC]', `❌ Erro ao submeter KYC para customer ${customerId}`, error);
      throw error;
    }
  }
}
