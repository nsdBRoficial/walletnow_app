/**
 * @module src/services/providers/index.ts
 * @description Registro centralizado dos provedores de depósito (Woovi, Stellar TestAnchor, Etherfuse V2, Defindex, Stripe e Etherfuse V1).
 */
export * from './depositProvider';
export * from './wooviProvider';
export * from './etherfuseProvider';
export * from './etherfuseV2Provider';
export * from './stripeProvider';
export * from './stellarTestAnchor/stellarTestAnchorProvider';

import { wooviProvider } from './wooviProvider';
import { etherfuseProvider } from './etherfuseProvider';
import { etherfuseV2Provider } from './etherfuseV2Provider';
import { stripeProvider } from './stripeProvider';
import { stellarTestAnchorProvider } from './stellarTestAnchor/stellarTestAnchorProvider';
import { defindexProvider } from './defindexProvider';
import { IDepositProvider } from './depositProvider';

/**
 * Registry centralizado de providers de depósito.
 *
 * Ordem: ativos (Woovi, Stellar TestAnchor, EtherfuseV2) → coming_soon (Stripe, Etherfuse V1).
 *
 * EtherfuseV2: fluxo programático validado — status active (sandbox).
 * Etherfuse V1: KYC hospedado — congelado (compliance sandbox pendente).
 *
 * REGRA: Nunca remover providers existentes — apenas adicionar novos.
 */
export const availableProviders: IDepositProvider[] = [
  wooviProvider,
  stellarTestAnchorProvider,
  etherfuseV2Provider,   // V2: fluxo programático validado (active)
  defindexProvider,
  stripeProvider,
  etherfuseProvider,     // V1: KYC hospedado (coming_soon — mantido para histórico)
];

