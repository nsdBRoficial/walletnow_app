/**
 * @module src\services\providers\etherfuse\etherfuseTypes.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
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
