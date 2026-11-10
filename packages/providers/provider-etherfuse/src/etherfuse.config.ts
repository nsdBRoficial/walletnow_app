/**
 * @module packages/providers/provider-etherfuse/src/etherfuse.config.ts
 * @description Infraestrutura de provedores (@walletnow/providers - etherfuse.config) — registro, barramento de eventos e adaptadores externos (exporta: ETHERFUSE_ASSET_CONFIG, ETHERFUSE_HORIZON_URL, TESOURO_FALLBACK_IDENTIFIER).
 */
/**
 * @walletnow/provider-etherfuse — Asset Configuration
 *
 * Configuração real do ativo de tesouraria Etherfuse para o Brasil.
 *
 * TESOURO = tokenized representation of Brazil's Tesouro Direto.
 * Issuer verificado no regional-starter-pack.
 *
 * Network: Stellar Testnet (Sandbox Etherfuse)
 * Rail: PIX (BRL)
 * API: https://api.sand.etherfuse.com (sandbox)
 *
 * IMPORTANTE: Este arquivo NÃO usa `import.meta.env`.
 * A URL do proxy é injetada externamente pelo consumidor (plugin).
 */

import type { IEtherfuseAssetConfig } from './etherfuse.types.js';

export const ETHERFUSE_ASSET_CONFIG: IEtherfuseAssetConfig = {
  assetCode: 'TESOURO',
  issuer: 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4',
  network: 'TESTNET',
  displayName: 'Tesouro Direto Tokenizado',
  description:
    "Tokenized representation of Brazil's Tesouro Direto — federal government short-term debt securities issued by the National Treasury. Backed by sovereign bonds via PIX.",
  decimals: 7,
  color: '#0F172A',
  status: 'preview',
};

export const ETHERFUSE_HORIZON_URL = 'https://horizon-testnet.stellar.org';

/** Identifier hardcoded do TESOURO como fallback se /ramp/assets falhar */
export const TESOURO_FALLBACK_IDENTIFIER =
  'TESOURO:GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4';
