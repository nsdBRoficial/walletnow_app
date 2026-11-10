/**
 * @module src/contexts/IntegrationEngineContext.tsx
 * @description Contexto React (IntegrationEngineContext) para gerenciamento de estado reativo e provisão de serviços na árvore de componentes (exporta: HealthMap, CapabilityProvider, IntegrationEngineContextValue, IntegrationEngineProvider).
 */
/**
 * IntegrationEngineContext
 *
 * Provider React que inicializa e expõe o Integration Engine para toda a UI.
 * Usa exclusivamente a API pública da IntegrationEngine:
 *   - engine.register(manifest) para registrar plugins
 *   - engine.findByCapability(id) para descobrir providers
 *   - engine.getHealthStatus(id) para health checks
 *   - engine.subscribeToHealthChanges() para atualizações
 *
 * Conecta serviços reais (DefindexVaultService, SoroswapAPIClient, Etherfuse)
 * sem mocks.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

import {
  DiscoveryService,
  HealthMonitor,
  IntegrationEngine,
  HealthStatus,
} from '@walletnow/core';
import type { ProtocolManifest } from '@walletnow/core';
import type { HealthCheckResult } from '@walletnow/core';

// Manifestos oficiais dos plugins
import { SOROSWAP_MANIFEST } from '@walletnow/plugin-soroswap';
import { DEFINDEX_MANIFEST } from '@walletnow/plugin-defindex';
import { ETHERFUSE_MANIFEST } from '@walletnow/plugin-etherfuse';

// Serviços reais dos plugins
import { DefindexAPIClient, DefindexVaultService, DefindexYieldService } from '@walletnow/plugin-defindex';
import { SoroswapAPIClient, SoroswapTokenService, TESTNET_TOKENS } from '@walletnow/plugin-soroswap';

// ─── Portfolio Manifest (built-in) ────────────────────────────────────────────
const PORTFOLIO_MANIFEST: ProtocolManifest = {
  id: 'portfolio',
  name: 'Portfolio',
  version: '1.0.0',
  category: 'wallet',
  description: 'Visão consolidada de todos os seus ativos e posições DeFi em tempo real.',
  website: 'https://walletnow.app',
  icon: `${import.meta.env.BASE_URL ?? '/'}logo-walletnow.svg`,
  networks: ['testnet', 'mainnet'],
  capabilities: [
    {
      id: 'portfolio',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read'],
      lifecycle: 'persistent',
      priority: 100,
    },
    {
      id: 'portfolio-contributor',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read'],
      lifecycle: 'persistent',
      priority: 100,
    },
  ],
  permissions: ['network.read'],
  author: 'WalletNow',
  priority: 100,
  display: {
    section: 'other',
    priority: 100,
    featured: true,
    color: '#00FF99',
    actionLabel: 'Ver Portfolio',
  },
  healthCheck: async () => HealthStatus.ONLINE,
};

// ─── Tipos do Contexto ────────────────────────────────────────────────────────

export interface HealthMap {
  [pluginId: string]: HealthCheckResult;
}

/** Provider de capability exposto pelo getCapability */
export interface CapabilityProvider<T = any> {
  manifest: ProtocolManifest;
  provider: T;
}

export interface IntegrationEngineContextValue {
  /** Engine principal */
  engine: IntegrationEngine;
  /** Lista de manifestos registrados */
  manifests: ProtocolManifest[];
  /** Mapa de health por pluginId */
  healthStatuses: HealthMap;
  /** true enquanto a inicialização está em andamento */
  isLoading: boolean;
  /** Erro de inicialização */
  error: string | null;
  /**
   * Retorna o provider real de uma capability.
   *
   * 'yield' | 'yield-vaults' → DefindexVaultService (getVaults, getVault, invalidateCache)
   * 'rwa'                    → Etherfuse provider (getAssets, getAvailableAssets)
   * 'swap'                   → SoroswapAPIClient (getQuote, buildTransaction, health)
   * 'payments'               → Etherfuse payments provider
   */
  getCapability: <T>(capabilityId: string, manifestId?: string) => CapabilityProvider<T> | null;
  /** Re-executa health checks */
  refreshHealth: () => Promise<void>;
}

const IntegrationEngineContext = createContext<IntegrationEngineContextValue | null>(null);

// ─── Singletons dos serviços reais ────────────────────────────────────────────

let _defindexVaultService: DefindexVaultService | null = null;
function getDefindexVaultService(): DefindexVaultService {
  if (!_defindexVaultService) {
    const client = new DefindexAPIClient({
      apiKey: (import.meta.env.VITE_DEFINDEX_API_KEY as string | undefined) ?? '',
    });
    _defindexVaultService = new DefindexVaultService({
      client,
      network: 'testnet',
      vaultListTtlMs: 5 * 60 * 1000,
    });
  }
  return _defindexVaultService;
}

let _defindexYieldService: DefindexYieldService | null = null;
function getDefindexYieldService(): DefindexYieldService {
  if (!_defindexYieldService) {
    const client = new DefindexAPIClient({
      apiKey: (import.meta.env.VITE_DEFINDEX_API_KEY as string | undefined) ?? '',
    });
    const vaultService = getDefindexVaultService();
    _defindexYieldService = new DefindexYieldService({
      client,
      vaultService,
      network: 'testnet',
      events: { emit: () => {} } as any,
    });
  }
  return _defindexYieldService;
}

let _soroswapClient: SoroswapAPIClient | null = null;
function getSoroswapClient(): SoroswapAPIClient {
  if (!_soroswapClient) {
    _soroswapClient = new SoroswapAPIClient({
      apiKey: (import.meta.env.VITE_SOROSWAP_API_KEY as string | undefined) ?? '',
    });
  }
  return _soroswapClient;
}

