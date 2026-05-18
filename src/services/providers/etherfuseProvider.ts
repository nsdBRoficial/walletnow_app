import { BaseDepositProvider, ProviderStatus } from './depositProvider';

export class EtherfuseProvider extends BaseDepositProvider {
  id = 'etherfuse';
  name = 'Etherfuse';
  status: ProviderStatus = 'coming_soon';
  description = 'LATAM stable asset infrastructure and treasury rails.';
  buttonLabel = 'Coming Soon';
  iconName = 'Globe';
}

export const etherfuseProvider = new EtherfuseProvider();
