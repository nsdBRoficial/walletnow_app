/**
 * @module src\services\providers\defindexProvider.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */

import { IDepositProvider } from './depositProvider';

export const defindexProvider: IDepositProvider = {
  id: 'defindex',
  name: 'Defindex Vaults',
  description: 'Deposit into automated yield strategies',
  status: 'active',
  iconName: 'TrendingUp',
  comingSoon: false,
};
