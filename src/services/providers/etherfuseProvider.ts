import { BaseDepositProvider, ProviderStatus } from './depositProvider';

export class EtherfuseProvider extends BaseDepositProvider {
  id = 'etherfuse';
  name = 'Etherfuse';
  status: ProviderStatus = 'active'; // Mudança para active para acessar o fluxo de preview
  description = 'Tokenized Treasury Notes. Institutional yield backed by sovereign bonds.';
  buttonLabel = 'Beta / Testnet Ready';
  iconName = 'Globe';
}

export const etherfuseProvider = new EtherfuseProvider();
