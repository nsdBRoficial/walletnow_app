export interface IEtherfuseAssetConfig {
  assetCode: string;
  issuer: string;
  network: 'TESTNET' | 'PUBLIC';
  displayName: string;
  description: string;
  decimals: number;
  color: string;
  status: 'preview' | 'active';
}

export interface IEtherfuseBalance {
  assetCode: string;
  balance: string;
  yieldAccrued?: string;
}
