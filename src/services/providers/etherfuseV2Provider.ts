/**
 * @module src\services\providers\etherfuseV2Provider.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { BaseDepositProvider, ProviderStatus } from './depositProvider';

/**
 * Etherfuse V2 Provider — Fluxo Programático Validado (Sandbox)
 *
 * DIFERENÇA DO V1:
 *   V1 usa KYC hospedado (iframe/portal externo) — bloqueado por proxy account não provisionada.
 *   V2 usa KYC programático via API — end-to-end funcional no sandbox Etherfuse.
 *
 * Status: active — fluxo sandbox validado no demo etherfuse-pix-demo.
 *
 * Objetivo: depósito de TESOURO (Tesouro Direto tokenizado) via PIX.
 *
 * @see docs/ETHERFUSE_V2_VALIDATED_FLOW.md
 */
export class EtherfuseV2Provider extends BaseDepositProvider {
  id = 'etherfuse_v2';
  name = 'Etherfuse V2';
  status: ProviderStatus = 'active'; // Fluxo sandbox funcional
  description = 'Tesouro Direto Tokenizado via PIX. Fluxo programático validado (Sandbox).';
  buttonLabel = 'Etherfuse V2 (Sandbox)';
  iconName = 'TrendingUp';
}

export const etherfuseV2Provider = new EtherfuseV2Provider();
