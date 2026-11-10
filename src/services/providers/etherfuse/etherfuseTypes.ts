/**
 * @module src/services/providers/etherfuse/etherfuseTypes.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseTypes) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: IEtherfuseAssetConfig, IEtherfuseBalance).
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
