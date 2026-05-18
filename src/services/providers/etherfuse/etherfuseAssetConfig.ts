import { IEtherfuseAssetConfig } from './etherfuseTypes';

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
  network: 'TESTNET',
  displayName: 'Tesouro Direto Tokenizado',
  description: "Tokenized representation of Brazil's Tesouro Direto — federal government short-term debt securities issued by the National Treasury. Backed by sovereign bonds via PIX.",
  decimals: 7,
  color: '#0F172A',
  status: 'preview',
};

// Horizon endpoint para Testnet (Etherfuse usa Stellar Testnet em sandbox)
export const ETHERFUSE_HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Supabase Edge Function proxy para chamadas server-side à Etherfuse API
export const ETHERFUSE_PROXY_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/etherfuse-proxy`;
