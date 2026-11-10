/**
 * @module src/services/kycValidatorService.ts
 * @description Serviço de domínio e integração (kycValidatorService) para operações Stellar, conciliação fiduciária e persistência Supabase (exporta: KycValidationRequest, KycValidationResult, KycValidationResponse, KycValidatorService).
 */
import { supabase } from '../lib/supabase';
import { Logger } from '../utils/productionLogger';

/**
 * KycValidatorService
 *
 * Wrapper do frontend para a Edge Function `kyc-validator`.
 * O frontend NíO conhece qual provider de KYC está ativo (Gemini, Etherfuse, Transfero).
 * A decisão é feita server-side via variável KYC_PROVIDER no Supabase Vault.
 *
 * SEGURANÇA:
 * - Nenhuma API key de KYC é enviada do frontend
 * - JWT Supabase enviado automaticamente
 * - Imagens são trafegadas apenas na requisição (não armazenadas pelo serviço)
 *
 * @module KycValidatorService
 */

export interface KycValidationRequest {
  documentBase64: string;    // Imagem do documento (base64 com data URI)
  selfieBase64: string;      // Selfie do usuário (base64 com data URI)
  expectedCpf: string;       // CPF declarado pelo usuário
  expectedName: string;      // Nome declarado pelo usuário
  expectedBirthDate: string; // Data de nascimento declarada (DD/MM/AAAA)
}

export interface KycValidationResult {
  isApproved: boolean;
  errorDetails: string[];
  provider: 'gemini' | 'etherfuse' | 'transfero';
}

export interface KycValidationResponse {
  success: boolean;
  result?: KycValidationResult;
  error?: string;
  errorCode?: string;
}

export const KycValidatorService = {
  /**
   * Envia imagens e dados do usuário para validação KYC server-side.
   * A chamada usa a Edge Function `kyc-validator` que escolhe o provider configurado.
   *
   * @param request Dados do usuário e imagens para validação
   * @returns Resultado da validação KYC
   */
  async validate(request: KycValidationRequest): Promise<KycValidationResult> {
    Logger.info('[KycValidatorService] Iniciando validação KYC via Edge Function...');

    const { data, error } = await supabase.functions.invoke<KycValidationResponse>('kyc-validator', {
      body: request,
    });

    if (error) {
      Logger.error('[KycValidatorService] Erro de rede ao invocar kyc-validator:', error);
      throw new Error(error.message ?? 'Falha de comunicação com o serviço de KYC.');
    }

    if (!data?.success || !data.result) {
      const errCode = data?.errorCode ?? 'UNKNOWN';
      const errMsg = data?.error ?? 'Erro desconhecido no serviço de KYC.';

      // Tratamento de erros conhecidos com mensagens amigáveis
      if (errCode === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Muitas tentativas de KYC. Aguarde 10 minutos e tente novamente.');
      }
      if (errCode === 'RATE_LIMIT_AI') {
        throw new Error('Limite da IA excedido. Aguarde de 1 a 2 minutos e tente novamente.');
      }
      if (errCode === 'KYC_TIMEOUT') {
        throw new Error('A análise demorou mais que o esperado. Verifique sua conexão e tente novamente.');
      }

      Logger.error(`[KycValidatorService] Erro de negócio: [${errCode}] ${errMsg}`);
      throw new Error(`[${errCode}] ${errMsg}`);
    }

    Logger.info(`[KycValidatorService] Validação concluída. isApproved=${data.result.isApproved}`);
    return data.result;
  },
};
