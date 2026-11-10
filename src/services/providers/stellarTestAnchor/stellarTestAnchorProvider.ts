/**
 * @module src\services\providers\stellarTestAnchor\stellarTestAnchorProvider.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module Services/Providers/StellarTestAnchor
 *
 * StellarNativeXlmProvider — Provedor de On/Off Ramp XLM Nativo na Stellar
 *
 * Responsabilidade Única (SRP):
 * Gerenciar a interface e o ciclo de depósito com liquidação final em XLM nativo na rede Stellar Testnet.
 * Conecta o trilho de pagamentos instantâneos (PIX via Woovi) com a infraestrutura on-chain
 * da Stellar, viabilizando liquidação automática sem exigir que o usuário compre ativos em exchanges.
 *
 * Especificação e Conformidade:
 * - Tipo de Provedor: Fiat On-Ramp com settlement nativo.
 * - Segurança: Roteamento auditado de fundos a partir da carteira de tesouraria (Treasury Hot Wallet).
 * - Integração: Utilizado no seletor de depósitos do dApp e nos fluxos de testes de âncoras.
 *
 * @updated Setembro de 2026
 * @extends {BaseDepositProvider}
 */

import { BaseDepositProvider, ProviderStatus } from '../depositProvider';
import { logger } from '../../../utils/logger';

export class StellarNativeXlmProvider extends BaseDepositProvider {
  id = 'stellar_testanchor';
  name = 'On/Off Ramp XLM Nativo';
  status: ProviderStatus = 'active';
  description = 'PIX → settlement real em XLM nativo na Stellar Testnet.';
  buttonLabel = 'Continue with PIX';
  iconName = 'Zap';

  public async initiateDeposit(amount: number, userId: string): Promise<any> {
    logger.info(
      '[WalletNow][TestAnchor]',
      `Iniciando depósito XLM Nativo para usuário ${userId}, valor: ${amount}`
    );

    // O fluxo de geração PIX é tratado no DepositModal (WooviService.createCharge).
    // Este método existe para conformidade com a interface — o settlement real
    // ocorre em StellarTestAnchorService.settleXLM() chamado pelo DepositModal.
    return { provider: this.id, amount, userId };
  }
}

export const stellarTestAnchorProvider = new StellarNativeXlmProvider();
