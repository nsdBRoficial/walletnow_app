/**
 * @module packages/testing/src/builders.ts
 * @description Fakes e utilitários de teste (@walletnow/testing - builders) para validação determinística em memória (exporta: buildIdentity, buildSession, buildWallet, buildProviderManifest).
 */
/**
 * @walletnow/testing — TestBuilders
 *
 * Funções de construção de objetos de teste (Builder Pattern).
 * Reduzem o boilerplate nos testes ao fornecer dados padrão válidos.
 *
 * @example
 * import { buildIdentity, buildSession, buildWallet } from '@walletnow/testing';
 *
 * const identity = buildIdentity({ label: 'Conta de Teste' });
 * const wallet = buildWallet({ identityId: identity.id });
 */

import type {
  Identity,
  IdentityId,
  IdentitySession,
  StellarWallet,
  WalletId,
  WalletNowProviderManifest,
  ProviderCapability,
} from '@walletnow/contracts';

// ─── Identity Builders ────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${String(++idCounter).padStart(4, '0')}`;
}

/** Constrói uma Identity válida para testes */
export function buildIdentity(overrides?: Partial<Identity>): Identity {
  return {
    id: nextId('identity'),
    authMethod: 'keypair',
    label: 'Test Identity',
    createdAt: 1000000000000,
    lastAuthAt: 1000000000000,
    isActive: true,
    ...overrides,
  };
}

/** Constrói uma IdentitySession válida para testes */
export function buildSession(
  identityId: IdentityId,
  overrides?: Partial<IdentitySession>,
): IdentitySession {
  return {
    identityId,
    publicKey: `GTEST${identityId.replace(/-/g, '').toUpperCase()}`,
    network: 'testnet',
    startedAt: 1000000000000,
    expiresAt: null,
    method: 'keypair',
    ...overrides,
  };
}

// ─── Wallet Builders ──────────────────────────────────────────────────────────

/** Constrói uma StellarWallet válida para testes */
export function buildWallet(
  identityId: IdentityId,
  overrides?: Partial<StellarWallet>,
): StellarWallet {
  const walletId: WalletId = nextId('wallet');
  return {
    id: walletId,
    identityId,
    publicKey: `GWALLET${walletId.replace(/-/g, '').toUpperCase()}`,
    network: 'testnet',
    custodyType: 'self-custody',
    label: 'Test Wallet',
    createdAt: 1000000000000,
    isActive: true,
    ...overrides,
  };
}

// ─── Provider Builders ────────────────────────────────────────────────────────

/** Constrói um WalletNowProviderManifest válido para testes */
export function buildProviderManifest(
  id: string,
  capabilities: ProviderCapability[] = [],
  overrides?: Partial<WalletNowProviderManifest>,
): WalletNowProviderManifest {
  return {
    id,
    name: `${id.charAt(0).toUpperCase()}${id.slice(1)} Provider`,
    version: '0.0.0-test',
    capabilities,
    networks: ['testnet'],
    description: `Test provider for ${id}`,
    website: `https://${id}.test`,
    icon: `https://${id}.test/icon.svg`,
    author: 'WalletNow Testing Suite',
    verified: false,
    ...overrides,
  };
}

// ─── Reset Utility ────────────────────────────────────────────────────────────

/** Reseta o contador de IDs — chame no beforeEach dos testes para IDs previsíveis */
export function resetBuilderCounters(): void {
  idCounter = 0;
}
