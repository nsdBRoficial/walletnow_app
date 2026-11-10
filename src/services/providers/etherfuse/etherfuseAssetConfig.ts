/**
 * @module src/services/providers/etherfuse/etherfuseAssetConfig.ts
 * @description Adaptador de integração Etherfuse RWA (etherfuseAssetConfig) — KYC programático, trustlines e ordens de Tesouro Direto Tokenizado via PIX (exporta: EtherfuseAssetConfig, ETHERFUSE_HORIZON_URL, ETHERFUSE_PROXY_ENDPOINT).
 */
import { IEtherfuseAssetConfig } from './etherfuseTypes';
import { StellarNetwork } from '../../../config/stellarNetwork';

/**
 * Configuração REAL do ativo de tesouraria Etherfuse para o Brasil.
 *
 * TESOURO = tokenized representation of Brazil's Tesouro Direto (Tesouro Nacional).
 * Issuer verificado no regional-starter-pack: GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4
 *
 * Network: Stellar Testnet (Sandbox Etherfuse)
 * Rail: PIX (BRL)
 * API: https://api.sand.etherfuse.com
 */
export const EtherfuseAssetConfig: IEtherfuseAssetConfig = {
  assetCode: 'TESOURO', // REAL asset code da Etherfuse Brazil
  issuer: 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4', // REAL issuer verificado
  network: StellarNetwork.config.isMainnet ? 'PUBLIC' : 'TESTNET',
  displayName: 'Tesouro Direto Tokenizado',
  description: "Tokenized representation of Brazil's Tesouro Direto — federal government short-term debt securities issued by the National Treasury. Backed by sovereign bonds via PIX.",
  decimals: 7,
  color: '#0F172A',
  status: 'preview',
};



// Horizon endpoint dinâmico (Etherfuse usa Stellar Testnet ou Mainnet)
export const ETHERFUSE_HORIZON_URL = StellarNetwork.horizonUrl;

// Supabase Edge Function proxy para chamadas server-side à Etherfuse API
export const ETHERFUSE_PROXY_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/etherfuse-proxy`;
