/**
 * @module src/services/providers/etherfuseProvider.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseProvider) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: EtherfuseProvider, etherfuseProvider).
 */
import { BaseDepositProvider, ProviderStatus } from './depositProvider';

/**
 * Etherfuse Provider — CONGELADO como Experimental/Enterprise
 *
 * Status: coming_soon (aguardando resolução de compliance sandbox e proxy account provisioning).
 * Mantido no registry para preservar o histórico arquitetural.
 * NíO remover — pode ser reativado quando o compliance sandbox for resolvido.
 */
export class EtherfuseProvider extends BaseDepositProvider {
  id = 'etherfuse';
  name = 'Etherfuse';
  status: ProviderStatus = 'coming_soon'; // Congelado: compliance sandbox pendente
  description = 'Tokenized Treasury Notes. Enterprise/institutional settlement (em breve).';
  buttonLabel = 'Enterprise';
  iconName = 'Globe';
}

export const etherfuseProvider = new EtherfuseProvider();

