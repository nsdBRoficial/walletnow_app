import { ETHERFUSE_PROXY_ENDPOINT, EtherfuseAssetConfig } from './etherfuseAssetConfig';
import { logger } from '../../../utils/logger';

/**
 * Resposta do endpoint GET /ramp/assets da Etherfuse.
 */
export interface EtherfuseAsset {
  symbol: string;
  identifier: string; // Formato "CODIGO:ISSUER"
  balance?: string;
  name?: string;
}

/**
 * Resposta do endpoint GET /ramp/assets
 */
export interface EtherfuseAssetsResponse {
  assets: EtherfuseAsset[];
}

/**
 * Resposta do endpoint POST /ramp/onboarding-url
 */
export interface EtherfuseOnboardingResponse {
  presigned_url: string;
  customerId: string;
}

/**
 * Status KYC do cliente na Etherfuse
 */
export type EtherfuseKycStatus = 'not_started' | 'pending' | 'approved' | 'approved_chain_deploying' | 'rejected';

/**
 * Resposta do endpoint GET /ramp/customer/:id/kyc/:pubkey
 */
export interface EtherfuseKycStatusResponse {
  status: EtherfuseKycStatus;
}

/**
 * Serviço de API da Etherfuse para o frontend.
 *
 * Todas as chamadas passam pelo proxy Supabase Edge Function para garantir
 * que a API key nunca seja exposta ao browser.
 *
 * IMPORTANTE: Este serviço APENAS faz discovery e KYC.
 * A trustline é criada via EtherfuseTrustlineService diretamente no Horizon.
 */
export const EtherfuseApiService = {
  /**
   * Chama o proxy Edge Function com tratamento de erros padronizado.
   */
  async _proxyRequest<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
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
      const errorText = await response.text();
      throw new Error(`Etherfuse Proxy Error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  },

  /**
   * Descobre os ativos disponíveis na Etherfuse para a conta do usuário.
   * Retorna identifier completo no formato "CODIGO:ISSUER".
   *
   * Usado para descobrir o identifier real do TESOURO antes de criar ordens.
   */
  async getAssets(publicKey: string): Promise<EtherfuseAssetsResponse> {
    try {
      logger.info('[WalletNow][Etherfuse]', 'Descobrindo assets disponíveis...', { publicKey: publicKey.substring(0, 8) + '...' });

      const params = new URLSearchParams({
        blockchain: 'stellar',
        currency: 'brl',
        wallet: publicKey,
      });

      const result = await this._proxyRequest(
        `/ramp/assets?${params.toString()}`
      ) as EtherfuseAssetsResponse;

      logger.info('[WalletNow][Etherfuse]', `Assets descobertos: ${result.assets.map(a => a.symbol).join(', ')}`);
      return result;
    } catch (error: any) {
      logger.error('[WalletNow][Etherfuse]', 'Falha ao descobrir assets', error);
      throw error;
    }
  },

  /**
   * Registra ou recupera um customer na Etherfuse e obtém a URL de onboarding KYC.
   *
   * Se o publicKey já estiver registrado (HTTP 409), a Etherfuse retorna o customer existente.
   */
  async createCustomerAndGetKycUrl(publicKey: string, email?: string): Promise<EtherfuseOnboardingResponse> {
    try {
      const customerId = crypto.randomUUID();
      const bankAccountId = crypto.randomUUID();

      logger.info('[WalletNow][Etherfuse]', 'Registrando customer na Etherfuse...', {
        customerId,
        publicKey: publicKey.substring(0, 8) + '...',
      });

      const result = await this._proxyRequest('/ramp/onboarding-url', 'POST', {
          customerId,
          bankAccountId,
          publicKey,
          blockchain: 'stellar',
        }) as EtherfuseOnboardingResponse;

      logger.info('[WalletNow][Etherfuse]', 'Customer registrado. URL de KYC obtida.', {
        customerId: result.customerId,
        hasUrl: !!result.presigned_url,
      });

      return result;
    } catch (error: any) {
      logger.error('[WalletNow][Etherfuse]', 'Falha ao registrar customer', error);
      throw error;
    }
  },

  /**
   * Consulta o status KYC do customer na Etherfuse.
   */
  async getKycStatus(customerId: string, publicKey: string): Promise<EtherfuseKycStatus> {
    try {
      const result = await this._proxyRequest(
        `/ramp/customer/${customerId}/kyc/${publicKey}`
      ) as EtherfuseKycStatusResponse;

      logger.info('[WalletNow][Etherfuse]', `KYC status: ${result.status}`, { customerId });
      return result.status;
    } catch (error: any) {
      logger.error('[WalletNow][Etherfuse]', 'Falha ao consultar KYC status', error);
      return 'not_started';
    }
  },

  /**
   * Verifica se o asset TESOURO está disponível para a wallet do usuário.
   * Retorna o identifier completo "TESOURO:ISSUER" para uso em ordens.
   */
  async getTesouroIdentifier(publicKey: string): Promise<string | null> {
    try {
      const { assets } = await this.getAssets(publicKey);
      const tesouro = assets.find(a => a.symbol === EtherfuseAssetConfig.assetCode);
      return tesouro?.identifier || null;
    } catch {
      return null;
    }
  },
};