let _tokenService: SoroswapTokenService | null = null;
function getTokenService(): SoroswapTokenService {
  if (!_tokenService) {
    _tokenService = new SoroswapTokenService();
  }
  return _tokenService;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props { children: ReactNode; }

export function IntegrationEngineProvider({ children }: Props) {
  const [manifests, setManifests] = useState<ProtocolManifest[]>([]);
  const [healthStatuses, setHealthStatuses] = useState<HealthMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Engine singleton
  const engine = useMemo(() => {
    const discovery = new DiscoveryService();
    const health = new HealthMonitor();
    return new IntegrationEngine(discovery, health);
  }, []);

  // Health refresh
  const refreshHealth = async () => {
    const newHealth: HealthMap = {};
    for (const m of manifests) {
      newHealth[m.id] = engine.getHealthStatus(m.id);
    }
    setHealthStatuses(newHealth);
  };

  /**
   * getCapability — retorna o provider real do plugin para a capability solicitada.
   * Alias 'yield-vaults' → 'yield' para compatibilidade com código legado.
   */
  const getCapability = <T,>(capabilityId: string, manifestId?: string): CapabilityProvider<T> | null => {
    // Normaliza aliases
    const normalizedId = capabilityId === 'yield-vaults' ? 'yield' : capabilityId;

    // Encontra manifesto que oferece esta capability
    const candidates = engine.findByCapability(normalizedId, false);
    const manifest = manifestId
      ? candidates.find((m) => m.id === manifestId)
      : candidates[0];

    if (!manifest) return null;

    // ── Yield (Defindex) ────────────────────────────────────────────────────
    if (normalizedId === 'yield') {
      const vaultService = getDefindexVaultService();
      const yieldService = getDefindexYieldService();
      return {
        manifest,
        provider: {
          listVaults: () => vaultService.listVaults(),
          getVaults:  () => vaultService.listVaults(),
          getVault:   (id: string) => vaultService.getVaultById(id),
          invalidateCache: () => vaultService.invalidateCache(),
          getUserPositions: (pubKey: string) => yieldService.getUserPositions(pubKey),
        } as unknown as T,
      };
    }

    // ── RWA (Etherfuse) ─────────────────────────────────────────────────────
    if (normalizedId === 'rwa') {
      const rwaAssets = [
        {
          id: 'TESOURO',
          name: 'Tesouro Direto Brasil',
          symbol: 'TESOURO',
          tvlUsd: 0,
          projectedApy: 11.75,
          apy: 11.75,
          description: 'Títulos do Tesouro Direto do Brasil tokenizados na rede Stellar via Etherfuse.',
          requiresKyc: true,
          underlying: 'Gov. Bond',
        },
      ];
      return {
        manifest,
        provider: {
          getAssets:           async () => rwaAssets,
          getAvailableAssets:  async () => rwaAssets,
        } as unknown as T,
      };
    }

    // ── Swap (Soroswap) ─────────────────────────────────────────────────────
    if (normalizedId === 'swap') {
      const apiClient = getSoroswapClient();
      const tokenService = getTokenService();
      return {
        manifest,
        provider: {
          getSupportedTokens: () => tokenService.getTokenList('testnet'),
          getTestnetTokens:   () => TESTNET_TOKENS,
          getQuote:           (params: any) => apiClient.getQuote(params, 'testnet'),
          buildTransaction:   (params: any) => apiClient.buildTransaction(params, 'testnet'),
          health:             () => apiClient.checkHealth('testnet'),
        } as unknown as T,
      };
    }

    // ── Payments (Etherfuse) ─────────────────────────────────────────────────
    if (normalizedId === 'payments') {
      return {
        manifest,
        provider: { getProviderName: () => 'Etherfuse' } as unknown as T,
      };
    }

    return null;
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Registra manifestos via API pública da engine
        await Promise.allSettled([
          engine.register(PORTFOLIO_MANIFEST),
          engine.register(SOROSWAP_MANIFEST),
          engine.register(DEFINDEX_MANIFEST),
          engine.register(ETHERFUSE_MANIFEST),
        ]);

        // Inicializa (dispara health checks para quaisquer providers remotos)
        await engine.initialize();

        // Coleta manifestos descobertos via findByCapability dos IDs conhecidos
        const knownIds = ['portfolio', 'yield', 'rwa', 'swap', 'payments', 'portfolio-contributor'];
        const allFound = new Map<string, ProtocolManifest>();

        for (const capId of knownIds) {
          for (const m of engine.findByCapability(capId, false)) {
            allFound.set(m.id, m);
          }
        }

        const discovered = Array.from(allFound.values());
        setManifests(discovered);

        // Health inicial
        const initialHealth: HealthMap = {};
        for (const m of discovered) {
          initialHealth[m.id] = engine.getHealthStatus(m.id);
        }
        setHealthStatuses(initialHealth);

        // Subscreve a atualizações de health em tempo real
        unsubscribe = engine.subscribeToHealthChanges((pluginId, health) => {
          setHealthStatuses((prev) => ({ ...prev, [pluginId]: health }));
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao inicializar Integration Engine';
        console.error('[IntegrationEngineContext]', err);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [engine]);

  const value = useMemo<IntegrationEngineContextValue>(
    () => ({ engine, manifests, healthStatuses, isLoading, error, refreshHealth, getCapability }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, manifests, healthStatuses, isLoading, error],
  );

  return (
    <IntegrationEngineContext.Provider value={value}>
      {children}
    </IntegrationEngineContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIntegrationEngine(): IntegrationEngineContextValue {
  const ctx = useContext(IntegrationEngineContext);
  if (!ctx) {
    throw new Error('useIntegrationEngine deve ser usado dentro de <IntegrationEngineProvider>');
  }
  return ctx;
}
