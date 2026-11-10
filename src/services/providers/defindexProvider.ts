/**
 * @module src/services/providers/defindexProvider.ts
 * @description Provedor de depósito/liquidez (defindexProvider) conectado ao registro central de rampas do WalletNow (exporta: defindexProvider).
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
