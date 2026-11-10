/**
 * @module packages\plugins\plugin-soroswap\src\constants\tokens.testnet.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-soroswap — Tokens conhecidos na Testnet
 *
 * Lista mínima de tokens para desenvolvimento em testnet.
 * Em produção, a lista é buscada dinamicamente via SoroswapTokenService.
 *
 * Contratos SAC (Stellar Asset Contracts) da testnet Soroswap.
 * Fonte: https://api.soroswap.finance (pools endpoint) + faucet oficial
 */

import type { SwapToken } from '@walletnow/core';

/**
 * Token nativo XLM.
 * Na Soroswap API, usamos o endereço do contrato nativo na testnet
 */
export const XLM_TESTNET: SwapToken = {
  code: 'XLM',
  name: 'Stellar Lumens',
  contract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  icon: 'https://stellar.org/images/assets/xlm-icon.svg',
  decimals: 7,
  org: 'Stellar Development Foundation',
};

/**
 * Tokens testnet conhecidos da Soroswap.
 * Os endereços podem mudar entre reimplantações da testnet.
 * Usar SoroswapTokenService.getTokenList() para lista atualizada.
 */
export const TESTNET_TOKENS: SwapToken[] = [
  XLM_TESTNET,
  {
    code: 'USDC',
    name: 'USD Coin',
    // Endereço SAC USDC Testnet (da API Soroswap)
    contract: 'CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM',
    icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    decimals: 7,
    org: 'Circle',
  },
  {
    code: 'EURC',
    name: 'Euro Coin',
    // Endereço SAC EURC Testnet (Circle)
    contract: 'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO',
    icon: 'https://cryptologos.cc/logos/euro-coin-eurc-logo.svg',
    decimals: 7,
    org: 'Circle',
  },
];

/** Mapa de contract → token para lookup rápido */
export const TESTNET_TOKEN_MAP = new Map<string, SwapToken>(
  TESTNET_TOKENS.map((t) => [t.contract, t]),
);
