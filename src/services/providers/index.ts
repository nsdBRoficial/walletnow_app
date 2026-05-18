export * from './depositProvider';
export * from './wooviProvider';
export * from './etherfuseProvider';
export * from './stripeProvider';

import { wooviProvider } from './wooviProvider';
import { etherfuseProvider } from './etherfuseProvider';
import { stripeProvider } from './stripeProvider';
import { IDepositProvider } from './depositProvider';

export const availableProviders: IDepositProvider[] = [
  wooviProvider,
  etherfuseProvider,
  stripeProvider
];
